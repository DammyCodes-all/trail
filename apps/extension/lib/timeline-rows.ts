import { severityOfStatus } from "@/lib/summary";
import type { TimelineStep } from "@/lib/timeline";

// The timeline's tone comes from the same severity model the report summary
// and the evidence panel use: console errors are failures, console warnings
// and 4xx requests are moderate, 5xx/network-level failures are critical.
// Reporter flags get their own tone: they are explicit human intent, visually
// distinct from warnings so they read as "the reporter said so" markers.
export type StepTone = "error" | "warn" | "neutral" | "flag";

export function toneFor(step: TimelineStep): StepTone {
  if (step.kind === "console" && step.level === "error") return "error";
  if (step.kind === "net") {
    return severityOfStatus(step.status ?? 0) === "critical"
      ? "error"
      : "warn";
  }
  if (step.kind === "console") return "warn";
  if (step.kind === "flag") return "flag";
  return "neutral";
}

// Level dot: navigation / user action / network / warning / failure / flag.
export type DotTone = "nav" | StepTone;

export function dotFor(step: TimelineStep): DotTone {
  if (step.kind === "nav") return "nav";
  const tone = toneFor(step);
  if (tone === "error") return "error";
  if (tone === "warn") return "warn";
  if (tone === "flag") return "flag";
  return "neutral";
}

export const dotClass = {
  nav: "bg-success",
  neutral: "bg-border-strong",
  warn: "bg-warn",
  error: "bg-destructive ring-2 ring-destructive/15",
  flag: "bg-info ring-2 ring-info/25",
} as const;

export type FilterMode = "all" | "errors" | "network" | "user" | "console";

export const filterLabels: Record<FilterMode, string> = {
  all: "All",
  errors: "Errors",
  network: "Network",
  user: "User",
  console: "Console",
};

export const filterModes = Object.keys(filterLabels) as FilterMode[];

export const GROUP_GAP = 2000;

// Compress repetitive interaction runs (consecutive identical clicks, typed
// inputs, Enter presses, form submits, or same-control hovers within
// GROUP_GAP) into one expandable row. Navigation, console, network, flag and
// viewport steps are landmarks and never group — they are the coordinates a
// reviewer navigates by. Presentation-only: buildTimeline() and the report
// markdown are untouched.
export type GroupRow = {
  kind: "group";
  steps: TimelineStep[];
  start: number;
  end: number;
};
export type Row = TimelineStep | GroupRow;

// What counts as a compressible interaction run.
const GROUPED_KINDS = new Set(["click", "input", "key", "submit", "hover"]);

export function buildRows(steps: TimelineStep[]): Row[] {
  const rows: Row[] = [];
  for (const step of steps) {
    const prev = rows.at(-1);
    if (prev && prev.kind === "group") {
      const lastStep = prev.steps.at(-1);
      if (
        lastStep &&
        step.kind === lastStep.kind &&
        step.text === lastStep.text &&
        step.t - lastStep.t <= GROUP_GAP
      ) {
        prev.steps.push(step);
        prev.end = step.t;
        continue;
      }
    }
    rows.push(
      GROUPED_KINDS.has(step.kind)
        ? { kind: "group", steps: [step], start: step.t, end: step.t }
        : step,
    );
  }
  return rows;
}

export const rowTime = (row: Row) => (row.kind === "group" ? row.end : row.t);

export type RenderItem = {
  key: string;
  row: Row;
  sub?: boolean;
  groupIndex?: number;
  // Index of the owning row in buildRows() output. Sub rows repeat their
  // group's index, so the collapse cap counts rows rather than rendered
  // items — an expanded group can never be sliced down the middle.
  rowIndex: number;
};

// A long session runs to hundreds of rows and the page scrolls the window,
// so an uncapped timeline makes the review tab enormous. Collapsed, we render
// the first COLLAPSED_ROW_LIMIT rows behind a "show more" control. The cap is
// deliberately below a screenful of rows (~56px each) so the collapsed
// timeline stays in the same order of magnitude as the sticky replay column.
export const COLLAPSED_ROW_LIMIT = 25;
// Don't bother collapsing to save a handful of rows — a "Show 2 more" button
// costs more attention than the rows it hides.
export const COLLAPSE_SLACK = 5;

// How much of `items` to render, given the collapse state. Cuts on a row
// boundary: the returned count always ends a whole row (group header plus any
// expanded sub rows), never inside one.
export function visibleCount(
  items: RenderItem[],
  showAll: boolean,
): { count: number; hiddenRows: number } {
  const totalRows = (items.at(-1)?.rowIndex ?? -1) + 1;
  if (showAll || totalRows <= COLLAPSED_ROW_LIMIT + COLLAPSE_SLACK) {
    return { count: items.length, hiddenRows: 0 };
  }
  let count = 0;
  while (count < items.length && items[count]!.rowIndex < COLLAPSED_ROW_LIMIT) {
    count += 1;
  }
  return { count, hiddenRows: totalRows - COLLAPSED_ROW_LIMIT };
}
