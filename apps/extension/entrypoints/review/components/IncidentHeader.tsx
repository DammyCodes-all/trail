import {
  AlertTriangle,
  Clock3,
  Globe2,
  ListChecks,
  MousePointer2,
  Terminal,
  Wifi,
} from "lucide-react";

import { TrailLogo } from "@/components/ui/trail-logo";
import type { ReportFacts } from "@/lib/facts";
import { formatDuration } from "@/lib/facts";
import type { TrailCounts } from "@/lib/types";
import { cn } from "@/lib/utils";

const severityStyles = {
  high: "border-destructive/35 bg-destructive-soft text-destructive",
  medium: "border-warn/35 bg-warn-soft text-warn",
  low: "border-border bg-muted text-muted-foreground",
} as const;

const severityLabels = {
  high: "High severity",
  medium: "Needs review",
  low: "Low severity",
} as const;

function Fact({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Clock3;
  label: string;
  value: string | number;
  tone?: "neutral" | "error" | "warn";
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon
        className={cn(
          "size-3.5 shrink-0",
          tone === "error" && "text-destructive",
          tone === "warn" && "text-warn",
          tone === "neutral" && "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <span className="truncate text-[12px] text-muted-foreground">
        <strong className="font-mono font-medium tabular-nums text-foreground">
          {value}
        </strong>{" "}
        {label}
      </span>
    </div>
  );
}

export function IncidentHeader({
  title,
  onTitleChange,
  onTitleBlur,
  facts,
  counts,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
  facts: ReportFacts;
  counts: TrailCounts;
}) {
  return (
    <header className="border-b border-border pb-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <TrailLogo
            className="size-7 shrink-0 text-primary"
            width={28}
            height={28}
            aria-label="TRAIL logo"
          />
          <span className="font-heading text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
            TRAIL <span className="text-border-strong">/</span> INCIDENT REVIEW
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Evidence collected
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-semibold",
              severityStyles[facts.severity],
            )}
          >
            <span className="mr-1.5 size-1.5 rounded-full bg-current" aria-hidden="true" />
            {severityLabels[facts.severity]}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {facts.host}
          </span>
        </div>
        <textarea
          rows={1}
          className="-ml-1 min-h-10 w-full max-w-4xl resize-none overflow-hidden rounded-md border border-transparent bg-transparent px-1 py-0.5 font-heading text-[2rem] font-semibold leading-[1.08] tracking-normal text-foreground outline-none transition-[background-color,border-color] duration-150 [field-sizing:content] placeholder:text-muted-foreground/60 hover:border-border focus:border-border focus:bg-card"
          value={title}
          onChange={(event) => onTitleChange(event.target.value.replace(/\n/g, " "))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          onBlur={onTitleBlur}
          placeholder="What happened?"
          spellCheck={false}
          aria-label="Report title"
        />
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Trail captured the sequence, page context, and runtime failures needed to investigate this incident.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5 border-t border-border/70 pt-4">
        <Fact icon={Clock3} label="duration" value={formatDuration(facts.durationMs)} />
        <Fact icon={ListChecks} label="evidence events" value={facts.eventCount} />
        <Fact
          icon={Terminal}
          label="console errors"
          value={facts.consoleErrors}
          tone={facts.consoleErrors ? "error" : "neutral"}
        />
        <Fact
          icon={Wifi}
          label="failed requests"
          value={counts.net}
          tone={counts.net ? "warn" : "neutral"}
        />
        <Fact icon={MousePointer2} label="interactions" value={counts.click + counts.input} />
        <Fact icon={Globe2} label="page" value={facts.host} />
        {facts.severity === "high" && (
          <Fact icon={AlertTriangle} label="triage" value="immediate" tone="error" />
        )}
      </div>
    </header>
  );
}
