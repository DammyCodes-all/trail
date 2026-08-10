import { ZERO_COUNTS } from "@trail/review/lib/summary";
import type { TrailCounts, TrailSession } from "@trail/review/lib/types";

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

// Reporter-flag count for the overlay badge. Kept out of TrailCounts on
// purpose: flags are user intent markers, not counted evidence, so the
// odometer/counts/reports never grow a slot for them.
export async function getFlagCount(): Promise<number> {
  const { flagCount } = await browser.storage.session.get("flagCount");
  return typeof flagCount === "number" ? flagCount : 0;
}

export async function setFlagCount(flagCount: number): Promise<void> {
  await browser.storage.session.set({ flagCount });
}

export async function clearFlagCount(): Promise<void> {
  await browser.storage.session.remove("flagCount");
}
