import type { ReportSection } from './github.ts';
import { defaultSectionRender } from './github.ts';
import { buildTimeline } from './timeline.ts';
import type { StoredEvent, TrailReport } from './types.ts';

// Deterministic title for a report: first console error, else first failed request,
// else "Bug on <host>".
export function suggestTitle(events: StoredEvent[]): string {
  const consoleErr = events.find((e) => e.k === 'console');
  if (consoleErr && consoleErr.k === 'console') {
    return (consoleErr.msg || 'Console error').slice(0, 70);
  }
  const netErr = events.find((e) => e.k === 'net' && e.status >= 400);
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

const envLines = () =>
  [
    `- User agent: ${navigator.userAgent.slice(0, 120)}`,
    `- Recorded: ${new Date().toLocaleString()}`,
  ].join('\n');

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
      text: envLines(),
    },
  ];

  if (nets.length) {
    sections.push({
      name: 'Failed Requests',
      priority: SECTION_PRIORITIES['Failed Requests']!,
      text: nets
        .map((e) => `- ${e.method} ${e.target} — ${e.status}${e.err ? ` (${e.err})` : ''}`)
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
