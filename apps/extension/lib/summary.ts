import type { StoredEvent, TrailCounts } from "./types";

// The zero state for TrailCounts. Every consumer reads and writes counts
// through this module so "no events" can never drift into a hand-rolled
// literal with a missing field.
export const ZERO_COUNTS: TrailCounts = {
  click: 0,
  input: 0,
  console: 0,
  net: 0,
};

export const totalCounts = (counts: TrailCounts): number =>
  counts.click + counts.input + counts.console + counts.net;

// Tally events of each kind in one pass. Used wherever an event list (or a
// relay batch) turns into TrailCounts: the background's batch handler, the
// review page's totals, and the popup's ephemeral report.
export function countEvents(events: Array<{ k: string }>): TrailCounts {
  const counts: TrailCounts = { ...ZERO_COUNTS };
  for (const event of events) {
    if (event.k === "click") counts.click++;
    else if (event.k === "input") counts.input++;
    else if (event.k === "console") counts.console++;
    else if (event.k === "net") counts.net++;
  }
  return counts;
}

// The extension's single failure predicate for HTTP statuses. Everything that
// decides "is this a failed request" — the recorder's capture gate, the saved
// report's summary counts, the issue body's section — goes through here. A
// 0 status means the network request itself failed (CORS, offline, aborted).
export const isFailedRequest = (status: number): boolean =>
  status === 0 || status >= 400;

// Analytics/tracking beacons: high-volume noise (ad blockers, CORS, ghostery)
// that drowns the real evidence in a report. The review UI keeps every
// capture; report consumers filter through this. Host-based, with a carve-out
// for facebook's /tr pixel (facebook.com is also a real destination).
const BEACON_HOSTS = [
  "google-analytics.com",
  "googletagmanager.com",
  "doubleclick.net",
  "connect.facebook.net",
  "facebook.com",
  "scorecardresearch.com",
  "quantcount.com",
  "mixpanel.com",
  "segment.io",
  "segment.com",
  "amplitude.com",
  "hotjar.com",
  "clarity.ms",
  "mc.yandex.ru",
];

export const isBeaconTarget = (target: string): boolean => {
  let host: string;
  let path: string;
  try {
    const u = new URL(target);
    host = u.hostname.toLowerCase();
    path = u.pathname;
  } catch {
    return false;
  }
  const isHost = (h: string) => host === h || host.endsWith(`.${h}`);
  if (BEACON_HOSTS.some(isHost)) {
    if (isHost("facebook.com")) return /^\/tr(\/|$)/.test(path);
    return true;
  }
  // Tracking-shaped subdomains on any domain (analytics.example.com).
  return host
    .split(".")
    .some((p) =>
      ["analytics", "beacon", "telemetry", "tracking", "tracker", "collect"].includes(p),
    );
};

// The derived summary a report shows in the popup history: console errors and
// failed requests. Kept as one pass so the background, the import path, and
// the popup's backfill can never disagree.
export function countSummary(events: StoredEvent[]): {
  errorCount: number;
  failedRequestCount: number;
} {
  let errorCount = 0;
  let failedRequestCount = 0;
  for (const event of events) {
    if (event.k === "console" && event.lv === "error") errorCount++;
    else if (event.k === "net" && isFailedRequest(event.status)) {
      failedRequestCount++;
    }
  }
  return { errorCount, failedRequestCount };
}

export type NetSeverity = "critical" | "moderate";

// How bad a failed request is: server/network-level failures (5xx, dropped
// connections) are critical, client-level 4xx are moderate. Both are
// failures; this only decides tone in the UI and report severity.
export const severityOfStatus = (status: number): NetSeverity =>
  status === 0 || status >= 500 ? "critical" : "moderate";
