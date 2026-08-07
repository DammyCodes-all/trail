// Groq-backed report enhancements. The extension never holds an API
// key: the replay server proxies POST /api/ai/enhance to Groq, and this
// module builds the (redaction-safe) session digest and calls it.
//
// The digest is the model's whole world: as much context as fits a budget,
// never rrweb events, never request/response headers, always capture-time
// redacted. Evidence lines are capped individually and then trimmed
// oldest-first to a hard total — a large session must degrade gracefully.

import { REPLAY_SERVER_URL } from './constants.ts';
import { formatDuration, type ReportFacts } from './facts.ts';
import { isBeaconTarget, isFailedRequest } from './summary.ts';
import type { TimelineStep } from './timeline.ts';
import type { IssueTemplate } from './templates.ts';
import type { StoredEvent, TrailReport } from './types.ts';
import { sanitizeAIResult, type AIResult } from './ai-merge.ts';

// Client-visible enhancement states. 'ready' carries the result separately;
// the rest are failure/preference states the UI surfaces.
export type AIStatus =
  | 'idle' // nothing to enhance yet (no events)
  | 'generating'
  | 'ready'
  | 'disabled' // user opted out
  | 'server-off' // replay server has no GROQ_API_KEY
  | 'unavailable'; // network / rate limited / upstream / unparseable

export interface EnhanceOutcome {
  ok: boolean;
  status: AIStatus;
  result?: AIResult;
}

const MAX_CONSOLE = 15;
const MAX_NET = 10;
const MAX_STACK_LINES = 10;
const MAX_MSG_CHARS = 1000;
const MAX_BODY_CHARS = 1500;
const MAX_STEP_CHARS = 300;
const TOTAL_EVIDENCE_BUDGET = 10_000;

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
  steps: string[];
  consoleErrors: Array<{ level: string; page: string; message: string; stack: string }>;
  failedRequests: Array<{ method: string; target: string; status: number; error: string; body: string }>;
  templates: Array<{
    filename: string;
    name: string;
    about?: string;
    labels?: string[];
    fields: Array<{ id: string; label: string }>;
  }>;
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

export function buildSessionDigest(
  report: Pick<TrailReport, 'startedAt' | 'endedAt' | 'url'> | null,
  events: StoredEvent[],
  timeline: TimelineStep[],
  facts: ReportFacts,
  templates: IssueTemplate[],
  repo?: string,
): SessionDigest {
  const steps = timeline
    .filter((s) => s.kind === 'nav' || s.kind === 'click' || s.kind === 'input')
    .map((s) => truncate(s.text, MAX_STEP_CHARS))
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

  // Hard total budget for evidence beyond the timeline: trim oldest-first so
  // the newest (most relevant) evidence always survives.
  let note: string | undefined;
  let total = 0;
  for (const c of consoles) total += c.message.length + c.stack.length;
  for (const n of nets) total += n.target.length + n.body.length;
  while (total > TOTAL_EVIDENCE_BUDGET && (consoles.length || nets.length)) {
    if (consoles.length) {
      total -= consoles[0]!.message.length + consoles[0]!.stack.length;
      consoles.shift();
      note = 'Some older evidence was truncated for size.';
    } else if (nets.length) {
      const n = nets.shift()!;
      total -= n.target.length + n.body.length;
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
    steps,
    consoleErrors: consoles,
    failedRequests: nets,
    templates: templates.map((t) => ({
      filename: t.filename,
      name: t.name,
      about: t.about,
      labels: t.labels,
      fields: t.fields,
    })),
    repo,
    ...(note ? { note } : {}),
  };
}

// POST the digest to the replay server's AI proxy. Any failure — network,
// timeout, server without a key, upstream error, unparseable completion —
// resolves to a status the caller maps straight into the fallback matrix.
export async function generateEnhancements(
  digest: SessionDigest,
  templates: IssueTemplate[],
  repo: string,
  signal?: AbortSignal,
): Promise<EnhanceOutcome> {
  try {
    const res = await fetch(`${REPLAY_SERVER_URL}/api/ai/enhance`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ digest, templates, repo }),
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
