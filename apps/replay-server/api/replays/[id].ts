// GET /api/replays/<id> → the session JSON itself.
import { get } from '../../lib/storage.js';
import { optionsResponse, withCors } from '../../lib/cors.js';

export const config = { runtime: 'nodejs' };

export function OPTIONS(): Response {
  return optionsResponse();
}

const ID_RE = /^[A-Za-z0-9.-]{1,64}$/;

export function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).pathname.split('/').pop() ?? '';
  if (!ID_RE.test(id)) {
    return Promise.resolve(withCors(new Response('missing id', { status: 400 })));
  }
  return get(id).then((data) => {
    if (!data) {
      return withCors(new Response('not found', { status: 404 }));
    }
    return withCors(Response.json(data));
  });
}
