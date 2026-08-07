// Phase 4: detect the target repo's issue template and shape the report body to
// its fields so prefilled issues land in the maintainers' format. The parsers,
// detector and shaper are pure (spike-tested); only fetchIssueTemplate hits the
// network, and every failure path degrades to null → the generic body.

import { defaultSectionRender, type ReportSection } from './report.ts';

export interface IssueTemplateField {
  id: string;
  label: string;
}

export interface IssueTemplate {
  kind: 'markdown' | 'yaml';
  filename: string;
  name: string;
  about?: string;
  // Frontmatter labels (e.g. `labels: ['bug']`) — prefilled into the issue URL.
  labels?: string[];
  fields: IssueTemplateField[];
}

export interface TemplateFile {
  filename: string;
  raw: string;
}

export interface ShapedSections {
  template: IssueTemplate;
  sections: ReportSection[];
}

// Deliberately excludes "report": GitHub's generated templates all carry the
// boilerplate about-line "Create a report to help us improve", which would
// otherwise make every template score as bug-ish.
const BUGISH = /\b(bug|defect|issue)\b/i;
const NO_RESPONSE = '_No response_';
const ADDITIONAL_RE = /additional|other context|anything else/i;

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

function applyMetaLine(line: string, meta: Record<string, string>, labels: string[]): void {
  const m = line.match(/^(name|about|description|title|labels):\s*(.*)$/i);
  if (!m || m[1] === undefined || m[2] === undefined) return;
  const key = m[1].toLowerCase();
  if (key === 'labels') {
    labels.push(
      ...m[2]
        .trim()
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean),
    );
  } else {
    meta[key] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; labels: string[] } {
  const meta: Record<string, string> = {};
  const labels: string[] = [];
  for (const line of raw.split('\n')) applyMetaLine(line, meta, labels);
  return { meta, labels };
}

// GitHub's generated markdown templates use `**Label**` on their own line; older
// hand-written ones use `## Label` headings. Accept both.
export function parseMarkdownTemplate(raw: string, filename: string): IssueTemplate | null {
  const front = raw.match(FRONTMATTER_RE);
  const { meta, labels } = front ? parseFrontmatter(front[1] ?? '') : parseFrontmatter('');
  const body = front ? raw.slice(front[0].length) : raw;
  const fields: IssueTemplateField[] = [];
  for (const line of body.split('\n')) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    const bold = line.match(/^\*\*(.+?)\*\*\s*$/);
    const label = (h2?.[1] ?? bold?.[1])?.trim();
    if (label) fields.push({ id: slugify(label), label });
  }
  if (!fields.length) return null;
  return {
    kind: 'markdown',
    filename,
    name: meta.name || filename,
    about: meta.about,
    labels,
    fields,
  };
}

