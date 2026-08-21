import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { EventType, type eventWithTime } from "@rrweb/types";
import Player from "rrweb-player";
import "rrweb-player/dist/style.css";
import { thinEvents } from "@trail/review/lib/replay/thin";

export interface ReplayPlayerHandle {
  seek: (timeOffset: number, play?: boolean) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
}

interface ReplayPlayerProps {
  events: eventWithTime[];
  speed?: number;
  onCurrentTimeChange?: (timeOffset: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  onReady?: () => void;
}

type PlayerInstance = Player & {
  $set: (props: { width: number; height: number }) => void;
  $destroy: () => void;
};

export const ReplayPlayer = forwardRef<
  ReplayPlayerHandle,
  ReplayPlayerProps
>(function ReplayPlayer(
  {
    events,
    speed = 1,
    onCurrentTimeChange,
    onDurationChange,
    onPlayingChange,
    onReady,
  },
  forwardedRef,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerInstance | null>(null);
  const callbackRef = useRef({
    onCurrentTimeChange,
    onDurationChange,
    onPlayingChange,
    onReady,
  });
  // Position and play state tracked inside the player: a rebuild (speed
  // change) must resume exactly where the old instance was.
  const lastTimeRef = useRef(0);
  const wasPlayingRef = useRef(false);

  callbackRef.current = {
    onCurrentTimeChange,
    onDurationChange,
    onPlayingChange,
    onReady,
  };

  // At high speed the replayer executes every due event in one burst per
  // frame, so the cursor stream is thinned per speed. 1x and 0.5x share the
  // full recording (same reference), so those speed changes never rebuild the
  // player — the transport applies them via setSpeed instead.
  const playEvents = useMemo(
    () => thinEvents(events, speed),
    [events, speed],
  );

  useImperativeHandle(
    forwardedRef,
    () => ({
      seek: (timeOffset, play = false) => {
        playerRef.current?.goto(Math.max(0, timeOffset), play);
      },
      play: () => playerRef.current?.play(),
      pause: () => playerRef.current?.pause(),
      setSpeed: (speed) => playerRef.current?.setSpeed(speed),
    }),
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !playEvents.length) return;

    let frame = 0;
    let measuredWidth = 0;
    let measuredHeight = 0;
    const meta = playEvents.find((event) => event.type === EventType.Meta);
    const viewportRatio =
      meta && meta.data.width > 0 && meta.data.height > 0
        ? meta.data.width / meta.data.height
        : 16 / 9;

    const dimensions = (availableWidth: number) => {
      const width = Math.max(280, Math.floor(availableWidth || 640));
      const fullscreenHeight = Math.max(320, window.innerHeight - 160);
      const maxHeight = container.closest(":fullscreen")
        ? fullscreenHeight
        : 460;
      return {
        width,
        height: Math.min(maxHeight, Math.round(width / viewportRatio)),
      };
    };

    const initial = dimensions(container.clientWidth);
    measuredWidth = initial.width;
    measuredHeight = initial.height;
    const player = new Player({
      target: container,
      props: {
        events: playEvents,
        ...initial,
        autoPlay: false,
        showController: false,
        speed,
        speedOption: [0.5, 1, 2, 4],
      },
    }) as PlayerInstance;
    playerRef.current = player;

    player.addEventListener("ui-update-current-time", (detail) => {
      const payload = (detail as { payload?: unknown })?.payload ?? detail;
      if (typeof payload === "number") {
        lastTimeRef.current = payload;
        callbackRef.current.onCurrentTimeChange?.(payload);
      }
    });
    player.addEventListener("ui-update-player-state", (detail) => {
      const payload = (detail as { payload?: unknown })?.payload ?? detail;
      if (typeof payload === "string") {
        wasPlayingRef.current = payload === "playing";
        callbackRef.current.onPlayingChange?.(payload === "playing");
      }
    });
    player.addEventListener("finish", () => {
      wasPlayingRef.current = false;
      callbackRef.current.onPlayingChange?.(false);
    });
    // Signal readiness after the first full-snapshot rebuild completes.
    // The replayer emits `fullsnapshot-rebuilded` (rrweb Replayer:
    // ReplayerEvents.FullsnapshotRebuilded = "fullsnapshot-rebuilded" in
    // rrweb-player 2.1.1 dist/rrweb-player.js) after its async
    // `setTimeout(1)` initial rebuild — gating timeline clicks until then
    // prevents racing two heavy rebuilds (mount snapshot 0 vs seek target).
    // Fallback timer covers edge cases where the event fires before we
    // attach or where there is no FullSnapshot.
    let readyFired = false;
    const fireReady = () => {
      if (readyFired) return;
      readyFired = true;
      callbackRef.current.onReady?.();
    };
    player.addEventListener("fullsnapshot-rebuilded", fireReady);
    const readyTimer = window.setTimeout(fireReady, 300);

    const metadata = player.getMetaData();
    callbackRef.current.onDurationChange?.(metadata.totalTime);
    callbackRef.current.onPlayingChange?.(false);

  // The player is rebuilt whenever the (thinned) event stream changes: when
  // the recording is replaced, or when the speed crosses the 1x boundary and
  // the cursor stream gets thinned/unthinned. Resume where the previous
  // instance was. (Speed changes within a thinned regime — 0.5x↔1x, 2x↔4x —
  // apply via setSpeed and never rebuild.)
    if (wasPlayingRef.current || lastTimeRef.current > 0) {
      player.goto(
        Math.min(lastTimeRef.current, metadata.totalTime),
        wasPlayingRef.current,
      );
    }

    const resizePlayer = (availableWidth: number) => {
      const next = dimensions(availableWidth);
      if (
        Math.abs(next.width - measuredWidth) < 2 &&
        Math.abs(next.height - measuredHeight) < 2
      ) {
        return;
      }
      measuredWidth = next.width;
      measuredHeight = next.height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        player.$set(next);
        queueMicrotask(() => player.triggerResize());
      });
    };

    const resizeObserver = new ResizeObserver(([entry]) => {
      resizePlayer(entry?.contentRect.width ?? container.clientWidth);
    });
    resizeObserver.observe(container);
    const handleFullscreenChange = () => {
      resizePlayer(container.clientWidth);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Test hook: proves the Svelte replay engine actually mounted.
    (window as unknown as Record<string, unknown>).__trailPlayerReady = true;
    // If the fullsnapshot event already fired synchronously, `readyFired`
    // ensures we still signal; otherwise the timer above will fire.

    return () => {
      window.clearTimeout(readyTimer);
      resizeObserver.disconnect();
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      cancelAnimationFrame(frame);
      playerRef.current = null;
      player.$destroy();
    };
  }, [playEvents]);

  return <div ref={containerRef} className="replay w-full" />;
});
