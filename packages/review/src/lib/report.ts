import { buildReportFacts, formatDuration } from './facts.ts';
import { isBeaconTarget, isFailedRequest } from './summary.ts';
import { foldRepeatedConsoles, type FoldedConsole } from './fold.ts';
import { buildTimeline, isReproStep } from './timeline.ts';
import { formatElapsedTime } from './time.ts';
import type { StoredEvent, TrailReport } from './types.ts';

// The unit the document pipeline works in: a named, prioritized block of the
// report. Consumers (issue URL, templates) fit them to a byte budget and
// re-render them to match a tracker's template.
export interface ReportSection {
  name: string;
  text: string;
  // lower = kept first when a consumer fits sections to a budget
  priority: number;
  // Optional custom emitter so a section can carry template-shaped headings
  // (markdown templates use `**Label**`, YAML issue forms use `### Label`).
  // Defaults to a generic `## name` heading.
  render?: (name: string, text: string) => string;
}

export const defaultSectionRender = (name: string, text: string) => `## ${name}\n\n${text}`;

export interface TrailReportLinks {
  replayUrl?: string;
  landingUrl?: string;
}

export function buildTrailReplayPreamble(links?: TrailReportLinks): string {
  return links?.replayUrl
    ? `> **Replay:** [Open the captured session in TRAIL for more context](${links.replayUrl})`
    : '';
}

export function buildTrailAttribution(links?: TrailReportLinks): string {
  if (!links?.landingUrl) return '';
  const replay = links.replayUrl
    ? ` · [View replay](${links.replayUrl})`
    : '';
  return `---\n\n<sub>Captured with [TRAIL](${links.landingUrl})${replay}</sub>`;
}

const cleanErrorMessage = (message: string): string =>
  message
    .replace(/^(?:Uncaught\s+)?(?:Error|TypeError|ReferenceError|RangeError|SyntaxError):\s*/i, '')
    .replace(/^boom:\s*/i, '')
    .trim();

// A fence that won't collide with its own content (bodies occasionally carry
// triple backticks).
const fenceFor = (s: string): string => (s.includes('```') ? '````' : '```');

// Fenced code blocks must sit at column 0: indenting a fence inside a list
// item closes it the moment the content dedents, and CommonMark swallows
// everything after that into one giant code block (GitHub parses the same way).
const fenced = (s: string): string => {
  const fence = fenceFor(s);
  return `${fence}\n${s.trimEnd()}\n${fence}`;
};

// Deterministic, evidence-backed title. When an error immediately follows a user
// action on the same page, include that action; otherwise report the failure as-is.
// A reporter flag with a note outranks everything: it is explicit human intent,
// so it names the bug even in a session with no technical evidence at all.
export function suggestTitle(events: StoredEvent[]): string {
  const ordered = [...events].sort((a, b) => a.t - b.t);
  const flag = ordered.find(
    (e) => e.k === 'flag' && Boolean((e.note || e.actual || e.expected)?.trim()),
  );
  if (flag && flag.k === 'flag') {
    return (flag.note || flag.actual || flag.expected || '').trim().slice(0, 70);
  }
  const consoleErr = ordered.find((e) => e.k === 'console' && e.lv === 'error');
  if (consoleErr && consoleErr.k === 'console') {
    const action = ordered
      .filter(
        (event) =>
          event.k === 'click' &&
          event.url === consoleErr.url &&
          event.t <= consoleErr.t &&
          consoleErr.t - event.t <= 2_000,
      )
      .at(-1);
    const message = cleanErrorMessage(consoleErr.msg || 'Console error');
    if (action?.k === 'click') {
      return `${action.label || action.tag} failed: ${message}`.slice(0, 70);
    }
    return message.slice(0, 70);
  }
  const netErr = ordered.find(
    (e) => e.k === 'net' && isFailedRequest(e.status) && !isBeaconTarget(e.target),
  );
  if (netErr && netErr.k === 'net') {
    return `${netErr.method} ${netErr.target} failed (${netErr.status})`.slice(0, 70);
  }
  const url = events[0]?.url;
  if (url) {
    try {
      return `Bug on ${new URL(url).host}`;
    } catch {
      return `Bug on ${url}`;
    }
  }
  return 'Bug report';
}

const SECTION_PRIORITIES: Record<string, number> = {
  'Steps to Reproduce': 1,
  // The reporter's notes sit right after the repro steps — the canonical
  // position for them in a professional bug report — and before the technical
  // evidence sections. (Legacy sessions may also carry the expected/actual
  // split, ordered the same way.)
  'Reporter Notes': 1.2,
  'Expected Behavior': 1.25,
  'Actual Behavior': 1.35,
  'Console Errors': 2,
  Environment: 3,
  'Failed Requests': 4,
};

