import type { NetEvent } from "@/lib/types";
import type { RecordContext } from "./context";
import { bodyText, requestBodyText } from "./format";
import { redactBody, redactHeaders, redactText, redactUrl } from "./redaction";
import { isFailedRequest } from "@/lib/summary";

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
