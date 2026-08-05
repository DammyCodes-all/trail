import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Network,
  Terminal,
} from "lucide-react";

import {
  Tabs,
  TabsHighlight,
  TabsHighlightItem,
  TabsList,
  TabsPanel,
  TabsPanels,
  TabsTab,
} from "@/components/animate-ui/primitives/base/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { prettyBody } from "@/lib/pretty";
import type { ConsoleEvent, NetEvent, StoredEvent } from "@/lib/types";
import { formatElapsedTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { highlightCode } from "../lib/highlight";

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
  tone: "error" | "warn";
}) {
  return (
    <CollapsibleTrigger className="group flex min-h-12 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none transition-colors duration-150 hover:bg-muted/50 active:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/50">
      <Icon
        className={cn("size-4", tone === "error" ? "text-destructive" : "text-warn")}
        aria-hidden="true"
      />
      <span className="font-heading text-sm font-semibold text-foreground">
        {title}
      </span>
      {typeof count === "number" ? (
        <span
          className={cn(
            "ml-auto rounded-sm px-2 py-1 font-mono text-[10px] font-medium tabular-nums",
            tone === "error"
              ? "bg-destructive-soft text-destructive"
              : "bg-warn-soft text-warn",
          )}
        >
          {count}
        </span>
      ) : null}
      <ChevronRight
        className={cn(
          "size-4 text-muted-foreground transition-transform duration-150 ease-out",
          open && "rotate-90",
        )}
        aria-hidden="true"
      />
    </CollapsibleTrigger>
  );
}

function DetailsToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-details-toggle="true"
      aria-expanded={expanded}
      aria-label={expanded ? "Hide details" : "Show details"}
      className="flex w-9 shrink-0 cursor-pointer items-center justify-center self-stretch rounded-sm text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted/60 hover:text-foreground active:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
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
  );
}

function DetailTabs({
  tabs,
  children,
}: {
  tabs: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState(tabs[0]?.id ?? "");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsHighlight
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-none bg-foreground"
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
      >
        <TabsList className="flex w-full border-b border-border/70 px-4">
          {tabs.map((t) => (
            <TabsHighlightItem key={t.id} value={t.id} className="flex-1">
              <TabsTab
                value={t.id}
                className="w-full cursor-pointer px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-[selected]:text-foreground"
              >
                {t.label}
              </TabsTab>
            </TabsHighlightItem>
          ))}
        </TabsList>
      </TabsHighlight>
      {children}
    </Tabs>
  );
}

