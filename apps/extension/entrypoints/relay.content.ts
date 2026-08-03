import {
  MSG_BATCH,
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

    // MAIN world → here. Batch on a timer so we're not doing one sendMessage per event.
    addEventListener('message', (e) => {
      if (e.source !== window) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      if (data[POST_MESSAGE_KEY] === true) buf.push(data.d);
    });

    const flush = () => {
      if (!buf.length) return;
      const batch = buf.splice(0);
      // .catch is required: sendMessage rejects when the extension reloads, and an
      // unhandled rejection in a content script is noisy.
      browser.runtime.sendMessage({ type: MSG_BATCH, batch }).catch(() => {});
    };

    const interval = setInterval(flush, 500);

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
        flush();
        window.postMessage({ [POST_MESSAGE_KEY]: 'stop' }, '*');
      } else if (msg?.type === MSG_START_RECORDER) {
        window.postMessage({ [POST_MESSAGE_KEY]: 'start' }, '*');
      } else if (msg?.type === MSG_REDACT) {
        window.postMessage({ [POST_MESSAGE_KEY]: 'redact', value: msg.value === true }, '*');
      }
    });
  },
});
