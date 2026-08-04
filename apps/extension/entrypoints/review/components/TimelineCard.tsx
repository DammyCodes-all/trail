import {
  AlertCircle,
  ChevronRight,
  CircleDot,
  Globe2,
  Keyboard,
  MousePointer2,
  Terminal,
  WifiOff,
} from "lucide-react";

import type { TimelineStep } from "@/lib/timeline";
import { cn } from "@/lib/utils";

export const fmtTime = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
};

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
  index,
  t0,
  active,
  onSeek,
}: {
  step: TimelineStep;
  index: number;
  t0: number;
  active: boolean;
  onSeek: (timestamp: number) => void;
}) {
  const Icon = iconByKind[step.kind];
  const tone = toneFor(step);
  const isNavigation = step.kind === "nav";

  return (
    <li className={cn(isNavigation && index > 0 && "mt-2 border-t border-border pt-2")}>
      <button
        type="button"
        className={cn(
          "group/step grid w-full cursor-pointer grid-cols-[3.5rem_1.5rem_minmax(0,1fr)_1rem] items-start gap-2 rounded-md px-2 py-2.5 text-left outline-none transition-[background-color,color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/50",
          active ? "bg-accent" : "hover:bg-muted/70",
        )}
        onClick={() => onSeek(step.t)}
        aria-current={active ? "step" : undefined}
      >
        <span className="pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
          {fmtTime(step.t - t0)}
        </span>
        <span
          className={cn(
            "mt-px flex size-5 items-center justify-center rounded",
            tone === "error" && "bg-destructive/12 text-destructive",
            tone === "warn" && "bg-warn/12 text-warn",
            tone === "neutral" && isNavigation && "bg-info/10 text-info",
            tone === "neutral" && !isNavigation && "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-3" aria-hidden="true" />
        </span>
        <span
          className={cn(
            "min-w-0 text-[13px] leading-relaxed wrap-break-word",
            tone === "error" && "font-medium text-destructive",
            tone === "warn" && "text-warn",
            tone === "neutral" && isNavigation && "font-medium text-foreground",
            tone === "neutral" && !isNavigation && "text-foreground/85",
          )}
        >
          {step.text}
        </span>
        <ChevronRight
          className="mt-1 size-3.5 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/step:opacity-100 group-focus-visible/step:opacity-100"
          aria-hidden="true"
        />
      </button>
    </li>
  );
}

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
  let activeIndex = -1;
  const absoluteTime = replayT0 + currentTime;
  for (let index = 0; index < steps.length; index++) {
    if ((steps[index]?.t ?? Number.POSITIVE_INFINITY) <= absoluteTime + 120) {
      activeIndex = index;
    } else {
      break;
    }
  }

  return (
    <section className="min-w-0 border-t border-border pt-4">
      <header className="mb-2 flex items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-2">
          <CircleDot className="size-3.5 text-primary" aria-hidden="true" />
          <h2 className="text-xs font-semibold text-foreground">Evidence trail</h2>
        </div>
        <span className="font-mono text-[10px] uppercase text-muted-foreground">
          {steps.length} events
        </span>
      </header>
      {steps.length ? (
        <ol className="pr-1 lg:max-h-[38rem] lg:overflow-y-auto">
          {steps.map((step, index) => (
            <TimelineRow
              key={`${step.t}-${step.kind}-${index}`}
              step={step}
              index={index}
              t0={t0}
              active={index === activeIndex}
              onSeek={onSeek}
            />
          ))}
        </ol>
      ) : (
        <p className="px-2 py-6 text-sm text-muted-foreground">
          No report-worthy events were captured.
        </p>
      )}
    </section>
  );
}
