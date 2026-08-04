import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TimelineStep } from "@/lib/timeline";

const fmtTime = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};

function TimelineRow({ step, t0 }: { step: TimelineStep; t0: number }) {
  const textClass =
    step.kind === "console"
      ? "text-destructive"
      : step.kind === "net"
        ? "text-primary"
        : step.kind === "nav"
          ? "font-medium text-foreground/70"
          : "text-foreground/85";
  const prefix =
    step.kind === "click" ? (
      <span className="text-primary" aria-hidden="true">
        ▸
      </span>
    ) : step.kind === "input" ? (
      <span className="text-muted-foreground" aria-hidden="true">
        ✎
      </span>
    ) : null;
  return (
    <li className="flex items-baseline gap-2 py-2">
      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
        {fmtTime(step.t - t0)}
      </span>
      {prefix}
      <span
        className={`min-w-0 text-[13px] leading-relaxed wrap-break-word ${textClass}`}
      >
        {step.text}
      </span>
    </li>
  );
}

// Chronological step list. Times are elapsed from `t0` (the first step), so the
// list always starts at 00:00 — see review/App.tsx.
export function TimelineCard({
  steps,
  t0,
}: {
  steps: TimelineStep[];
  t0: number;
}) {
  return (
    <Card className="flex max-h-160 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Timeline
        </h2>
        <Badge
          variant="ghost"
          className="font-mono text-[11px] text-muted-foreground"
        >
          {steps.length} events
        </Badge>
      </div>
      <ol className="flex-1 divide-y divide-border overflow-y-auto px-4 py-1">
        {steps.map((s, i) => (
          <TimelineRow key={i} step={s} t0={t0} />
        ))}
      </ol>
      {steps.length === 0 && (
        <p className="p-4 text-body-sm text-muted-foreground">
          No events captured.
        </p>
      )}
    </Card>
  );
}
