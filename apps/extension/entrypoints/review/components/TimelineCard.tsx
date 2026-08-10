import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ChevronDown } from "lucide-react";

import {
  Tabs,
  TabsList,
  TabsTab,
} from "@/components/animate-ui/components/base/tabs";
import type { TimelineStep } from "@/lib/timeline";
import { formatElapsedTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  buildRows,
  COLLAPSED_ROW_LIMIT,
  filterLabels,
  filterModes,
  rowTime,
  toneFor,
  visibleCount,
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
  const [showAll, setShowAll] = useState(false);
  const disclosureRef = useRef<HTMLButtonElement>(null);
  // An explicit collapse beats the replay's auto-lift until the replay comes
  // back inside the collapsed window (mirrors `userCollapsed` for groups).
  const userCollapsedAll = useRef(false);

  const filteredSteps = useMemo(
    () =>
      steps.filter((step) => {
        if (filter === "errors") return toneFor(step) === "error";
        if (filter === "network") return step.kind === "net";
        if (filter === "user") {
          return (
            step.kind === "nav" ||
            step.kind === "click" ||
            step.kind === "input" ||
            step.kind === "key" ||
            step.kind === "submit" ||
            step.kind === "hover" ||
            step.kind === "viewport"
          );
        }
        if (filter === "console") return step.kind === "console";
        return true;
      }),
    [steps, filter],
  );

  const rows = useMemo(() => buildRows(filteredSteps), [filteredSteps]);

  // A new filter is a new list: start it collapsed again.
  useEffect(() => {
    setShowAll(false);
    userCollapsedAll.current = false;
  }, [filter]);

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
        out.push({ key: `row-${index}`, row, groupIndex: index, rowIndex: index });
        if (expanded.has(`row-${index}`)) {
          for (const step of row.steps) {
            out.push({
              key: `${index}-${step.t}`,
              row: step,
              sub: true,
              rowIndex: index,
            });
          }
        }
      } else if (row.kind === "group") {
        // Singleton interaction groups render as a plain step.
        out.push({
          key: `row-${index}`,
          row: row.steps[0] as TimelineStep,
          rowIndex: index,
        });
      } else {
        out.push({ key: `row-${index}`, row, rowIndex: index });
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

  // Collapse is presentation-only and sits on top of the full list: rows,
  // activeIndex and the rowEls refs all still span the whole timeline, so
  // follow-scroll keeps working unchanged.
  const { count: shownCount, hiddenRows } = visibleCount(renderable, showAll);
  const shown = hiddenRows ? renderable.slice(0, shownCount) : renderable;

  // The replay outruns the collapsed window: lift the cap rather than let the
  // active row point at an unmounted element, which would strand follow-scroll
  // for the rest of the pass. Same precedent — and same override rule — as a
  // group auto-expanding when the replay reaches it: an explicit collapse wins
  // until the replay comes back inside the collapsed window.
  useEffect(() => {
    if (!hiddenRows) return;
    if (activeIndex < shownCount) {
      userCollapsedAll.current = false;
      return;
    }
    if (!userCollapsedAll.current) setShowAll(true);
  }, [hiddenRows, activeIndex, shownCount]);

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

  // Collapsing removes page height above the fold, so the button can end up
  // off-screen and the page appears to jump. Pull it back into view when that
  // happens; expanding only ever adds height below, so it needs nothing.
  const toggleShowAll = () => {
    if (!showAll) {
      userCollapsedAll.current = false;
      setShowAll(true);
      return;
    }
    userCollapsedAll.current = true;
    setShowAll(false);
    requestAnimationFrame(() => {
      const el = disclosureRef.current;
      if (el && el.getBoundingClientRect().top < 0) {
        el.scrollIntoView({ block: "center" });
      }
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
          {shown.map(({ key, row, sub, groupIndex }, index) => {
            const last = index === shown.length - 1;
            // Rows revealed by "show more" fade in; the rows that were always
            // on screen must not re-animate when the cap lifts.
            const revealed = showAll && index >= COLLAPSED_ROW_LIMIT;
            const revealIndex = revealed ? index - COLLAPSED_ROW_LIMIT : 0;
            if (sub) {
              return (
                <SubRow
                  key={key}
                  step={row as TimelineStep}
                  t0={t0}
                  active={index === activeIndex}
                  onSeek={onSeek}
                  liRef={attachRef(index)}
                  reveal={revealed ? revealIndex : undefined}
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
                  reveal={revealed ? revealIndex : undefined}
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
                reveal={revealed ? revealIndex : undefined}
              />
            );
          })}
        </ol>
      ) : (
        <p className="px-2 py-6 text-sm text-muted-foreground">
          No events match this filter.
        </p>
      )}
      {hiddenRows || showAll ? (
        <div className="mt-3 flex justify-center">
          <button
            ref={disclosureRef}
            type="button"
            onClick={toggleShowAll}
            aria-expanded={showAll}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-border-strong bg-background px-3 text-xs font-medium text-foreground transition-colors duration-150 ease-out hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {showAll ? "Show less" : `Show ${hiddenRows} more`}
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-200 ease-out",
                showAll && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
        </div>
      ) : null}
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