export interface ReportOptions {
  // Backstop: when true, any typed value that was captured unmasked is hidden anyway.
  redact: boolean;
}

export type ReportSummary = Pick<
  TrailReport,
  'title' | 'startedAt' | 'endedAt' | 'url'
> | null;

const pathOf = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

// The Environment section must derive from the same report the header facts
// use — otherwise a saved session shows one duration/URL in the header and a
// different one in the issue body. The caller's already-built timeline is
// reused so a render never sorts the session twice.
const envLines = (
  report: ReportSummary,
  events: StoredEvent[],
  timeline: ReturnType<typeof buildTimeline>,
) => {
  const facts = buildReportFacts(events, report, {}, timeline);
  // Recorded is the capture start (like the AI digest's), never the render
  // time — re-exporting a cached session must not change the report.
  const recorded = new Date(report?.startedAt ?? Date.now()).toISOString();
  return [
    `- Browser: ${facts.browser}`,
    `- OS: ${facts.os}`,
    `- Page: ${facts.url || 'Unknown'}`,
    ...(facts.viewport ? [`- Viewport: ${facts.viewport}`] : []),
    `- Duration: ${formatDuration(facts.durationMs)}`,
    `- TRAIL: ${facts.extensionVersion}`,
    `- Recorded: ${recorded}`,
  ].join('\n');
};

// A net event that counts as a failed request. Kept as an explicit type guard
// because the shared isFailedRequest predicate isn't one by itself.
const isFailedNet = (
  e: StoredEvent,
): e is Extract<StoredEvent, { k: 'net' }> =>
  e.k === 'net' && isFailedRequest(e.status);

// Issue bodies are read by humans: analytics beacons and tracking calls carry
// multi-KB query strings that would bury the actual failure. Scheme, host, and
// path always survive; the query string is trimmed to fit a display cap. The
// review UI keeps the full capture — this only affects the exported report.
const shortTarget = (target: string, max = 220): string => {
  if (target.length <= max) return target;
  try {
    const u = new URL(target);
    const base = `${u.origin}${u.pathname}`;
    if (base.length >= max) return `${base.slice(0, max - 1)}…`;
    return `${base}${u.search.slice(0, max - base.length - 1)}…`;
  } catch {
    // Relative targets (no parseable host) can still be huge — cap them too.
    return `${target.slice(0, max - 1)}…`;
  }
};

// Steps are capped so one section can't eat the whole issue-URL budget: a
// 300-action session stays reproducible without silently dropping the
// console/failed-request sections. The newest steps win — the immediate
// lead-up to the failure is what the maintainer needs first.
const MAX_STEPS = 100;

