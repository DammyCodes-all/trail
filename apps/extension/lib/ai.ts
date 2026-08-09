// Server-backed report enhancements. The extension never holds an API
// key: the replay server proxies POST /api/ai/enhance to OpenRouter (and the
// title-only /api/ai/title to Groq), and this module builds the
// (redaction-safe) session digest and calls it.
//
// The digest is the model's whole world: as much context as fits a budget,
// never rrweb events, never request/response headers, always capture-time
// redacted. Evidence lines are capped individually and then trimmed
// oldest-first to a hard total — a large session must degrade gracefully.

import { REPLAY_SERVER_URL } from './constants.ts';
import { formatDuration, type ReportFacts } from './facts.ts';
import { foldRepeatedConsoles } from './fold.ts';
import { isBeaconTarget, isFailedRequest } from './summary.ts';
import type { TimelineStep } from './timeline.ts';
import type { IssueTemplate } from './templates.ts';
import { formatElapsedTime } from './time.ts';
import type { StoredEvent, TrailReport } from './types.ts';
import { sanitizeAIResult, type AIResult } from './ai-merge.ts';

// Client-visible enhancement states. 'ready' carries the result separately;
// the rest are failure/preference states the UI surfaces.
export type AIStatus =
  | 'idle' // nothing to enhance yet (no events)
  | 'generating'
  | 'ready'
  | 'disabled' // user opted out
  | 'server-off' // replay server lacks the corresponding AI provider key
  | 'unavailable'; // network / rate limited / upstream / unparseable

export interface EnhanceOutcome {
  ok: boolean;
  status: AIStatus;
  result?: AIResult;
}

const MAX_CONSOLE = 15;
const MAX_NET = 10;
const MAX_FLAGS = 5;
const MAX_STACK_LINES = 10;
const MAX_MSG_CHARS = 1000;
const MAX_BODY_CHARS = 1500;
const MAX_STEP_CHARS = 300;
const TOTAL_EVIDENCE_BUDGET = 10_000;

// Title-only digest limits: tighter than the report digest (the title call is
// cheap by design), but the flag cap is gone — every flag is the reporter's
// own words, so the full set goes in.
const TITLE_MAX_STEPS = 40;
const TITLE_MAX_CONSOLE = 10;
const TITLE_MAX_NET = 10;
const TITLE_MAX_STACK_LINES = 5;
const TITLE_BUDGET = 8_000;

const truncate = (s: string, n: number): string =>
  s.length <= n ? s : `${s.slice(0, n)}…(truncated)`;

export interface SessionDigest {
  environment: {
    browser: string;
    os: string;
    page: string;
    duration: string;
    trail: string;
    recorded: string;
  };
  // Whole-session counts (folded consoles, beacon-filtered failed requests) so
  // the model can weigh the failure type even when per-evidence arrays were
  // trimmed by the budget — the same guarantee the title digest's stats line.
  stats: string;
  steps: string[];
  consoleErrors: Array<{ level: string; page: string; message: string; stack: string }>;
  failedRequests: Array<{ method: string; target: string; status: number; error: string; body: string }>;
  // Reporter-flagged moments: the user's own account of expected vs actual
  // outcome. High-signal intent — see the proxy's SYSTEM_PROMPT for how the
  // model is told to treat them.
  flags: Array<{ at: string; expected?: string; actual?: string }>;
  repo?: string;
  note?: string;
}

const pathOf = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

