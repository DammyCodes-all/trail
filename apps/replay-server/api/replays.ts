// POST /api/replays — accept a shared session { v, title, exportedAt, report,
// events }, store it, return { id }. The share link is <origin>/api/replays/<id>.
import { randomUUID } from 'node:crypto';
import { put } from '../lib/storage.js';

const MAX_BODY = 30 * 1024 * 1024;

export const config = { runtime: 'nodejs' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY) {
    return new Response('replay too large', { status: 413 });
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return new Response('invalid json', { status: 400 });
  }
  if (!data || typeof data !== 'object' || !Array.isArray((data as { events?: unknown }).events)) {
    return new Response('events array required', { status: 400 });
  }
  const id = randomUUID();
  try {
    await put(id, data);
  } catch (err) {
    return new Response(`storage failed: ${(err as Error).message}`, { status: 500 });
  }
  return Response.json({ id });
}
