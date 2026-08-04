import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EventType, type eventWithTime } from "@rrweb/types";
import Player from "rrweb-player";
import "rrweb-player/dist/style.css";

export interface ReplayPlayerHandle {
  seek: (timeOffset: number, play?: boolean) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
}

interface ReplayPlayerProps {
  events: eventWithTime[];
  onCurrentTimeChange?: (timeOffset: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayingChange?: (playing: boolean) => void;
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
    onCurrentTimeChange,
    onDurationChange,
    onPlayingChange,
  },
  forwardedRef,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerInstance | null>(null);
  const callbackRef = useRef({
    onCurrentTimeChange,
    onDurationChange,
    onPlayingChange,
  });

  callbackRef.current = {
    onCurrentTimeChange,
    onDurationChange,
    onPlayingChange,
  };

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
    if (!container || !events.length) return;

    let frame = 0;
    let measuredWidth = 0;
    let measuredHeight = 0;
    const meta = events.find((event) => event.type === EventType.Meta);
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
        events,
        ...initial,
        autoPlay: false,
        showController: false,
        speed: 1,
        speedOption: [0.5, 1, 2, 4],
      },
    }) as PlayerInstance;
    playerRef.current = player;

    player.addEventListener("ui-update-current-time", (detail) => {
      const payload = (detail as { payload?: unknown })?.payload ?? detail;
      if (typeof payload === "number") {
        callbackRef.current.onCurrentTimeChange?.(payload);
      }
    });
    player.addEventListener("ui-update-player-state", (detail) => {
      const payload = (detail as { payload?: unknown })?.payload ?? detail;
      if (typeof payload === "string") {
        callbackRef.current.onPlayingChange?.(payload === "playing");
      }
    });
    player.addEventListener("finish", () => {
      callbackRef.current.onPlayingChange?.(false);
    });

    const metadata = player.getMetaData();
    callbackRef.current.onDurationChange?.(metadata.totalTime);
    callbackRef.current.onPlayingChange?.(false);

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

    return () => {
      resizeObserver.disconnect();
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      cancelAnimationFrame(frame);
      playerRef.current = null;
      player.$destroy();
    };
  }, [events]);

  return <div ref={containerRef} className="replay w-full" />;
});