// host + path, query string stripped. A title only needs the page, and query
// strings can carry session tokens.
const hostPathOf = (url: string): string => {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? u.host : `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
};

// Timeline nav steps embed full URLs; rewrite them to host+path for the
// title digest.
const NAV_TEXT_RE = /^(Navigate to|Reloaded) (.+)$/;
const navStepText = (text: string): string => {
  const m = text.match(NAV_TEXT_RE);
  return m ? `${m[1]!} ${hostPathOf(m[2]!)}` : text;
};

export function buildSessionDigest(
  report: Pick<TrailReport, 'startedAt' | 'endedAt' | 'url'> | null,
  events: StoredEvent[],
  timeline: TimelineStep[],
  facts: ReportFacts,
  repo?: string,
): SessionDigest {
  // Steps are scrubbed like the title digest: nav URLs become host+path so
  // query-string tokens and session ids never reach the model.
  const steps = timeline
    .filter((s) => s.kind === 'nav' || s.kind === 'click' || s.kind === 'input')
    .map((s) =>
      truncate(s.kind === 'nav' ? navStepText(s.text) : s.text, MAX_STEP_CHARS),
    )
    .slice(-40);

  const consoles = events
    .filter((e): e is Extract<StoredEvent, { k: 'console' }> => e.k === 'console')
    .slice(-MAX_CONSOLE)
    .map((e) => ({
      level: e.lv,
      page: pathOf(e.url),
      message: truncate(e.msg || '', MAX_MSG_CHARS),
      stack: (e.stack ?? '').split('\n').slice(0, MAX_STACK_LINES).join('\n'),
    }));

  const nets = events
    .filter(
      (e): e is Extract<StoredEvent, { k: 'net' }> =>
        e.k === 'net' &&
        isFailedRequest(e.status) &&
        !isBeaconTarget(e.target),
    )
    .slice(-MAX_NET)
    .map((e) => ({
      method: e.method,
      target: truncate(e.target, MAX_MSG_CHARS),
      status: e.status,
      error: e.err ?? '',
      body: e.body ? truncate(e.body, MAX_BODY_CHARS) : '',
    }));

  // Whole-session counts behind the trimmed arrays: folded consoles (a noisy
  // loop is one error, not a hundred) and beacon-filtered failed requests, so
  // the numbers match the evidence the model actually sees.
  const foldedErrors = foldRepeatedConsoles(events).filter(
    (e) => e.k === 'console' && e.lv === 'error',
  ).length;
  const failedCount = events.filter(
    (e) => e.k === 'net' && isFailedRequest(e.status) && !isBeaconTarget(e.target),
  ).length;
  const flagCount = events.filter((e) => e.k === 'flag').length;
  const stats = `${flagCount} flagged moments · ${foldedErrors} console errors · ${failedCount} failed requests in ${formatDuration(facts.durationMs)}`;

  // Reporter flags: the user's own expected/actual notes, offset like the
  // timeline so the model can anchor them to the surrounding steps. Last five
  // kept — flags are rare, but a flag-spam session must not eat the budget.
  const t0 = events[0]?.t ?? 0;
  const flags = events
    .filter((e): e is Extract<StoredEvent, { k: 'flag' }> => e.k === 'flag')
    .slice(-MAX_FLAGS)
    .map((e) => ({
      at: formatElapsedTime(e.t - t0),
      ...(e.expected ? { expected: truncate(e.expected, MAX_STEP_CHARS) } : {}),
      ...(e.actual ? { actual: truncate(e.actual, MAX_STEP_CHARS) } : {}),
    }));

  // Hard total budget for evidence beyond the timeline: trim oldest-first so
  // the newest (most relevant) evidence always survives. Flags are the
  // reporter's own words, so they're trimmed last.
  let note: string | undefined;
  let total = 0;
  for (const c of consoles) total += c.message.length + c.stack.length;
  for (const n of nets) total += n.target.length + n.body.length;
  for (const f of flags) total += (f.expected ?? '').length + (f.actual ?? '').length;
  while (
    total > TOTAL_EVIDENCE_BUDGET &&
    (consoles.length || nets.length || flags.length)
  ) {
    if (consoles.length) {
      total -= consoles[0]!.message.length + consoles[0]!.stack.length;
      consoles.shift();
      note = 'Some older evidence was truncated for size.';
    } else if (nets.length) {
      const n = nets.shift()!;
      total -= n.target.length + n.body.length;
      note = 'Some older evidence was truncated for size.';
    } else if (flags.length) {
      const f = flags.shift()!;
      total -= (f.expected ?? '').length + (f.actual ?? '').length;
      note = 'Some older evidence was truncated for size.';
    }
  }

  return {
    environment: {
      browser: facts.browser,
      os: facts.os,
      page: facts.url || 'Unknown',
      duration: formatDuration(facts.durationMs),
      trail: facts.extensionVersion,
      recorded: new Date(report?.startedAt ?? Date.now()).toISOString(),
    },
    stats,
    steps,
    consoleErrors: consoles,
    failedRequests: nets,
    flags,
    repo,
    ...(note ? { note } : {}),
  };
}

// The title-only digest: what the model needs to name a bug in one line.
// The full flag set (uncapped — the reporter's own words, the strongest
// signal), the step sequence up to the failure, console errors with stack
// tops, and failed requests. No templates and no repo: the title is
// repo-independent, so the page-load call never waits on either.
export interface TitleDigest {
  environment: {
    browser: string;
    os: string;
    page: string;
    duration: string;
    trail: string;
    recorded: string;
  };
  // Whole-session counts, so the model can weigh the failure type even when
  // the per-evidence arrays were trimmed by the budget.
  stats: string;
  steps: string[];
  consoleErrors: Array<{ level: string; page: string; message: string; stack: string }>;
  failedRequests: Array<{ method: string; target: string; status: number; error: string }>;
  flags: Array<{ at: string; expected?: string; actual?: string }>;
}

export function buildTitleDigest(
  report: Pick<TrailReport, 'startedAt' | 'endedAt' | 'url'> | null,
  events: StoredEvent[],
  timeline: TimelineStep[],
  facts: ReportFacts,
): TitleDigest {
  const steps = timeline
    .filter((s) => s.kind === 'nav' || s.kind === 'click' || s.kind === 'input')
    .map((s) =>
      truncate(s.kind === 'nav' ? navStepText(s.text) : s.text, MAX_STEP_CHARS),
    )
    .slice(-TITLE_MAX_STEPS);

  const consoles = events
    .filter((e): e is Extract<StoredEvent, { k: 'console' }> => e.k === 'console')
    .slice(-TITLE_MAX_CONSOLE)
    .map((e) => ({
      level: e.lv,
      page: pathOf(e.url),
      message: truncate(e.msg || '', MAX_MSG_CHARS),
      stack: (e.stack ?? '').split('\n').slice(0, TITLE_MAX_STACK_LINES).join('\n'),
    }));

  const nets = events
    .filter(
      (e): e is Extract<StoredEvent, { k: 'net' }> =>
        e.k === 'net' &&
        isFailedRequest(e.status) &&
        !isBeaconTarget(e.target),
    )
    .slice(-TITLE_MAX_NET)
    .map((e) => ({
      method: e.method,
      target: truncate(hostPathOf(e.target), MAX_MSG_CHARS),
      status: e.status,
      error: e.err ?? '',
    }));

  // All flags, never sliced: they are the reporter's own account and the
  // strongest title signal. The budget trims them last.
  const t0 = events[0]?.t ?? 0;
  const flagCount = events.filter((e) => e.k === 'flag').length;
  const flags = events
    .filter((e): e is Extract<StoredEvent, { k: 'flag' }> => e.k === 'flag')
    .map((e) => ({
      at: formatElapsedTime(e.t - t0),
      ...(e.expected ? { expected: truncate(e.expected, MAX_STEP_CHARS) } : {}),
      ...(e.actual ? { actual: truncate(e.actual, MAX_STEP_CHARS) } : {}),
    }));

  // Hard total budget for evidence beyond the steps: trim oldest-first so the
  // newest evidence always survives. Flags are the reporter's own words, so
  // they're trimmed last.
  let total = 0;
  for (const c of consoles) total += c.message.length + c.stack.length;
  for (const n of nets) total += n.target.length;
  for (const f of flags) total += (f.expected ?? '').length + (f.actual ?? '').length;
  while (total > TITLE_BUDGET && (consoles.length || nets.length || flags.length)) {
    if (consoles.length) {
      total -= consoles[0]!.message.length + consoles[0]!.stack.length;
      consoles.shift();
    } else if (nets.length) {
      const n = nets.shift()!;
      total -= n.target.length;
    } else if (flags.length) {
      const f = flags.shift()!;
      total -= (f.expected ?? '').length + (f.actual ?? '').length;
    }
  }

  return {
    environment: {
      browser: facts.browser,
      os: facts.os,
      page: hostPathOf(facts.url || 'Unknown'),
      duration: formatDuration(facts.durationMs),
      trail: facts.extensionVersion,
      recorded: new Date(report?.startedAt ?? Date.now()).toISOString(),
    },
    stats: `${flagCount} flagged moments · ${facts.consoleErrors} console errors · ${facts.failedRequests} failed requests in ${formatDuration(facts.durationMs)}`,
    steps,
    consoleErrors: consoles,
    failedRequests: nets,
    flags,
  };
}

// POST the digest to the replay server's AI proxy. Any failure — network,
// timeout, server without a key, upstream error, unparseable completion —
// resolves to a status the caller maps straight into the fallback matrix.
// `chosenTemplate` is the exact template the review page will shape the issue
// onto; the server tells the model to map onto it, so its field values are
// never silently discarded.
export async function generateEnhancements(
  digest: SessionDigest,
  templates: IssueTemplate[],
  repo: string,
  chosenTemplate: IssueTemplate | null,
  signal?: AbortSignal,
): Promise<EnhanceOutcome> {
  try {
    const res = await fetch(`${REPLAY_SERVER_URL}/api/ai/enhance`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        digest,
        templates,
        repo,
        ...(chosenTemplate ? { chosenTemplate } : {}),
      }),
      signal,
    });
    if (res.status === 501) return { ok: false, status: 'server-off' };
    if (!res.ok) return { ok: false, status: 'unavailable' };
    const data = (await res.json().catch(() => null)) as { content?: unknown } | null;
    const result =
      typeof data?.content === 'string' ? sanitizeAIResult(data.content) : null;
    if (!result) return { ok: false, status: 'unavailable' };
    return { ok: true, status: 'ready', result };
  } catch {
    return { ok: false, status: 'unavailable' };
  }
}

export interface TitleOutcome {
  ok: boolean;
  status: AIStatus;
  title?: string;
}

// POST the title digest to the replay server's title-only proxy. Same
// status mapping as generateEnhancements; the response is sanitized and only
// the title field is kept.
export async function generateTitle(
  digest: TitleDigest,
  signal?: AbortSignal,
): Promise<TitleOutcome> {
  try {
    const res = await fetch(`${REPLAY_SERVER_URL}/api/ai/title`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ digest }),
      signal,
    });
    if (res.status === 501) return { ok: false, status: 'server-off' };
    if (!res.ok) return { ok: false, status: 'unavailable' };
    const data = (await res.json().catch(() => null)) as { content?: unknown } | null;
    const result =
      typeof data?.content === 'string' ? sanitizeAIResult(data.content) : null;
    if (!result?.title) return { ok: false, status: 'unavailable' };
    return { ok: true, status: 'ready', title: result.title };
  } catch {
    return { ok: false, status: 'unavailable' };
  }
}
