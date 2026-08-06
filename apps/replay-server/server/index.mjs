// Local twin of the Vercel functions: same routes, file-backed storage.
//   POST /api/replays/presign       → { id, uploadUrl } (uploads via PUT)
//   PUT  /api/replays/upload/<id>   → store the session body
//   GET  /api/replays/<id>          → session JSON
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { put, get, isBlobMode } from '../lib/storage.js';

const PORT = Number(process.env.REPLAY_PORT ?? 8898);
const MAX_BODY = 50 * 1024 * 1024; // matches Blob's per-blob cap

const ID_RE = /^[A-Za-z0-9.-]{1,64}$/;

const json = (res, code, data) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, `http://localhost:${PORT}`).pathname;

  if (req.method === 'GET' && path === '/') {
    json(res, 200, {
      name: 'trail-replay-server',
      version: '1.0.0',
      storage: isBlobMode() ? 'vercel-blob' : 'file',
      routes: {
        'POST /api/replays/presign': 'get a presigned upload URL, returns { id, uploadUrl }',
        'PUT <uploadUrl>': 'upload the session directly (Blob or this server in dev)',
        'GET /api/replays/<id>': 'fetch a stored session',
      },
    });
    return;
  }

  if (req.method === 'POST' && path === '/api/replays/presign') {
    const id = randomUUID();
    json(res, 200, {
      id,
      uploadUrl: `http://localhost:${PORT}/api/replays/upload/${id}`,
    });
    return;
  }

  const uploadMatch = path.match(/^\/api\/replays\/upload\/([A-Za-z0-9.-]+)$/);
  if (req.method === 'PUT' && uploadMatch && ID_RE.test(uploadMatch[1])) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_BODY) {
        res.writeHead(413, { 'content-type': 'text/plain' });
        res.end('replay too large');
        return;
      }
      chunks.push(chunk);
    }
    let data;
    try {
      data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      json(res, 400, { error: 'invalid json' });
      return;
    }
    if (!data || !Array.isArray(data.events)) {
      json(res, 400, { error: 'events array required' });
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

  const dataMatch = path.match(/^\/api\/replays\/([A-Za-z0-9.-]+)$/);
  if (req.method === 'GET' && dataMatch && ID_RE.test(dataMatch[1])) {
    const data = await get(dataMatch[1]);
    if (!data) {
      json(res, 404, { error: 'not found' });
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`replay server on http://localhost:${PORT}${isBlobMode() ? ' (Vercel Blob)' : ' (file storage)'}`);
});
