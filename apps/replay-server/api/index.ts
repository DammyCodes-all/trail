// GET / — server info. Handy for confirming a deployment is live and which
// storage mode it runs in (isBlobMode() is true when BLOB_READ_WRITE_TOKEN
// is set in the function env). Named exports opt into Vercel's Web fetch-style
// function API; a default export runs in Node (req, res) mode instead.
import { isBlobMode } from '../lib/storage.js';

export const config = { runtime: 'nodejs' };

export function GET(): Response {
  return Response.json({
    name: 'trail-replay-server',
    version: '1.0.0',
    storage: isBlobMode() ? 'vercel-blob' : 'file',
    routes: {
      'POST /api/replays': 'store a shared session, returns { id }',
      'GET /api/replays/<id>': 'fetch a stored session',
    },
  });
}
