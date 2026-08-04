import type { NetEvent } from "@/lib/types";
import type { RecordContext } from "./context";
import { bodyText } from "./format";

// Instrument fetch and XHR to record failed requests. Failures are report-worthy;
// successful requests are noise and are never recorded.
export const instrumentNetwork = (ctx: RecordContext) => {
  const { emit, isActive, pageUrl } = ctx;

  const origFetch = window.fetch;
  window.fetch = async function (...a: unknown[]) {
    const t = Date.now();
    const arg = a[0] as
      | { url?: string; method?: string }
      | string
      | undefined;
    const url = typeof arg === "string" ? arg : (arg?.url ?? "");
    const method =
      (a[1] as { method?: string } | undefined)?.method ??
      (typeof arg === "object" ? arg?.method : undefined) ??
      "GET";
    try {
      const r = await origFetch.apply(this, a as Parameters<typeof fetch>);
      if (!r.ok && isActive()) {
        // Clone keeps the page's own read of the response intact; the body is
        // captured async so a failed body read never blocks the app's fetch.
        void (async () => {
          let body: string | undefined;
          try {
            body = bodyText(await r.clone().text());
          } catch {
            // body unreadable — still record the failure without it
          }
          if (!isActive()) return;
          const ev: NetEvent = {
            k: "net",
            target: url,
            method,
            status: r.status,
            t,
            via: "fetch",
            url: pageUrl(),
            body,
          };
          emit(ev);
        })();
      }
      return r;
    } catch (err) {
      if (isActive()) {
        const ev: NetEvent = {
          k: "net",
          target: url,
          method,
          status: 0,
          err: (err as Error).message,
          t,
          via: "fetch",
          url: pageUrl(),
        };
        emit(ev);
      }
      throw err;
    }
  };

  const XO = XMLHttpRequest.prototype.open;
  const XS = XMLHttpRequest.prototype.send;
  const callOpen = XO as unknown as (...args: unknown[]) => void;
  const callSend = XS as unknown as (...args: unknown[]) => void;
  XMLHttpRequest.prototype.open = function (
    m: string,
    u: string | URL,
    ...r: unknown[]
  ) {
    (
      this as unknown as { __trail: { method: string; url: string } }
    ).__trail = {
      method: m,
      url: String(u),
    };
    return callOpen.call(this, m, u, ...r);
  };
  XMLHttpRequest.prototype.send = function (...a: unknown[]) {
    const t = Date.now();
    this.addEventListener("loadend", () => {
      const meta = (
        this as unknown as { __trail?: { method: string; url: string } }
      ).__trail;
      const bad = this.status === 0 || this.status >= 400;
      if (bad && meta && isActive()) {
        let body: string | undefined;
        try {
          const rt = this.responseType;
          if (rt === "" || rt === "text") body = bodyText(this.responseText);
        } catch {
          // binary/opaque responses have no text body
        }
        const ev: NetEvent = {
          k: "net",
          target: meta.url,
          method: meta.method,
          status: this.status,
          t,
          via: "xhr",
          url: pageUrl(),
          body,
        };
        emit(ev);
      }
    });
    return callSend.apply(this, a);
  };
};
