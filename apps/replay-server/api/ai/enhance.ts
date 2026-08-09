// POST /api/ai/enhance → proxy a report-enhancement call to OpenRouter.
// Thin route: validate the body, rate-limit per IP, delegate to the shared
// proxy (lib/ai-proxy.js), map errors. The extension owns parsing and the
// deterministic fallback — the server never inspects report content.

import { isOpenRouterConfigured, proxyEnhance } from "../../lib/ai-proxy.js";
import { aiEnhanceLimiter, tryConsume } from "../../lib/rate-limit.js";

export const config = { runtime: "nodejs" };

const MAX_BODY = 1024 * 1024; // digests are ~10KB; this is abuse headroom

const clientIp = (request: Request): string =>
  (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
  "unknown";

export async function POST(request: Request): Promise<Response> {
  if (!isOpenRouterConfigured()) {
    return Response.json({ error: "ai_not_configured" }, { status: 501 });
  }

  const allowed = await tryConsume(aiEnhanceLimiter, clientIp(request));
  if (!allowed.ok) {
    return Response.json(
      { error: "rate_limited", retryAfterSecs: allowed.retryAfterSecs },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) {
      return Response.json({ error: "payload_too_large" }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const { digest, templates, repo, chosenTemplate } = (body ?? {}) as {
    digest?: unknown;
    templates?: unknown;
    repo?: unknown;
    chosenTemplate?: unknown;
  };
  if (
    typeof digest !== "object" ||
    digest === null ||
    !Array.isArray(templates) ||
    (typeof repo !== "string" && repo !== undefined) ||
    (typeof chosenTemplate !== "object" &&
      chosenTemplate !== undefined &&
      chosenTemplate !== null)
  ) {
    return Response.json({ error: "bad_payload" }, { status: 400 });
  }

  const upstream = await proxyEnhance({ digest, templates, repo, chosenTemplate });
  if (!upstream.ok) {
    return Response.json({ error: upstream.error }, { status: upstream.status });
  }
  return Response.json({ ok: true, content: upstream.content });
}
