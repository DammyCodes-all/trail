import { useState } from "react";
import {
  ChevronDown,
  CircleCheck,
  Network,
  Terminal,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ConsoleEvent, NetEvent, StoredEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fmtTime } from "./TimelineCard";

function SectionHeader({
  icon: Icon,
  title,
  count,
  open,
  tone,
}: {
  icon: typeof Terminal;
  title: string;
  count: number;
  open: boolean;
  tone: "error" | "warn";
}) {
  return (
    <CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 px-2 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
      <Icon
        className={cn(
          "size-3.5",
          tone === "error" ? "text-destructive" : "text-warn",
        )}
        aria-hidden="true"
      />
      <span className="text-xs font-semibold text-foreground">{title}</span>
      <span
        className={cn(
          "ml-1 rounded-full px-1.5 py-0.5 font-mono text-[10px]",
          tone === "error"
            ? "bg-destructive/10 text-destructive"
            : "bg-warn/10 text-warn",
        )}
      >
        {count}
      </span>
      <ChevronDown
        className={cn(
          "ml-auto size-3.5 text-muted-foreground transition-transform duration-200 ease-out",
          !open && "-rotate-90",
        )}
        aria-hidden="true"
      />
    </CollapsibleTrigger>
  );
}

function ConsoleRow({
  event,
  t0,
  onSeek,
}: {
  event: ConsoleEvent;
  t0: number;
  onSeek: (timestamp: number) => void;
}) {
  return (
    <button
      type="button"
      className="grid w-full cursor-pointer grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-t border-border/70 px-2 py-3 text-left outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={() => onSeek(event.t)}
    >
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {fmtTime(event.t - t0)}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[13px] font-medium leading-relaxed wrap-break-word",
            event.lv === "error" ? "text-destructive" : "text-warn",
          )}
        >
          {event.msg || `Console ${event.lv}`}
        </span>
        {event.stack && (
          <code className="mt-1.5 block max-h-24 overflow-hidden whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-muted-foreground">
            {event.stack}
          </code>
        )}
      </span>
    </button>
  );
}

function NetworkRow({
  event,
  t0,
  onSeek,
}: {
  event: NetEvent;
  t0: number;
  onSeek: (timestamp: number) => void;
}) {
  const critical = event.status === 0 || event.status >= 500;
  return (
    <button
      type="button"
      className="grid w-full cursor-pointer grid-cols-[3.5rem_3.25rem_minmax(0,1fr)_2.5rem] gap-2 border-t border-border/70 px-2 py-3 text-left outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={() => onSeek(event.t)}
    >
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {fmtTime(event.t - t0)}
      </span>
      <span className="font-mono text-[10px] font-medium text-foreground">
        {event.method}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-mono text-[11px] text-foreground" title={event.target}>
          {event.target}
        </span>
        {(event.err || event.body) && (
          <span className="mt-1 block max-h-20 overflow-hidden whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-muted-foreground">
            {event.err || event.body}
          </span>
        )}
      </span>
      <span
        className={cn(
          "justify-self-end rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
          critical
            ? "bg-destructive/10 text-destructive"
            : "bg-warn/10 text-warn",
        )}
      >
        {event.status || "ERR"}
      </span>
    </button>
  );
}

export function EvidencePanel({
  events,
  t0,
  onSeek,
}: {
  events: StoredEvent[];
  t0: number;
  onSeek: (timestamp: number) => void;
}) {
  const consoles = events.filter((event): event is StoredEvent & ConsoleEvent => event.k === "console");
  const requests = events.filter((event): event is StoredEvent & NetEvent => event.k === "net");
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [networkOpen, setNetworkOpen] = useState(true);

  return (
    <section className="mt-6 border-t border-border pt-4">
      <div className="mb-2 flex items-center justify-between px-2">
        <h2 className="text-xs font-semibold text-foreground">Runtime evidence</h2>
        <span className="font-mono text-[10px] uppercase text-muted-foreground">
          {consoles.length + requests.length} findings
        </span>
      </div>

      {!consoles.length && !requests.length ? (
        <div className="flex items-center gap-2 px-2 py-5 text-sm text-muted-foreground">
          <CircleCheck className="size-4 text-success" aria-hidden="true" />
          No console or network failures captured.
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card/50">
          {consoles.length > 0 && (
            <Collapsible open={consoleOpen} onOpenChange={setConsoleOpen}>
              <SectionHeader
                icon={Terminal}
                title="Console"
                count={consoles.length}
                open={consoleOpen}
                tone="error"
              />
              <CollapsibleContent>
                {consoles.map((event) => (
                  <ConsoleRow key={event.seq} event={event} t0={t0} onSeek={onSeek} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
          {requests.length > 0 && (
            <Collapsible open={networkOpen} onOpenChange={setNetworkOpen}>
              <SectionHeader
                icon={Network}
                title="Failed requests"
                count={requests.length}
                open={networkOpen}
                tone="warn"
              />
              <CollapsibleContent>
                {requests.map((event) => (
                  <NetworkRow key={event.seq} event={event} t0={t0} onSeek={onSeek} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </section>
  );
}
