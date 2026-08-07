import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  Globe2,
  Keyboard,
  MousePointer2,
  Terminal,
  WifiOff,
} from "lucide-react";

import type { TimelineStep } from "@/lib/timeline";
import { formatElapsedTime } from "@/lib/time";
import {
  dotClass,
  dotFor,
  toneFor,
  type GroupRow,
} from "@/lib/timeline-rows";
import { cn } from "@/lib/utils";

export const iconByKind = {
  nav: Globe2,
  click: MousePointer2,
  input: Keyboard,
  console: Terminal,
  net: WifiOff,
} as const;

// Long entries (network failures, console errors) clamp to two lines so the
// timeline stays scannable; the row's chevron reveals the full text. Overflow
// is measured while the clamp is applied — scrollHeight includes the lines it
// hides — and the row keeps the control sticky once detected so it never
// vanishes while the entry is open.
function ClampedText({
  text,
  clamped,
  className,
  onOverflow,
}: {
  text: string;
  clamped: boolean;
  className?: string;
  onOverflow: (overflowing: boolean) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => onOverflow(el.scrollHeight - el.clientHeight > 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, onOverflow]);

  return (
    <span
      ref={ref}
      className={cn("wrap-break-word", clamped && "line-clamp-2", className)}
    >
      {text}
    </span>
  );
}

export function TimelineRow({
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
  const [long, setLong] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleOverflow = useCallback(
    (overflowing: boolean) => setLong((prev) => prev || overflowing),
    [],
  );

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
      <div
        className={cn(
          "my-1.5 flex items-stretch rounded-sm transition-[background-color,border-color] duration-150 ease-out focus-within:ring-2 focus-within:ring-ring/50",
          isFailure && "border border-destructive/30 bg-destructive/5 hover:bg-destructive/8",
          !isFailure && active && "bg-accent",
          !isFailure && !active && "hover:bg-muted/70",
        )}
      >
        <button
          type="button"
          className={cn(
            "grid min-h-11 min-w-0 flex-1 cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-3 px-3 text-left outline-none sm:px-4",
            isFailure ? "py-3.5" : "py-2.5",
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
          <ClampedText
            text={step.text}
            clamped={!expanded}
            onOverflow={handleOverflow}
            className={cn(
              "min-w-0 pt-0.5 text-[13px] leading-relaxed",
              tone === "error" && "font-medium text-destructive",
              tone === "warn" && "text-warn",
              tone === "neutral" && isNavigation && "font-medium text-foreground",
              tone === "neutral" && !isNavigation && "text-foreground/85",
            )}
          />
          {status ? (
            <span className="pt-0.5 font-mono text-xs font-semibold text-destructive">
              {status}
            </span>
          ) : (
            <span className="w-2" aria-hidden="true" />
          )}
        </button>
        {long ? (
          <button
            type="button"
            aria-label={expanded ? "Show less" : "Show full entry"}
            aria-expanded={expanded}
            className="mt-2.5 mr-2 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors duration-150 hover:bg-foreground/10 hover:text-foreground focus-visible:bg-foreground/10 focus-visible:outline-none"
            onClick={() => setExpanded((value) => !value)}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200 ease-out",
                expanded && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function GroupRow({
  group,
  last,
  t0,
  active,
  expanded,
  onSeek,
  onToggle,
  liRef,
}: {
  group: GroupRow;
  last: boolean;
  t0: number;
  active: boolean;
  expanded: boolean;
  onSeek: (timestamp: number) => void;
  onToggle: () => void;
  liRef?: (el: HTMLLIElement | null) => void;
}) {
  const first = group.steps[0] as TimelineStep;
  const Icon = iconByKind[first.kind];

  return (
    <li
      ref={liRef}
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
      <div
        className={cn(
          "my-1.5 flex items-stretch rounded-sm transition-[background-color,border-color] duration-150 ease-out focus-within:ring-2 focus-within:ring-ring/50",
          active && "bg-accent",
          !active && "hover:bg-muted/70",
        )}
      >
        <button
          type="button"
          className="grid min-h-11 min-w-0 flex-1 cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-3 px-3 py-2.5 text-left outline-none sm:px-4"
          onClick={() => {
            onSeek(group.start);
            onToggle();
          }}
          aria-current={active ? "step" : undefined}
          aria-expanded={expanded}
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
          aria-label={expanded ? "Collapse interactions" : "Expand interactions"}
          className="flex w-9 shrink-0 cursor-pointer items-center justify-center self-stretch rounded-sm text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted focus-visible:outline-none"
          onClick={onToggle}
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200 ease-out",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </div>
    </li>
  );
}

export function SubRow({
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
