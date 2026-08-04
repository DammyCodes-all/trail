import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { eventWithTime } from "@rrweb/types";
import { Clapperboard } from "lucide-react";

import type { ReportFacts } from "@/lib/facts";
import {
  ReplayPlayer,
  type ReplayPlayerHandle,
} from "../ReplayPlayer";
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
    onCurrentTimeChange: (timeOffset: number) => void;
  }
>(function ReplayPanel(
  { events, facts, currentTime, onCurrentTimeChange },
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

  useImperativeHandle(
    forwardedRef,
    () => ({
      seek: (timeOffset, play = false) =>
        replayRef.current?.seek(timeOffset, play),
      play: () => replayRef.current?.play(),
      pause: () => replayRef.current?.pause(),
      setSpeed: (nextSpeed) => replayRef.current?.setSpeed(nextSpeed),
    }),
    [],
  );

  useEffect(() => {
    setDuration(eventDuration);
    setIsPlaying(false);
    setSpeed(1);
  }, [eventDuration]);

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
    replayRef.current?.seek(nextTime, false);
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
      className="min-w-0 border-b border-border bg-background py-8 sm:py-10 fullscreen:overflow-auto fullscreen:p-4"
    >
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
      <div className="overflow-hidden rounded-sm border border-border-strong bg-card">
        {events.length ? (
          <>
            <ReplayPlayer
              ref={replayRef}
              events={events}
              onCurrentTimeChange={onCurrentTimeChange}
              onDurationChange={setDuration}
              onPlayingChange={setIsPlaying}
            />
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
    </section>
  );
});
