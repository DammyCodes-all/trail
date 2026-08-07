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
const TIMEOUT_MS = 25_000;
const MAX_TOKENS = 1600;
const TEMPERATURE = 0.3;

// Rough tokens ≈ chars / 4 (English). Used only for the size log line.
const charsToTokens = (chars) => Math.round(chars / 4);

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
  "- Respond with valid JSON only.",
].join("\n");

// POST a report digest to Featherless and return the model's raw completion
// text. The extension owns parsing and validation — this is a dumb pipe.
// Resolves { ok: true, content } on success, { ok: false, status, error }
// otherwise; never throws.
export async function proxyEnhance({ digest, templates, repo }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
  try {
    const res = await fetch(`${FEATHERLESS_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.FEATHERLESS_API_KEY}`,
        "http-referer": "https://github.com/DammyCodes-all/trail",
        "x-title": "TRAIL",
      },
      signal: controller.signal,
      body: payload,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[ai-proxy] upstream ${res.status}, ${logSize()}: ${body.slice(0, 500)}`,
      );
      return { ok: false, status: 502, error: `upstream_${res.status}` };
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      console.error(`[ai-proxy] empty completion, ${logSize()}`);
      return { ok: false, status: 502, error: "empty_completion" };
    }
    return { ok: true, content };
  } catch (err) {
    console.error(
      `[ai-proxy] upstream ${controller.signal.aborted ? "timeout" : "error"}, ${logSize()}: ${
        err?.message ?? String(err)
      }`,
    );
    return { ok: false, status: 504, error: "upstream_timeout" };
  } finally {
    clearTimeout(timer);
  }
}
