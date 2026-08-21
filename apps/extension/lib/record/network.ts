import type { NetEvent } from "@trail/review/lib/types";
import type { RecordContext } from "./context";
import { bodyText, requestBodyText } from "./format";
import { redactBody, redactHeaders, redactText, redactUrl } from "./redaction";
import { isFailedRequest } from "@trail/review/lib/summary";

// Best-effort normalization of anything fetch/XHR expose as "headers":
// Headers instances, [name, value][] arrays, and plain records. Sensitive
// names are redacted immediately, at capture time.
const headerEntries = (h: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  try {
    if (h == null) return out;
    if (typeof h === "object" && typeof (h as { forEach?: unknown }).forEach === "function") {
      (h as { forEach: (fn: (v: string, k: string) => void) => void }).forEach((v, k) => {
        out[String(k)] = String(v);
      });
    } else if (Array.isArray(h)) {
      for (const pair of h) {
        if (Array.isArray(pair) && pair.length >= 2) out[String(pair[0])] = String(pair[1]);
      }
    } else {
      for (const [k, v] of Object.entries(h as Record<string, unknown>)) out[k] = String(v);
    }
  } catch {
    // best-effort only
  }
  return redactHeaders(out);
};

const xhrResponseHeaders = (raw: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return redactHeaders(out);
};

// Instrument fetch and XHR to record failed requests. Failures are report-worthy;
// successful requests are noise and are never recorded.
export const instrumentNetwork = (ctx: RecordContext) => {
  const w = window as unknown as Record<string, unknown>;
  if (w.__trailNetworkPatched) return;
  w.__trailNetworkPatched = true;
  const { emit, isActive, pageUrl } = ctx;

  const origFetch = window.fetch;
  window.fetch = async function (...a: unknown[]) {
    const t = Date.now();
    const arg = a[0] as
      | { url?: string; method?: string; headers?: unknown }
      | string
      | undefined;
    const url = typeof arg === "string" ? arg : (arg?.url ?? "");
    const method =
      (a[1] as { method?: string } | undefined)?.method ??
      (typeof arg === "object" ? arg?.method : undefined) ??
      "GET";
    const init = a[1] as
      | { headers?: unknown; body?: unknown }
      | undefined;
    const requestHeaders = headerEntries(
      init?.headers ??
        (typeof arg === "object" ? (arg as { headers?: unknown }).headers : undefined),
    );
    const requestBody = redactBody(requestBodyText(init?.body));
    try {
      const r = await origFetch.apply(this, a as Parameters<typeof fetch>);
      if (isFailedRequest(r.status) && isActive()) {
        // Clone keeps the page's own read of the response intact; the body is
        // captured async so a failed body read never blocks the app's fetch.
        void (async () => {
          let body: string | undefined;
          try {
            body = redactBody(bodyText(await r.clone().text()));
          } catch {
            // body unreadable — still record the failure without it
          }
          if (!isActive()) return;
          const ev: NetEvent = {
            k: "net",
            target: redactUrl(url),
            method,
            status: r.status,
            t,
            via: "fetch",
            url: pageUrl(),
            body,
            requestHeaders,
            responseHeaders: headerEntries(r.headers),
            requestBody,
          };
          emit(ev);
        })();
      }
      return r;
    } catch (err) {
      if (isActive()) {
        const ev: NetEvent = {
          k: "net",
          target: redactUrl(url),
          method,
          status: 0,
          err: redactText((err as Error).message),
          t,
          via: "fetch",
          url: pageUrl(),
          requestHeaders,
          requestBody,
        };
        emit(ev);
      }
      throw err;
    }
  };

  const XO = XMLHttpRequest.prototype.open;
  const XS = XMLHttpRequest.prototype.send;
  const XSH = XMLHttpRequest.prototype.setRequestHeader;
  const callOpen = XO as unknown as (...args: unknown[]) => void;
  const callSend = XS as unknown as (...args: unknown[]) => void;
  const callSetHeader = XSH as unknown as (name: string, value: string) => void;
  type XhrMeta = {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  };
  XMLHttpRequest.prototype.open = function (
    m: string,
    u: string | URL,
    ...r: unknown[]
  ) {
    (this as unknown as { __trail?: XhrMeta }).__trail = {
      method: m,
      url: String(u),
    };
    return callOpen.call(this, m, u, ...r);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (
    name: string,
    value: string,
  ) {
    const meta = (this as unknown as { __trail?: XhrMeta }).__trail;
    if (meta) {
      (meta.headers ??= {})[name] = value;
    }
    return callSetHeader.call(this, name, value);
  };
  XMLHttpRequest.prototype.send = function (...a: unknown[]) {
    const t = Date.now();
    const meta = (this as unknown as { __trail?: XhrMeta }).__trail;
    if (meta) meta.body = redactBody(requestBodyText(a[0]));
    this.addEventListener("loadend", () => {
      const m = (
        this as unknown as { __trail?: XhrMeta }
      ).__trail;
      const bad = isFailedRequest(this.status);
      if (bad && m && isActive()) {
        let body: string | undefined;
        try {
          const rt = this.responseType;
          if (rt === "" || rt === "text") body = redactBody(bodyText(this.responseText));
        } catch {
          // binary/opaque responses have no text body
        }
        const ev: NetEvent = {
          k: "net",
          target: redactUrl(m.url),
          method: m.method,
          status: this.status,
          t,
          via: "xhr",
          url: pageUrl(),
          body,
          requestHeaders: redactHeaders(m.headers ?? {}),
          responseHeaders: xhrResponseHeaders(this.getAllResponseHeaders()),
          requestBody: m.body,
        };
        emit(ev);
      }
    });
    return callSend.apply(this, a);
  };
};

// Resource elements that fail to load (images, scripts, stylesheets, media)
// are invisible to the fetch/XHR patches — yet a broken image or missing CSS
// is often the one visible bug. The capture-phase error listener fires for
// element load errors; the uncaught-error path (target = window) is filtered
// out by the tag check. Favicon and prefetch links are the classic
// meaningless 404 noise and are skipped.
export const instrumentResourceErrors = (ctx: RecordContext) => {
  const w = window as unknown as Record<string, unknown>;
  if (w.__trailResourceErrorPatched) return;
  w.__trailResourceErrorPatched = true;
  const { emit, isActive, pageUrl } = ctx;
  addEventListener(
    "error",
    (e) => {
      if (!isActive()) return;
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.tagName !== "string") return;
      if (
        target.tagName !== "IMG" &&
        target.tagName !== "VIDEO" &&
        target.tagName !== "AUDIO" &&
        target.tagName !== "SCRIPT" &&
        target.tagName !== "SOURCE" &&
        target.tagName !== "LINK"
      ) {
        return;
      }
      if (target.tagName === "LINK") {
        const rel = (target as HTMLLinkElement).rel || "";
        // icon/prefetch/dns-prefetch/preload pings fail constantly and mean
        // nothing to the bug at hand.
        if (/\b(icon|prefetch|dns-prefetch|preload|prerender)\b/.test(rel)) return;
      }
      const src =
        (target as HTMLImageElement).src ||
        (target as HTMLScriptElement).src ||
        (target as HTMLSourceElement).src ||
        (target as HTMLLinkElement).href ||
        "";
      if (!src) return;
      // The error event carries no HTTP status. Recover it from the
      // performance buffer where the browser exposes it (responseStatus):
      // a 404 avatar is a moderate failure, while the hardcoded 0 would
      // mislabel it and every other real 4xx as a network-level crash.
      // Absent (no response recorded in Safari/Firefox fallbacks, or the
      // connection itself failed), status stays 0 — which is truthful.
      let status = 0;
      const entries = performance.getEntriesByName(src, "resource") as
        | PerformanceResourceTiming[]
        | undefined;
      if (entries) {
        for (let i = entries.length - 1; i >= 0; i--) {
          const responseStatus = entries[i]!.responseStatus;
          if (typeof responseStatus === "number" && responseStatus > 0) {
            status = responseStatus;
            break;
          }
        }
      }
      const ev: NetEvent = {
        k: "net",
        target: redactUrl(src),
        method: "GET",
        status,
        err: "Failed to load resource",
        t: Date.now(),
        via: "resource",
        url: pageUrl(),
      };
      emit(ev);
    },
    true,
  );
};

