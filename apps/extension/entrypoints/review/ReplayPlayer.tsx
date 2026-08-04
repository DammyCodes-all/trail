import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { eventWithTime } from '@rrweb/types';
import Player from 'rrweb-player';
import 'rrweb-player/dist/style.css';

export interface ReplayPlayerHandle {
  seek: (timeOffset: number, play?: boolean) => void;
  play: () => void;
  pause: () => void;
}

export const ReplayPlayer = forwardRef<
  ReplayPlayerHandle,
  {
    events: eventWithTime[];
    onCurrentTimeChange?: (timeOffset: number) => void;
  }
>(function ReplayPlayer({ events, onCurrentTimeChange }, forwardedRef) {
  const ref = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  useImperativeHandle(forwardedRef, () => ({
    seek: (timeOffset, play = false) => {
      playerRef.current?.goto(Math.max(0, timeOffset), play);
    },
    play: () => playerRef.current?.play(),
    pause: () => playerRef.current?.pause(),
  }), []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !events.length) return;
    const width = Math.max(320, Math.floor(el.clientWidth || 640));
    const player = new Player({
      target: el,
      props: {
        events,
        width,
        height: Math.round(width * 0.625),
        autoPlay: false,
        showController: true,
        speedOption: width < 480 ? [1, 2] : [1, 2, 4, 8],
      },
    });
    playerRef.current = player;
    player.addEventListener("ui-update-current-time", (detail) => {
      const payload = (detail as { payload?: unknown })?.payload ?? detail;
      if (typeof payload === "number") onCurrentTimeChange?.(payload);
    });
    // Test hook: proves the Svelte player actually mounted.
    (window as unknown as Record<string, unknown>).__trailPlayerReady = true;
    return () => {
      playerRef.current = null;
      (player as unknown as { $destroy?: () => void }).$destroy?.();
    };
  }, [events, onCurrentTimeChange]);

  return <div ref={ref} className="replay w-full" />;
});
