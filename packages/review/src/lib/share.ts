import { REPLAY_SERVER_URL, WEB_URL } from "./constants";
import { copyText } from "./exports";
import {
  forgetShare,
  getCachedShare,
  hashSession,
  rememberShare,
  stableShareJson,
} from "./share-cache";
import type { SharedReportPayload, StoredEvent, TrailCounts } from "./types";

export interface EnsureShareResult {
  link: string;
  reused: boolean;
}

export interface ShareResult extends EnsureShareResult {
  copied: boolean;
}

export type SharePhase = 'preparing' | 'uploading';

// The path shapes of a TRAIL replay share link. New links point at the web
// app (/r/<id>, which renders the review for everyone and hands off to the
// extension when installed); legacy links point straight at the replay
// server's payload route and stay importable forever. Popup validation and
// the review page's share-mode check share this so the format lives in one
// place.
export const SHARE_PATH_RE =
  /^\/(?:api\/replays|r)\/[A-Za-z0-9.-]{1,64}$/;

export const isShareLink = (url: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    ["http:", "https:"].includes(parsed.protocol) &&
    SHARE_PATH_RE.test(parsed.pathname)
  );
};

// The payload of a web-app share link (/r/<id>) lives on this deployment's
// replay server under /api/replays/<id>; legacy links are already payload
// URLs. Both fetchers (the extension's share-mode import and the web review
// loader) resolve through here so a link always fetches its JSON, never HTML.
export function resolveSharePayloadUrl(link: string): string {
  const parsed = new URL(link);
  const match = /^\/r\/([A-Za-z0-9.-]{1,64})$/.exec(parsed.pathname);
  if (match?.[1]) return `${REPLAY_SERVER_URL}/api/replays/${match[1]}`;
  return link;
}

// New share links are always web-app links. Older cache entries and imported
// sessions may still carry the payload route, so normalize those at the
// presentation boundary while keeping the legacy URL usable for reads.
export function toWebShareLink(link: string): string {
  try {
    const parsed = new URL(link);
    const match = /^\/api\/replays\/([A-Za-z0-9.-]{1,64})$/.exec(parsed.pathname);
    return match?.[1] ? `${WEB_URL}/r/${match[1]}` : link;
  } catch {
    return link;
  }
}

// Concurrent share attempts for the same session (e.g. rapid double-clicks)
// share one upload instead of hitting blob storage twice. Module scope so it
// survives across clicks; separate tabs are out of reach without messaging.
const shareInFlight = new Map<string, Promise<EnsureShareResult>>();

// A recipient just imported a session from a shared link. Remember it under
// the same content hash the sharer uses, so re-sharing this session reuses
// the incoming link instead of uploading the payload a second time.
export async function rememberIncomingShare(
  payload: SharedReportPayload,
  link: string,
): Promise<void> {
  const hash = await hashSession(stableShareJson(payload));
  await rememberShare(hash, link);
}

export interface ShareSessionInput {
  // The memoized stable-serialization of the session (see stableShareJson):
  // the content hash that decides whether a link can be reused.
  stableJson: string;
  title: string;
  base: {
    startedAt: number;
    endedAt: number;
    eventCount: number;
    counts: TrailCounts;
    url: string;
  };
  events: StoredEvent[];
}

// Ensure a replay exists on the replay server and return the web-app link.
// This path deliberately has no clipboard side effect so it is safe to call
// automatically after a review loads. A content hash of the session is
// remembered alongside each generated link (chrome.storage.local, see
// lib/share-cache.ts). Re-sharing an unchanged session reuses the existing
// link and never uploads to blob storage again; title edits don't count because
// the title is excluded from the hash.
//
// Reused links are probed (status-only fetch, body cancelled) before being
// trusted: a cache entry can outlive its blob, and a confirmed 4xx/5xx clears
// the entry and uploads fresh. The probe always hits the resolved payload URL —
// a web-app link would answer 200 with HTML even when the blob behind it is
// gone. If the probe itself fails due to a network outage, the cached link is
// kept rather than discarded.
export async function ensureShareLink(
  input: ShareSessionInput,
  onPhase?: (phase: SharePhase) => void,
): Promise<EnsureShareResult> {
  const hash = await hashSession(input.stableJson);
  const running = shareInFlight.get(hash);
  if (running) return running;
  const run = (async (): Promise<EnsureShareResult> => {
    onPhase?.('preparing');
    const cached = await getCachedShare(hash);
    if (cached) {
      try {
        const probe = await fetch(resolveSharePayloadUrl(cached));
        await probe.body?.cancel().catch(() => {});
        if (probe.ok) {
          const link = toWebShareLink(cached);
          if (link !== cached) {
            try {
              await rememberShare(hash, link);
            } catch {}
          }
          return { link, reused: true };
        }
        await forgetShare(hash);
      } catch {
        return { link: toWebShareLink(cached), reused: true };
      }
    }
    onPhase?.('uploading');
    let res: Response;
    try {
      res = await fetch(`${REPLAY_SERVER_URL}/api/replays/presign`, {
        method: "POST",
      });
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "network error");
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { id, uploadUrl } = (await res.json()) as {
      id?: string;
      uploadUrl?: string;
    };
    if (!id || !uploadUrl) throw new Error("no presign");
    let putRes: Response;
    try {
      putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          v: 2,
          title: input.title,
          exportedAt: Date.now(),
          report: { title: input.title, repo: "", ...input.base },
          events: input.events,
        } satisfies SharedReportPayload),
      });
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "network error");
    }
    if (!putRes.ok) throw new Error(`HTTP ${putRes.status}`);
    const link = `${WEB_URL}/r/${id}`;
    // Awaited so the entry exists before the success toast — closing the tab
    // right after sharing must not lose the link. A storage failure is not
    // worth failing the share over.
    try {
      await rememberShare(hash, link);
    } catch {}
    return { link, reused: false };
  })();
  shareInFlight.set(hash, run);
  void run
    .catch(() => {})
    .finally(() => {
      if (shareInFlight.get(hash) === run) shareInFlight.delete(hash);
    });
  return run;
}

export async function copyReplayLink(link: string): Promise<boolean> {
  return copyText(link);
}

// Explicit sharing keeps the original clipboard-oriented behavior used by the
// Share menu. Automatic callers should use ensureShareLink directly.
export async function shareSession(input: ShareSessionInput): Promise<ShareResult> {
  const result = await ensureShareLink(input);
  return { ...result, copied: await copyReplayLink(result.link) };
}
