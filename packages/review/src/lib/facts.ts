import type { MetaEvent, StoredEvent, TrailReport } from "./types";
import { buildTimeline } from "./timeline";
import { isFailedRequest, latchesSessionSeverity } from "./summary";

export type ReportSeverity = "high" | "medium" | "low";

export interface ReportFacts {
  severity: ReportSeverity;
  durationMs: number;
  eventCount: number;
  consoleErrors: number;
  consoleWarnings: number;
  failedRequests: number;
  browser: string;
  os: string;
  extensionVersion: string;
  url: string;
  host: string;
  // "WxH", captured at capture time; absent for sessions recorded before
  // meta events existed.
  viewport?: string;
}

interface FactOptions {
  userAgent?: string;
  extensionVersion?: string;
}

const durationFromEvents = (events: StoredEvent[]) => {
  let first = Number.POSITIVE_INFINITY;
  let last = 0;

  for (const event of events) {
    if (!Number.isFinite(event.t)) continue;
    first = Math.min(first, event.t);
    last = Math.max(last, event.t);
  }

  return Number.isFinite(first) ? Math.max(0, last - first) : 0;
};

export function parseUserAgent(userAgent: string): {
  browser: string;
  os: string;
} {
  const edge = userAgent.match(/Edg\/([\d.]+)/);
  const firefox = userAgent.match(/Firefox\/([\d.]+)/);
  const chrome = userAgent.match(/(?:Chrome|CriOS)\/([\d.]+)/);
  const safari = userAgent.match(/Version\/([\d.]+).*Safari/);

  const browser = edge
    ? `Edge ${edge[1]}`
    : firefox
      ? `Firefox ${firefox[1]}`
      : chrome
        ? `Chrome ${chrome[1]}`
        : safari
          ? `Safari ${safari[1]}`
          : "Unknown browser";

  let os = "Unknown OS";
  const windows = userAgent.match(/Windows NT ([\d.]+)/);
  const android = userAgent.match(/Android ([\d.]+)/);
  const ios = userAgent.match(/(?:iPhone OS|CPU OS) ([\d_]+)/);
  const mac = userAgent.match(/Mac OS X ([\d_]+)/);

  if (windows) {
    const version =
      windows[1] === "10.0"
        ? "10/11"
        : windows[1] === "6.3"
          ? "8.1"
          : windows[1];
    os = `Windows ${version}`;
  } else if (android) {
    os = `Android ${android[1]}`;
  } else if (ios) {
    os = `iOS ${ios[1]?.replaceAll("_", ".")}`;
  } else if (mac) {
    os = `macOS ${mac[1]?.replaceAll("_", ".")}`;
  } else if (/CrOS/.test(userAgent)) {
    os = "ChromeOS";
  } else if (/Linux/.test(userAgent)) {
    os = "Linux";
  }

  return { browser, os };
}

export function buildReportFacts(
  events: StoredEvent[],
  report?: Pick<TrailReport, "startedAt" | "endedAt" | "url"> | null,
  options: FactOptions = {},
  // The review page already built the timeline for its step list; pass it in
  // so eventCount never triggers a second full sort of the session.
  timeline: ReturnType<typeof buildTimeline> = buildTimeline(events),
): ReportFacts {
  let consoleErrors = 0;
  let consoleWarnings = 0;
  let failedRequests = 0;
  let criticalNetworkFailure = false;

  for (const event of events) {
    if (event.k === "console") {
      if (event.lv === "error") consoleErrors++;
      else consoleWarnings++;
    } else if (event.k === "net" && isFailedRequest(event.status)) {
      failedRequests++;
      if (latchesSessionSeverity(event)) {
        criticalNetworkFailure = true;
      }
    }
  }

  const severity: ReportSeverity =
    consoleErrors > 0 || criticalNetworkFailure
      ? "high"
      : consoleWarnings > 0 || failedRequests > 0
        ? "medium"
        : "low";
  const savedDuration =
    report && report.endedAt >= report.startedAt
      ? report.endedAt - report.startedAt
      : 0;
  const url = report?.url || events.find((event) => event.url)?.url || "";
  let host = "Unknown page";
  try {
    host = new URL(url).host;
  } catch {
    if (url) host = url;
  }

  // The environment the session was RECORDED in, not the machine rendering
  // it: a shared report opened on a different browser must still describe the
  // recordee. The earliest meta event of the session wins; absent that
  // (pre-meta sessions, staged tests), fall back to the rendering machine.
  let meta: MetaEvent | undefined;
  for (const event of events) {
    if (event.k === "meta" && (!meta || event.t < meta.t)) meta = event;
  }
  const userAgent =
    options.userAgent ??
    meta?.userAgent ??
    (typeof navigator === "undefined" ? "" : navigator.userAgent);
  const environment = parseUserAgent(userAgent);
  const viewport = meta
    ? `${meta.viewportW}×${meta.viewportH}`
    : undefined;
  const extensionVersion =
    options.extensionVersion ??
    (globalThis as {
      browser?: { runtime?: { getManifest?: () => { version?: string } } };
    }).browser?.runtime?.getManifest?.().version ??
    "unknown";

  return {
    severity,
    durationMs: savedDuration || durationFromEvents(events),
    eventCount: timeline.length,
    consoleErrors,
    consoleWarnings,
    failedRequests,
    browser: environment.browser,
    os: environment.os,
    extensionVersion,
    url,
    host,
    viewport,
  };
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
