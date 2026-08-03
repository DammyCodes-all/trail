import { useEffect, useRef } from 'react';
import type { eventWithTime } from '@rrweb/types';
import Player from 'rrweb-player';
import 'rrweb-player/dist/style.css';

export function ReplayPlayer({ events }: { events: eventWithTime[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !events.length) return;
    const player = new Player({
      target: el,
      props: {
        events,
        width: 640,
        height: 400,
        autoPlay: false,
        showController: true,
      },
    });
    // Test hook: proves the Svelte player actually mounted.
    (window as unknown as Record<string, unknown>).__trailPlayerReady = true;
    return () => {
      (player as unknown as { $destroy?: () => void }).$destroy?.();
    };
  }, [events]);

  return <div ref={ref} className="replay" />;
}
