import { Badge } from "@/components/ui/badge";
import { TrailLogo } from "@/components/ui/trail-logo";
import type { TrailCounts } from "@/lib/types";
import { MousePointerClick, TriangleAlert, WifiOff } from "lucide-react";

export function ReviewHeader({
  title,
  onTitleChange,
  onTitleBlur,
  counts,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
  counts: TrailCounts;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <TrailLogo
          className="mt-0.5 size-10 shrink-0"
          width={40}
          height={40}
          aria-label="TRAIL logo"
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="font-heading text-xs font-semibold tracking-[0.18em] text-muted-foreground">
            TRAIL
          </span>
          <input
            className="w-full max-w-140 rounded-md border border-transparent bg-transparent p-1 font-heading text-xl font-medium text-foreground outline-none transition-colors hover:border-border focus:border-border focus:bg-background"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={onTitleBlur}
            placeholder="Bug report title"
            spellCheck={false}
            aria-label="Report title"
          />
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Badge variant="outline" className="gap-1">
          <MousePointerClick aria-hidden="true" />
          {counts.click}
        </Badge>
        <Badge variant="destructive" className="gap-1">
          <TriangleAlert aria-hidden="true" />
          {counts.console}
        </Badge>
        <Badge className="gap-1 border-transparent bg-primary/10 text-primary">
          <WifiOff aria-hidden="true" />
          {counts.net}
        </Badge>
      </div>
    </header>
  );
}
