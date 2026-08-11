export interface BaseTrailEvent {
  k:
    | 'click'
    | 'input'
    | 'key'
    | 'submit'
    | 'console'
    | 'net'
    | 'nav'
    | 'hover'
    | 'viewport'
    | 'meta'
    | 'rrweb'
    | 'flag';
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

// Enter pressed on a form control. Keyboard-driven repros ("type a query,
// press Enter") produce no click and often no change event — without this
// step they would leave no trace at all. Only Enter is captured; other keys
// are the page's own business.
export interface KeyEvent extends BaseTrailEvent {
  k: 'key';
  key: 'Enter';
  label: string;
  tag: string;
}

// A form submission: entered via keyboard, by clicking a submit control, or
// programmatically. Carries the form's context so the step reads
// "Submitted form Sign-in (POST /api/login)". When the submit was caused by
// clicking a button, `submitter` records that button's identity so the
// timeline can fold the click into this step causally (SubmitEvent.submitter
// is ground truth — no time-window guessing).
export interface FormSubmitEvent extends BaseTrailEvent {
  k: 'submit';
  label: string;
  method: string;
  action: string;
  submitter?: { label: string; tag: string };
}

// A hover that reveals UI: menu buttons (aria-haspopup) and role-based menu
// surfaces only. A hover without a follow-up action is usually not the bug —
// but menu-open bugs are unreproducible from steps alone, and the replay
// cannot show :hover state, so the step is the only trace.
export interface HoverEvent extends BaseTrailEvent {
  k: 'hover';
  label: string;
  tag: string;
  // The role/attribute that qualified this element (aria-haspopup, menu, …).
  reason: string;
}

// A material viewport resize (responsive-layout bugs need the resize step).
export interface ViewportEvent extends BaseTrailEvent {
  k: 'viewport';
  w: number;
  h: number;
}

// Capture-time environment: the UA and viewport of the machine that
// RECORDED, so the Environment section describes the recordee even when the
// report is rendered on (or shared to) a different machine. Emitted at every
// document boot; the earliest one wins.
export interface MetaEvent extends BaseTrailEvent {
  k: 'meta';
  userAgent: string;
  viewportW: number;
  viewportH: number;
  dpr: number;
}

export interface InputEvent extends BaseTrailEvent {
  k: 'input';
  label: string;
  masked: boolean;
  value: string;
  // File inputs: the selected file names (capped). When present, the step
  // reads "Uploaded N files to <label>" instead of a typed value.
  files?: string[];
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
  // How the request left the page. 'fetch'/'xhr' are instrumented network
  // calls; 'resource' is an element that failed to load (img, script, CSS —
  // invisible to fetch/XHR); 'ws' is an abnormal WebSocket closure.
  via: 'fetch' | 'xhr' | 'resource' | 'ws';
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
//
// `phase` distinguishes the captured moments of the flag flow: 'open' (the
// flag form appeared — the start of the report-writing window), 'submit' (the
// flag was submitted, carrying the note) and 'cancel' (the form was closed
// without submitting). Events recorded before `phase` existed have no phase
// and are treated as submits. `note` is the reporter's single free-form
// account (expected vs actual is extracted downstream); `expected`/`actual`
// are the legacy two-field form and still read for old sessions.
export interface FlagEvent extends BaseTrailEvent {
  k: 'flag';
  phase?: 'open' | 'submit' | 'cancel';
  note?: string;
  expected?: string;
  actual?: string;
}

export type TrailEvent =
  | ClickEvent
  | KeyEvent
  | FormSubmitEvent
  | HoverEvent
  | ViewportEvent
  | MetaEvent
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
  // Keyboard/forms are interactions too — counted like clicks, and folded
  // into the "Interactions" tally. Hovers are deliberately NOT counted: they
  // are ambient (a navbar sweep ticks the counter), timeline steps only.
  key: number;
  submit: number;
  viewport: number;
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
