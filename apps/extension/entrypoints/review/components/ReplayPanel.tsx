import { forwardRef } from "react";
import type { eventWithTime } from "@rrweb/types";
import { Clapperboard, Monitor, Puzzle, Radio } from "lucide-react";

import type { ReportFacts } from "@/lib/facts";
import {
  ReplayPlayer,
  type ReplayPlayerHandle,
} from "../ReplayPlayer";

function EnvironmentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-2 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-mono text-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}

export const ReplayPanel = forwardRef<
  ReplayPlayerHandle,
  {
    events: eventWithTime[];
    facts: ReportFacts;
    onCurrentTimeChange: (timeOffset: number) => void;
  }
>(function ReplayPanel({ events, facts, onCurrentTimeChange }, ref) {
  return (
    <aside className="min-w-0 lg:sticky lg:top-5 lg:self-start">
      <section className="overflow-hidden rounded-lg border border-border-strong bg-card">
        <header className="flex h-11 items-center justify-between border-b border-border px-3.5">
          <div className="flex items-center gap-2">
            <Clapperboard className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xs font-semibold text-foreground">Session replay</h2>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-muted-foreground">
            <Radio className="size-3 text-primary" aria-hidden="true" />
            Supporting evidence
          </span>
        </header>
        {events.length ? (
          <ReplayPlayer
            ref={ref}
            events={events}
            onCurrentTimeChange={onCurrentTimeChange}
          />
        ) : (
          <div className="grid min-h-64 place-items-center px-8 text-center">
            <div>
              <h3 className="font-heading text-base font-medium">No replay frames captured</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Runtime evidence is still available in the investigation.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-4 border-t border-border pt-3">
        <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase text-muted-foreground">
          <Monitor className="size-3.5" aria-hidden="true" />
          Environment
        </div>
        <dl className="divide-y divide-border/70">
          <EnvironmentRow label="Browser" value={facts.browser} />
          <EnvironmentRow label="OS" value={facts.os} />
          <EnvironmentRow label="URL" value={facts.url || "Unknown"} />
          <EnvironmentRow label="Trail" value={`v${facts.extensionVersion}`} />
        </dl>
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Puzzle className="size-3" aria-hidden="true" />
          Captured by the browser extension, without an app SDK.
        </p>
      </section>
    </aside>
  );
});