function HeaderTable({
  title,
  headers,
}: {
  title: string;
  headers: Record<string, string>;
}) {
  const entries = Object.entries(headers);
  if (!entries.length) return null;
  return (
    <div>
      <h4 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {title}
      </h4>
      <dl className="divide-y divide-border/60 overflow-hidden rounded-sm border border-border bg-background/50">
        {entries.map(([name, value]) => (
          <div
            key={name}
            className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-x-4 px-3 py-2"
          >
            <dt className="wrap-break-word py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
              {name}
            </dt>
            <dd
              className={cn(
                "wrap-break-word py-0.5 font-mono text-[11px]",
                value === "[redacted]" ? "text-warn" : "text-muted-foreground",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function BodyBlock({ title, body }: { title: string; body: string }) {
  // Pretty-print JSON/urlencoded bodies, then highlight. Memoized per body so
  // toggling tabs never re-runs the tokenizer.
  const html = useMemo(() => {
    const { text, lang } = prettyBody(body);
    return highlightCode(text, lang);
  }, [body]);
  return (
    <div>
      <h4 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {title}
      </h4>
      <pre className="wrap-break-word whitespace-pre-wrap rounded-sm border border-border bg-background/50 px-3 py-2.5 font-mono text-[11px] leading-relaxed">
        <code className="text-foreground" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

// Detail panels scroll inside a capped height so a long body or header list
// never stretches the row (the tab strip stays pinned above it).
function ScrollPane({ children }: { children: React.ReactNode }) {
  return <div className="max-h-80 overflow-y-auto px-4 py-4">{children}</div>;
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
  const [expanded, setExpanded] = useState(false);
  return (
    <div data-console-row="true">
      <div className="flex items-stretch">
        <button
          type="button"
          className="grid min-h-11 min-w-0 flex-1 cursor-pointer grid-cols-[3rem_minmax(0,1fr)] items-start gap-3 px-4 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-muted/40 active:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={() => onSeek(event.t)}
        >
          <span className="pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground/70">
            {formatElapsedTime(event.t - t0)}
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                "wrap-break-word block font-mono text-[11px] font-medium leading-relaxed line-clamp-2",
                event.lv === "error" ? "text-destructive" : "text-warn",
              )}
            >
              {event.msg || `Console ${event.lv}`}
            </span>
            {!expanded && event.stack && (
              <span className="mt-1 block font-mono text-[10px] text-subtle-foreground">
                Stack trace
              </span>
            )}
          </span>
        </button>
        <DetailsToggle expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      </div>
      {expanded && (
        <div className="border-t border-border/60">
          {event.stack ? (
            <DetailTabs
              tabs={[
                { id: "message", label: "Message" },
                { id: "stack", label: "Stack trace" },
              ]}
            >
              <TabsPanels>
                <TabsPanel value="message" keepMounted>
                  <ScrollPane>
                    <BodyBlock title="Message" body={event.msg || `Console ${event.lv}`} />
                  </ScrollPane>
                </TabsPanel>
                <TabsPanel value="stack" keepMounted>
                  <ScrollPane>
                    <BodyBlock title="Stack trace" body={event.stack} />
                  </ScrollPane>
                </TabsPanel>
              </TabsPanels>
            </DetailTabs>
          ) : (
            <ScrollPane>
              <BodyBlock title="Message" body={event.msg || `Console ${event.lv}`} />
            </ScrollPane>
          )}
        </div>
      )}
    </div>
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
  const [expanded, setExpanded] = useState(false);
  const critical = event.status === 0 || event.status >= 500;
  const requestHeaders =
    event.requestHeaders && Object.keys(event.requestHeaders).length
      ? event.requestHeaders
      : null;
  const responseHeaders =
    event.responseHeaders && Object.keys(event.responseHeaders).length
      ? event.responseHeaders
      : null;
  const hasDetails = !!(
    event.body ||
    event.err ||
    event.requestBody ||
    requestHeaders ||
    responseHeaders
  );
  return (
    <div data-net-row="true">
      <div className="flex items-stretch">
        <button
          type="button"
          className="grid min-h-11 min-w-0 flex-1 cursor-pointer grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-3 px-4 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-muted/40 active:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={() => onSeek(event.t)}
        >
          <span className="pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground/70">
            {formatElapsedTime(event.t - t0)}
          </span>
          <span className="min-w-0">
            <span className="block font-mono text-[11px] text-foreground">
              <span className="mr-2 font-semibold text-foreground">{event.method}</span>
              <span className="wrap-break-word text-muted-foreground">{event.target}</span>
            </span>
            {(event.err || event.body) && (
              <span className="wrap-break-word mt-1 block font-mono text-[11px] leading-relaxed text-subtle-foreground line-clamp-2">
                {event.err || event.body}
              </span>
            )}
          </span>
          <span
            className={cn(
              "mt-0.5 justify-self-end rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold",
              critical
                ? "bg-destructive-soft text-destructive"
                : "bg-warn-soft text-warn",
            )}
          >
            {event.status || "ERR"}
          </span>
        </button>
        <DetailsToggle expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      </div>
      {expanded && (
        <div className="border-t border-border/60">
          {hasDetails ? (
            <>
              {(() => {
                const tabs: { id: string; label: string }[] = [
                  { id: "headers", label: "Headers" },
                ];
                if (event.requestBody) tabs.push({ id: "payload", label: "Payload" });
                if (event.body) tabs.push({ id: "response", label: "Response" });
                const general = (
                  <>
                    <dl className="grid gap-2 text-[11px]">
                      <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-x-4">
                        <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                          Request
                        </dt>
                        <dd className="wrap-break-word font-mono text-foreground">
                          {event.method} {event.target}
                          <span className="ml-2 text-muted-foreground">
                            via {event.via} · {formatElapsedTime(event.t - t0)}
                          </span>
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-x-4">
                        <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                          Status
                        </dt>
                        <dd
                          className={cn(
                            "font-mono",
                            critical ? "text-destructive" : "text-warn",
                          )}
                        >
                          {event.status || "ERR"}
                          {event.err ? ` — ${event.err}` : ""}
                        </dd>
                      </div>
                    </dl>
                    {requestHeaders ? (
                      <HeaderTable title="Request headers" headers={requestHeaders} />
                    ) : null}
                    {responseHeaders ? (
                      <HeaderTable title="Response headers" headers={responseHeaders} />
                    ) : null}
                  </>
                );
                if (tabs.length === 1) {
                  return (
                    <ScrollPane>
                      <div className="grid gap-3">{general}</div>
                    </ScrollPane>
                  );
                }
                return (
                  <DetailTabs tabs={tabs}>
                    <TabsPanels>
                      <TabsPanel value="headers" keepMounted>
                        <ScrollPane>
                          <div className="grid gap-3">{general}</div>
                        </ScrollPane>
                      </TabsPanel>
                      {event.requestBody ? (
                        <TabsPanel value="payload" keepMounted>
                          <ScrollPane>
                            <BodyBlock title="Request body" body={event.requestBody} />
                          </ScrollPane>
                        </TabsPanel>
                      ) : null}
                      {event.body ? (
                        <TabsPanel value="response" keepMounted>
                          <ScrollPane>
                            <BodyBlock title="Response body" body={event.body} />
                          </ScrollPane>
                        </TabsPanel>
                      ) : null}
                    </TabsPanels>
                  </DetailTabs>
                );
              })()}
            </>
          ) : (
            <p className="px-4 py-4 text-[11px] text-subtle-foreground">
              No headers or body were captured for this request.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-4 text-sm text-muted-foreground">
      <CircleCheck className="size-4 text-success" aria-hidden="true" />
      {children}
    </div>
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
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);

  return (
    <section className="border-b border-border py-8 sm:py-10">
      <div className="overflow-hidden rounded-sm border border-border bg-card/30">
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
              <div className="divide-y divide-border/60">
                {requests.map((event) => (
                  <NetworkRow key={event.seq} event={event} t0={t0} onSeek={onSeek} />
                ))}
              </div>
            ) : (
              <EmptyState>No network failures captured.</EmptyState>
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
              <div className="divide-y divide-border/60">
                {consoles.map((event) => (
                  <ConsoleRow key={event.seq} event={event} t0={t0} onSeek={onSeek} />
                ))}
              </div>
            ) : (
              <EmptyState>No console errors captured.</EmptyState>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
}
