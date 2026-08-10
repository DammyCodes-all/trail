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

export interface ShareResult {
  link: string;
  copied: boolean;
  reused: boolean;
}

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

// Concurrent share attempts for the same session (e.g. rapid double-clicks)
// share one upload instead of hitting blob storage twice. Module scope so it
// survives across clicks; separate tabs are out of reach without messaging.
const shareInFlight = new Map<string, Promise<ShareResult>>();

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

// Upload the session to the replay server and hand back the share link. The
// link points at the web app (/r/<id>), which opens the review for anyone —
// with the extension installed it hands off into the extension instead. The
// payload itself goes to the replay server through a presigned PUT URL: Vercel
// caps function bodies at ~4.5MB and full sessions blow past that, so the
// payload goes straight to storage. The payload carries the full report so a
// reviewer can rebuild the exact same review UI (timeline, evidence, replay)
// from the link. Clipboard failures never block the link from being generated.
//
// A content hash of the session is remembered alongside each generated link
// (chrome.storage.local, see lib/share-cache.ts). Re-sharing an unchanged
// session reuses the existing link and never uploads to blob storage again;
// only new events (or any other payload change) hash differently and upload
// fresh. Title edits don't count — the title is excluded from the hash.
//
// Reused links are probed (status-only fetch, body cancelled) before being
// trusted: a cache entry can outlive its blob, and a confirmed 4xx/5xx
// clears the entry and uploads fresh. The probe always hits the RESOLVED
// payload URL — a web-app link would answer 200 with HTML even when the blob
// behind it is gone. If the probe itself fails the network the entry is kept —
// better a possibly-stale link than destroying a valid one during an outage.
export async function shareSession(input: ShareSessionInput): Promise<ShareResult> {
  const hash = await hashSession(input.stableJson);
  const running = shareInFlight.get(hash);
  if (running) return running;
  const run = (async (): Promise<ShareResult> => {
    const cached = await getCachedShare(hash);
    if (cached) {
      try {
        const probe = await fetch(resolveSharePayloadUrl(cached));
        await probe.body?.cancel().catch(() => {});
        if (probe.ok) {
          return { link: cached, copied: await copyText(cached), reused: true };
        }
        await forgetShare(hash);
      } catch {
        return { link: cached, copied: await copyText(cached), reused: true };
      }
    }
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
    return { link, copied: await copyText(link), reused: false };
  })();
  shareInFlight.set(hash, run);
  void run
    .catch(() => {})
    .finally(() => {
      if (shareInFlight.get(hash) === run) shareInFlight.delete(hash);
    });
  return run;
}
