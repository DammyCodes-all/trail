// Storage adapter: Vercel Blob when a read-write token is configured (the
// production path — serverless has no disk), otherwise local files (dev and the
// E2E spike). The API surface — put(id, data) / get(id) — is all either side
// needs, so a future switch to Postgres/KV touches only this file.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDownloadUrl, put as blobPut } from '@vercel/blob';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.data');

export function isBlobMode() {
  return Boolean(TOKEN);
}

export async function put(id, data) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  if (TOKEN) {
    await blobPut(`replays/${id}.json`, body, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      token: TOKEN,
    });
    return id;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, `${id}.json`), body, 'utf8');
  return id;
}

export async function get(id) {
  if (TOKEN) {
    try {
      const url = await getDownloadUrl(TOKEN, `replays/${id}.json`);
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, `${id}.json`), 'utf8'));
  } catch {
    return null;
  }
}
