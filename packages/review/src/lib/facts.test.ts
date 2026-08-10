import { describe, expect, it } from "vitest";
import { buildReportFacts, parseUserAgent } from "./facts";
import type { StoredEvent } from "./types";

const event = (over: Partial<StoredEvent>): StoredEvent => ({
  k: "click",
  t: 1000,
  url: "https://example.com",
  ...over,
} as StoredEvent);

describe("parseUserAgent", () => {
  it("detects browser and OS from a Chrome UA", () => {
    const { browser, os } = parseUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
    );
    expect(browser).toBe("Chrome 126.0.0.0");
    expect(os).toBe("Linux");
  });
});

describe("buildReportFacts", () => {
  it("derives severity from console errors and network failures", () => {
    const quiet = buildReportFacts(
      [event({ k: "click" })],
      null,
      { userAgent: "" },
    );
    expect(quiet.severity).toBe("low");

    const warned = buildReportFacts(
      [event({ k: "console", lv: "warn", msg: "meh" })],
      null,
      { userAgent: "" },
    );
    expect(warned.severity).toBe("medium");

    const failed = buildReportFacts(
      [event({ k: "net", status: 404 })],
      null,
      { userAgent: "" },
    );
    expect(failed.severity).toBe("medium");

    const critical = buildReportFacts(
      [event({ k: "net", status: 503 })],
      null,
      { userAgent: "" },
    );
    expect(critical.severity).toBe("high");

    const errored = buildReportFacts(
      [event({ k: "console", lv: "error", msg: "boom" })],
      null,
      { userAgent: "" },
    );
    expect(errored.severity).toBe("high");
  });

  it("counts only real failures as failed requests", () => {
    const facts = buildReportFacts(
      [event({ k: "net", status: 301 }), event({ k: "net", status: 404 })],
      null,
      { userAgent: "" },
    );
    expect(facts.failedRequests).toBe(1);
  });

  it("prefers the saved report's duration and URL over the events", () => {
    const facts = buildReportFacts(
      [event({ k: "click", t: 1000 })],
      { startedAt: 5000, endedAt: 8000, url: "https://saved.example/" },
      { userAgent: "" },
    );
    expect(facts.durationMs).toBe(3000);
    expect(facts.url).toBe("https://saved.example/");
  });

  it("accepts a prebuilt timeline for eventCount without rebuilding it", () => {
    const events = [
      event({ k: "click", t: 0 }),
      event({ k: "console", t: 100, lv: "error", msg: "x" }),
    ];
    const facts = buildReportFacts(events, null, { userAgent: "" }, [
      { t: 0, kind: "click", text: "a" },
      { t: 1, kind: "click", text: "b" },
      { t: 2, kind: "click", text: "c" },
    ] as never);
    expect(facts.eventCount).toBe(3);
  });
});
