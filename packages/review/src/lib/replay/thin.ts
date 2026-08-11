import { EventType, IncrementalSource, type eventWithTime } from "@rrweb/types";

// rrweb's replayer advances time once per animation frame and executes every
// event that has come due in a single synchronous burst, so at high speed
// dozens of micro-events (cursor positions, scroll ticks) land in the same
// frame and the replay stutters. Thinning the stream to roughly one cursor
// step per frame keeps 2x/4x playback legible without touching DOM mutations,
// whose node-id references make them non-droppable.
export const thinEvents = (
  events: eventWithTime[],
  speed: number,
): eventWithTime[] => {
  if (speed <= 1 || events.length === 0) return events;

  const minMouseGap = 1000 / speed; // replay-ms between kept cursor positions
  const scrollGap = 200; // replay-ms between kept scroll events
  let lastMouseAt = -Infinity;
  let lastScrollAt = -Infinity;
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

    if (data.source === IncrementalSource.Scroll) {
      if (event.timestamp - lastScrollAt < scrollGap) {
        changed = true;
        return null;
      }
      lastScrollAt = event.timestamp;
      return event;
    }

    return event;
  });

  return changed
    ? thinned.filter((event): event is eventWithTime => event !== null)
    : events;
};
