// GET /api/replays/<id> → the session JSON itself.
import { get } from '../../lib/storage.js';

export const config = { runtime: 'nodejs' };

const ID_RE = /^[A-Za-z0-9.-]{1,64}$/;

export default async function handler(req: Request): Promise<Response> {
  const id = new URL(req.url).pathname.split('/').pop() ?? '';
  if (!ID_RE.test(id)) {
    return new Response('missing id', { status: 400 });
  }
  const data = await get(id);
  if (!data) {
    return new Response('not found', { status: 404 });
  }
  return Response.json(data);
}