// WebSocket connections failing are invisible to fetch/XHR patching. A
// real-time app whose socket dies is a common, real bug — and the close
// codes carry the story. Clean closures (1000 normal, 1001 going away, 1005
// no status) are skipped; everything else is a failure worth reporting.
// Wrapped as a plain function so the page's own constructor calls keep
// working; the prototype is borrowed from the original class so page
// `instanceof WebSocket` checks (and prototype-plumbing libraries) are
// unaffected.
export const instrumentWebSockets = (ctx: RecordContext) => {
  const w = window as unknown as Record<string, unknown>;
  if (w.__trailWebSocketPatched) return;
  w.__trailWebSocketPatched = true;
  const { emit, isActive, pageUrl } = ctx;
  const OrigWebSocket = window.WebSocket;
  if (typeof OrigWebSocket !== "function") return;
  const WrappedWebSocket = function (
    this: WebSocket,
    ...args: ConstructorParameters<typeof WebSocket>
  ) {
    const instance = new OrigWebSocket(...args);
    const url = String(args[0] ?? "");
    instance.addEventListener("close", (event) => {
      if (!isActive()) return;
      const code = (event as CloseEvent).code;
      if (code === 1000 || code === 1001 || code === 1005) return;
      if (!url) return;
      // Timestamped at CLOSE, not at connect: a socket that connects then
      // dies two minutes later is a failure that happened two minutes in —
      // anchoring it to construction puts the step at the top of the
      // timeline, misordering the repro. Same for the page context: the
      // page that matters is the one the close happened on.
      const ev: NetEvent = {
        k: "net",
        target: redactUrl(url),
        method: "WS",
        status: 0,
        err: `WebSocket closed (${code})`,
        t: Date.now(),
        via: "ws",
        url: pageUrl(),
      };
      emit(ev);
    });
    return instance;
  } as unknown as typeof WebSocket;
  // Instances are created by the original class, so instanceof must be
  // anchored on its prototype — otherwise page code doing
  // `socket instanceof WebSocket` sees the fresh wrapper prototype and
  // reports false for every socket.
  WrappedWebSocket.prototype = OrigWebSocket.prototype;
  // The wrapped constructor must not drop the protocol constants the page
  // (and libraries) read off `WebSocket`: CONNECTING, OPEN, CLOSING, CLOSED.
  const Wrapped = WrappedWebSocket as typeof WebSocket & {
    CONNECTING: number;
    OPEN: number;
    CLOSING: number;
    CLOSED: number;
  };
  Wrapped.CONNECTING = OrigWebSocket.CONNECTING;
  Wrapped.OPEN = OrigWebSocket.OPEN;
  Wrapped.CLOSING = OrigWebSocket.CLOSING;
  Wrapped.CLOSED = OrigWebSocket.CLOSED;
  window.WebSocket = Wrapped;
};
