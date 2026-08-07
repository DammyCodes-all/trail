import { afterEach, describe, expect, it, vi } from "vitest";
import { REPLAY_SERVER_URL } from "./constants";
import {
  buildSessionDigest,
  generateEnhancements,
} from "./ai";
import {
  applyAI,
  sanitizeAIResult,
  stripFences,
} from "./ai-merge";
import {
  aiCacheKey,
  getCachedAIResult,
  rememberAIResult,
} from "./ai-cache";
import { buildSections } from "./report";
import { buildTimeline } from "./timeline";
import { buildReportFacts } from "./facts";
import { shapeSections, type IssueTemplate } from "./templates";
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
  event({ k: "net", t: 700, status: 404, method: "GET", target: "/api/x", body: "boom body" }),
  event({ k: "input", t: 800, label: "Email", masked: true, value: "••••••••" }),
];

const report = {
  title: "My report",
  startedAt: 0,
  endedAt: 2000,
  url: "https://example.com",
};

const timeline = buildTimeline(events);
const facts = buildReportFacts(events, report, undefined, timeline);

const baseSections = buildSections(report, events, { redact: true }, timeline);

const MARKDOWN_TEMPLATE: IssueTemplate = {
  kind: "markdown",
  filename: "bug_report.md",
  name: "Bug report",
  about: "Create a report to help us improve",
  fields: [
    { id: "describe-the-bug", label: "Describe the bug" },
    { id: "to-reproduce", label: "To Reproduce" },
    { id: "expected-behavior", label: "Expected behavior" },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stripFences", () => {
  it("strips a ```json fence", () => {
    expect(stripFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("leaves plain content alone", () => {
    expect(stripFences('{"a":1}')).toBe('{"a":1}');
  });
});

describe("sanitizeAIResult", () => {
  it("accepts a valid result", () => {
    const out = sanitizeAIResult(
      JSON.stringify({ title: "Broken checkout", summary: "Checkout 500s.", steps: ["Open /x", "Click Pay"], labels: ["bug"] }),
    );
    expect(out).toEqual({
      title: "Broken checkout",
      summary: "Checkout 500s.",
      steps: ["Open /x", "Click Pay"],
      labels: ["bug"],
    });
  });

  it("applies valid fields and drops invalid ones individually", () => {
    const out = sanitizeAIResult(
      JSON.stringify({ title: "T", summary: 42, steps: "nope", labels: ["bug", 7, "ui"] }),
    );
    expect(out?.title).toBe("T");
    expect(out?.summary).toBeUndefined();
    expect(out?.steps).toBeUndefined();
    expect(out?.labels).toEqual(["bug", "ui"]);
  });

  it("rejects malformed JSON and non-objects", () => {
    expect(sanitizeAIResult("not json")).toBeNull();
    expect(sanitizeAIResult("[1,2]")).toBeNull();
    expect(sanitizeAIResult('"string"')).toBeNull();
    expect(sanitizeAIResult("{}")).toBeNull();
  });

  it("caps lengths and counts", () => {
    const out = sanitizeAIResult(
      JSON.stringify({
        title: "x".repeat(300),
        steps: Array.from({ length: 80 }, (_, i) => `step ${i}`),
        labels: Array.from({ length: 30 }, (_, i) => `l${i}`),
      }),
    );
    expect(out?.title?.length).toBe(120);
    expect(out?.steps?.length).toBe(50);
    expect(out?.labels?.length).toBe(20);
  });

  it("keeps template mapping only with a filename and string fields", () => {
    const out = sanitizeAIResult(
      JSON.stringify({
        template: {
          filename: "bug_report.md",
          fields: { "describe-the-bug": "It broke", "fake-field": 3 },
        },
      }),
    );
    expect(out?.template?.filename).toBe("bug_report.md");
    expect(out?.template?.fields).toEqual({ "describe-the-bug": "It broke" });
  });
});

describe("applyAI", () => {
  const result = {
    title: "Broken checkout",
    summary: "Paying for an order 500s.",
    steps: ["Go to checkout", "Hit Pay"],
    template: { filename: "bug_report.md", fields: { "describe-the-bug": "Paying 500s." } },
    labels: ["bug"],
  };

  it("leads with the summary and replaces the deterministic steps", () => {
    const out = applyAI(baseSections, result, null);
    expect(out[0]?.name).toBe("Summary");
    expect(out[0]?.priority).toBe(0);
    const steps = out.find((s) => s.name === "Steps to Reproduce");
    expect(steps?.text).toBe("1. Go to checkout\n2. Hit Pay");
  });

  it("shapes onto the template and overlays AI field content", () => {
    const out = applyAI(baseSections, result, MARKDOWN_TEMPLATE);
    const describe = out.find((s) => s.name === "Describe the bug");
    expect(describe?.text).toBe("Paying 500s.");
    const reproduce = out.find((s) => s.name === "To Reproduce");
    expect(reproduce?.text).toBe("1. Go to checkout\n2. Hit Pay");
    expect(out.some((s) => s.text === "_No response_")).toBe(true);
  });

  it("ignores a mapping for an unknown template and falls back to shapeSections", () => {
    const wrong = { ...result, template: { filename: "other.md", fields: { x: "y" } } };
    const out = applyAI(baseSections, wrong, MARKDOWN_TEMPLATE);
    const describe = out.find((s) => s.name === "Describe the bug");
    expect(describe?.text).not.toBe("y");
  });

  it("ignores unknown field ids in an otherwise valid mapping", () => {
    const out = applyAI(
      baseSections,
      { ...result, template: { filename: "bug_report.md", fields: { nope: "y" } } },
      MARKDOWN_TEMPLATE,
    );
    expect(out.some((s) => s.text === "y")).toBe(false);
    expect(out.every((s) => s.text !== "_No response_")).toBe(false);
  });
});

describe("shapeSections with Summary (fallback parity)", () => {
  it("maps the Summary section onto a describe-style field", () => {
    const withSummary = [
      { name: "Summary", priority: 0, text: "It broke" },
      ...baseSections,
    ];
    const out = shapeSections(MARKDOWN_TEMPLATE, withSummary).sections;
    const describe = out.find((s) => s.name === "Describe the bug");
    expect(describe?.text).toBe("It broke");
  });
});

describe("buildSessionDigest", () => {
  it("keeps the timeline, environment, and evidence within caps", () => {
    const digest = buildSessionDigest(report, events, timeline, facts, []);
    expect(digest.steps.some((s) => s.includes("Submit"))).toBe(true);
    expect(digest.environment.browser).toBeTruthy();
    expect(digest.consoleErrors).toHaveLength(1);
    expect(digest.failedRequests).toHaveLength(1);
  });

  it("truncates long bodies", () => {
    const long = event({ k: "net", t: 700, status: 500, method: "GET", target: "/api/long", body: "z".repeat(3000) });
    const digest = buildSessionDigest(report, [...events, long], timeline, facts, []);
    const body = digest.failedRequests.find((r) => r.target === "/api/long")?.body;
    expect(body?.length).toBeLessThanOrEqual(1512);
    expect(body).toContain("(truncated)");
  });

  it("trims evidence oldest-first to the total budget", () => {
    const many = [
      ...events,
      ...Array.from({ length: 14 }, (_, i) =>
        event({ k: "console", t: 900 + i, lv: "error", msg: "m".repeat(900) }),
      ),
    ];
    const digest = buildSessionDigest(report, many, timeline, facts, []);
    const total = digest.consoleErrors.reduce(
      (sum, c) => sum + c.message.length + c.stack.length,
      0,
    );
    expect(total).toBeLessThanOrEqual(10_200);
    expect(digest.consoleErrors.length).toBeLessThan(15);
  });

  it("never includes typed values (timeline is redacted)", () => {
    const digest = buildSessionDigest(report, events, timeline, facts, []);
    const joined = JSON.stringify(digest);
    expect(joined).not.toContain("a@b.com");
  });

  it("includes the repo and parsed templates", () => {
    const digest = buildSessionDigest(report, events, timeline, facts, [MARKDOWN_TEMPLATE], "acme/widget");
    expect(digest.repo).toBe("acme/widget");
    expect(digest.templates[0]?.filename).toBe("bug_report.md");
    expect(digest.templates[0]?.fields[0]).toEqual({ id: "describe-the-bug", label: "Describe the bug" });
  });
});

describe("generateEnhancements (fallback matrix)", () => {
  const digest = buildSessionDigest(report, events, timeline, facts, []);
  const okBody = JSON.stringify({ ok: true, content: JSON.stringify({ title: "T", summary: "S" }) });

  const mockFetch = (status: number, body: unknown, error = false) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        if (error) throw new TypeError("network down");
        return new Response(JSON.stringify(body), { status });
      }),
    );
  };

  it("returns the parsed result on 200", async () => {
    mockFetch(200, JSON.parse(okBody));
    const out = await generateEnhancements(digest, [], "a/b");
    expect(out.ok).toBe(true);
    expect(out.status).toBe("ready");
    expect(out.result?.title).toBe("T");
  });

  it("maps 501 to server-off", async () => {
    mockFetch(501, { error: "ai_not_configured" });
    const out = await generateEnhancements(digest, [], "a/b");
    expect(out.ok).toBe(false);
    expect(out.status).toBe("server-off");
  });

  it.each([429, 502, 504, 500])("maps %i to unavailable", async (status) => {
    mockFetch(status, { error: "x" });
    const out = await generateEnhancements(digest, [], "a/b");
    expect(out).toEqual({ ok: false, status: "unavailable" });
  });

  it("maps network failure to unavailable", async () => {
    mockFetch(0, null, true);
    const out = await generateEnhancements(digest, [], "a/b");
    expect(out).toEqual({ ok: false, status: "unavailable" });
  });

  it("maps an unparseable completion to unavailable", async () => {
    mockFetch(200, { ok: true, content: "not json" });
    const out = await generateEnhancements(digest, [], "a/b");
    expect(out).toEqual({ ok: false, status: "unavailable" });
  });

  it("posts to the replay server AI route", async () => {
    const fetchMock = vi.fn(async () => new Response(okBody, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await generateEnhancements(digest, [MARKDOWN_TEMPLATE], "a/b");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${REPLAY_SERVER_URL}/api/ai/enhance`);
    const payload = JSON.parse(String(init.body)) as { repo: string; templates: unknown[] };
    expect(payload.repo).toBe("a/b");
    expect(payload.templates).toHaveLength(1);
  });
});

describe("ai-cache", () => {
  const memory = new Map<string, unknown>();

  const stubBrowser = () => {
    vi.stubGlobal("browser", {
      storage: {
        local: {
          get: async (key: string) =>
            memory.has(key) ? { [key]: memory.get(key) } : {},
          set: async (patch: Record<string, unknown>) => {
            for (const [k, v] of Object.entries(patch)) memory.set(k, v);
          },
        },
      },
    });
  };

  it("round-trips a result and keys by session hash + repo", async () => {
    stubBrowser();
    const result = { title: "T", summary: "S" };
    const key = aiCacheKey("hash1", "a/b");
    await rememberAIResult(key, result);
    expect(await getCachedAIResult(key)).toEqual(result);
    expect(await getCachedAIResult(aiCacheKey("hash1", "c/d"))).toBeNull();
    expect(await getCachedAIResult(aiCacheKey("hash2", "a/b"))).toBeNull();
  });

  it("returns null for a corrupted entry", async () => {
    stubBrowser();
    memory.set("trail:aiCache", { bad: { result: "corrupted", createdAt: 1 } });
    expect(await getCachedAIResult("bad")).toBeNull();
  });
});