// Build the report sections (also what buildIssueUrl fits to a byte budget).
// Callers that already built the timeline (the review page memoizes it) pass
// it in so a render never sorts the events more than once.
export function buildSections(
  report: ReportSummary,
  events: StoredEvent[],
  opts: ReportOptions,
  timeline: ReturnType<typeof buildTimeline> = buildTimeline(events, opts.redact),
): ReportSection[] {
  // What counts as a repro step is timeline.ts's call (STEP_KINDS) — the AI
  // digests filter through the same set.
  const actions = timeline.filter((s) => isReproStep(s.kind));
  const omitted = Math.max(0, actions.length - MAX_STEPS);
  const kept = omitted ? actions.slice(-MAX_STEPS) : actions;
  const list = kept.map((s, i) => `${i + 1}. ${s.text}`).join('\n');
  const steps = list
    ? `${omitted ? `> …${omitted} earlier step${omitted === 1 ? '' : 's'} omitted.\n\n` : ''}${list}`
    : 'No actions recorded.';

  const consoles = foldRepeatedConsoles(events).filter(
    (e): e is FoldedConsole => e.k === 'console',
  );
  const nets = events.filter(isFailedNet);

  // Reporter flags: each flag is its own moment. Bullets carry the time offset
  // so N flags read as N distinct moments, never one merged pair. The modern
  // form is a single free-form note ('Reporter Notes'); legacy expected/actual
  // sessions still render their two sections. A flag without text stays a
  // timeline marker and a hint for the AI, not report text.
  const flags = events
    .filter((e) => e.k === 'flag')
    .sort((a, b) => a.t - b.t);
  // Anchor offsets to the same chronological baseline the timeline uses
  // (its first step), never to insertion order — the report's @mm:ss must
  // match what the user sees on screen.
  const t0 = timeline[0]?.t ?? events[0]?.t ?? 0;
  const flagNote = (
    f: Extract<StoredEvent, { k: 'flag' }>,
    pick: (f: Extract<StoredEvent, { k: 'flag' }>) => string | undefined,
  ) => `- \`@${formatElapsedTime(f.t - t0)}\` — ${pick(f) ?? ''}`.trim();
  const reporterNotes = flags.filter((f) => f.note?.trim());
  const expectedNotes = flags.filter((f) => f.expected?.trim());
  const actualNotes = flags.filter((f) => f.actual?.trim());

  const sections: ReportSection[] = [
    {
      name: 'Steps to Reproduce',
      priority: SECTION_PRIORITIES['Steps to Reproduce']!,
      text: steps || 'No actions recorded.',
    },
  ];

  if (reporterNotes.length) {
    sections.push({
      name: 'Reporter Notes',
      priority: SECTION_PRIORITIES['Reporter Notes']!,
      text: reporterNotes.map((f) => flagNote(f, (x) => x.note)).join('\n'),
    });
  }
  if (expectedNotes.length) {
    sections.push({
      name: 'Expected Behavior',
      priority: SECTION_PRIORITIES['Expected Behavior']!,
      text: expectedNotes.map((f) => flagNote(f, (x) => x.expected)).join('\n'),
    });
  }
  if (actualNotes.length) {
    sections.push({
      name: 'Actual Behavior',
      priority: SECTION_PRIORITIES['Actual Behavior']!,
      text: actualNotes.map((f) => flagNote(f, (x) => x.actual)).join('\n'),
    });
  }

  sections.push(
    {
      name: 'Console Errors',
      priority: SECTION_PRIORITIES['Console Errors']!,
      text: consoles.length
        ? consoles
            .map((e) => {
              // Stacks are capped like before; the fence keeps them readable.
              const stack = (
                e.k === 'console' &&
                (e.stack ?? '').split('\n').slice(0, 10).join('\n').trim()
              ) || '';
              // Repeated identical messages fold into one bullet with a count,
              // so a noisy loop can't write the same line a hundred times.
              const repeat = e.count > 1 ? ` (×${e.count})` : '';
              const first = `- \`${e.lv}\` at ${pathOf(e.url)}: ${e.msg || 'Console error'}${repeat}`;
              return stack ? `${first}\n\n${fenced(stack)}` : first;
            })
            .join('\n')
        : 'None captured.',
    },
    {
      name: 'Environment',
      priority: SECTION_PRIORITIES.Environment!,
      text: envLines(report, events, timeline),
    },
  );

  // Beacons (analytics, tracking) are filtered out: they fail constantly for
  // reasons unrelated to the bug. The review UI keeps them; the report does not.
  const failed = nets.filter((e) => !isBeaconTarget(e.target));
  if (failed.length) {
    // Separated with --- so GitHub renders each failure as its own block —
    // long entries no longer blur together in one wall of text. Bodies sit in
    // top-level fenced blocks (never indented inside the list item — see
    // fenced()).
    const list = failed
      .map((e) => {
        const line = `- ${e.method} ${shortTarget(e.target)} — ${e.status}${e.err ? ` (${e.err})` : ''}`;
        // Capture stores large bodies for the review UI; the report keeps a
        // tight cap so issue bodies stay within the tracker's budget.
        const body =
          e.body && e.body.length > 4000
            ? `${e.body.slice(0, 4000)}\n...(truncated)`
            : e.body;
        return body ? `${line}\n\n${fenced(body)}` : line;
      })
      .join('\n\n---\n\n');
    // Beacon floods (analytics, tracking) can produce dozens of rows; tuck the
    // list behind a <details> toggle on GitHub so a small report reads plainly
    // while a big one hides behind one click. GitHub renders <details> in issue
    // bodies; the blank line after </summary> is required for the markdown.
    const text =
      failed.length > 5 || list.length > 600
        ? `<details>\n<summary>${failed.length} failed requests</summary>\n\n${list}\n\n</details>`
        : list;
    sections.push({
      name: 'Failed Requests',
      priority: SECTION_PRIORITIES['Failed Requests']!,
      text,
    });
  }

  return sections;
}

// Render sections to markdown honoring each section's template renderer
// (default: `## name`). Shared by copy/download and the GitHub URL body.
export function buildMarkdownFromSections(
  title: string,
  sections: ReportSection[],
  links?: TrailReportLinks,
): string {
  const body = sections
    .map((s) => (s.render ?? defaultSectionRender)(s.name, s.text))
    .join('\n\n');
  const preamble = buildTrailReplayPreamble(links);
  const attribution = buildTrailAttribution(links);
  return `# ${title || 'Bug report'}\n\n${preamble ? `${preamble}\n\n` : ''}${body}\n${attribution ? `\n${attribution}\n` : ''}`;
}

export function buildMarkdown(
  report: ReportSummary,
  events: StoredEvent[],
  opts: ReportOptions,
): string {
  return buildMarkdownFromSections(report?.title ?? 'Bug report', buildSections(report, events, opts));
}
