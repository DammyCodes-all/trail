// The Featherless proxy, shared by the Vercel function (api/ai/enhance.ts) and
// the local twin (server/index.mjs) so the two can't drift. The API key lives
// here in the server env — never in the extension.
//
// Error paths log the upstream status and error body (truncated) plus the
// payload size, so context-length and rate-limit failures are diagnosable.
// Prompts and completions are never logged.

const FEATHERLESS_BASE =
  process.env.AI_BASE_URL ?? "https://api.featherless.ai/v1";
const MODEL = process.env.AI_MODEL ?? "deepseek-ai/DeepSeek-V4-Flash-0731";
const MAX_ATTEMPTS = 2; // one retry covers transient 5xx / 429 / empty completions
const MAX_TOKENS = 30000;
const TEMPERATURE = 0.3;

// Rough tokens ≈ chars / 4 (English). Used only for the size log line.
const charsToTokens = (chars) => Math.round(chars / 4);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// AI enhancements are enabled only when the server holds a Featherless key.
// The extension degrades to the deterministic report when this is false.
export function isAiMode() {
  return Boolean(process.env.FEATHERLESS_API_KEY);
}

const SYSTEM_PROMPT = [
  "You are the report writer for TRAIL, a browser extension that turns a captured bug",
  "reproduction into a maintainer-ready GitHub issue.",
  "You receive a digest of captured evidence and the repo's issue templates.",
  "Rules:",
  "- Never invent facts that are not in the digest. If something is unknown, say so.",
  "- Never restate console errors, failed requests, or environment lines verbatim;",
  "  the evidence sections are rendered deterministically by the extension.",
  "- Use only field ids that exist in the provided templates.",
  "- Write concise, specific prose a maintainer can act on.",
  "- If the chosen template has a field for describing the issue (e.g. 'Summary',",
  "  'Describe the bug', 'What happened'), put the natural-language summary there.",
  "- Return exactly one JSON object. No Markdown, no code fences, no commentary.",
  "  Example shape:",
  '  {"title": "short issue title", "summary": "prose",',
  '   "steps": ["1. ", "2. "], "template": {"filename": "bug_report.md",',
  '   "fields": {"field-id": "value"}}, "labels": ["bug"]}',
  "- Only include keys you can fill from the digest; omit empty ones.",
].join("\n");

// POST a report digest to Featherless and return the model's raw completion
// text. The extension owns parsing and validation — this is a dumb pipe.
// Resolves { ok: true, content } on success, { ok: false, status, error }
// otherwise; never throws.
//
// No timeout: Featherless queues first requests behind a loading model and can
// take a while before the first token. We wait. One retry covers transient 5xx
// and empty completions; the per-IP rate limiter caps abuse.
export async function proxyEnhance({ digest, templates, repo }) {
  const payload = JSON.stringify({
    model: MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    // V4 thinking mode on: reasoning is allowed and can spend the output
    // budget, so MAX_TOKENS stays large enough for both reasoning and the
    // final JSON. If Featherless ignores this field, it degrades to whatever
    // the model defaults to.
    thinking: { type: "enabled" },
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
      const res = await fetch(`${FEATHERLESS_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.FEATHERLESS_API_KEY}`,
          "http-referer": "https://github.com/DammyCodes-all/trail",
          "x-title": "TRAIL",
        },
        body: payload,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(
          `[ai-proxy] attempt ${attempt} upstream ${res.status}, ${logSize()}: ${body.slice(0, 500)}`,
        );
        // 429 is a concurrency/rate limit — transient like 5xx, so retry once
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
        // JSON-mode empty (stop), thinking spent the budget (length + reasoning),
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
