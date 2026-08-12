import { describe, expect, it } from "vitest";
import {
  buildMarkdown,
  buildMarkdownFromSections,
  buildSections,
  suggestTitle,
} from "./report";
import type { StoredEvent } from "./types";

const event = (over: Partial<StoredEvent>): StoredEvent => ({
  k: "click",
  t: 1000,
  url: "https://example.com",
  ...over,
} as StoredEvent);

const events = [
  event({ k: "nav", t: 0, reload: false }),
  event({ k: "click", t: 500, label: "Submit", tag: "button" }),
  event({ k: "console", t: 600, lv: "error", msg: "TypeError: x is undefined" }),
  event({ k: "net", t: 700, status: 404, method: "GET", target: "/api/x" }),
  event({ k: "net", t: 800, status: 301, method: "GET", target: "/gone" }),
];

const report = {
  title: "My report",
  startedAt: 0,
  endedAt: 2000,
  url: "https://example.com",
};

describe("suggestTitle", () => {
  it("leads with the console error when one follows a click", () => {
    expect(suggestTitle(events)).toBe("Submit failed: x is undefined");
  });

  it("falls back to the page host", () => {
    expect(suggestTitle([event({ k: "click" })])).toBe("Bug on example.com");
  });

  it("prefers a flagged note over an incidental console error", () => {
    const flagged = [
      ...events,
      event({ k: "flag", t: 900, note: "Total shows the final price" }),
    ];
    expect(suggestTitle(flagged)).toBe("Total shows the final price");
  });

  it("uses the legacy actual note when the flag has no note", () => {
    expect(
      suggestTitle([event({ k: "flag", t: 900, actual: "Total doubles" })]),
    ).toBe("Total doubles");
  });

  it("prefers the note over legacy expected/actual fields", () => {
    expect(
      suggestTitle([
        event({
          k: "flag",
          t: 900,
          note: "Cart empties on reload",
          expected: "Cart keeps items",
          actual: "Cart empties",
        }),
      ]),
    ).toBe("Cart empties on reload");
  });

  it("ignores flags without notes for the title", () => {
    expect(suggestTitle([event({ k: "flag", t: 900 })])).toBe("Bug on example.com");
  });
});

