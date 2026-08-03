// GET /api/replays/<id>       → player page (rrweb rebuilds the session)
// GET /api/replays/<id>.json  → the session JSON itself
// Also answers the /r/<id> rewrite (vercel.json) since it maps here directly.
import { get } from '../../lib/storage.js';
import { playerHtml } from '../../lib/player.js';

export const config = { runtime: 'nodejs' };

const ID_RE = /^[A-Za-z0-9.-]{1,64}$/;

export default async function handler(req: Request): Promise<Response> {
  const path = new URL(req.url).pathname;
  let id = path.split('/').pop() ?? '';
  const isJson = id.endsWith('.json');
  if (isJson) id = id.slice(0, -'.json'.length);
  if (!ID_RE.test(id)) {
    return new Response('missing id', { status: 400 });
  }
  if (!isJson) {
    return new Response(playerHtml(id), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }
  const data = await get(id);
  if (!data) {
    return new Response('not found', { status: 404 });
  }
  return Response.json(data);
}
