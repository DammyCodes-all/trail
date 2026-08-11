import { describe, expect, it } from "vitest";
import {
  buildFlagWindows,
  buildReplayMap,
  compressFlagWindows,
  WINDOW_BUDGET_MS,
} from "./replay-windows";
import type { StoredEvent } from "./types";

const event = (over: Partial<StoredEvent>): StoredEvent =>
  ({ k: "console", t: 1000, url: "https://example.com", ...over }) as StoredEvent;

const flag = (
  t: number,
  phase: "open" | "submit" | "cancel",
  notes: Partial<StoredEvent> = {},
): StoredEvent =>
  event({ k: "flag", t, phase, ...notes }) as StoredEvent;

const consoleErr = (t: number): StoredEvent =>
  event({ k: "console", t, lv: "error", msg: "boom" });

const failedNet = (t: number): StoredEvent =>
  event({ k: "net", t, status: 500, method: "GET", target: "/api/x", via: "fetch" });

const okNet = (t: number): StoredEvent =>
  event({ k: "net", t, status: 200, method: "GET", target: "/api/x", via: "fetch" });

describe("buildFlagWindows", () => {
  it("pairs open → submit and counts background activity", () => {
    const windows = buildFlagWindows([
      event({ k: "click", t: 0, label: "Go", tag: "button" }),
      flag(1000, "open"),
      consoleErr(2500),
      failedNet(3000),
      flag(6000, "submit", { expected: "works", actual: "broken" }),
    ]);
    expect(windows).toHaveLength(1);
    expect(windows[0]).toEqual({
      open: 1000,
      submit: 6000,
      durationMs: 5000,
      background: 2,
    });
  });

  it("counts only console errors and failed requests as background", () => {
    const windows = buildFlagWindows([
      flag(1000, "open"),
      okNet(2000),
      consoleErr(2500),
      flag(5000, "submit"),
    ]);
    expect(windows[0]?.background).toBe(1);
  });

  it("skips windows shorter than the minimum (real activity, not dead air)", () => {
    const windows = buildFlagWindows([flag(1000, "open"), flag(1500, "submit")]);
    expect(windows).toEqual([]);
  });

  it("treats open → cancel as a cancelled window", () => {
    const windows = buildFlagWindows([flag(1000, "open"), flag(8000, "cancel")]);
    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      open: 1000,
      submit: 8000,
      durationMs: 7000,
      cancelled: true,
    });
  });

  it("closes a straggler open at the next open", () => {
    const windows = buildFlagWindows([
      flag(1000, "open"),
      flag(4000, "open"),
      flag(9000, "submit"),
    ]);
    expect(windows).toHaveLength(2);
    expect(windows[0]).toMatchObject({ open: 1000, submit: 4000, cancelled: true });
    expect(windows[1]).toMatchObject({ open: 4000, submit: 9000 });
    expect(windows[1]).not.toHaveProperty("cancelled");
  });

  it("closes an unclosed open at the last event", () => {
    const windows = buildFlagWindows([flag(1000, "open"), event({ k: "click", t: 9000, label: "A", tag: "button" })]);
    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({ open: 1000, submit: 9000, cancelled: true });
  });

  it("ignores legacy flags without a phase", () => {
    const windows = buildFlagWindows([
      event({ k: "flag", t: 1000, expected: "works", actual: "broken" }),
    ]);
    expect(windows).toEqual([]);
  });
});

describe("buildReplayMap", () => {
  const t0 = 1000;
  const windows = [{ open: 2000, submit: 5000, durationMs: 3000, background: 1 }];

  it("maps the window edges onto the budget and shifts everything after", () => {
    const map = buildReplayMap(t0, windows);
    expect(map.removedMs).toBe(3000 - WINDOW_BUDGET_MS);
    expect(map.spans).toHaveLength(1);
    expect(map.spans[0]).toMatchObject({ start: 1000, end: 1000 + WINDOW_BUDGET_MS });
    expect(map.wallToReplay(2000)).toBe(1000);
    expect(map.wallToReplay(5000)).toBe(1000 + WINDOW_BUDGET_MS);
    expect(map.wallToReplay(6000)).toBe(6000 - 1000 - map.removedMs);
    expect(map.wallToReplay(t0)).toBe(0);
  });

  it("round-trips wall clock ↔ replay time at every boundary", () => {
    const map = buildReplayMap(t0, windows);
    for (const t of [1000, 1500, 2000, 3500, 5000, 6000, 12000]) {
      expect(map.replayToWall(map.wallToReplay(t))).toBe(t);
    }
  });

  it("plays an expanded window at full duration", () => {
    const map = buildReplayMap(t0, windows, new Set([0]));
    expect(map.removedMs).toBe(0);
    expect(map.spans[0]).toMatchObject({ start: 1000, end: 4000 });
    expect(map.wallToReplay(5000)).toBe(4000);
  });

  it("interpolates inside the window", () => {
    const map = buildReplayMap(t0, windows);
    const halfway = 3500;
    const offset = map.wallToReplay(halfway);
    const frac = WINDOW_BUDGET_MS / 2;
    expect(offset).toBe(1000 + frac);
    expect(map.replayToWall(offset)).toBe(halfway);
  });

  it("stacks multiple windows", () => {
    const map = buildReplayMap(0, [
      { open: 1000, submit: 4000, durationMs: 3000, background: 0 },
      { open: 7000, submit: 9000, durationMs: 2000, background: 0 },
    ]);
    expect(map.spans[1]).toMatchObject({
      start: 7000 - (3000 - WINDOW_BUDGET_MS) - 0,
    });
    expect(map.replayToWall(map.wallToReplay(9500))).toBe(9500);
  });
});

describe("compressFlagWindows", () => {
  const rrweb = (timestamp: number) =>
    ({ timestamp, type: 1, data: {} }) as unknown as Parameters<
      typeof compressFlagWindows
    >[0][number];

  it("anchors the first event at replay offset 0 and compresses the rest", () => {
    const map = buildReplayMap(1000, [
      { open: 2000, submit: 5000, durationMs: 3000, background: 0 },
    ]);
    const out = compressFlagWindows([rrweb(1000), rrweb(2500), rrweb(6000)], map);
    // The player clocks from events[0] — it must sit on the same remapped
    // scale as the rest, or the duration goes negative and playback stalls.
    expect(out[0]!.timestamp).toBe(0);
    // 2500 is 1/6 into the window → 1/6 of the 1500ms budget.
    expect(out[1]!.timestamp).toBe(2000 + WINDOW_BUDGET_MS / 6 - 1000);
    expect(out[2]!.timestamp).toBe(6000 - map.removedMs - 1000);
    // The player's totalTime (last − first) must equal the compressed span.
    expect(out.at(-1)!.timestamp - out[0]!.timestamp).toBe(
      6000 - map.removedMs - 1000,
    );
  });

  it("is monotonic across the compressed window", () => {
    const map = buildReplayMap(1000, [
      { open: 2000, submit: 5000, durationMs: 3000, background: 0 },
    ]);
    const out = compressFlagWindows(
      [rrweb(1000), rrweb(2000), rrweb(3000), rrweb(5000), rrweb(6000)],
      map,
    );
    for (let i = 1; i < out.length; i++) {
      expect(out[i]!.timestamp).toBeGreaterThanOrEqual(out[i - 1]!.timestamp);
    }
    expect(out.at(-1)!.timestamp).toBeLessThan(6000);
  });
});
