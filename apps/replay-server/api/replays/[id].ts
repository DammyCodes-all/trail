// GET /api/replays/<id> → the session JSON itself.
import { get } from '../../lib/storage.js';

export const config = { runtime: 'nodejs' };

const ID_RE = /^[A-Za-z0-9.-]{1,64}$/;

export function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).pathname.split('/').pop() ?? '';
  if (!ID_RE.test(id)) {
    return Promise.resolve(new Response('missing id', { status: 400 }));
  }
  return get(id).then((data) => {
    if (!data) {
      return new Response('not found', { status: 404 });
    }
    return Response.json(data);
  });
}
