// Storage adapter: Vercel Blob when a read-write token is configured (the
// production path — serverless has no disk), otherwise local files (dev and the
// E2E spike). The API surface — put(id, data) / get(id) — is all either side
// needs, so a future switch to Postgres/KV touches only this file.
//
// Blobs are public with deterministic paths: the read-write token embeds the
// store id, so a blob's URL is always
// https://<store>.public.blob.vercel-storage.com/replays/<id>.json — no SDK
// call needed to read. Shares are secret-link style: the id is a random UUID
// nobody can guess, and the full share link is the capability.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { put as blobPut } from '@vercel/blob';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.data');

export function isBlobMode() {
  return Boolean(TOKEN);
}

// Token format: vercel_blob_rw_<storeId>_<secret> — the store id is the
// subdomain of every blob URL (lowercased; DNS case-insensitive).
const storeId = () => TOKEN.split('_')[3]?.toLowerCase() ?? '';

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
      const res = await fetch(
        `https://${storeId()}.public.blob.vercel-storage.com/replays/${id}.json`,
      );
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
