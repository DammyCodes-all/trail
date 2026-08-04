import { useState } from "react";
import {
  Check,
  ChevronDown,
  Filter,
  Globe2,
  Keyboard,
  MousePointer2,
  Terminal,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function TimelineRow({
  step,
  last,
  t0,
  active,
  onSeek,
}: {
  step: TimelineStep;
  last: boolean;
  t0: number;
  active: boolean;
  onSeek: (timestamp: number) => void;
}) {
  const Icon = iconByKind[step.kind];
  const tone = toneFor(step);
  const isNavigation = step.kind === "nav";
  const isFailure = tone !== "neutral";
  const status = step.kind === "net" ? step.status || "ERR" : undefined;

  return (
    <li className="relative grid grid-cols-[3.25rem_2.5rem_minmax(0,1fr)] sm:grid-cols-[4rem_2.75rem_minmax(0,1fr)]">
      <span className="pt-3.5 font-mono text-[11px] tabular-nums text-muted-foreground">
        {formatElapsedTime(step.t - t0)}
      </span>
      <span className="relative flex justify-center pt-3">
        {!last ? (
          <span className="absolute bottom-[-0.75rem] top-7 w-px bg-border" aria-hidden="true" />
        ) : null}
        <span
          className={cn(
            "relative z-10 mt-1 size-2 rounded-full border-2 border-background",
            active && "size-2.5 bg-primary ring-2 ring-primary/20",
            !active && isFailure && "bg-destructive ring-2 ring-destructive/15",
            !active && !isFailure && "bg-border-strong",
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

type FilterMode = "all" | "actions" | "failures";

const filterLabels: Record<FilterMode, string> = {
  all: "All events",
  actions: "Interactions",
  failures: "Failures",
};

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
  const filteredSteps = steps.filter((step) => {
    if (filter === "actions") {
      return step.kind === "nav" || step.kind === "click" || step.kind === "input";
    }
    if (filter === "failures") {
      return step.kind === "console" || step.kind === "net";
    }
    return true;
  });
  let activeIndex = -1;
  const absoluteTime = replayT0 + currentTime;
  for (let index = 0; index < filteredSteps.length; index++) {
    if ((filteredSteps[index]?.t ?? Number.POSITIVE_INFINITY) <= absoluteTime + 120) {
      activeIndex = index;
    } else {
      break;
    }
  }

  return (
    <section className="min-w-0 border-b border-border py-8 sm:py-10">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Evidence timeline
        </h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            {filteredSteps.length === steps.length
              ? `${steps.length} events`
              : `${filteredSteps.length} of ${steps.length}`}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" className="h-9 rounded-sm px-3">
                  <Filter data-icon="inline-start" aria-hidden="true" />
                  Filter
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </Button>
              }
            />
            <DropdownMenuContent className="min-w-44 rounded-sm">
              {(Object.keys(filterLabels) as FilterMode[]).map((mode) => (
                <DropdownMenuItem key={mode} onClick={() => setFilter(mode)}>
                  <Check
                    className={cn("size-4", filter !== mode && "opacity-0")}
                    aria-hidden="true"
                  />
                  {filterLabels[mode]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {filteredSteps.length ? (
        <ol>
          {filteredSteps.map((step, index) => (
            <TimelineRow
              key={`${step.t}-${step.kind}-${index}`}
              step={step}
              last={index === filteredSteps.length - 1}
              t0={t0}
              active={index === activeIndex}
              onSeek={onSeek}
            />
          ))}
        </ol>
      ) : (
        <p className="px-2 py-6 text-sm text-muted-foreground">
          No events match this filter.
        </p>
      )}
    </section>
  );
}
