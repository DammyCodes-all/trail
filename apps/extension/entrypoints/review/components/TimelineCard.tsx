import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Globe2,
  Keyboard,
  MousePointer2,
  Terminal,
  WifiOff,
} from "lucide-react";

import {
  Tabs,
  TabsList,
  TabsTab,
} from "@/components/animate-ui/components/base/tabs";
import type { TimelineStep } from "@/lib/timeline";
import { formatElapsedTime } from "@/lib/time";
import { cn } from "@/lib/utils";

const iconByKind = {
  nav: Globe2,
  click: MousePointer2,
  input: Keyboard,
  console: Terminal,
  net: WifiOff,
} as const;

function toneFor(step: TimelineStep) {
  if (step.kind === "console" && step.level === "error") return "error";
  if (step.kind === "console" || step.kind === "net") {
    return (step.status ?? 0) >= 500 ? "error" : "warn";
  }
  return "neutral";
}

// Level dot: navigation / user action / network / warning / failure.
function dotFor(step: TimelineStep) {
  if (step.kind === "nav") return "nav";
  const tone = toneFor(step);
  if (tone === "error") return "error";
  if (tone === "warn") return "warn";
  return "neutral";
}

const dotClass = {
  nav: "bg-success",
  neutral: "bg-border-strong",
  warn: "bg-warn",
  error: "bg-destructive ring-2 ring-destructive/15",
} as const;

function TimelineRow({
  step,
  last,
  t0,
  active,
  onSeek,
  liRef,
}: {
  step: TimelineStep;
  last: boolean;
  t0: number;
  active: boolean;
  onSeek: (timestamp: number) => void;
  liRef?: (el: HTMLLIElement | null) => void;
}) {
  const Icon = iconByKind[step.kind];
  const tone = toneFor(step);
  const isNavigation = step.kind === "nav";
  const isFailure = tone !== "neutral";
  const status = step.kind === "net" ? step.status || "ERR" : undefined;

  return (
    <li
      ref={liRef}
      className="relative grid grid-cols-[3.25rem_2.5rem_minmax(0,1fr)] sm:grid-cols-[4rem_2.75rem_minmax(0,1fr)]"
    >
      <span className="pt-3.5 font-mono text-[11px] tabular-nums text-muted-foreground">
        {formatElapsedTime(step.t - t0)}
      </span>
      <span className="relative flex justify-center pt-3">
        {!last ? (
          <span className="absolute bottom-[-0.75rem] top-7 w-px bg-border" aria-hidden="true" />
        ) : null}
        <span
          data-level={dotFor(step)}
          className={cn(
            "relative z-10 mt-1 size-2 rounded-full border-2 border-background",
            active && "size-2.5 bg-primary ring-2 ring-primary/20",
            !active && dotClass[dotFor(step)],
          )}
          aria-hidden="true"
        />
      </span>
      <button
        type="button"
        className={cn(
          "group/step my-1.5 grid min-h-11 w-full cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-3 rounded-sm px-3 py-2.5 text-left outline-none transition-[background-color,border-color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/50 sm:px-4",
          isFailure && "border border-destructive/30 bg-destructive/5 py-3.5 hover:bg-destructive/8",
          !isFailure && active && "bg-accent",
          !isFailure && !active && "hover:bg-muted/70",
        )}
        onClick={() => onSeek(step.t)}
        aria-current={active ? "step" : undefined}
      >
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-sm",
            tone === "error" && "bg-destructive/12 text-destructive",
            tone === "warn" && "bg-warn/12 text-warn",
            tone === "neutral" && isNavigation && "bg-info/10 text-info",
            tone === "neutral" && !isNavigation && "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <span
          className={cn(
            "min-w-0 pt-0.5 text-[13px] leading-relaxed wrap-break-word",
            tone === "error" && "font-medium text-destructive",
            tone === "warn" && "text-warn",
            tone === "neutral" && isNavigation && "font-medium text-foreground",
            tone === "neutral" && !isNavigation && "text-foreground/85",
          )}
        >
          {step.text}
        </span>
        {status ? (
          <span className="pt-0.5 font-mono text-xs font-semibold text-destructive">
            {status}
          </span>
        ) : (
          <span className="w-2" aria-hidden="true" />
        )}
      </button>
    </li>
  );
}

