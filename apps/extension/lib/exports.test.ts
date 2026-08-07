import { describe, expect, it } from "vitest";
import { buildConsoleLog, buildHar, buildMetadataJson } from "./exports";
import type { ConsoleEvent, NetEvent } from "./types";

const netEvent: NetEvent = {
  k: "net",
  t: 1_700_000_000_000,
  url: "https://example.com",
  target: "https://example.com/api/x",
  method: "GET",
  status: 404,
  via: "fetch",
  body: "not found",
  requestHeaders: { "content-type": "application/json" },
  responseHeaders: { server: "nginx" },
  requestBody: "{}",
};

describe("buildHar", () => {
  it("emits one HAR entry per event with request and response", () => {
    const har = JSON.parse(buildHar([netEvent], "1.2.3")) as {
      log: { creator: { version: string }; entries: Array<{ request: Record<string, unknown>; response: Record<string, unknown> }> };
    };
    expect(har.log.creator.version).toBe("1.2.3");
    expect(har.log.entries).toHaveLength(1);
    expect(har.log.entries[0]?.request.url).toBe("https://example.com/api/x");
    expect(har.log.entries[0]?.response.status).toBe(404);
  });

  it("serializes headers as name/value pairs", () => {
    const har = JSON.parse(buildHar([netEvent], "1")) as {
      log: { entries: Array<{ request: { headers: Array<{ name: string; value: string }> } }> };
    };
    expect(har.log.entries[0]?.request.headers).toEqual([
      { name: "content-type", value: "application/json" },
    ]);
  });

  it("produces valid JSON for an empty session", () => {
    expect(() => JSON.parse(buildHar([], "1"))).not.toThrow();
  });
});

describe("buildConsoleLog", () => {
  it("renders timestamp, level, and message with the stack", () => {
    const ev: ConsoleEvent = {
      k: "console",
      t: 1_700_000_000_000,
      url: "https://example.com",
      lv: "error",
      msg: "boom",
      stack: "at fn (a.js:1:1)",
    };
    const log = buildConsoleLog([ev]);
    expect(log).toContain("ERROR boom");
    expect(log).toContain("at fn (a.js:1:1)");
  });

  it("says so when nothing was captured", () => {
    expect(buildConsoleLog([])).toBe("No console errors captured.");
  });
});

describe("buildMetadataJson", () => {
  it("serializes the given metadata verbatim", () => {
    const json = buildMetadataJson({
      title: "t",
      capturedAt: 1,
      durationMs: 2,
      url: "u",
      browser: "b",
      os: "o",
      extensionVersion: "e",
      counts: { click: 1, input: 2, console: 3, net: 4 },
    });
    expect(JSON.parse(json)).toMatchObject({
      title: "t",
      extensionVersion: "e",
      counts: { click: 1, net: 4 },
    });
  });
});
