import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TrailCounts } from "@/lib/types";
import {
  Keyboard,
  MousePointerClick,
  Square,
  TriangleAlert,
  WifiOff,
} from "lucide-react";

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="gap-1">
          <MousePointerClick aria-hidden="true" />
          clicks {counts.click}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Keyboard aria-hidden="true" />
          inputs {counts.input}
        </Badge>
        <Badge variant="destructive" className="gap-1">
          <TriangleAlert aria-hidden="true" />
          errors {counts.console}
        </Badge>
        <Badge className="gap-1 border-transparent bg-primary/10 text-primary">
          <WifiOff aria-hidden="true" />
          failures {counts.net}
        </Badge>
      </div>
      <p className="text-body-sm text-muted-foreground">
        Reproduce the bug. Every click, error, and failed request is being
        captured.
      </p>
      <Button
        variant="destructive"
        className="h-9"
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