function SubRow({
  step,
  t0,
  active,
  onSeek,
  liRef,
}: {
  step: TimelineStep;
  t0: number;
  active: boolean;
  onSeek: (timestamp: number) => void;
  liRef?: (el: HTMLLIElement | null) => void;
}) {
  const Icon = iconByKind[step.kind];
  return (
    <li
      ref={liRef}
      className="grid grid-cols-[3.25rem_2.5rem_minmax(0,1fr)] sm:grid-cols-[4rem_2.75rem_minmax(0,1fr)]"
    >
      <span className="pt-2.5 pl-8 font-mono text-[11px] tabular-nums text-muted-foreground sm:pl-10">
        {formatElapsedTime(step.t - t0)}
      </span>
      <span className="flex justify-center pt-2">
        <span
          data-level={dotFor(step)}
          className={cn(
            "relative z-10 mt-1 size-1.5 rounded-full border border-background",
            active ? "bg-primary ring-2 ring-primary/20" : dotClass[dotFor(step)],
          )}
          aria-hidden="true"
        />
      </span>
      <button
        type="button"
        className={cn(
          "my-0.5 grid min-h-9 w-full cursor-pointer grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-2 rounded-sm px-3 py-2 text-left outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/50",
          active && "bg-accent",
          !active && "hover:bg-muted/70",
        )}
        onClick={() => onSeek(step.t)}
        aria-current={active ? "step" : undefined}
      >
        <span className="flex size-5 items-center justify-center rounded-sm bg-muted text-muted-foreground">
          <Icon className="size-3" aria-hidden="true" />
        </span>
        <span className="min-w-0 pt-0.5 text-xs leading-relaxed text-foreground/85 wrap-break-word">
          {step.text}
        </span>
        <span className="w-2" aria-hidden="true" />
      </button>
    </li>
  );
}

type FilterMode = "all" | "errors" | "network" | "user" | "console";

const filterLabels: Record<FilterMode, string> = {
  all: "All",
  errors: "Errors",
  network: "Network",
  user: "User",
  console: "Console",
};

const filterModes = Object.keys(filterLabels) as FilterMode[];

const GROUP_GAP = 2000;

// Compress repetitive interaction runs (consecutive identical clicks/inputs
// within GROUP_GAP) into one expandable row. Navigation, console and network
// steps are landmarks and never group. Presentation-only: buildTimeline() and
// the report markdown are untouched.
type GroupRow = { kind: "group"; steps: TimelineStep[]; start: number; end: number };
type Row = TimelineStep | GroupRow;

