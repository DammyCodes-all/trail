import { ZERO_COUNTS } from "./summary";
import type { TrailCounts, TrailSession } from "@/lib/types";

// Session + live-count state lives in chrome.storage.session so it survives the
// SW going to sleep but dies with the browser session. All read-modify-write
// callers go through this module; the background routes around it.

export async function getSession(): Promise<TrailSession | null> {
  const { session } = await browser.storage.session.get("session");
  return (session as TrailSession) ?? null;
}

export async function setSession(session: TrailSession | null): Promise<void> {
  if (session) await browser.storage.session.set({ session });
  else await browser.storage.session.remove("session");
}

export async function getCounts(): Promise<TrailCounts> {
  const { counts } = await browser.storage.session.get("counts");
  return { ...ZERO_COUNTS, ...(counts as Partial<TrailCounts>) };
}

export async function setCounts(counts: TrailCounts): Promise<void> {
  await browser.storage.session.set({ counts });
}

export async function clearCounts(): Promise<void> {
  await browser.storage.session.remove("counts");
}
