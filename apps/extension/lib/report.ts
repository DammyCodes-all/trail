import { buildReportFacts, formatDuration } from './facts.ts';
import { isFailedRequest } from './summary.ts';
import { buildTimeline } from './timeline.ts';
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

const cleanErrorMessage = (message: string): string =>
  message
    .replace(/^(?:Uncaught\s+)?(?:Error|TypeError|ReferenceError|RangeError|SyntaxError):\s*/i, '')
    .replace(/^boom:\s*/i, '')
    .trim();

// Deterministic, evidence-backed title. When an error immediately follows a user
// action on the same page, include that action; otherwise report the failure as-is.
export function suggestTitle(events: StoredEvent[]): string {
  const ordered = [...events].sort((a, b) => a.t - b.t);
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
  const netErr = ordered.find((e) => e.k === 'net' && isFailedRequest(e.status));
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
// different one in the issue body.
const envLines = (report: ReportSummary, events: StoredEvent[]) => {
  const facts = buildReportFacts(events, report);
  return [
    `- Browser: ${facts.browser}`,
    `- OS: ${facts.os}`,
    `- Page: ${facts.url || 'Unknown'}`,
    `- Duration: ${formatDuration(facts.durationMs)}`,
    `- TRAIL: ${facts.extensionVersion}`,
    `- Recorded: ${new Date().toLocaleString()}`,
  ].join('\n');
};

// A net event that counts as a failed request. Kept as an explicit type guard
// because the shared isFailedRequest predicate isn't one by itself.
const isFailedNet = (
  e: StoredEvent,
): e is Extract<StoredEvent, { k: 'net' }> =>
  e.k === 'net' && isFailedRequest(e.status);

// Build the report sections (also what buildIssueUrl fits to a byte budget).
// Callers that already built the timeline (the review page memoizes it) pass
// it in so a render never sorts the events more than once.
export function buildSections(
  report: ReportSummary,
  events: StoredEvent[],
  opts: ReportOptions,
  timeline: ReturnType<typeof buildTimeline> = buildTimeline(events, opts.redact),
): ReportSection[] {
  const actions = timeline.filter((s) => s.kind === 'nav' || s.kind === 'click' || s.kind === 'input');
  const steps = actions.map((s, i) => `${i + 1}. ${s.text}`).join('\n');

  const consoles = events.filter((e) => e.k === 'console');
  const nets = events.filter(isFailedNet);

  const sections: ReportSection[] = [
    {
      name: 'Steps to Reproduce',
      priority: SECTION_PRIORITIES['Steps to Reproduce']!,
      text: steps || 'No actions recorded.',
    },
    {
      name: 'Console Errors',
      priority: SECTION_PRIORITIES['Console Errors']!,
      text: consoles.length
        ? consoles
            .map((e) => {
              const stack = (e.k === 'console' && (e.stack ?? '').split('\n').slice(0, 10).join('\n')) || '';
              return `- \`${e.lv}\` at ${pathOf(e.url)}: ${stack || e.msg}`;
            })
            .join('\n')
        : 'None captured.',
    },
    {
      name: 'Environment',
      priority: SECTION_PRIORITIES.Environment!,
      text: envLines(report, events),
    },
  ];

  if (nets.length) {
    sections.push({
      name: 'Failed Requests',
      priority: SECTION_PRIORITIES['Failed Requests']!,
      text: nets
        .map((e) => {
          const line = `- ${e.method} ${e.target} — ${e.status}${e.err ? ` (${e.err})` : ''}`;
          // Capture stores large bodies for the review UI; the report keeps a
          // tight cap so issue bodies stay within the tracker's budget.
          const body =
            e.body && e.body.length > 4000
              ? `${e.body.slice(0, 4000)}\n...(truncated)`
              : e.body;
          return body ? `${line}\n  \`\`\`\n${body}\n  \`\`\`` : line;
        })
        .join('\n'),
    });
  }

  return sections;
}

// Render sections to markdown honoring each section's template renderer
// (default: `## name`). Shared by copy/download and the GitHub URL body.
export function buildMarkdownFromSections(
  title: string,
  sections: ReportSection[],
): string {
  const body = sections
    .map((s) => (s.render ?? defaultSectionRender)(s.name, s.text))
    .join('\n\n');
  return `# ${title || 'Bug report'}\n\n${body}\n`;
}

export function buildMarkdown(
  report: ReportSummary,
  events: StoredEvent[],
  opts: ReportOptions,
): string {
  return buildMarkdownFromSections(report?.title ?? 'Bug report', buildSections(report, events, opts));
}
