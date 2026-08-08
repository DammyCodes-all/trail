// The Groq proxy, shared by the Vercel function (api/ai/enhance.ts) and the
// local twin (server/index.mjs) so the two can't drift. The API key lives here
// in the server env — never in the extension.
//
// Error paths log the upstream status and error body (truncated) plus the
// payload size, so context-length and rate-limit failures are diagnosable.
// Prompts and completions are never logged.

const GROQ_BASE =
  process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
const MODEL = process.env.AI_MODEL ?? "openai/gpt-oss-120b";
const MAX_ATTEMPTS = 2; // one retry covers transient 5xx / 429 / empty completions
// Generous cap for a report JSON (structured summaries + template field
// values); keeps latency and cost bounded no matter how the model behaves.
const MAX_TOKENS = 15000;
const TEMPERATURE = 0.3;

// Rough tokens ≈ chars / 4 (English). Used only for the size log line.
const charsToTokens = (chars) => Math.round(chars / 4);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// AI enhancements are enabled only when the server holds a Groq key.
// The extension degrades to the deterministic report when this is false.
export function isAiMode() {
  return Boolean(process.env.GROQ_API_KEY);
}

const SYSTEM_PROMPT = [
  "You are the report writer for TRAIL, a browser extension that turns a captured bug",
  "reproduction into a maintainer-ready GitHub issue.",
  "You receive a digest of captured evidence and the repo's issue templates.",
  "Rules:",
  "- Never invent facts that are not in the digest. If something is unknown, say so.",
  "- Never restate console errors, failed requests, or environment lines verbatim;",
  "  the evidence sections are rendered deterministically by the extension.",
  "- Digest 'flags' are moments the reporter explicitly marked during recording,",
  "  with their own words for expected vs actual outcome. They are the most",
  "  reliable statement of intent in the whole digest: anchor the title, the",
  "  summary, and any expected/actual template field on them. Prefer the",
  "  reporter's phrasing; never soften or contradict it. A flag without notes",
  "  still marks a moment the reporter found wrong — account for it in the",
  "  summary when it stands out in the step sequence.",
  "- If the chosen template has a field for the expected outcome (e.g.",
  "  'Expected behavior', 'What did you expect to happen?'), fill it from the",
  "  flagged expected notes when present; likewise the actual-outcome field",
  "  from flagged actual notes. Do not invent expected/actual content that the",
  "  digest does not contain.",
  "- Use only field ids that exist in the provided templates.",
  "- Write concise, specific prose a maintainer can act on.",
  "- If the chosen template has a field for describing the issue (e.g. 'Summary',",
  "  'Describe the bug', 'What happened'), put the natural-language summary there.",
  "- When the templates list is empty (the repo has no issue template), structure",
  "  the 'summary' field as the industry-standard bug report: **Problem** (one",
  "  line), **Expected vs Actual** (what should happen vs what actually",
  "  happened), **Root cause** (only when the digest's evidence supports it),",
  "  **Impact** (who/what is affected). One or two sentences per label, concise.",
  "- Return exactly one JSON object. No Markdown, no code fences, no commentary.",
  "  Example shape:",
  '  {"title": "short issue title", "summary": "prose",',
  '   "steps": ["1. ", "2. "], "template": {"filename": "bug_report.md",',
  '   "fields": {"field-id": "value"}}, "labels": ["bug"]}',
  "- Only include keys you can fill from the digest; omit empty ones.",
].join("\n");

// POST a report digest to Groq and return the model's raw completion text.
// The extension owns parsing and validation — this is a dumb pipe.
// Resolves { ok: true, content } on success, { ok: false, status, error }
// otherwise; never throws.
//
// No timeout: slow first-token latency is tolerated; the per-IP rate limiter
// caps abuse. One retry covers transient 5xx, 429 rate limits, and empty
// completions.
export async function proxyEnhance({ digest, templates, repo }) {
  const payload = JSON.stringify({
    model: MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          task: "Write the report enhancements for this captured bug.",
          repo,
          digest,
          templates,
        }),
      },
    ],
  });
  const logSize = () =>
    `payload ${payload.length} chars (~${charsToTokens(payload.length)} tokens)`;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: payload,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(
          `[ai-proxy] attempt ${attempt} upstream ${res.status}, ${logSize()}: ${body.slice(0, 500)}`,
        );
        // 429 is a rate/concurrency limit — transient like 5xx, so retry once
        // after a short backoff (honor Retry-After when the upstream sends it).
        if (
          (res.status >= 500 || res.status === 429) &&
          attempt < MAX_ATTEMPTS
        ) {
          const retryAfter = Number(res.headers.get("retry-after"));
          await sleep(retryAfter > 0 ? retryAfter * 1000 : 2500);
          continue;
        }
        return { ok: false, status: 502, error: `upstream_${res.status}` };
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        // Log why the completion is empty so the failure mode is diagnosable:
        // JSON-mode empty (stop), reasoning spent the budget (length + reasoning),
        // or a routing quirk. Reasoning length only — never the reasoning text.
        const choice = data?.choices?.[0];
        console.error(
          `[ai-proxy] attempt ${attempt} empty completion, ${logSize()}: ` +
            `finish=${choice?.finish_reason ?? "unknown"} ` +
            `reasoningChars=${choice?.message?.reasoning_content?.length ?? 0} ` +
            `completionTokens=${data?.usage?.completion_tokens ?? "unknown"}`,
        );
        if (attempt < MAX_ATTEMPTS) continue;
        return { ok: false, status: 502, error: "empty_completion" };
      }
      return { ok: true, content };
    } catch (err) {
      console.error(
        `[ai-proxy] attempt ${attempt} error, ${logSize()}: ${
          err?.message ?? String(err)
        }`,
      );
      if (attempt < MAX_ATTEMPTS) continue;
      return { ok: false, status: 502, error: "upstream_error" };
    }
  }
  return { ok: false, status: 502, error: "upstream_error" };
}
