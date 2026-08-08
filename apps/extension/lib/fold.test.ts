import { describe, expect, it } from "vitest";
import { foldRepeatedConsoles } from "./fold";
import type { StoredEvent } from "./types";

const event = (over: Partial<StoredEvent>): StoredEvent => ({
  k: "console",
  t: 1000,
  url: "https://example.com",
  ...over,
} as StoredEvent);

describe("foldRepeatedConsoles", () => {
  it("collapses identical repeated messages into one entry with a count", () => {
    const folded = foldRepeatedConsoles([
      event({ t: 10, lv: "warn", msg: "throttled api" }),
      event({ t: 20, lv: "warn", msg: "throttled api" }),
      event({ t: 30, lv: "warn", msg: "throttled api" }),
    ]);
    expect(folded).toHaveLength(1);
    const first = folded[0] as unknown as { count: number; lastT: number };
    expect(first.count).toBe(3);
    expect(first.lastT).toBe(30);
    expect(folded[0]).toMatchObject({ t: 10, lv: "warn", msg: "throttled api" });
  });

  it("keeps distinct messages separate", () => {
    const folded = foldRepeatedConsoles([
      event({ t: 10, lv: "warn", msg: "a" }),
      event({ t: 20, lv: "error", msg: "b" }),
      event({ t: 30, lv: "warn", msg: "c" }),
    ]);
    expect(folded).toHaveLength(3);
  });

  it("folds session-wide, not just consecutive runs", () => {
    const folded = foldRepeatedConsoles([
      event({ t: 10, lv: "warn", msg: "throttled api" }),
      event({ t: 20, lv: "error", msg: "real failure" }),
      event({ t: 30, lv: "warn", msg: "throttled api" }),
    ]);
    const warns = folded.filter((e) => e.k === "console" && e.lv === "warn");
    expect(warns).toHaveLength(1);
    expect((warns[0] as unknown as { count: number }).count).toBe(2);
  });

  it("keeps the same message on different pages separate", () => {
    const folded = foldRepeatedConsoles([
      event({ t: 10, url: "/a", msg: "same" }),
      event({ t: 20, url: "/b", msg: "same" }),
    ]);
    expect(folded).toHaveLength(2);
  });

  it("passes non-console events through untouched", () => {
    const click = event({ k: "click", t: 5, label: "Submit" });
    const folded = foldRepeatedConsoles([click]);
    expect(folded).toEqual([click]);
  });

  it("leaves a single occurrence at count 1", () => {
    const folded = foldRepeatedConsoles([
      event({ t: 10, lv: "warn", msg: "once" }),
    ]);
    expect((folded[0] as unknown as { count: number }).count).toBe(1);
  });
});
