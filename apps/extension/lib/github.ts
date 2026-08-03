import type { ConsoleEvent, NetEvent, StoredEvent } from '@/lib/types';

// GitHub's `issues/new` is a GET. Its nginx 414s somewhere near 8192 bytes of total
// URL. We fit to a fixed budget with headroom, cutting sections in priority order so
// the URL opens prefilled and the full report is still on the clipboard.
const URL_LIMIT = 7600;

export interface ReportSection {
  name: string;
  text: string;
  // lower = kept first when the budget runs out
  priority: number;
}

export interface IssueUrlResult {
  url: string;
  dropped: string[];
}

const cap = (s: string, n: number) => (s ? s.trim().slice(0, n) : '');

// GitHub's own API caps issue bodies at 65536 chars; there's no POST fallback for
// issues/new, so cutting to fit is the only path. Keep what a maintainer can't guess:
// steps first, then the first console error (stack trimmed), env, then the failed
// requests, then the remaining console noise. Steps to reproduce is the entire point.
export const SECTION_PRIORITIES: Record<string, number> = {
  'Steps to Reproduce': 1,
  'Console Errors': 2,
  Environment: 3,
  'Failed Requests': 4,
  'Additional Logs': 5,
};

export function buildIssueUrl(
  repo: string,
  title: string,
  sections: ReportSection[],
): IssueUrlResult {
  const base = `https://github.com/${repo}/issues/new`;
  const encTitle = encodeURIComponent(cap(title, 120));
  const overhead =
    base.length + '?title='.length + encTitle.length + '&body='.length;
  const budget = URL_LIMIT - overhead;

  const ordered = [...sections].sort((a, b) => a.priority - b.priority);
  const blocks = ordered.map((s) => ({ name: s.name, block: `## ${s.name}\n\n${s.text}\n\n` }));

  let body = '';
  const dropped: string[] = [];
  for (const { name, block } of blocks) {
    if (encodeURIComponent(body + block).length <= budget) body += block;
    else dropped.push(name);
  }

  if (dropped.length) {
    const note =
      `> Truncated for URL length: ${dropped.join(', ')}. ` +
      `Full report is on the clipboard.\n`;
    if (encodeURIComponent(note + body).length <= budget) body = note + body;
  }

  return { url: `${base}?title=${encTitle}&body=${encodeURIComponent(body)}`, dropped };
}

const envLines = () =>
  [
    `- User agent: ${cap(navigator.userAgent, 120)}`,
    `- Recorded: ${new Date().toLocaleString()}`,
  ].join('\n');

function stackLines(e: ConsoleEvent): string {
  const stack = (e.stack ?? '').split('\n').slice(0, 10).join('\n');
  return stack || e.msg;
}

// Build the report sections straight from the captured events (timeline.ts will add
// the steps section in Phase 3). Everything here is deterministic — no AI anywhere.
export function sectionsFromEvents(events: StoredEvent[]): ReportSection[] {
  const consoles = events.filter((e): e is ConsoleEvent & { seq: number } => e.k === 'console');
  const nets = events.filter((e): e is NetEvent & { seq: number } => e.k === 'net');

  const sections: ReportSection[] = [
    {
      name: 'Console Errors',
      priority: SECTION_PRIORITIES['Console Errors']!,
      text: consoles.length
        ? consoles
            .map((e) => {
              const loc = new URL(e.url).pathname;
              return `- \`${e.lv}\` at ${loc}: ${stackLines(e)}`;
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
