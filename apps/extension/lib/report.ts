import type { ReportSection } from './github.ts';
import { defaultSectionRender } from './github.ts';
import { buildReportFacts, formatDuration } from './facts.ts';
import { buildTimeline } from './timeline.ts';
import type { StoredEvent, TrailReport } from './types.ts';

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
  const netErr = ordered.find((e) => e.k === 'net' && (e.status === 0 || e.status >= 400));
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
  repo: string;
  // Backstop: when true, any typed value that was captured unmasked is hidden anyway.
  redact: boolean;
}

const pathOf = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

const envLines = (events: StoredEvent[]) => {
  const facts = buildReportFacts(events);
  return [
    `- Browser: ${facts.browser}`,
    `- OS: ${facts.os}`,
    `- Page: ${facts.url || 'Unknown'}`,
    `- Duration: ${formatDuration(facts.durationMs)}`,
    `- TRAIL: ${facts.extensionVersion}`,
    `- Recorded: ${new Date().toLocaleString()}`,
  ].join('\n');
};

// Build the report sections (also what buildIssueUrl fits to a byte budget).
export function buildSections(
  report: Pick<TrailReport, 'title'>,
  events: StoredEvent[],
  opts: ReportOptions,
): ReportSection[] {
  const timeline = buildTimeline(events, opts.redact);
  const actions = timeline.filter((s) => s.kind === 'nav' || s.kind === 'click' || s.kind === 'input');
  const steps = actions.map((s, i) => `${i + 1}. ${s.text}`).join('\n');

  const consoles = events.filter((e) => e.k === 'console');
  const nets = events.filter((e) => e.k === 'net');

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
      text: envLines(events),
    },
  ];

  if (nets.length) {
    sections.push({
      name: 'Failed Requests',
      priority: SECTION_PRIORITIES['Failed Requests']!,
      text: nets
        .map((e) => {
          const line = `- ${e.method} ${e.target} — ${e.status}${e.err ? ` (${e.err})` : ''}`;
          return e.body ? `${line}\n  \`\`\`\n${e.body}\n  \`\`\`` : line;
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
  report: Pick<TrailReport, 'title'>,
  events: StoredEvent[],
  opts: ReportOptions,
): string {
  return buildMarkdownFromSections(report.title, buildSections(report, events, opts));
}
