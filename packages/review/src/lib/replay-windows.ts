// Phase: replay window compression.
//
// While the reporter writes their flag notes (flag form open → submit/cancel),
// the page is idle — the overlay is rr-blocked and its UI events are isolated
// — yet the replay plays those real-time seconds as dead air. A fast bug can
// therefore look like a 90-second replay dominated by someone typing a
// paragraph.
//
// Fix, data-side: each report-writing window plays in a fixed short budget
// instead of its real duration; events after the window shift by the removed
// time. Nothing is dropped — the window's own rrweb frames still play, just
// fast — and the wall-clock ↔ replay-time mappings keep seeking and the
// timeline highlight exact. Pure functions; no network, no storage.

import type { eventWithTime } from '@rrweb/types';
import type { StoredEvent } from './types.ts';

// Windows shorter than this are real activity, not report-writing dead air —
// no compression, no marker.
export const MIN_WINDOW_MS = 3000;

// A whole report-writing window plays in this much replay time regardless of
// its real length (a 10s and a 90s report both flash by at the same pace).
export const WINDOW_BUDGET_MS = 1500;

export interface FlagWindow {
  // Wall-clock timestamps of the window's edges.
  open: number;
  submit: number;
  durationMs: number;
  // Console errors / failed requests that fired while the form was open —
  // background activity that must not get lost in the compression. Surfaces
  // as a badge on the "skipped" marker.
  background: number;
  // Opened but never submitted (cancelled, or the session ended). The window
  // is still compressed — the reporter still typed in it.
  cancelled?: boolean;
}

export interface ReplaySpan {
  window: FlagWindow;
  // Replay-time budget this window plays in (full duration when expanded).
  budgetMs: number;
  // Player offsets (ms from the first rrweb event) of the window's span.
  start: number;
  end: number;
}

export interface ReplayTimeMap {
  // Wall-clock timestamp of the first rrweb event — the player's offset 0.
  t0: number;
  // Total real duration removed by compression.
  removedMs: number;
  spans: ReplaySpan[];
  // Wall-clock absolute timestamp → player offset.
  wallToReplay: (wallT: number) => number;
  // Player offset → wall-clock absolute timestamp.
  replayToWall: (offset: number) => number;
}

const isBackgroundEvent = (e: StoredEvent): boolean =>
  e.k === 'console' || (e.k === 'net' && (e.status === 0 || e.status >= 400));

// Pair flag 'open' events with their closing submit/cancel into windows.
// Tolerant pairing: an open with no close in the stream (legacy sessions
// without phase, or an unclosed form at session end) closes at the next open
// or at the last event. Legacy flags (no phase) are submits and never open a
// window, so old sessions compress nothing.
export function buildFlagWindows(
  events: StoredEvent[],
  minWindowMs: number = MIN_WINDOW_MS,
): FlagWindow[] {
  const sorted = [...events].sort((a, b) => a.t - b.t);
  const windows: FlagWindow[] = [];
  let open: { t: number } | null = null;
  let background = 0;
  let lastEventT = sorted.at(-1)?.t ?? 0;

  const close = (submitT: number, cancelled: boolean): void => {
    if (!open) return;
    const durationMs = submitT - open.t;
    if (durationMs >= minWindowMs) {
      windows.push({
        open: open.t,
        submit: submitT,
        durationMs,
        background,
        ...(cancelled ? { cancelled: true } : {}),
      });
    }
    open = null;
    background = 0;
  };

  for (const e of sorted) {
    if (open && isBackgroundEvent(e)) {
      background++;
      continue;
    }
    if (e.k !== 'flag' || !e.phase) continue;
    if (e.phase === 'open') {
      // A second open before a close means the first was cancelled (the
      // toggle-close path posts 'cancel' today, but tolerate stragglers).
      if (open) close(e.t, true);
      open = { t: e.t };
      continue;
    }
    // submit or cancel closes the window.
    if (open) {
      close(e.t, e.phase === 'cancel');
    }
  }
  if (open) close(lastEventT, true);
  return windows;
}

// Rebuild the wall-clock ↔ replay-time map after a window's budget changed
// (an expand toggle re-derives the map; the events are then remapped with it).
// `expanded` indexes the windows that must play at full speed.
export function buildReplayMap(
  t0: number,
  windows: FlagWindow[],
  expanded: ReadonlySet<number> = new Set(),
): ReplayTimeMap {
  const spans: ReplaySpan[] = [];
  let removedBefore = 0;
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i]!;
    const budgetMs = expanded.has(i)
      ? w.durationMs
      : Math.min(w.durationMs, WINDOW_BUDGET_MS);
    const start = w.open - removedBefore - t0;
    spans.push({ window: w, budgetMs, start, end: start + budgetMs });
    removedBefore += w.durationMs - budgetMs;
  }

  const forward = (wallT: number): number => {
    let removed = 0;
    for (const span of spans) {
      const w = span.window;
      if (wallT <= w.open) return wallT - removed;
      if (wallT < w.submit) {
        const frac = (wallT - w.open) / w.durationMs;
        return w.open - removed + span.budgetMs * frac;
      }
      removed += w.durationMs - span.budgetMs;
    }
    return wallT - removed;
  };

  const inverse = (t: number): number => {
    let removed = 0;
    for (const span of spans) {
      const w = span.window;
      const absStart = w.open - removed;
      const absEnd = absStart + span.budgetMs;
      if (t <= absStart) return t + removed;
      if (t < absEnd) {
        const frac = (t - absStart) / span.budgetMs;
        return w.open + frac * w.durationMs;
      }
      removed += w.durationMs - span.budgetMs;
    }
    return t + removed;
  };

  return {
    t0,
    removedMs: removedBefore,
    spans,
    wallToReplay: (wallT) => forward(wallT) - t0,
    replayToWall: (offset) => inverse(offset + t0),
  };
}

// Remap rrweb event timestamps through the windows so each report-writing
// window plays in its budget instead of real time. The first event anchors at
// replay offset 0 — the player derives its clock base from events[0], so every
// event must live on the same remapped scale (mixing epoch timestamps into the
// stream breaks the player's duration and stalls playback). The player's
// duration shrinks by the removed time. Never mutates the input.
export function compressFlagWindows(
  events: eventWithTime[],
  map: ReplayTimeMap,
): eventWithTime[] {
  return events.map((ev) => ({
    ...ev,
    timestamp: map.wallToReplay(ev.timestamp),
  }));
}
