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
});
