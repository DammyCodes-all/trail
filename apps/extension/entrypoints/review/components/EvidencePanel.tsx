import { useState } from "react";
import {
  Braces,
  ChevronRight,
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
import { formatElapsedTime } from "@/lib/time";
import { cn } from "@/lib/utils";

function SectionHeader({
  icon: Icon,
  title,
  count,
  open,
  tone,
}: {
  icon: typeof Terminal;
  title: string;
  count?: number;
  open: boolean;
  tone: "error" | "warn" | "neutral";
}) {
  return (
    <CollapsibleTrigger className="group flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50">
      <Icon
        className={cn(
          "size-4",
          tone === "error" ? "text-destructive" : "text-warn",
          tone === "neutral" && "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {typeof count === "number" ? (
        <span className="ml-auto rounded-sm bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
          {count}
        </span>
      ) : null}
      <ChevronRight
        className={cn(
          "size-4 text-muted-foreground transition-transform duration-200 ease-out",
          open && "rotate-90",
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
        {formatElapsedTime(event.t - t0)}
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
        {formatElapsedTime(event.t - t0)}
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
  const rrwebCount = events.filter((event) => event.k === "rrweb").length;
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [domOpen, setDomOpen] = useState(false);

  return (
    <section className="border-b border-border py-8 sm:py-10">
      <div className="overflow-hidden rounded-sm border border-border bg-card/40">
        <Collapsible open={networkOpen} onOpenChange={setNetworkOpen}>
          <SectionHeader
            icon={Network}
            title="Network"
            count={requests.length}
            open={networkOpen}
            tone="warn"
          />
          <CollapsibleContent>
            {requests.length ? (
              requests.map((event) => (
                <NetworkRow key={event.seq} event={event} t0={t0} onSeek={onSeek} />
              ))
            ) : (
              <div className="flex items-center gap-2 border-t border-border px-4 py-4 text-sm text-muted-foreground">
                <CircleCheck className="size-4 text-success" aria-hidden="true" />
                No network failures captured.
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        <Collapsible open={consoleOpen} onOpenChange={setConsoleOpen}>
          <SectionHeader
            icon={Terminal}
            title="Console"
            count={consoles.length}
            open={consoleOpen}
            tone="error"
          />
          <CollapsibleContent>
            {consoles.length ? (
              consoles.map((event) => (
                <ConsoleRow key={event.seq} event={event} t0={t0} onSeek={onSeek} />
              ))
            ) : (
              <div className="flex items-center gap-2 border-t border-border px-4 py-4 text-sm text-muted-foreground">
                <CircleCheck className="size-4 text-success" aria-hidden="true" />
                No console errors captured.
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        <Collapsible open={domOpen} onOpenChange={setDomOpen}>
          <SectionHeader
            icon={Braces}
            title="DOM snapshot"
            open={domOpen}
            tone="neutral"
          />
          <CollapsibleContent>
            <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground">
              {rrwebCount
                ? `${rrwebCount} rrweb frames include the captured DOM snapshots used by the replay.`
                : "No DOM snapshot frames were captured."}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
}
