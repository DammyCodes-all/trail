import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Tabs,
  TabsList,
  TabsTab,
} from "@/components/animate-ui/components/base/tabs";
import type { TimelineStep } from "@/lib/timeline";
import { formatElapsedTime } from "@/lib/time";
import {
  buildRows,
  filterLabels,
  filterModes,
  rowTime,
  toneFor,
  type FilterMode,
  type RenderItem,
} from "@/lib/timeline-rows";
import {
  GroupRow,
  SubRow,
  TimelineRow,
} from "./TimelineRows";
import { useTimelineFollow } from "./useTimelineFollow";

export function TimelineCard({
  steps,
  t0,
  replayT0,
  currentTime,
  onSeek,
  isPlaying = false,
}: {
  steps: TimelineStep[];
  t0: number;
  replayT0: number;
  currentTime: number;
  onSeek: (timestamp: number) => void;
  isPlaying?: boolean;
}) {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filteredSteps = useMemo(
    () =>
      steps.filter((step) => {
        if (filter === "errors") return toneFor(step) === "error";
        if (filter === "network") return step.kind === "net";
        if (filter === "user") {
          return step.kind === "nav" || step.kind === "click" || step.kind === "input";
        }
        if (filter === "console") return step.kind === "console";
        return true;
      }),
    [steps, filter],
  );

  const rows = useMemo(() => buildRows(filteredSteps), [filteredSteps]);

  const absoluteTime = replayT0 + currentTime;

  // A collapsed group opens itself once the replay reaches its range — unless
  // the user just collapsed it. Collapsing wins over auto-expand for the rest
  // of the pass; leaving the range resets the intent so a fresh pass re-opens.
  const userCollapsed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const due: string[] = [];
    rows.forEach((row, index) => {
      if (row.kind !== "group" || row.steps.length <= 1) return;
      const key = `row-${index}`;
      const inside = absoluteTime >= row.start - 250 && absoluteTime <= row.end + 250;
      if (inside) {
        if (!expanded.has(key) && !userCollapsed.current.has(key)) due.push(key);
      } else {
        userCollapsed.current.delete(key);
      }
    });
    if (due.length) {
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const key of due) next.add(key);
        return next;
      });
    }
  }, [rows, expanded, absoluteTime]);

  // Flat list of what is actually rendered, so grouping, expansion and the
  // active highlight all agree. The group header row is always present (it
  // carries the collapse/expand control); sub rows follow it when expanded.
  const renderable = useMemo<RenderItem[]>(() => {
    const out: RenderItem[] = [];
    rows.forEach((row, index) => {
      if (row.kind === "group" && row.steps.length > 1) {
        out.push({ key: `row-${index}`, row, groupIndex: index });
        if (expanded.has(`row-${index}`)) {
          for (const step of row.steps) {
            out.push({ key: `${index}-${step.t}`, row: step, sub: true });
          }
        }
      } else if (row.kind === "group") {
        // Singleton interaction groups render as a plain step.
        out.push({ key: `row-${index}`, row: row.steps[0] as TimelineStep });
      } else {
        out.push({ key: `row-${index}`, row });
      }
    });
    return out;
  }, [rows, expanded]);

  let activeIndex = -1;
  for (let index = 0; index < renderable.length; index++) {
    const item = renderable[index];
    if (!item) break;
    if (rowTime(item.row) <= absoluteTime + 250) {
      activeIndex = index;
    } else {
      break;
    }
  }
  const activeItem = activeIndex >= 0 ? renderable[activeIndex] : undefined;

  const { steering, jumpToLatest, cardRef, rowEls } = useTimelineFollow({
    activeIndex,
    isPlaying,
    currentTime,
  });

  const toggleGroup = (index: number) => {
    const key = `row-${index}`;
    if (expanded.has(key)) userCollapsed.current.add(key);
    else userCollapsed.current.delete(key);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const attachRef = (index: number) => (el: HTMLLIElement | null) => {
    rowEls.current[index] = el;
  };

  return (
    <section
      ref={cardRef}
      className="min-w-0 border-b border-border py-8 sm:py-10 lg:border-b-0"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Evidence timeline
        </h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            {filteredSteps.length === steps.length
              ? `${steps.length} events`
              : `${filteredSteps.length} of ${steps.length}`}
          </span>
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as FilterMode)}
          >
            <TabsList aria-label="Filter timeline">
              {filterModes.map((mode) => (
                <TabsTab key={mode} value={mode}>
                  {filterLabels[mode]}
                </TabsTab>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>
      {renderable.length ? (
        <ol>
          {renderable.map(({ key, row, sub, groupIndex }, index) => {
            const last = index === renderable.length - 1;
            if (sub) {
              return (
                <SubRow
                  key={key}
                  step={row as TimelineStep}
                  t0={t0}
                  active={index === activeIndex}
                  onSeek={onSeek}
                  liRef={attachRef(index)}
                />
              );
            }
            if (row.kind === "group") {
              return (
                <GroupRow
                  key={key}
                  group={row}
                  last={last}
                  t0={t0}
                  active={index === activeIndex}
                  expanded={expanded.has(`row-${groupIndex}`)}
                  onSeek={onSeek}
                  onToggle={() => toggleGroup(groupIndex as number)}
                  liRef={attachRef(index)}
                />
              );
            }
            return (
              <TimelineRow
                key={key}
                step={row}
                last={last}
                t0={t0}
                active={index === activeIndex}
                onSeek={onSeek}
                liRef={attachRef(index)}
              />
            );
          })}
        </ol>
      ) : (
        <p className="px-2 py-6 text-sm text-muted-foreground">
          No events match this filter.
        </p>
      )}
      {steering && isPlaying && renderable.length ? (
        <div className="pointer-events-none sticky bottom-3 z-10 mt-3 flex justify-center">
          <button
            type="button"
            onClick={jumpToLatest}
            className="pointer-events-auto flex h-9 items-center gap-2 rounded-sm border border-border-strong bg-background/90 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors duration-150 hover:bg-background"
          >
            Jump to latest
            {activeItem ? (
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {formatElapsedTime(rowTime(activeItem.row) - t0)}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}
    </section>
  );
}
