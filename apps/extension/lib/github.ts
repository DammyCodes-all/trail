// GitHub's `issues/new` is a GET. Its nginx 414s somewhere near 8192 bytes of total
// URL. We fit to a fixed budget with headroom, cutting sections in priority order so
// the URL opens prefilled and the full report is still on the clipboard.
const URL_LIMIT = 7600;

export interface ReportSection {
  name: string;
  text: string;
  // lower = kept first when the budget runs out
  priority: number;
  // Optional custom emitter so a section can carry template-shaped headings
  // (markdown templates use `**Label**`, YAML issue forms use `### Label`).
  // Defaults to a generic `## name` heading.
  render?: (name: string, text: string) => string;
}

export const defaultSectionRender = (name: string, text: string) => `## ${name}\n\n${text}`;

export interface IssueUrlResult {
  url: string;
  dropped: string[];
}

const cap = (s: string, n: number) => (s ? s.trim().slice(0, n) : '');

// GitHub's own API caps issue bodies at 65536 chars; there's no POST fallback for
// issues/new, so cutting to fit is the only path.
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
  const blocks = ordered.map((s) => ({
    name: s.name,
    block: `${(s.render ?? defaultSectionRender)(s.name, s.text)}\n\n`,
  }));

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
