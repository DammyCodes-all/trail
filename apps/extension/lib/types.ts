export interface BaseTrailEvent {
  k: 'click' | 'input' | 'console' | 'net' | 'rrweb';
  t: number;
  url: string;
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

export type TrailEvent = ClickEvent | InputEvent | ConsoleEvent | NetEvent | RrwebEvent;

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
}

export interface SessionEvents {
  reportId: number;
  events: StoredEvent[];
}