// Hand-rolled YAML issue-form parser: pulls `body:` entries and each field's
// id/label. Tolerant of unknown types, nested attributes and indentation quirks.
// The yaml frontmatter has no `---` delimiters — it's the plain lines before
// `body:`, so meta lines are collected there and parsed with the same rules.
export function parseYamlTemplate(raw: string, filename: string): IssueTemplate | null {
  const metaLines: string[] = [];
  const fields: IssueTemplateField[] = [];
  let inBody = false;
  let fieldIndent = -1;
  let current: { id?: string; label?: string } | null = null;

  const flush = () => {
    if (current?.label) {
      fields.push({ id: current.id || slugify(current.label), label: current.label });
    }
    current = null;
  };

  for (const rawLine of raw.split('\n')) {
    if (!rawLine.trim()) continue;
    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;
    const line = rawLine.trim();

    if (!inBody) {
      if (line === '---') continue;
      if (line === 'body:') {
        inBody = true;
        continue;
      }
      metaLines.push(rawLine);
      continue;
    }

    if (line.startsWith('- type:')) {
      flush();
      current = {};
      fieldIndent = indent;
      continue;
    }
    if (!current) continue;
    if (indent <= fieldIndent) {
      flush();
      continue;
    }
    const idm = line.match(/^id:\s*(.+)$/i);
    if (idm?.[1]) {
      current.id = idm[1].trim();
      continue;
    }
    const lm = line.match(/^label:\s*(.+)$/i);
    if (lm?.[1]) {
      current.label = lm[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  flush();

  if (!fields.length) return null;
  const { meta, labels } = parseFrontmatter(metaLines.join('\n'));
  return {
    kind: 'yaml',
    filename,
    name: meta.name || filename,
    about: meta.about,
    labels,
    fields,
  };
}

function parseFile(file: TemplateFile): IssueTemplate | null {
  return /\.ya?ml$/i.test(file.filename)
    ? parseYamlTemplate(file.raw, file.filename)
    : parseMarkdownTemplate(file.raw, file.filename);
}

function isBugish(t: IssueTemplate | null, filename: string): boolean {
  return BUGISH.test(`${filename} ${t?.name ?? ''} ${t?.about ?? ''}`);
}

// Pick the bug-report-ish template from a directory; otherwise the first file.
// config.yml / config.yaml are the template-chooser config, not templates.
export function detectTemplate(files: TemplateFile[]): TemplateFile | null {
  const candidates = files.filter((f) => !/^config\.ya?ml$/i.test(f.filename));
  if (!candidates.length) return null;
  const scored = candidates
    .map((f) => ({ f, bugish: isBugish(parseFile(f), f.filename) }))
    .sort((a, b) => Number(b.bugish) - Number(a.bugish));
  return scored[0]?.f ?? null;
}

function detectParsed(templates: IssueTemplate[]): IssueTemplate | null {
  if (!templates.length) return null;
  const scored = templates
    .map((t) => ({ t, bugish: isBugish(t, t.filename) }))
    .sort((a, b) => Number(b.bugish) - Number(a.bugish));
  return scored[0]?.t ?? null;
}

const rendererFor = (kind: IssueTemplate['kind']) =>
  (name: string, text: string) =>
    kind === 'markdown' ? `**${name}**\n\n${text}` : `### ${name}\n\n${text}`;

function matchScore(fieldLabel: string, section: ReportSection): number {
  const w = fieldLabel.toLowerCase();
  const t = (re: RegExp) => (re.test(w) ? 1 : 0);
  switch (section.name) {
    case 'Steps to Reproduce':
      return t(/repro|step|follow|action|go to/i);
    case 'Console Errors':
      return t(/console|error|log|stack|exception/i);
    case 'Environment':
      return t(/environ|browser|desktop|device|os|version|smartphone|phone/i);
    case 'Failed Requests':
      return t(/request|network|api|endpoint|fail/i);
    default:
      return 0;
  }
}

// Map report sections onto template fields. Unmatched fields become
// GitHub's `_No response_`; unmatched sections are appended under an
// "Additional context" field if the template has one, else appended at the end —
// no captured data is ever dropped.
export function shapeSections(template: IssueTemplate, sections: ReportSection[]): ShapedSections {
  const render = rendererFor(template.kind);
  const remaining = [...sections];
  const shaped: ReportSection[] = [];

  for (const field of template.fields) {
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < remaining.length; i++) {
      const score = matchScore(field.label, remaining[i]!);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      const s = remaining[bestIdx]!;
      shaped.push({ name: field.label, priority: shaped.length + 1, text: s.text, render });
      remaining.splice(bestIdx, 1);
    } else {
      shaped.push({ name: field.label, priority: shaped.length + 1, text: NO_RESPONSE, render });
    }
  }

  if (remaining.length) {
    const extra = remaining.map((s) => defaultSectionRender(s.name, s.text)).join('\n\n');
    const additional = template.fields.find((f) => ADDITIONAL_RE.test(f.label));
    if (additional) {
      const idx = shaped.findIndex((s) => s.name === additional.label);
      if (idx >= 0) {
        const prev = shaped[idx]!;
        shaped[idx] = {
          ...prev,
          text: prev.text === NO_RESPONSE ? extra : `${prev.text}\n\n${extra}`,
        };
      }
    } else {
      for (const s of remaining) {
        shaped.push({ name: s.name, priority: shaped.length + 1, text: s.text, render });
      }
    }
  }

  return { template, sections: shaped };
}

// ---- network (extension contexts only) ----

const API = 'https://api.github.com/repos';

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = 5000,
): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchTemplateRaw(url: string): Promise<string | null> {
  const res = await fetchWithTimeout(url, {
    headers: { Accept: 'application/vnd.github.raw+json' },
  });
  if (!res) return null;
  return res.text().catch(() => null);
}

const atobUtf8 = (base64: string): string => {
  const bin = atob(base64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

// Resolve a repo to its best issue template (markdown or YAML form), or null
// when there is none / the repo is private / the network is unavailable. Callers
// fall back to the generic report body.
export async function fetchIssueTemplate(repo: string): Promise<IssueTemplate | null> {
  const clean = repo
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\/+$/, '');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(clean)) return null;

  const dirRes = await fetchWithTimeout(`${API}/${clean}/contents/.github/ISSUE_TEMPLATE`);
  if (dirRes) {
    const list = (await dirRes.json().catch(() => null)) as Array<{ name?: unknown; type?: unknown }> | null;
    if (Array.isArray(list)) {
      const parsed: IssueTemplate[] = [];
      for (const entry of list) {
        const name = typeof entry?.name === 'string' ? entry.name : '';
        if (entry?.type !== 'file' || !name || /^config\.ya?ml$/i.test(name)) continue;
        const raw = await fetchTemplateRaw(
          `${API}/${clean}/contents/.github/ISSUE_TEMPLATE/${encodeURIComponent(name)}`,
        );
        if (raw === null) continue;
        const t = /\.ya?ml$/i.test(name)
          ? parseYamlTemplate(raw, name)
          : parseMarkdownTemplate(raw, name);
        if (t) parsed.push(t);
      }
      const detected = detectParsed(parsed);
      if (detected) return detected;
    }
  }

  // Single-file fallback for older repos: .github/issue_template.md
  const singleRes = await fetchWithTimeout(`${API}/${clean}/contents/.github/issue_template.md`);
  if (singleRes) {
    const data = (await singleRes.json().catch(() => null)) as {
      content?: unknown;
      encoding?: unknown;
    } | null;
    if (
      data &&
      typeof data === 'object' &&
      typeof data.content === 'string' &&
      data.encoding === 'base64'
    ) {
      return parseMarkdownTemplate(atobUtf8(data.content), 'issue_template.md');
    }
  }

  return null;
}
