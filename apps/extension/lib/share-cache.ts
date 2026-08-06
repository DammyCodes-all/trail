import { SHARE_CACHE_KEY } from './constants.ts';

export interface CachedShare {
  link: string;
  createdAt: number;
}

const MAX_CACHED = 200;

// The part of a share payload that determines its identity: exportedAt and
// the title are excluded (the title is the one editable field, so renaming a
// session must not orphan its link), so the same session always serializes
// the same whether it's about to be uploaded or was just fetched from a link.
// Both sides (sharer and recipient) must use this to hash, or their hashes
// would never match.
export function stableShareJson(payload: {
  v: number;
  report: unknown;
  events: unknown[];
}): string {
  const report = Object.fromEntries(
    Object.entries(payload.report ?? {}).filter(([key]) => key !== 'title'),
  );
  return JSON.stringify({ v: payload.v, report, events: payload.events });
}

// Content hash for a share payload. Callers must feed a serialization that is
// stable across shares (i.e. excluding exportedAt), so the same session always
// hashes the same and its link can be reused instead of re-uploaded.
export async function hashSession(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

export async function getCachedShare(hash: string): Promise<string | undefined> {
  const { [SHARE_CACHE_KEY]: cache } =
    await browser.storage.local.get(SHARE_CACHE_KEY);
  return (cache as Record<string, CachedShare> | undefined)?.[hash]?.link;
}

// Record a generated share link. The cache is capped at MAX_CACHED entries,
// evicting the oldest first — the entries themselves are tiny (hash + link),
// the payloads never live here.
export async function rememberShare(hash: string, link: string): Promise<void> {
  const { [SHARE_CACHE_KEY]: cache } =
    await browser.storage.local.get(SHARE_CACHE_KEY);
  const next: Record<string, CachedShare> = {
    ...(cache as Record<string, CachedShare> | undefined),
    [hash]: { link, createdAt: Date.now() },
  };
  const entries = Object.entries(next).sort(
    (a, b) => a[1].createdAt - b[1].createdAt,
  );
  while (entries.length > MAX_CACHED) delete next[entries.shift()![0]];
  await browser.storage.local.set({ [SHARE_CACHE_KEY]: next });
}