describe("buildSections", () => {
  it("lists the actions as reproducible steps", () => {
    const sections = buildSections(report, events, { redact: true });
    const steps = sections.find((s) => s.name === "Steps to Reproduce");
    expect(steps?.text).toBe("1. Navigate to https://example.com\n2. Click Submit");
  });

  it("excludes redirects from Failed Requests", () => {
    const sections = buildSections(report, events, { redact: true });
    const failed = sections.find((s) => s.name === "Failed Requests");
    expect(failed?.text).toContain("/api/x");
    expect(failed?.text).not.toContain("/gone");
  });

  it("shortens beacon-sized URLs in Failed Requests but keeps short ones", () => {
    const longQuery = `https://cdn.acme.com/bundle.js?${"x".repeat(3000)}`;
    const sections = buildSections(
      report,
      [
        event({ k: "net", t: 700, status: 403, method: "POST", target: longQuery }),
        event({ k: "net", t: 800, status: 500, method: "GET", target: "/api/short" }),
      ],
      { redact: true },
    );
    const failed = sections.find((s) => s.name === "Failed Requests");
    const beaconLine = failed?.text.split("\n").find((l) => l.includes("cdn.acme.com"));
    expect(beaconLine).toBeDefined();
    expect(beaconLine!.length).toBeLessThanOrEqual(260);
    expect(beaconLine?.endsWith("… — 403")).toBe(true);
    expect(failed?.text).toContain("/api/short");
  });

  it("omits analytics beacons from Failed Requests and separates entries", () => {
    const sections = buildSections(
      report,
      [
        event({ k: "net", t: 700, status: 0, method: "POST", target: "https://www.google-analytics.com/g/collect?v=2&tid=1" }),
        event({ k: "net", t: 800, status: 500, method: "GET", target: "/api/boom" }),
        event({ k: "net", t: 900, status: 404, method: "GET", target: "/api/missing" }),
      ],
      { redact: true },
    );
    const failed = sections.find((s) => s.name === "Failed Requests");
    expect(failed?.text).not.toContain("google-analytics");
    expect(failed?.text).toContain("/api/boom");
    expect(failed?.text?.split("---")).toHaveLength(2);
  });

  it("keeps a beacon-only session from producing a Failed Requests section", () => {
    const sections = buildSections(
      report,
      [event({ k: "net", t: 700, status: 0, method: "POST", target: "https://connect.facebook.net/tr?id=1" })],
      { redact: true },
    );
    expect(sections.some((s) => s.name === "Failed Requests")).toBe(false);
  });

  it("renders bodies in top-level fences so separators stay markdown", () => {
    const sections = buildSections(
      report,
      [
        event({ k: "net", t: 700, status: 400, method: "POST", target: "/api/auth", body: '{"status":"error"}' }),
        event({ k: "net", t: 800, status: 500, method: "GET", target: "/api/x" }),
      ],
      { redact: true },
    );
    const failed = sections.find((s) => s.name === "Failed Requests");
    expect(failed?.text).toContain('- POST /api/auth — 400\n\n```\n{"status":"error"}\n```');
    expect(failed?.text).toContain("\n---\n");
    const lines = failed!.text.split("\n");
    expect(lines.filter((l) => l === "```").length).toBe(2);
    expect(lines.some((l) => l.startsWith("  ```"))).toBe(false);
  });

  it("renders console stacks in top-level fences", () => {
    const sections = buildSections(
      report,
      [event({ k: "console", t: 600, lv: "error", msg: "boom", stack: "TypeError: boom\n    at a (x.js:1:1)" })],
      { redact: true },
    );
    const consoleSection = sections.find((s) => s.name === "Console Errors");
    expect(consoleSection?.text).toContain("- `error` at /: boom\n\n```\nTypeError: boom\n    at a (x.js:1:1)\n```");
  });

  it("folds repeated identical console messages into one bullet with a count", () => {
    const repeated = Array.from({ length: 100 }, (_, i) =>
      event({ k: "console", t: 600 + i, lv: "warn", msg: "throttled api" }),
    );
    const sections = buildSections(report, repeated, { redact: true });
    const consoleSection = sections.find((s) => s.name === "Console Errors");
    const bullets = consoleSection!.text
      .split("\n")
      .filter((l) => l.startsWith("- "));
    expect(bullets).toHaveLength(1);
    expect(bullets[0]).toBe("- `warn` at /: throttled api (×100)");
  });

  it("does not fold identical messages that differ by level or page", () => {
    const mixed = [
      event({ k: "console", t: 600, lv: "warn", msg: "same" }),
      event({ k: "console", t: 610, lv: "error", msg: "same" }),
      event({ k: "console", t: 620, url: "https://other.example", lv: "warn", msg: "same" }),
    ];
    const sections = buildSections(report, mixed, { redact: true });
    const consoleSection = sections.find((s) => s.name === "Console Errors");
    const bullets = consoleSection!.text
      .split("\n")
      .filter((l) => l.startsWith("- "));
    expect(bullets).toHaveLength(3);
  });

  it("collapses a large Failed Requests list behind a details toggle, keeps small ones plain", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      event({ k: "net", t: 700 + i, status: 500, method: "GET", target: `/api/fail/${i}` }),
    );
    const big = buildSections(report, many, { redact: true });
    const bigFailed = big.find((s) => s.name === "Failed Requests");
    expect(bigFailed?.text).toContain("<details>");
    expect(bigFailed?.text).toContain("<summary>8 failed requests</summary>");

    const small = buildSections(report, events, { redact: true });
    const smallFailed = small.find((s) => s.name === "Failed Requests");
    expect(smallFailed?.text).not.toContain("<details>");
    expect(smallFailed?.text).toContain("/api/x");
  });

  it("derives Environment from the same report the header uses", () => {
    const sections = buildSections(report, events, { redact: true });
    const env = sections.find((s) => s.name === "Environment");
    expect(env?.text).toContain("Page: https://example.com");
    expect(env?.text).toContain("Duration: 2s");
    expect(env?.text).toContain("Recorded: 1970-01-01T00:00:00.000Z");
  });

  it("keeps steps, environment, and failed requests in priority order", () => {
    const sections = buildSections(report, events, { redact: true });
    expect(sections.map((s) => s.name)).toEqual([
      "Steps to Reproduce",
      "Console Errors",
      "Environment",
      "Failed Requests",
    ]);
  });

  it("emits a Reporter Notes section between steps and console errors", () => {
    const sections = buildSections(
      report,
      [
        ...events,
        event({
          k: "flag",
          t: 650,
          note: "The total should be $4.99 but it showed $9.98",
        }),
      ],
      { redact: true },
    );
    expect(sections.map((s) => s.name)).toEqual([
      "Steps to Reproduce",
      "Reporter Notes",
      "Console Errors",
      "Environment",
      "Failed Requests",
    ]);
    const notes = sections.find((s) => s.name === "Reporter Notes");
    expect(notes?.text).toContain(
      "`@00:00` — The total should be $4.99 but it showed $9.98",
    );
    // Priorities keep the notes ahead of console evidence in URL-budget fits.
    expect(notes!.priority).toBeLessThan(
      sections.find((s) => s.name === "Console Errors")!.priority,
    );
  });

  it("renders two flags as two distinct moments, never one merged pair", () => {
    const sections = buildSections(
      report,
      [
        event({ k: "flag", t: 1000, note: "Cart keeps items? No — cart empties" }),
        event({ k: "flag", t: 5000, note: "Card rejected at checkout" }),
      ],
      { redact: true },
    );
    const notes = sections.find((s) => s.name === "Reporter Notes");
    expect(notes?.text).toBe(
      "- `@00:00` — Cart keeps items? No — cart empties\n- `@00:04` — Card rejected at checkout",
    );
  });

  it("keeps legacy Expected/Actual sections for old sessions", () => {
    const sections = buildSections(
      report,
      [event({ k: "flag", t: 1000, expected: "Cart keeps items", actual: "Cart empties" })],
      { redact: true },
    );
    const expected = sections.find((s) => s.name === "Expected Behavior");
    const actual = sections.find((s) => s.name === "Actual Behavior");
    expect(expected?.text).toContain("Cart keeps items");
    expect(actual?.text).toContain("Cart empties");
  });

  it("emits no note sections when the flag has no text", () => {
    const sections = buildSections(
      report,
      [...events, event({ k: "flag", t: 650 })],
      { redact: true },
    );
    expect(sections.some((s) => s.name === "Reporter Notes")).toBe(false);
    expect(sections.some((s) => s.name === "Expected Behavior")).toBe(false);
    expect(sections.some((s) => s.name === "Actual Behavior")).toBe(false);
  });

  it("emits only the section that exists", () => {
    const sections = buildSections(
      report,
      [event({ k: "flag", t: 1000, note: "Only a note" })],
      { redact: true },
    );
    expect(sections.map((s) => s.name)).toEqual([
      "Steps to Reproduce",
      "Reporter Notes",
      "Console Errors",
      "Environment",
    ]);
  });

  it("keeps flagged notes out of the Steps to Reproduce", () => {
    const sections = buildSections(
      report,
      [
        event({ k: "click", t: 500, label: "Submit", tag: "button" }),
        event({ k: "flag", t: 600, note: "It should work" }),
      ],
      { redact: true },
    );
    const steps = sections.find((s) => s.name === "Steps to Reproduce");
    expect(steps?.text).toContain("Click Submit");
    expect(steps?.text).not.toContain("It should work");
  });
});

describe("buildMarkdown", () => {
  it("renders a title and every section", () => {
    const md = buildMarkdown(report, events, { redact: true });
    expect(md).toContain("# My report");
    expect(md).toContain("## Steps to Reproduce");
    expect(md).toContain("## Environment");
  });

  it("tolerates a missing report", () => {
    const md = buildMarkdownFromSections("", []);
    expect(md).toBe("# Bug report\n\n\n");
  });

  it("adds the replay callout and TRAIL attribution when links are available", () => {
    const md = buildMarkdownFromSections("My report", [], {
      replayUrl: "https://trail.example/r/replay-123",
      landingUrl: "https://trail.example/",
    });

    expect(md).toContain(
      "> **Replay:** [Open the captured session in TRAIL](https://trail.example/r/replay-123)",
    );
    expect(md).toContain(
      "<sub>Captured with [TRAIL](https://trail.example/) · [View replay](https://trail.example/r/replay-123)</sub>",
    );
  });
});
