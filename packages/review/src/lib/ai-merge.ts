// Parsing and merging of AI report enhancements onto the deterministic
// sections. Pure functions: no network, no storage — everything here is
// testable with plain inputs.

import { type ReportSection } from './report.ts';
import { shapeSections, type IssueTemplate } from './templates.ts';

// The structured contract the model fills in. Every field is optional because
// the validator applies per-field: whatever parses is used, the rest falls
// back to the deterministic pipeline.
export interface AIResult {
  title?: string;
  summary?: string;
  steps?: string[];
  template?: { filename: string; fields: Record<string, string> };
  labels?: string[];
}

const LIMITS = {
  title: 100,
  summary: 4000,
  step: 500,
  steps: 50,
  label: 50,
  labels: 20,
  fieldValue: 4000,
  filename: 120,
} as const;

// Model output is fenced or sloppy JSON more often than not; strip a single
// ```json fence (or ``` / ```jsonl) before parsing.
const FENCE_RE = /^\s*```(?:jsonl?)?\s*\n?([\s\S]*?)\n?\s*```\s*$/;

export function stripFences(content: string): string {
  const m = content.match(FENCE_RE);
  return m?.[1] ?? content;
}

const clean = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;

// Validate and normalize a raw model completion into an AIResult. Invalid
// fields are dropped individually — a bad title never kills a good summary.
// Returns null only when nothing usable survives (not JSON, not an object).
export function sanitizeAIResult(content: string): AIResult | null {
  let raw: unknown;
  try {
    raw = JSON.parse(stripFences(content).trim());
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;

  const out: AIResult = {};
  const title = clean((raw as Record<string, unknown>).title, LIMITS.title);
  if (title) out.title = title;
  const summary = clean((raw as Record<string, unknown>).summary, LIMITS.summary);
  if (summary) out.summary = summary;

  const stepsRaw = (raw as Record<string, unknown>).steps;
  if (Array.isArray(stepsRaw)) {
    const steps = stepsRaw
      .map((s) => {
        const c = clean(s, LIMITS.step);
        // Models often number the steps they return; applyAI re-numbers on
        // output, so a kept ordinal would render "1. 1. Navigate to ...".
        // Requires whitespace after the separator: "2FA" / "3.14" survive.
        return c ? c.replace(/^\d+[.)]\s+/, '') : undefined;
      })
      .filter((s): s is string => !!s)
      .slice(0, LIMITS.steps);
    if (steps.length) out.steps = steps;
  }

  const tpl = (raw as Record<string, unknown>).template;
  const tplFilename =
    tpl && typeof tpl === 'object' ? clean((tpl as Record<string, unknown>).filename, LIMITS.filename) : undefined;
  const tplFields = tpl && typeof tpl === 'object' ? (tpl as Record<string, unknown>).fields : undefined;
  if (tplFilename && tplFields && typeof tplFields === 'object' && !Array.isArray(tplFields)) {
    const fields: Record<string, string> = {};
    for (const [id, value] of Object.entries(tplFields as Record<string, unknown>)) {
      const text = clean(value, LIMITS.fieldValue);
      if (text) fields[id] = text;
    }
    if (Object.keys(fields).length) out.template = { filename: tplFilename, fields };
  }

  const labelsRaw = (raw as Record<string, unknown>).labels;
  if (Array.isArray(labelsRaw)) {
    const labels = labelsRaw
      .map((l) => clean(l, LIMITS.label))
      .filter((l): l is string => !!l)
      .slice(0, LIMITS.labels);
    if (labels.length) out.labels = labels;
  }

  return Object.keys(out).length ? out : null;
}

// Merge an AIResult onto the deterministic sections. Order of operations:
//  1. AI summary leads the report (priority 0 — kept first in URL budgets).
//  2. AI steps replace the deterministic "Steps to Reproduce" text.
//  3. With a template: shape deterministically first (every field filled,
//     nothing dropped), then overlay AI field content by field id. Unknown ids
//     are ignored, so a hallucinated template can never break the shape.
// Without a template the AI result just rides on the deterministic sections.
export function applyAI(
  baseSections: ReportSection[],
  result: AIResult,
  template: IssueTemplate | null,
): ReportSection[] {
  const withAI = [...baseSections];

  if (result.summary) {
    withAI.unshift({ name: 'Summary', priority: 0, text: result.summary });
  }
  if (result.steps?.length) {
    const text = result.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
    const idx = withAI.findIndex((s) => s.name === 'Steps to Reproduce');
    if (idx >= 0) withAI[idx] = { ...withAI[idx]!, text };
    else withAI.push({ name: 'Steps to Reproduce', priority: 1, text });
  }

  if (!template) return withAI;

  const mapped =
    result.template?.filename === template.filename ? result.template : null;
  if (!mapped) return shapeSections(template, withAI).sections;

  const shaped = shapeSections(template, withAI).sections;
  const labelOf = new Map(template.fields.map((f) => [f.id, f.label]));
  for (const [id, text] of Object.entries(mapped.fields)) {
    const label = labelOf.get(id);
    if (!label) continue;
    const idx = shaped.findIndex((s) => s.name === label);
    if (idx >= 0) shaped[idx] = { ...shaped[idx]!, text };
  }
  return shaped;
}
