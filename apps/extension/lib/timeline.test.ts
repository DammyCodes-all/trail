import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";
import type { StoredEvent } from "./types";

const event = (over: Partial<StoredEvent>): StoredEvent => ({
  k: "console",
  t: 1000,
  url: "https://example.com",
  ...over,
} as StoredEvent);

const nav = event({ k: "nav", t: 0, url: "https://example.com", reload: false });

describe("buildTimeline console folding", () => {
  it("emits one step with a count for a repeated message", () => {
    const steps = buildTimeline([
      nav,
      event({ t: 10, lv: "warn", msg: "throttled api" }),
      event({ t: 20, lv: "warn", msg: "throttled api" }),
      event({ t: 30, lv: "warn", msg: "throttled api" }),
    ]);
    expect(steps).toHaveLength(2);
    expect(steps[1]).toMatchObject({
      t: 10,
      kind: "console",
      level: "warn",
      text: "Console warn: throttled api",
      count: 3,
    });
  });

  it("keeps first-occurrence order when a message repeats across the session", () => {
    const steps = buildTimeline([
      nav,
      event({ t: 10, lv: "warn", msg: "throttled api" }),
      event({ k: "click", t: 15, label: "Submit", tag: "button" }),
      event({ t: 25, lv: "warn", msg: "throttled api" }),
      event({ t: 30, lv: "error", msg: "real failure" }),
    ]);
    expect(steps.map((s) => s.kind)).toEqual([
      "nav",
      "console",
      "click",
      "console",
    ]);
    expect(steps[1]).toMatchObject({ count: 2, t: 10 });
  });

  it("leaves unique console messages without a count", () => {
    const steps = buildTimeline([nav, event({ t: 10, lv: "warn", msg: "once" })]);
    expect(steps[1]).toMatchObject({ text: "Console warn: once" });
    expect(steps[1]).not.toHaveProperty("count");
  });
});
