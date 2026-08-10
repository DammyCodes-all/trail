// CORS for the web review viewer. The extension fetches these routes with
// <all_urls> host permission (no CORS needed); the web app's /r/<id> page is a
// plain browser page, so the replay server must allow its cross-origin GETs
// and AI POSTs (the POSTs also need the preflight OPTIONS + content-type
// header). Everything here is deliberately permissive: replay IDs are
// unguessable secrets, and AI bodies are redacted digests.
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Max-Age': '86400',
};

export function withCors(response: Response): Response {
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export function optionsResponse(): Response {
  return withCors(new Response(null, { status: 204 }));
}
