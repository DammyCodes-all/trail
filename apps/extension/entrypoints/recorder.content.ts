import { record } from 'rrweb';
import { POST_MESSAGE_KEY } from '@/lib/constants';
import type { ClickEvent, ConsoleEvent, InputEvent, NetEvent } from '@/lib/types';

declare global {
  interface Window {
    __trailRecorder?: boolean;
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  registration: 'runtime',
  noScriptStartedPostMessage: true,
  main() {
    if (window.__trailRecorder) return;
    window.__trailRecorder = true;

    const emit = (d: object) => {
      window.postMessage({ [POST_MESSAGE_KEY]: true, d }, '*');
    };

    const cap = (s: unknown, n = 60): string | null => {
      if (s == null) return null;
      const str = String(s).trim();
      return str.length > n ? str.slice(0, n) : str;
    };

    const fmt = (a: unknown): string => {
      try {
        return typeof a === 'string' ? a : JSON.stringify(a)?.slice(0, 300) ?? String(a);
      } catch {
        return String(a);
      }
    };

    let active = true;
    let running = false;
    let autoRedact = true; // default on; relay delivers the stored preference
    let rrwebStop: (() => void) | undefined;

    const startRrweb = () => {
      try {
        rrwebStop = record({
          emit: (ev) => {
            if (active) emit({ k: 'rrweb', ev, t: ev.timestamp, url: pageUrl() });
          },
          recordAfter: 'DOMContentLoaded',
          maskInputOptions: { password: true },
          blockClass: 'rr-block',
          checkoutEveryNms: 30_000,
          errorHandler: () => true, // never let a recording bug break the page
        });
        running = true;
      } catch {
        // never break the page if rrweb can't start
      }
    };

    const pageUrl = () => location.href;

    addEventListener('message', (e) => {
      if (e.data?.[POST_MESSAGE_KEY] === 'stop') {
        active = false;
        rrwebStop?.();
        running = false;
      } else if (e.data?.[POST_MESSAGE_KEY] === 'start') {
        // Re-arm after a stop on the same page. The stale __trailRecorder guard
        // makes re-executing recorder.js a no-op, so re-activation has to come
        // through the relay as a message.
        active = true;
        if (!running) startRrweb();
      } else if (e.data?.[POST_MESSAGE_KEY] === 'redact') {
        autoRedact = e.data.value === true;
      }
    });

    // ---- console + uncaught errors (installed at document_start) ----
    for (const lv of ['error', 'warn'] as const) {
      const orig = console[lv];
      console[lv] = function (...a: unknown[]) {
        if (active) {
          const ev: ConsoleEvent = {
            k: 'console',
            lv,
            msg: a.map(fmt).join(' '),
            t: Date.now(),
            url: pageUrl(),
          };
          emit(ev);
        }
        return orig.apply(this, a);
      };
    }

    addEventListener(
      'error',
      (e) => {
        if (!active) return;
        const ev: ConsoleEvent = {
          k: 'console',
          lv: 'error',
          t: Date.now(),
          url: pageUrl(),
          msg: e.message,
          stack: e.error?.stack?.slice(0, 500),
        };
        emit(ev);
      },
      true,
    );

    addEventListener(
      'unhandledrejection',
      (e) => {
        if (!active) return;
        const ev: ConsoleEvent = {
          k: 'console',
          lv: 'error',
          t: Date.now(),
          url: pageUrl(),
          msg: 'Unhandled rejection: ' + fmt(e.reason),
        };
        emit(ev);
      },
      true,
    );

    // ---- failed network requests ----
    const origFetch = window.fetch;
    window.fetch = async function (...a: unknown[]) {
      const t = Date.now();
      const arg = a[0] as { url?: string; method?: string } | string | undefined;
      const url = typeof arg === 'string' ? arg : (arg?.url ?? '');
      const method =
        (a[1] as { method?: string } | undefined)?.method ??
        (typeof arg === 'object' ? arg?.method : undefined) ??
        'GET';
      try {
        const r = await origFetch.apply(this, a as Parameters<typeof fetch>);
        if (!r.ok && active) {
          const ev: NetEvent = {
            k: 'net',
            target: url,
            method,
            status: r.status,
            t,
            via: 'fetch',
            url: pageUrl(),
          };
          emit(ev);
        }
        return r;
      } catch (err) {
        if (active) {
          const ev: NetEvent = {
            k: 'net',
            target: url,
            method,
            status: 0,
            err: (err as Error).message,
            t,
            via: 'fetch',
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
    XMLHttpRequest.prototype.open = function (m: string, u: string | URL, ...r: unknown[]) {
      (this as unknown as { __trail: { method: string; url: string } }).__trail = {
        method: m,
        url: String(u),
      };
      return callOpen.call(this, m, u, ...r);
    };
    XMLHttpRequest.prototype.send = function (...a: unknown[]) {
      const t = Date.now();
      this.addEventListener('loadend', () => {
        const meta = (this as unknown as { __trail?: { method: string; url: string } }).__trail;
        const bad = this.status === 0 || this.status >= 400;
        if (bad && meta && active) {
          const ev: NetEvent = {
            k: 'net',
            target: meta.url,
            method: meta.method,
            status: this.status,
            t,
            via: 'xhr',
            url: pageUrl(),
          };
          emit(ev);
        }
      });
      return callSend.apply(this, a);
    };

    // ---- clicks, with a readable label ----
    const label = (el: Element): string | null =>
      cap(el.getAttribute?.('aria-label')) ??
      cap(el.textContent) ??
      cap(el.getAttribute?.('placeholder')) ??
      cap(el.getAttribute?.('alt')) ??
      cap(el.getAttribute?.('name') || el.id) ??
      `<${el.tagName.toLowerCase()}>`;

    // A click is only a report-worthy *action* when it lands on an interactive
    // control. Text-ish inputs and textareas are excluded: typing into them is
    // already captured by the change handler, and counting the focus-clicks that
    // precede every keystroke inflates the report. Blank background and inert
    // wrappers (body, labels, plain divs) are noise, not steps.
    const TEXT_LIKE = /^(text|email|password|search|tel|url|number|date|datetime-local|month|week|time|file)$/;
    const CLICKABLE = 'button,a[href],[role=button],[onclick],select,summary,details,input';

    const actionTarget = (el: Element): Element | null => {
      const node = (el.closest?.(CLICKABLE) ?? el) as Element;
      const tag = node.tagName?.toLowerCase();
      if (tag === 'input') {
        const type = (node as HTMLInputElement).type || 'text';
        return TEXT_LIKE.test(type) ? null : node;
      }
      if (tag === 'textarea' || tag === 'label' || tag === 'body' || tag === 'html') return null;
      if (tag === 'a' && !(node as HTMLAnchorElement).href) return null;
      return node;
    };

    addEventListener(
      'click',
      (e) => {
        if (!active) return;
        const node = actionTarget(e.target as Element);
        if (!node) return;
        const ev: ClickEvent = {
          k: 'click',
          label: label(node) ?? `<${node.tagName.toLowerCase()}>`,
          tag: node.tagName.toLowerCase(),
          t: Date.now(),
          url: pageUrl(),
        };
        emit(ev);
      },
      true,
    );

    // ---- typed input, masked by default ----
    const SENSITIVE = /pass|pwd|secret|token|otp|cvv|ssn|card|auth|api[-_]?key/i;
    addEventListener(
      'change',
      (e) => {
        if (!active) return;
        const el = e.target as HTMLInputElement;
        if (!el.matches?.('input,textarea,select')) return;
        const hide =
          autoRedact ||
          el.type === 'password' ||
          SENSITIVE.test(el.name + el.id + (el.getAttribute('autocomplete') ?? ''));
        const ev: InputEvent = {
          k: 'input',
          label: label(el) ?? `<${el.tagName.toLowerCase()}>`,
          t: Date.now(),
          url: pageUrl(),
          masked: hide,
          value: hide ? '•'.repeat(8) : (cap(el.value, 100) ?? ''),
        };
        emit(ev);
      },
      true,
    );

    // ---- rrweb: visual replay only ----
    startRrweb();
  },
});
