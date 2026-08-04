import {
  MSG_BATCH,
  MSG_OVERLAY_STATUS,
  MSG_REDACT,
  MSG_START_RECORDER,
  MSG_STOP_RECORDER,
  POST_MESSAGE_KEY,
} from '@/lib/constants';

declare global {
  interface Window {
    __trailRelay?: boolean;
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'ISOLATED',
  noScriptStartedPostMessage: true,
  main() {
    if (window.__trailRelay) return;
    window.__trailRelay = true;

    let buf: unknown[] = [];

    // Resolver for the recorder's 'stopped' ack (stop handshake).
    let stoppedResolve: (() => void) | null = null;

    // MAIN world → here. Batch on a timer so we're not doing one sendMessage per event.
    addEventListener('message', (e) => {
      if (e.source !== window) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      if (data[POST_MESSAGE_KEY] === true) buf.push(data.d);
      else if (data[POST_MESSAGE_KEY] === 'stopped') stoppedResolve?.();
      else if (data[POST_MESSAGE_KEY] === 'boot') void checkSession();
    });

    const send = (msg: Record<string, unknown>) =>
      // .catch is required: sendMessage rejects when the extension reloads, and an
      // unhandled rejection in a content script is noisy.
      browser.runtime.sendMessage(msg).catch(() => {});

    const flush = () => {
      if (!buf.length) return;
      send({ type: MSG_BATCH, batch: buf.splice(0) });
    };

    const interval = setInterval(flush, 500);

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
    addEventListener('pagehide', flush);
    addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') flush();
      },
      { capture: true },
    );

    // Background → here → MAIN world. Stop tears down the already-open page, start
    // re-arms it after a stop (see recorder.content.ts), and redact is relayed since
    // the recorder can't read chrome.storage on its own.
    browser.runtime.onMessage.addListener((msg) => {
      if (msg?.type === MSG_STOP_RECORDER) {
        clearInterval(interval);
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
