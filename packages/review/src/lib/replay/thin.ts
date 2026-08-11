import { EventType, IncrementalSource, type eventWithTime } from "@rrweb/types";

// rrweb's replayer advances time once per animation frame and executes every
// event that has come due in a single synchronous burst, so at high speed
// dozens of micro-events (cursor positions, scroll ticks) land in the same
// frame and the replay stutters. Cursor positions are thinned at replay time
// because rrweb records them unthrottled. Scroll needs no replay-time
// thinning: capture throttles it to one event per 200ms (sampling.scroll in
// rrweb.ts), which stays ~50ms apart in replay time even at 4x. DOM
// mutations are never touched — their node-id references make them
// non-droppable.
export const thinEvents = (
  events: eventWithTime[],
  speed: number,
): eventWithTime[] => {
  if (speed <= 1 || events.length === 0) return events;

  // Kept cursor positions are minMouseGap recording-ms apart: 1000ms of
  // recording per kept step, i.e. 1000/speed² ms of replay time (~15 frames
  // at 2x, ~4 frames at 4x) — sparse enough that a per-frame burst stays
  // small, dense enough that the cursor still tracks the real path.
  const minMouseGap = 1000 / speed;
  let lastMouseAt = -Infinity;
  let changed = false;

  const thinned = events.map((event) => {
    if (event.type !== EventType.IncrementalSnapshot) return event;
    const data = event.data;

    if (data.source === IncrementalSource.MouseMove) {
      const positions = data.positions;
      const first = positions[0];
      if (!first) return event;
      // The first position anchors the event's delay in the replayer
      // (addDelay), but the whole event is redundant if it starts too close
      // to the last kept position — every position is replayed independently.
      const firstAt = event.timestamp + first.timeOffset;
      if (firstAt - lastMouseAt < minMouseGap) {
        changed = true;
        return null;
      }
      const kept = [first];
      lastMouseAt = firstAt;
      for (let i = 1; i < positions.length; i++) {
        const position = positions[i];
        if (!position) break;
        const at = event.timestamp + position.timeOffset;
        // Always keep the final position so the cursor lands exactly where the
        // movement ended (e.g. right before a click).
        if (at - lastMouseAt >= minMouseGap || i === positions.length - 1) {
          kept.push(position);
          lastMouseAt = at;
        }
      }
      if (kept.length === positions.length) return event;
      changed = true;
      return { ...event, data: { ...data, positions: kept } };
    }

    return event;
  });

  return changed
    ? thinned.filter((event): event is eventWithTime => event !== null)
    : events;
};
