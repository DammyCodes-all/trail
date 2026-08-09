import { afterEach, describe, expect, it, vi } from "vitest";
import { REPLAY_SERVER_URL } from "./constants";
import {
  buildSessionDigest,
  buildTitleDigest,
  generateEnhancements,
  generateTitle,
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
    { id: "actual-behavior", label: "Actual behavior" },
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
    expect(out?.title?.length).toBe(100);
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

  it("routes flagged Expected/Actual notes into the template's own fields", () => {
    const flaggedEvents = [
      ...events,
      event({
        k: "flag",
        t: 900,
        expected: "Cart keeps items",
        actual: "Cart empties",
      }),
    ];
    const sections = buildSections(report, flaggedEvents, { redact: true });
    const out = shapeSections(MARKDOWN_TEMPLATE, sections).sections;
    const expected = out.find((s) => s.name === "Expected behavior");
    const actual = out.find((s) => s.name === "Actual behavior");
    expect(expected?.text).toContain("Cart keeps items");
    expect(actual?.text).toContain("Cart empties");
  });

  it("does not misroute a field that merely mentions 'happened' mid-sentence", () => {
    const deploymentTemplate: IssueTemplate = {
      ...MARKDOWN_TEMPLATE,
      fields: [
        { id: "describe-the-bug", label: "Describe the bug" },
        { id: "deployment", label: "What actually happened during deployment" },
        { id: "to-reproduce", label: "To Reproduce" },
      ],
    };
    const flaggedEvents = [
      ...events,
      event({ k: "flag", t: 900, expected: "Cart keeps items" }),
    ];
    const sections = buildSections(report, flaggedEvents, { redact: true });
    const out = shapeSections(deploymentTemplate, sections).sections;
    const deployment = out.find((s) => s.name === "What actually happened during deployment");
    expect(deployment?.text).toBe("_No response_");
  });
});

describe("buildSessionDigest", () => {
  it("keeps the timeline, environment, and evidence within caps", () => {
    const digest = buildSessionDigest(report, events, timeline, facts);
    expect(digest.steps.some((s) => s.includes("Submit"))).toBe(true);
    expect(digest.environment.browser).toBeTruthy();
    expect(digest.consoleErrors).toHaveLength(1);
    expect(digest.failedRequests).toHaveLength(1);
  });

  it("truncates long bodies", () => {
    const long = event({ k: "net", t: 700, status: 500, method: "GET", target: "/api/long", body: "z".repeat(3000) });
    const digest = buildSessionDigest(report, [...events, long], timeline, facts);
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
    const digest = buildSessionDigest(report, many, timeline, facts);
    const total = digest.consoleErrors.reduce(
      (sum, c) => sum + c.message.length + c.stack.length,
      0,
    );
    expect(total).toBeLessThanOrEqual(10_200);
    expect(digest.consoleErrors.length).toBeLessThan(15);
  });

  it("never includes typed values (timeline is redacted)", () => {
    const digest = buildSessionDigest(report, events, timeline, facts);
    const joined = JSON.stringify(digest);
    expect(joined).not.toContain("a@b.com");
  });

  it("keeps the repo; templates travel in the payload, not the digest", () => {
    const digest = buildSessionDigest(report, events, timeline, facts, "acme/widget");
    expect(digest.repo).toBe("acme/widget");
    expect("templates" in digest).toBe(false);
  });

  it("normalizes nav step URLs to host+path (no query strings)", () => {
    const withNav = [
      event({ k: "nav", t: 0, reload: false, url: "https://example.com/checkout?token=abc" }),
      ...events.filter((e) => e.k !== "nav"),
    ];
    const digest = buildSessionDigest(report, withNav, buildTimeline(withNav), facts);
    expect(digest.steps.some((s) => s.includes("token=abc"))).toBe(false);
    expect(digest.steps.some((s) => s.includes("Navigate to example.com/checkout"))).toBe(true);
    expect(JSON.stringify(digest)).not.toContain("token=abc");
  });

  it("counts stats post-fold and beacon-free, matching the arrays the model sees", () => {
    const noisy = [
      ...events,
      event({ k: "console", t: 900, lv: "error", msg: "loop boom" }),
      event({ k: "console", t: 950, lv: "error", msg: "loop boom" }),
      event({ k: "console", t: 1000, lv: "error", msg: "loop boom" }),
      event({ k: "net", t: 1100, status: 404, method: "GET", target: "https://analytics.example.com/collect" }),
    ];
    const digest = buildSessionDigest(report, noisy, buildTimeline(noisy), facts);
    expect(digest.stats).toMatch(/2 console errors/);
    expect(digest.stats).toMatch(/1 failed requests/);
    expect(digest.stats).toMatch(/flagged moments/);
  });

  it("carries reporter flags with time offsets and notes", () => {
    const flagged = [
      ...events,
      event({ k: "flag", t: 900, expected: "Cart keeps items", actual: "Cart empties" }),
    ];
    const digest = buildSessionDigest(report, flagged, timeline, facts);
    expect(digest.flags).toEqual([
      { at: "00:00", expected: "Cart keeps items", actual: "Cart empties" },
    ]);
  });

  it("includes flags without notes and caps the flag list", () => {
    const manyFlags = [
      ...Array.from({ length: 7 }, (_, i) =>
        event({ k: "flag", t: 900 + i, expected: `note ${i}` }),
      ),
    ];
    const digest = buildSessionDigest(report, manyFlags, timeline, facts);
    expect(digest.flags).toHaveLength(5);
    expect(digest.flags.at(-1)?.expected).toBe("note 6");
    expect(digest.flags.some((f) => f.at)).toBe(true);
  });
});

