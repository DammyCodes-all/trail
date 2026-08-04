import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TrailCounts } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Keyboard,
  MousePointerClick,
  Square,
  TriangleAlert,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

const tickSpring = { type: "spring", bounce: 0.35, duration: 0.4 } as const;

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent: "neutral" | "warn" | "destructive";
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "flex flex-row items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1",
        accent === "neutral" && "bg-card",
        accent === "warn" && "bg-warn/5 ring-warn/15",
        accent === "destructive" && "bg-destructive/5 ring-destructive/15"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          accent === "neutral" && "bg-muted text-muted-foreground",
          accent === "warn" && "bg-warn/15 text-warn",
          accent === "destructive" && "bg-destructive/15 text-destructive"
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            className="font-mono text-lg font-medium leading-none text-foreground tabular-nums"
            initial={{ opacity: 0, scale: 0.6, y: -2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: 2 }}
            transition={tickSpring}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
    </Card>
  );
}

export function RecordingScreen({
  counts,
  busy,
  onStop,
}: {
  counts: TrailCounts;
  busy: boolean;
  onStop: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={MousePointerClick} label="clicks" value={counts.click} accent="neutral" />
        <Stat icon={Keyboard} label="inputs" value={counts.input} accent="neutral" />
        <Stat icon={TriangleAlert} label="errors" value={counts.console} accent="destructive" />
        <Stat icon={WifiOff} label="failures" value={counts.net} accent="warn" />
      </div>
      <p className="text-body-sm text-muted-foreground">
        Reproduce the bug. Every click, error, and failed request is being
        captured.
      </p>
      <div className="flex-1" />
      <Button
        variant="destructive"
        className="h-9 shrink-0"
        id="stop"
        onClick={onStop}
        disabled={busy}
      >
        <Square data-icon="inline-start" aria-hidden="true" />
        Stop &amp; Review
      </Button>
    </div>
  );
}
