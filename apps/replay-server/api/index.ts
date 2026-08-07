// GET / — server info. Handy for confirming a deployment is live and which
// storage mode it runs in (isBlobMode() is true when BLOB_READ_WRITE_TOKEN
// is set in the function env).
import { isBlobMode } from "../lib/storage.js";
import { isAiMode } from "../lib/ai-proxy.js";

export const config = { runtime: "nodejs" };

export function GET(): Response {
  return Response.json({
    name: "trail-replay-server",
    version: "1.0.0",
    storage: isBlobMode() ? "vercel-blob" : "file",
    ai: isAiMode() ? "enabled" : "disabled",
    routes: {
      "POST /api/replays/presign": "get a presigned upload URL, returns { id, uploadUrl }",
      "PUT <uploadUrl>": "upload the session directly (Blob, up to 50MB)",
      "GET /api/replays/<id>": "fetch a stored session",
    },
  });
}
