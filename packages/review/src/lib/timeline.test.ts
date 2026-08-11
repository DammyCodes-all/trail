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

describe("buildTimeline interaction steps", () => {
  it("renders keyboard, submit, hover and viewport steps", () => {
    const steps = buildTimeline([
      nav,
      event({ k: "key", t: 10, key: "Enter", label: "Search", tag: "input" }),
      event({
        k: "submit",
        t: 20,
        label: "Sign-in",
        method: "POST",
        action: "https://example.com/api/login",
      }),
      event({ k: "hover", t: 30, label: "Avatar menu", tag: "button", reason: "aria-haspopup" }),
      event({ k: "viewport", t: 40, w: 375, h: 812 }),
    ]);
    expect(steps.map((s) => s.text)).toEqual([
      "Navigate to https://example.com",
      "Pressed Enter in Search",
      "Submitted form Sign-in (POST https://example.com/api/login)",
      "Hovered Avatar menu (aria-haspopup)",
      "Resized viewport to 375×812",
    ]);
  });

  it("folds the click on a submit button into the submit step it caused", () => {
    const steps = buildTimeline([
      nav,
      event({ k: "click", t: 10, label: "Sign in", tag: "button" }),
      event({
        k: "submit",
        t: 20,
        label: "Sign-in",
        method: "post",
        action: "https://example.com/api/login",
        submitter: { label: "Sign in", tag: "button" },
      }),
    ]);
    expect(steps.map((s) => s.kind)).toEqual(["nav", "submit"]);
  });

  it("keeps a click on a different element than the submitter", () => {
    const steps = buildTimeline([
      nav,
      event({ k: "click", t: 10, label: "Other button", tag: "button" }),
      event({
        k: "submit",
        t: 20,
        label: "Sign-in",
        method: "post",
        action: "https://example.com/api/login",
        submitter: { label: "Sign in", tag: "button" },
      }),
    ]);
    expect(steps.map((s) => s.kind)).toEqual(["nav", "click", "submit"]);
  });

  it("renders an upload step for file inputs", () => {
    const steps = buildTimeline([
      nav,
      event({
        k: "input",
        t: 10,
        label: "Receipt",
        masked: false,
        value: "",
        files: ["receipt.pdf"],
      }),
    ]);
    expect(steps[1]).toMatchObject({
      kind: "input",
      text: "Uploaded 1 file to Receipt",
    });
  });

  it("excludes meta events from the timeline", () => {
    const steps = buildTimeline([
      nav,
      event({
        k: "meta",
        t: 5,
        userAgent: "Mozilla",
        viewportW: 1280,
        viewportH: 720,
        dpr: 1,
      }),
      event({ k: "click", t: 10, label: "Go", tag: "button" }),
    ]);
    expect(steps.map((s) => s.kind)).toEqual(["nav", "click"]);
  });
});

describe("buildTimeline flag windows", () => {
  it("folds open/cancel edges into the submit step with a duration marker", () => {
    const steps = buildTimeline([
      nav,
      event({ k: "flag", t: 1000, phase: "open" }),
      event({ k: "flag", t: 1000 + 42_000, phase: "submit", note: "Expected $4.99 but the total showed $9.98" }),
    ]);
    expect(steps.map((s) => s.kind)).toEqual(["nav", "flag"]);
    expect(steps[1]).toMatchObject({
      t: 43_000,
      kind: "flag",
      text: 'Flag: "Expected $4.99 but the total showed $9.98" (42s of report writing)',
    });
  });

  it("marks background activity that fired while the report was written", () => {
    const steps = buildTimeline([
      nav,
      event({ k: "flag", t: 1000, phase: "open" }),
      event({ t: 2000, lv: "error", msg: "boom during writing" }),
      event({ k: "net", t: 3000, status: 500, method: "GET", target: "/api/x", via: "fetch" }),
      event({ k: "flag", t: 1000 + 10_000, phase: "submit" }),
    ]);
    const flagStep = steps.find((s) => s.kind === "flag");
    expect(flagStep?.text).toBe(
      "Flagged this moment (10s of report writing) · 2 background events",
    );
  });

  it("skips short windows and keeps legacy flags as plain steps", () => {
    const steps = buildTimeline([
      nav,
      event({ k: "flag", t: 1000, phase: "open" }),
      event({ k: "flag", t: 1400, phase: "submit" }),
      event({ k: "flag", t: 5000, expected: "works", actual: "broken" }),
    ]);
    expect(steps.map((s) => s.kind)).toEqual(["nav", "flag", "flag"]);
    expect(steps[1]).toMatchObject({ text: "Flagged this moment" });
    // Legacy two-field sessions keep their expected/actual rendering.
    expect(steps[2]).toMatchObject({ text: 'Flag: "works" — "broken"' });
  });

  it("prefers the note over legacy expected/actual fields", () => {
    const steps = buildTimeline([
      nav,
      event({
        k: "flag",
        t: 5000,
        note: "The total showed double the price",
        expected: "works",
        actual: "broken",
      }),
    ]);
    expect(steps[1]).toMatchObject({
      text: 'Flag: "The total showed double the price"',
    });
  });
});
