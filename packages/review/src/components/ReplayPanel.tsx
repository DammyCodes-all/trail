import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { eventWithTime } from "@rrweb/types";
import { Clapperboard } from "lucide-react";

import type { ReportFacts } from "@trail/review/lib/facts";
import type { ReplaySpan } from "@trail/review/lib/replay-windows";
import {
  ReplayPlayer,
  type ReplayPlayerHandle,
} from "../replay";
import {
  ReplayHeaderControls,
  ReplayTransportControls,
} from "./ReplayControls";

export const ReplayPanel = forwardRef<
  ReplayPlayerHandle,
  {
    events: eventWithTime[];
    facts: ReportFacts;
    currentTime: number;
    spans?: ReplaySpan[];
    expandedWindows?: ReadonlySet<number>;
    onToggleExpandWindow?: (index: number) => void;
    onCurrentTimeChange: (timeOffset: number) => void;
    onPlayingChange?: (playing: boolean) => void;
    onReady?: () => void;
  }
>(function ReplayPanel(
  {
    events,
    facts,
    currentTime,
    spans = [],
    expandedWindows = new Set(),
    onToggleExpandWindow,
    onCurrentTimeChange,
    onPlayingChange,
    onReady,
  },
  forwardedRef,
) {
  const replayRef = useRef<ReplayPlayerHandle>(null);
  const panelRef = useRef<HTMLElement>(null);
  const isSeekingRef = useRef(false);
  const resumeAfterSeekRef = useRef(false);
  const eventDuration = Math.max(
    0,
    (events.at(-1)?.timestamp ?? 0) - (events[0]?.timestamp ?? 0),
  );
  const [duration, setDuration] = useState(eventDuration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const pendingSeekRef = useRef<number | null>(null);
  const pendingPlayRef = useRef(false);
  const seekRafRef = useRef(0);

  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;
  useEffect(() => {
    onPlayingChangeRef.current?.(isPlaying);
  }, [isPlaying]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      seek: (timeOffset, play = false) => {
        if (!isReady) {
          pendingSeekRef.current = timeOffset;
          pendingPlayRef.current = play;
          return;
        }
        // Coalesce rapid timeline clicks: rAF lets React paint the
        // optimistic highlight before the heavy sync goto blocks.
        pendingSeekRef.current = timeOffset;
        pendingPlayRef.current = play;
        if (seekRafRef.current) cancelAnimationFrame(seekRafRef.current);
        seekRafRef.current = requestAnimationFrame(() => {
          seekRafRef.current = 0;
          const t = pendingSeekRef.current;
          const p = pendingPlayRef.current;
          pendingSeekRef.current = null;
          pendingPlayRef.current = false;
          if (t !== null) replayRef.current?.seek(t, p);
        });
      },
      play: () => replayRef.current?.play(),
      pause: () => replayRef.current?.pause(),
      setSpeed: (nextSpeed) => replayRef.current?.setSpeed(nextSpeed),
    }),
    [isReady],
  );

  useEffect(() => {
    setDuration(eventDuration);
    setIsPlaying(false);
    setSpeed(1);
    if (!events.length) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
    // Don't clobber a user-initiated seek queued while !isReady — the
    // imperative handle's pendingSeek would be lost and the timeline click
    // would appear to hang until the 300ms fallback.
    if (pendingSeekRef.current === null) {
      pendingPlayRef.current = false;
    }
    if (seekRafRef.current) cancelAnimationFrame(seekRafRef.current);
  }, [eventDuration, events]);

  useEffect(() => () => cancelAnimationFrame(seekRafRef.current), []);

  // The events list is replaced when a report-writing window is expanded or
  // collapsed, which remounts the player (rrweb-player can't re-time an
  // existing instance). Restore the playback position across the remount so
  // the toggle doesn't reset the review back to 00:00. Parent effects run
  // after the child's, so the player exists by the time this runs.
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  useEffect(() => {
    if (!isReady) {
      if (pendingSeekRef.current !== null) return;
      pendingSeekRef.current = currentTimeRef.current;
      pendingPlayRef.current = false;
      return;
    }
    replayRef.current?.seek(currentTimeRef.current, false);
  }, [events, isReady]);

  // The report-writing window under the current playback position, if any:
  // show a "skipped" marker instead of silently playing through dead air.
  const activeSpanIndex = (() => {
    for (let i = spans.length - 1; i >= 0; i--) {
      const span = spans[i]!;
      if (currentTime >= span.start - 100 && currentTime <= span.end + 100) {
        return i;
      }
      if (currentTime > span.end + 100) return -1;
    }
    return -1;
  })();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === panelRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const togglePlayback = () => {
    if (isPlaying) {
      replayRef.current?.pause();
      return;
    }
    if (duration > 0 && currentTime >= duration) {
      replayRef.current?.seek(0, true);
      onCurrentTimeChange(0);
      return;
    }
    replayRef.current?.play();
  };

  const changeSpeed = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    replayRef.current?.setSpeed(nextSpeed);
  };

  const beginSeek = () => {
    if (isSeekingRef.current) return;
    isSeekingRef.current = true;
    resumeAfterSeekRef.current = isPlaying;
    if (isPlaying) replayRef.current?.pause();
  };

  const seek = (nextTime: number) => {
    onCurrentTimeChange(nextTime);
    if (!isReady) {
      pendingSeekRef.current = nextTime;
      pendingPlayRef.current = false;
      return;
    }
    // Defer goto by rAF so the time label paints before sync rebuild.
    pendingSeekRef.current = nextTime;
    pendingPlayRef.current = false;
    if (seekRafRef.current) cancelAnimationFrame(seekRafRef.current);
    seekRafRef.current = requestAnimationFrame(() => {
      seekRafRef.current = 0;
      const t = pendingSeekRef.current;
      pendingSeekRef.current = null;
      if (t !== null) replayRef.current?.seek(t, false);
    });
  };

  const finishSeek = () => {
    if (!isSeekingRef.current) return;
    isSeekingRef.current = false;
    if (resumeAfterSeekRef.current) replayRef.current?.play();
    resumeAfterSeekRef.current = false;
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await panelRef.current?.requestFullscreen();
  };

  const safeDuration = Math.max(0, duration);
  const safeCurrentTime = Math.min(Math.max(0, currentTime), safeDuration);

  return (
    <section
      ref={panelRef}
      className="min-w-0 border-b border-border bg-background py-8 sm:py-10 lg:h-full lg:border-b-0 fullscreen:overflow-auto fullscreen:p-4"
    >
      <div data-sticky-replay="true" className="lg:sticky lg:top-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Session replay
        </h2>
        {events.length ? (
          <ReplayHeaderControls
            duration={safeDuration}
            speed={speed}
            isFullscreen={isFullscreen}
            portalContainer={panelRef}
            onSpeedChange={changeSpeed}
            onToggleFullscreen={() => void toggleFullscreen()}
          />
        ) : null}
      </header>
      <div className="relative overflow-hidden rounded-sm border border-border-strong bg-card">
        {events.length ? (
          <>
            <ReplayPlayer
              ref={replayRef}
              events={events}
              speed={speed}
              onCurrentTimeChange={onCurrentTimeChange}
              onDurationChange={setDuration}
              onPlayingChange={setIsPlaying}
              onReady={() => {
                setIsReady(true);
                onReady?.();
                // Flush any seek that was coalesced while the player was
                // still building its initial snapshot.
                if (pendingSeekRef.current !== null) {
                  const t = pendingSeekRef.current;
                  const p = pendingPlayRef.current;
                  pendingSeekRef.current = null;
                  pendingPlayRef.current = false;
                  if (seekRafRef.current) cancelAnimationFrame(seekRafRef.current);
                  seekRafRef.current = requestAnimationFrame(() => {
                    seekRafRef.current = 0;
                    replayRef.current?.seek(t, p);
                  });
                }
              }}
            />
            {activeSpanIndex >= 0 ? (
              <SkippedWindowChip
                span={spans[activeSpanIndex]!}
                expanded={expandedWindows.has(activeSpanIndex)}
                onToggle={() =>
                  onToggleExpandWindow?.(activeSpanIndex)
                }
              />
            ) : null}
            <ReplayTransportControls
              currentTime={safeCurrentTime}
              duration={safeDuration}
              isPlaying={isPlaying}
              onTogglePlayback={togglePlayback}
              onSeekStart={beginSeek}
              onSeek={seek}
              onSeekEnd={finishSeek}
            />
          </>
        ) : (
          <div className="grid min-h-80 place-items-center px-8 text-center">
            <div>
              <Clapperboard
                className="mx-auto mb-3 size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <h3 className="font-heading text-base font-medium">
                No replay frames captured
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Runtime evidence is still available in the investigation.
              </p>
            </div>
          </div>
        )}
      </div>
      <p className="sr-only">
        Recorded in {facts.browser} on {facts.os}.
      </p>
      </div>
    </section>
  );
});

// Floating marker over the player while the replay is inside a report-writing
// window: the window plays compressed (default) or at 1x (expanded), and the
// real duration plus any background activity are always visible so the
// compression never hides evidence.
function SkippedWindowChip({
  span,
  expanded,
  onToggle,
}: {
  span: ReplaySpan;
  expanded: boolean;
  onToggle: () => void;
}) {
  const secs = Math.max(1, Math.round(span.window.durationMs / 1000));
  const bg = span.window.background;
  return (
    <div className="absolute bottom-14 left-1/2 z-10 flex -translate-x-1/2 max-w-[calc(100%-2rem)] flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-sm border border-border-strong bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
      <span>
        Skipped {secs}s of report writing
        {bg > 0
          ? ` · ${bg} background event${bg === 1 ? "" : "s"} during writing`
          : ""}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="cursor-pointer rounded-xs px-1.5 py-0.5 font-semibold text-info underline decoration-info/40 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground/40"
      >
        {expanded ? "Collapse" : "Watch at 1×"}
      </button>
    </div>
  );
}
