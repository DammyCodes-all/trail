import type { eventWithTime } from "@rrweb/types";
import { Card } from "@/components/ui/card";
import { ReplayPlayer } from "../ReplayPlayer";

export function ReplayCard({ events }: { events: eventWithTime[] }) {
  return (
    <Card className="min-h-120 overflow-hidden">
      {events.length ? (
        <ReplayPlayer events={events} />
      ) : (
        <div className="flex h-full min-h-120 flex-col items-center justify-center gap-2 p-8 text-center">
          <h4 className="font-heading text-h4 font-medium">
            No replay frames captured
          </h4>
          <p className="max-w-xs text-body-sm text-muted-foreground">
            The session has clicks, console and network events — but no rrweb
            frames made it into this report.
          </p>
        </div>
      )}
    </Card>
  );
}