describe("buildTitleDigest", () => {
  it("keeps every flag — the title's strongest signal is never capped", () => {
    const manyFlags = Array.from({ length: 7 }, (_, i) =>
      event({ k: "flag", t: 900 + i, expected: `note ${i}` }),
    );
    const digest = buildTitleDigest(report, [...events, ...manyFlags], timeline, facts);
    expect(digest.flags).toHaveLength(7);
    expect(digest.flags.at(-1)?.expected).toBe("note 6");
  });

  it("normalizes nav step URLs to host+path (no query strings)", () => {
    const withNav = [
      event({ k: "nav", t: 0, reload: false, url: "https://example.com/checkout?token=abc" }),
      event({ k: "nav", t: 100, reload: true, url: "https://example.com/checkout?token=abc" }),
      ...events.filter((e) => e.k !== "nav"),
    ];
    const digest = buildTitleDigest(report, withNav, buildTimeline(withNav), facts);
    expect(digest.steps[0]).toBe("Navigate to example.com/checkout");
    expect(digest.steps[1]).toBe("Reloaded example.com/checkout");
    expect(JSON.stringify(digest)).not.toContain("token=abc");
  });

  it("keeps the stack top of console errors and host+path request targets", () => {
    const withConsole = event({
      k: "console",
      t: 900,
      lv: "error",
      msg: "TypeError: x is undefined",
      stack: "at a\nat b\nat c\nat d\nat e\nat f",
      url: "https://example.com/app?x=1",
    });
    const withNet = event({
      k: "net",
      t: 950,
      status: 500,
      method: "POST",
      target: "https://example.com/api/order?key=1",
    });
    const digest = buildTitleDigest(
      report,
      [...events, withConsole, withNet],
      timeline,
      facts,
    );
    const error = digest.consoleErrors.at(-1);
    expect(error?.stack?.split("\n")).toHaveLength(5);
    expect(error?.stack).toContain("at e");
    expect(error?.stack).not.toContain("at f");
    expect(error?.page).toBe("/app");
    const target = digest.failedRequests.at(-1)?.target;
    expect(target).toBe("example.com/api/order");
    expect(JSON.stringify(digest)).not.toContain("?x=1");
    expect(JSON.stringify(digest)).not.toContain("?key=1");
  });

  it("carries whole-session stats and the page host+path", () => {
    const digest = buildTitleDigest(report, events, timeline, facts);
    expect(digest.stats).toMatch(/flagged moments/);
    expect(digest.stats).toMatch(/1 console errors/);
    expect(digest.stats).toMatch(/1 failed requests/);
    expect(digest.environment.page).toBe("example.com");
    expect(digest.environment.duration).toBeTruthy();
  });

  it("trims evidence oldest-first to the budget with flags surviving longest", () => {
    const spam = Array.from({ length: 14 }, (_, i) =>
      event({ k: "console", t: 900 + i, lv: "error", msg: "m".repeat(900) }),
    );
    const flags = Array.from({ length: 3 }, (_, i) =>
      event({ k: "flag", t: 1900 + i, expected: `note ${i}` }),
    );
    const digest = buildTitleDigest(report, [...events, ...spam, ...flags], timeline, facts);
    const total = digest.consoleErrors.reduce(
      (sum, c) => sum + c.message.length + c.stack.length,
      0,
    );
    expect(total).toBeLessThanOrEqual(8_200);
    expect(digest.consoleErrors.length).toBeLessThan(15);
    expect(digest.flags).toHaveLength(3);
  });

  it("never includes typed values", () => {
    const withInput = [
      ...events,
      event({ k: "input", t: 800, label: "Email", masked: true, value: "a@b.com" }),
    ];
    const digest = buildTitleDigest(report, withInput, buildTimeline(withInput), facts);
    expect(JSON.stringify(digest)).not.toContain("a@b.com");
  });
});

