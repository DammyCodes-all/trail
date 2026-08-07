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

  it("derives Environment from the same report the header uses", () => {
    const sections = buildSections(report, events, { redact: true });
    const env = sections.find((s) => s.name === "Environment");
    expect(env?.text).toContain("Page: https://example.com");
    expect(env?.text).toContain("Duration: 2s");
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
