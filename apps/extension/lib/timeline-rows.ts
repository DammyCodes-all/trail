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

// Compress repetitive interaction runs (consecutive identical clicks/inputs
// within GROUP_GAP) into one expandable row. Navigation, console and network
// steps are landmarks and never group. Presentation-only: buildTimeline() and
// the report markdown are untouched.
export type GroupRow = {
  kind: "group";
  steps: TimelineStep[];
  start: number;
  end: number;
};
export type Row = TimelineStep | GroupRow;

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
      step.kind === "click" || step.kind === "input"
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
};