describe("generateTitle (fallback matrix)", () => {
  const digest = buildTitleDigest(report, events, timeline, facts);
  const okBody = JSON.stringify({
    ok: true,
    content: '```json\n{"title": "Broken checkout"}\n```',
  });

  const mockFetch = (status: number, body: unknown, error = false) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        if (error) throw new TypeError("network down");
        return new Response(JSON.stringify(body), { status });
      }),
    );
  };

  it("returns the parsed title on 200", async () => {
    mockFetch(200, JSON.parse(okBody));
    const out = await generateTitle(digest);
    expect(out.ok).toBe(true);
    expect(out.status).toBe("ready");
    expect(out.title).toBe("Broken checkout");
  });

  it("maps 501 to server-off", async () => {
    mockFetch(501, { error: "ai_not_configured" });
    const out = await generateTitle(digest);
    expect(out.ok).toBe(false);
    expect(out.status).toBe("server-off");
    expect(out.title).toBeUndefined();
  });

  it.each([429, 502, 504, 500])("maps %i to unavailable", async (status) => {
    mockFetch(status, { error: "x" });
    const out = await generateTitle(digest);
    expect(out).toEqual({ ok: false, status: "unavailable" });
  });

  it("maps network failure to unavailable", async () => {
    mockFetch(0, null, true);
    const out = await generateTitle(digest);
    expect(out).toEqual({ ok: false, status: "unavailable" });
  });

  it("maps an unparseable completion to unavailable", async () => {
    mockFetch(200, { ok: true, content: "not json" });
    const out = await generateTitle(digest);
    expect(out).toEqual({ ok: false, status: "unavailable" });
  });

  it("maps a completion without a title to unavailable", async () => {
    mockFetch(200, { ok: true, content: JSON.stringify({ summary: "S" }) });
    const out = await generateTitle(digest);
    expect(out).toEqual({ ok: false, status: "unavailable" });
  });

  it("posts the digest to the replay server title route", async () => {
    const fetchMock = vi.fn(async () => new Response(okBody, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await generateTitle(digest);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${REPLAY_SERVER_URL}/api/ai/title`);
    const payload = JSON.parse(String(init.body)) as { digest: { stats: string } };
    expect(payload.digest.stats).toContain("flagged moments");
  });
});

describe("generateEnhancements (fallback matrix)", () => {
  const digest = buildSessionDigest(report, events, timeline, facts);
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
    const out = await generateEnhancements(digest, [], "a/b", null);
    expect(out.ok).toBe(true);
    expect(out.status).toBe("ready");
    expect(out.result?.title).toBe("T");
  });

  it("maps 501 to server-off", async () => {
    mockFetch(501, { error: "ai_not_configured" });
    const out = await generateEnhancements(digest, [], "a/b", null);
    expect(out.ok).toBe(false);
    expect(out.status).toBe("server-off");
  });

  it.each([429, 502, 504, 500])("maps %i to unavailable", async (status) => {
    mockFetch(status, { error: "x" });
    const out = await generateEnhancements(digest, [], "a/b", null);
    expect(out).toEqual({ ok: false, status: "unavailable" });
  });

  it("maps network failure to unavailable", async () => {
    mockFetch(0, null, true);
    const out = await generateEnhancements(digest, [], "a/b", null);
    expect(out).toEqual({ ok: false, status: "unavailable" });
  });

  it("maps an unparseable completion to unavailable", async () => {
    mockFetch(200, { ok: true, content: "not json" });
    const out = await generateEnhancements(digest, [], "a/b", null);
    expect(out).toEqual({ ok: false, status: "unavailable" });
  });

  it("posts to the replay server AI route with template list and chosen template", async () => {
    const fetchMock = vi.fn(async () => new Response(okBody, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await generateEnhancements(digest, [MARKDOWN_TEMPLATE], "a/b", MARKDOWN_TEMPLATE);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${REPLAY_SERVER_URL}/api/ai/enhance`);
    const payload = JSON.parse(String(init.body)) as {
      repo: string;
      templates: unknown[];
      chosenTemplate: unknown;
    };
    expect(payload.repo).toBe("a/b");
    expect(payload.templates).toHaveLength(1);
    expect(payload.chosenTemplate).toEqual(MARKDOWN_TEMPLATE);
  });

  it("omits the chosen template when there is none", async () => {
    const fetchMock = vi.fn(async () => new Response(okBody, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await generateEnhancements(digest, [], "a/b", null);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect("chosenTemplate" in payload).toBe(false);
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
