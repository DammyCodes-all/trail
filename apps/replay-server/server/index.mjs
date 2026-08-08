// Local twin of the Vercel functions: same routes, file-backed storage.
//   POST /api/replays/presign       → { id, uploadUrl } (uploads via PUT)
//   PUT  /api/replays/upload/<id>   → store the session body
//   GET  /api/replays/<id>          → session JSON
//   POST /api/ai/enhance            → proxy a report-enhancement to Groq
//   POST /api/ai/title              → proxy a title-only completion to Groq
import http from "node:http";
import { randomUUID } from "node:crypto";
import { put, get, isBlobMode } from "../lib/storage.js";
import { isAiMode, proxyEnhance, proxyTitle } from "../lib/ai-proxy.js";
import { aiEnhanceLimiter, tryConsume } from "../lib/rate-limit.js";

const PORT = Number(process.env.REPLAY_PORT ?? 8898);
const MAX_BODY = 50 * 1024 * 1024; // matches Blob's per-blob cap
const MAX_AI_BODY = 1024 * 1024; // AI digests are ~10KB; this is abuse headroom

const ID_RE = /^[A-Za-z0-9.-]{1,64}$/;

const json = (res, code, data) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
};

const clientIp = (req) =>
  (req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim() ||
  req.socket.remoteAddress ||
  "unknown";

async function handleAiEnhance(req, res) {
  if (!isAiMode()) {
    json(res, 501, { error: "ai_not_configured" });
    return;
  }
  const allowed = await tryConsume(aiEnhanceLimiter, clientIp(req));
  if (!allowed.ok) {
    json(res, 429, {
      error: "rate_limited",
      retryAfterSecs: allowed.retryAfterSecs,
    });
    return;
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_AI_BODY) {
      json(res, 413, { error: "payload_too_large" });
      return;
    }
    chunks.push(chunk);
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    json(res, 400, { error: "invalid_json" });
    return;
  }
  const { digest, templates, repo } = body ?? {};
  if (
    typeof digest !== "object" ||
    digest === null ||
    !Array.isArray(templates) ||
    (typeof repo !== "string" && repo !== undefined)
  ) {
    json(res, 400, { error: "bad_payload" });
    return;
  }

  const upstream = await proxyEnhance({ digest, templates, repo });
  if (!upstream.ok) {
    json(res, upstream.status, { error: upstream.error });
    return;
  }
  json(res, 200, { ok: true, content: upstream.content });
}

async function handleAiTitle(req, res) {
  if (!isAiMode()) {
    json(res, 501, { error: "ai_not_configured" });
    return;
  }
  const allowed = await tryConsume(aiEnhanceLimiter, clientIp(req));
  if (!allowed.ok) {
    json(res, 429, {
      error: "rate_limited",
      retryAfterSecs: allowed.retryAfterSecs,
    });
    return;
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_AI_BODY) {
      json(res, 413, { error: "payload_too_large" });
      return;
    }
    chunks.push(chunk);
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    json(res, 400, { error: "invalid_json" });
    return;
  }
  const { digest } = body ?? {};
  if (typeof digest !== "object" || digest === null) {
    json(res, 400, { error: "bad_payload" });
    return;
  }

  const upstream = await proxyTitle({ digest });
  if (!upstream.ok) {
    json(res, upstream.status, { error: upstream.error });
    return;
  }
  json(res, 200, { ok: true, content: upstream.content });
}

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, `http://localhost:${PORT}`).pathname;

  if (req.method === "GET" && path === "/") {
    json(res, 200, {
      name: "trail-replay-server",
      version: "1.0.0",
      storage: isBlobMode() ? "vercel-blob" : "file",
      ai: isAiMode() ? "enabled" : "disabled",
    });
    return;
  }

  if (req.method === "POST" && path === "/api/replays/presign") {
    const id = randomUUID();
    json(res, 200, {
      id,
      uploadUrl: `http://localhost:${PORT}/api/replays/upload/${id}`,
    });
    return;
  }

  const uploadMatch = path.match(/^\/api\/replays\/upload\/([A-Za-z0-9.-]+)$/);
  if (req.method === "PUT" && uploadMatch && ID_RE.test(uploadMatch[1])) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_BODY) {
        res.writeHead(413, { "content-type": "text/plain" });
        res.end("replay too large");
        return;
      }
      chunks.push(chunk);
    }
    let data;
    try {
      data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      json(res, 400, { error: "invalid json" });
      return;
    }
    if (!data || !Array.isArray(data.events)) {
      json(res, 400, { error: "events array required" });
      return;
    }
    try {
      await put(uploadMatch[1], data);
    } catch (err) {
      json(res, 500, { error: `storage failed: ${err.message}` });
      return;
    }
    json(res, 200, { id: uploadMatch[1] });
    return;
  }

  if (req.method === "POST" && path === "/api/ai/enhance") {
    await handleAiEnhance(req, res);
    return;
  }

  if (req.method === "POST" && path === "/api/ai/title") {
    await handleAiTitle(req, res);
    return;
  }

  const dataMatch = path.match(/^\/api\/replays\/([A-Za-z0-9.-]+)$/);
  if (req.method === "GET" && dataMatch && ID_RE.test(dataMatch[1])) {
    const data = await get(dataMatch[1]);
    if (!data) {
      json(res, 404, { error: "not found" });
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(data));
    return;
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

server.listen(PORT, () => {
  console.log(
    `replay server on http://localhost:${PORT}${isBlobMode() ? " (Vercel Blob)" : " (file storage)"}`,
  );
});
