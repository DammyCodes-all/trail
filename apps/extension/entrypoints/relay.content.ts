import {
  MSG_BATCH,
  MSG_OPEN_SHARE,
  MSG_OVERLAY_STATUS,
  MSG_REDACT,
  MSG_START_RECORDER,
  MSG_STOP_RECORDER,
  POST_MESSAGE_KEY,
  WEB_ORIGIN,
} from '@trail/review/lib/constants';

const RELAY_MARKER = 'data-trail-extension-relay';

declare global {
  interface Window {
    __trailRelaySignal?: AbortSignal;
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'ISOLATED',
  noScriptStartedPostMessage: true,
  main(ctx) {
    // Static and executeScript injections can have separate JS globals even in
    // the ISOLATED world. A DOM marker is shared, so only one relay owns events.
    const markerTarget = document.documentElement;
    if (markerTarget?.hasAttribute(RELAY_MARKER)) return;
    markerTarget?.setAttribute(RELAY_MARKER, '');
    if (window.__trailRelaySignal && !window.__trailRelaySignal.aborted) return;
    window.__trailRelaySignal = ctx.signal;
    ctx.onInvalidated(() => {
      window.__trailRelaySignal = undefined;
    });

    let buf: unknown[] = [];

    // Resolver for the recorder's 'stopped' ack (stop handshake).
    let stoppedResolve: (() => void) | null = null;

    // Countable ks that drive the live overlay counters. rrweb is intentionally
    // excluded — its high-volume visual stream is throttled to the interval
    // so the overlay doesn't spam the SW on every mouse/scroll frame.
    const COUNTABLE = new Set([
      "click",
      "input",
      "key",
      "submit",
      "viewport",
      "console",
      "net",
      "flag",
    ]);
    let immediateTimer: number | undefined;
    const scheduleImmediateFlush = () => {
      if (immediateTimer !== undefined) return;
      immediateTimer = window.setTimeout(() => {
        immediateTimer = undefined;
        flushSoon();
      }, 50);
    };
    const flushSoon = () => {
      if (!buf.length) return;
      void browser.runtime
        .sendMessage({ type: MSG_BATCH, batch: buf.splice(0) })
        .catch(() => {});
    };

    // MAIN world → here. Batch on a timer so we're not doing one sendMessage per event.
    addEventListener('message', (e) => {
      if (e.source !== window) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      if (data[POST_MESSAGE_KEY] === true) {
        buf.push(data.d);
        const k = (data.d as { k?: string })?.k;
        if (k && COUNTABLE.has(k)) scheduleImmediateFlush();
      }
      else if (data[POST_MESSAGE_KEY] === 'stopped') stoppedResolve?.();
      else if (data[POST_MESSAGE_KEY] === 'boot') void checkSession();
      // Presence probe: the web app's handoff gate asks "is TRAIL installed?"
      // and the relay answers with an ack so the page can show the Open-in-TRAIL
      // gate instead of falling straight into the inline review.
      else if (data[POST_MESSAGE_KEY] === 'probe') {
        window.postMessage({ [POST_MESSAGE_KEY]: 'probe-ack' }, '*');
      }
      // Handoff bridge: the web app (/r/<id> → "Review in TRAIL") posts the
      // share link; the relay forwards it to the background, which opens the
      // extension's own review tab. Origin-gated so any old page can't do it.
      else if (
        data[POST_MESSAGE_KEY] === 'open-share' &&
        e.origin === WEB_ORIGIN
      ) {
        // Forward the ack back to the page so the web UI can stop waiting
        // (the handoff page switches to "opening in TRAIL…" on ok).
        send({ type: MSG_OPEN_SHARE, link: data.link }).then((r) => {
          window.postMessage(
            { [POST_MESSAGE_KEY]: 'open-ack', ok: r?.ok === true },
            '*',
          );
        });
      }
    });

    const send = (msg: Record<string, unknown>) =>
      // .catch is required: sendMessage rejects when the extension reloads, and an
      // unhandled rejection in a content script is noisy.
      browser.runtime.sendMessage(msg).catch(() => {});

    let flushInterval: number | undefined;
    const startFlushLoop = () => {
      if (flushInterval !== undefined) return;
      flushInterval = window.setInterval(flushSoon, 150);
    };
    const stopFlushLoop = () => {
      if (flushInterval === undefined) return;
      window.clearInterval(flushInterval);
      flushInterval = undefined;
    };
    startFlushLoop();

    // Session awareness: the recorder is registered for <all_urls>, so pages
    // OTHER than the session tab get one too. Poll the background for "is this
    // the session tab?" and disarm the recorder when it isn't — otherwise stray
    // tabs would keep capturing (and post-stop recorders would run forever).
    let polling = false;
    let pollTimer: number | undefined;
    const checkSession = () => {
      browser.runtime
        .sendMessage({ type: MSG_OVERLAY_STATUS })
        .then((r) => {
          if (r?.recording === true) {
            startPolling();
          } else {
            stopPolling();
            window.postMessage({ [POST_MESSAGE_KEY]: 'stop' }, '*');
          }
        })
        .catch(() => stopPolling());
    };
    const startPolling = () => {
      if (polling) return;
      polling = true;
      pollTimer = window.setInterval(checkSession, 1000);
    };
    const stopPolling = () => {
      polling = false;
      if (pollTimer !== undefined) {
        clearInterval(pollTimer);
        pollTimer = undefined;
      }
    };

    // Navigation tears the page down with any un-flushed buffer. Flush on
    // pagehide so the tail of a session isn't silently lost (Risk 4).
    addEventListener('pagehide', flushSoon);
    addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') flushSoon();
      },
      { capture: true },
    );

    // Background → here → MAIN world. Stop tears down the already-open page, start
    // re-arms it after a stop (see recorder.content.ts), and redact is relayed since
    // the recorder can't read chrome.storage on its own.
    browser.runtime.onMessage.addListener((msg) => {
      if (msg?.type === MSG_STOP_RECORDER) {
        stopFlushLoop();
        if (immediateTimer !== undefined) {
          clearTimeout(immediateTimer);
          immediateTimer = undefined;
        }
        stopPolling();
        // Deterministic stop: tell the recorder to seal, wait for its ack (with a
        // bounded fallback in case the page is being torn down), then upload the
        // tail as a FINAL batch the background awaits before clearing the session.
        window.postMessage({ [POST_MESSAGE_KEY]: 'stop' }, '*');
        const stopped = new Promise<void>((resolve) => {
          stoppedResolve = resolve;
          setTimeout(() => {
            if (stoppedResolve === resolve) {
              stoppedResolve = null;
              resolve();
            }
          }, 200);
        });
        return stopped.then(() => {
          if (!buf.length) return;
          return send({ type: MSG_BATCH, batch: buf.splice(0), final: true });
        });
      } else if (msg?.type === MSG_START_RECORDER) {
        startFlushLoop();
        startPolling();
        window.postMessage({ [POST_MESSAGE_KEY]: 'start' }, '*');
      } else if (msg?.type === MSG_REDACT) {
        window.postMessage({ [POST_MESSAGE_KEY]: 'redact', value: msg.value === true }, '*');
      }
    });

    // A page loaded mid-session inherits a running recorder; find out right away
    // whether it belongs here and disarm it if not.
    void checkSession();
  },
});
