import { describe, expect, it } from "vitest";
import {
  countEvents,
  countSummary,
  isFailedRequest,
  severityOfStatus,
  totalCounts,
  ZERO_COUNTS,
} from "./summary";
import type { StoredEvent } from "./types";

const event = (over: Partial<StoredEvent>): StoredEvent => ({
  k: "click",
  t: 0,
  url: "https://example.com",
  ...over,
} as StoredEvent);

describe("countEvents", () => {
  it("tallies each kind in one pass", () => {
    const events = [
      event({ k: "click" }),
      event({ k: "click" }),
      event({ k: "input" }),
      event({ k: "console" }),
      event({ k: "net" }),
      event({ k: "nav" }),
      event({ k: "rrweb", ev: {} }),
    ];
    expect(countEvents(events)).toEqual({ click: 2, input: 1, console: 1, net: 1 });
  });

  it("ignores unknown kinds", () => {
    const events = [{ k: "nope" }, { k: "other" }] as unknown as StoredEvent[];
    expect(countEvents(events)).toEqual(ZERO_COUNTS);
  });

  it("returns a fresh copy for empty input", () => {
    expect(countEvents([])).toEqual(ZERO_COUNTS);
    expect(countEvents([])).not.toBe(ZERO_COUNTS);
  });
});

describe("totalCounts", () => {
  it("sums all four counters", () => {
    expect(totalCounts({ click: 1, input: 2, console: 3, net: 4 })).toBe(10);
  });
});

describe("isFailedRequest", () => {
  it("treats dropped connections and 4xx/5xx as failures", () => {
    expect(isFailedRequest(0)).toBe(true);
    expect(isFailedRequest(400)).toBe(true);
    expect(isFailedRequest(404)).toBe(true);
    expect(isFailedRequest(503)).toBe(true);
  });

  it("does not treat redirects or successes as failures", () => {
    expect(isFailedRequest(199)).toBe(false);
    expect(isFailedRequest(200)).toBe(false);
    expect(isFailedRequest(301)).toBe(false);
    expect(isFailedRequest(399)).toBe(false);
  });
});

describe("countSummary", () => {
  it("counts console errors and failed requests, not warnings", () => {
    const events = [
      event({ k: "console", lv: "error", msg: "boom" }),
      event({ k: "console", lv: "warn", msg: "meh" }),
      event({ k: "net", status: 404 }),
      event({ k: "net", status: 200 }),
      event({ k: "net", status: 0 }),
    ];
    expect(countSummary(events)).toEqual({ errorCount: 1, failedRequestCount: 2 });
  });

  it("is empty for an empty session", () => {
    expect(countSummary([])).toEqual({ errorCount: 0, failedRequestCount: 0 });
  });
});

describe("severityOfStatus", () => {
  it("marks server failures and dropped connections critical", () => {
    expect(severityOfStatus(0)).toBe("critical");
    expect(severityOfStatus(500)).toBe("critical");
    expect(severityOfStatus(503)).toBe("critical");
  });

  it("marks client errors moderate", () => {
    expect(severityOfStatus(400)).toBe("moderate");
    expect(severityOfStatus(404)).toBe("moderate");
  });
});
