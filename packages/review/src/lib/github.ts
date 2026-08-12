// GitHub's `issues/new` is a GET. Its nginx 414s somewhere near 8192 bytes of total
// URL. We fit to a fixed budget with headroom, cutting sections in priority order so
// the URL opens prefilled and the full report is still on the clipboard.
const URL_LIMIT = 7600;

import {
  buildTrailAttribution,
  buildTrailReplayPreamble,
  defaultSectionRender,
  type ReportSection,
  type TrailReportLinks,
} from "./report";

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
  labels: string[] = [],
  links?: TrailReportLinks,
): IssueUrlResult {
  const base = `https://github.com/${repo}/issues/new`;
  const encTitle = encodeURIComponent(cap(title, 120));
  const cleanLabels = labels
    .filter((l): l is string => typeof l === 'string')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 20);
  const labelsPart = cleanLabels.length ? `&labels=${encodeURIComponent(cleanLabels.join(','))}` : '';
  const overhead = base.length + '?title='.length + encTitle.length + '&body='.length + labelsPart.length;
  const budget = URL_LIMIT - overhead;

  const ordered = [...sections].sort((a, b) => a.priority - b.priority);
  const blocks = ordered.map((s) => ({
    name: s.name,
    block: `${(s.render ?? defaultSectionRender)(s.name, s.text)}\n\n`,
  }));

  const preamble = buildTrailReplayPreamble(links);
  const attribution = buildTrailAttribution(links);
  const footer = attribution ? `\n\n${attribution}` : '';
  const fits = (candidate: string) =>
    encodeURIComponent(candidate + footer).length <= budget;

  let body = preamble ? `${preamble}\n\n` : '';
  const dropped: string[] = [];
  for (const { name, block } of blocks) {
    if (fits(body + block)) body += block;
    else dropped.push(name);
  }

  if (dropped.length) {
    const note =
      `> Truncated for URL length: ${dropped.join(', ')}. ` +
      `Full report is on the clipboard.\n`;
    if (fits(note + body)) body = note + body;
  }

  const trimmedBody = body.trimEnd();
  body = trimmedBody ? `${trimmedBody}${footer}` : attribution;

  return {
    url: `${base}?title=${encTitle}&body=${encodeURIComponent(body)}${labelsPart}`,
    dropped,
  };
}
