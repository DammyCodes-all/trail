export interface BaseTrailEvent {
  k: 'click' | 'input' | 'console' | 'net' | 'nav' | 'rrweb' | 'flag';
  t: number;
  url: string;
}

// Emitted by the recorder at document boot. Unlike clicks/inputs/console/net
// (captured), a nav event is a landmark: it makes page loads — including
// same-URL refreshes — visible on the timeline and in the report.
export interface NavEvent extends BaseTrailEvent {
  k: 'nav';
  // True when the browser reports this load as a reload of the same document
  // (address-bar refresh, F5, location.reload). False for first loads and
  // ordinary navigations, including same-URL ones via a link.
  reload?: boolean;
}

export interface ClickEvent extends BaseTrailEvent {
  k: 'click';
  label: string;
  tag: string;
}

export interface InputEvent extends BaseTrailEvent {
  k: 'input';
  label: string;
  masked: boolean;
  value: string;
}

export interface ConsoleEvent extends BaseTrailEvent {
  k: 'console';
  lv: 'error' | 'warn';
  msg: string;
  stack?: string;
}

export interface NetEvent extends BaseTrailEvent {
  k: 'net';
  target: string;
  method: string;
  status: number;
  via: 'fetch' | 'xhr';
  err?: string;
  // Response body of the failed request, capped and truncated by the recorder.
  body?: string;
  // Best-effort request/response metadata of the failed request. Values are
  // capture-time redacted for sensitive header names (authorization, cookies).
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
}

export interface RrwebEvent extends BaseTrailEvent {
  k: 'rrweb';
  ev: unknown;
}

// A moment the reporter marked during recording (⚑ in the overlay). The notes
// are the reporter's own words about what should have happened vs what did.
// Both fields are optional: a flag without notes is still a timeline marker.
// Captured at capture time (user-authored text — never redacted).
export interface FlagEvent extends BaseTrailEvent {
  k: 'flag';
  expected?: string;
  actual?: string;
}

export type TrailEvent =
  | ClickEvent
  | InputEvent
  | ConsoleEvent
  | NetEvent
  | NavEvent
  | RrwebEvent
  | FlagEvent;

export type StoredEvent = TrailEvent & { seq: number };

export interface TrailCounts {
  click: number;
  input: number;
  console: number;
  net: number;
}

export interface TrailSession {
  tabId: number;
  startedAt: number;
}

export interface TrailReport {
  seq: number;
  title: string;
  repo: string;
  startedAt: number;
  endedAt: number;
  eventCount: number;
  counts: TrailCounts;
  url: string;
  // Derived at save time so the popup history can show what went wrong without
  // loading the session's (multi-MB) event snapshot. Optional because reports
  // saved before these existed fall back to the raw event count.
  errorCount?: number;
  failedRequestCount?: number;
  // Set on reports imported from a shared link: the share URL it came from.
  // Used to dedupe re-imports and to show provenance.
  source?: string;
}

// The session shape the extension uploads to the replay server and downloads
// as a replay file. `v` gates the shape so importers can reject foreign JSON.
export interface SharedReportPayload {
  v: number;
  title?: string;
  exportedAt?: number;
  report: Omit<TrailReport, 'seq'>;
  events: StoredEvent[];
}

export interface SessionEvents {
  reportId: number;
  events: StoredEvent[];
}