function buildRows(steps: TimelineStep[]): Row[] {
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

const rowTime = (row: Row) => (row.kind === "group" ? row.end : row.t);

type RenderItem = { key: string; row: Row; sub?: boolean; groupIndex?: number };

export function TimelineCard({
  steps,
  t0,
  replayT0,
  currentTime,
  onSeek,
}: {
  steps: TimelineStep[];
  t0: number;
  replayT0: number;
  currentTime: number;
  onSeek: (timestamp: number) => void;
}) {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const rowEls = useRef<(HTMLLIElement | null)[]>([]);

  const filteredSteps = useMemo(
    () =>
      steps.filter((step) => {
        if (filter === "errors") return toneFor(step) === "error";
        if (filter === "network") return step.kind === "net";
        if (filter === "user") {
          return step.kind === "nav" || step.kind === "click" || step.kind === "input";
        }
        if (filter === "console") return step.kind === "console";
        return true;
      }),
    [steps, filter],
  );

  const rows = useMemo(() => buildRows(filteredSteps), [filteredSteps]);

  const absoluteTime = replayT0 + currentTime;

  // A collapsed group opens itself once the replay reaches its range — unless
  // the user just collapsed it. Collapsing wins over auto-expand for the rest
  // of the pass; leaving the range resets the intent so a fresh pass re-opens.
  const userCollapsed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const due: string[] = [];
    rows.forEach((row, index) => {
      if (row.kind !== "group" || row.steps.length <= 1) return;
      const key = `row-${index}`;
      const inside = absoluteTime >= row.start - 250 && absoluteTime <= row.end + 250;
      if (inside) {
        if (!expanded.has(key) && !userCollapsed.current.has(key)) due.push(key);
      } else {
        userCollapsed.current.delete(key);
      }
    });
    if (due.length) {
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const key of due) next.add(key);
        return next;
      });
    }
  }, [rows, expanded, absoluteTime]);

  // Flat list of what is actually rendered, so grouping, expansion and the
  // active highlight all agree.
  const renderable = useMemo<RenderItem[]>(() => {
    const out: RenderItem[] = [];
    rows.forEach((row, index) => {
      if (row.kind === "group" && row.steps.length > 1) {
        if (expanded.has(`row-${index}`)) {
          for (const step of row.steps) {
            out.push({ key: `${index}-${step.t}`, row: step, sub: true });
          }
        } else {
          out.push({ key: `row-${index}`, row, groupIndex: index });
        }
      } else if (row.kind === "group") {
        // Singleton interaction groups render as a plain step.
        out.push({ key: `row-${index}`, row: row.steps[0] as TimelineStep });
      } else {
        out.push({ key: `row-${index}`, row });
      }
    });
    return out;
  }, [rows, expanded]);

  let activeIndex = -1;
  for (let index = 0; index < renderable.length; index++) {
    const item = renderable[index];
    if (!item) break;
    if (rowTime(item.row) <= absoluteTime + 250) {
      activeIndex = index;
    } else {
      break;
    }
  }

  useEffect(() => {
    const el = rowEls.current[activeIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const toggleGroup = (index: number) => {
    const key = `row-${index}`;
    if (expanded.has(key)) userCollapsed.current.add(key);
    else userCollapsed.current.delete(key);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const attachRef = (index: number) => (el: HTMLLIElement | null) => {
    rowEls.current[index] = el;
  };

  return (
    <section className="min-w-0 border-b border-border py-8 sm:py-10 lg:border-b-0">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Evidence timeline
        </h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            {filteredSteps.length === steps.length
              ? `${steps.length} events`
              : `${filteredSteps.length} of ${steps.length}`}
          </span>
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as FilterMode)}
          >
            <TabsList aria-label="Filter timeline">
              {filterModes.map((mode) => (
                <TabsTab key={mode} value={mode}>
                  {filterLabels[mode]}
                </TabsTab>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>
      {renderable.length ? (
        <ol>
          {renderable.map(({ key, row, sub, groupIndex }, index) => {
            const last = index === renderable.length - 1;
            if (sub) {
              return (
                <SubRow
                  key={key}
                  step={row as TimelineStep}
                  t0={t0}
                  active={index === activeIndex}
                  onSeek={onSeek}
                  liRef={attachRef(index)}
                />
              );
            }
            if (row.kind === "group") {
              const group = row;
              const first = group.steps[0] as TimelineStep;
              const active = index === activeIndex;
              const Icon = iconByKind[first.kind];
              const groupKey = `row-${groupIndex}`;
              return (
                <li
                  key={key}
                  ref={attachRef(index)}
                  className="relative grid grid-cols-[3.25rem_2.5rem_minmax(0,1fr)] sm:grid-cols-[4rem_2.75rem_minmax(0,1fr)]"
                >
                  <span className="pt-3.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {formatElapsedTime(group.start - t0)}
                  </span>
                  <span className="relative flex justify-center pt-3">
                    {!last ? (
                      <span className="absolute bottom-[-0.75rem] top-7 w-px bg-border" aria-hidden="true" />
                    ) : null}
                    <span
                      data-level={dotFor(first)}
                      className={cn(
                        "relative z-10 mt-1 size-2 rounded-full border-2 border-background",
                        active && "size-2.5 bg-primary ring-2 ring-primary/20",
                        !active && dotClass[dotFor(first)],
                      )}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="my-1.5 flex items-stretch">
                    <button
                      type="button"
                      className={cn(
                        "grid min-h-11 min-w-0 flex-1 cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-3 rounded-sm px-3 py-2.5 text-left outline-none transition-[background-color,border-color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/50 sm:px-4",
                        active && "bg-accent",
                        !active && "hover:bg-muted/70",
                      )}
                      onClick={() => {
                        onSeek(group.start);
                        toggleGroup(groupIndex as number);
                      }}
                      aria-current={active ? "step" : undefined}
                      aria-expanded={expanded.has(groupKey)}
                    >
                      <span className="flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground">
                        <Icon className="size-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 pt-0.5 text-[13px] leading-relaxed text-foreground/85 wrap-break-word">
                        {first.text}
                      </span>
                      <span className="rounded-sm bg-muted px-2 py-1 font-mono text-[10px] font-medium text-muted-foreground">
                        {group.steps.length} interactions
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={
                        expanded.has(groupKey)
                          ? "Collapse interactions"
                          : "Expand interactions"
                      }
                      className="flex w-9 shrink-0 cursor-pointer items-center justify-center self-stretch rounded-sm text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                      onClick={() => toggleGroup(groupIndex as number)}
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 transition-transform duration-200 ease-out",
                          expanded.has(groupKey) && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </li>
              );
            }
            return (
              <TimelineRow
                key={key}
                step={row as TimelineStep}
                last={last}
                t0={t0}
                active={index === activeIndex}
                onSeek={onSeek}
                liRef={attachRef(index)}
              />
            );
          })}
        </ol>
      ) : (
        <p className="px-2 py-6 text-sm text-muted-foreground">
          No events match this filter.
        </p>
      )}
    </section>
  );
}
