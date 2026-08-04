import { POST_MESSAGE_KEY } from "@/lib/constants";
import type { RecordContext } from "@/lib/record/context";
import { instrumentConsole } from "@/lib/record/console";
import { instrumentClicks, instrumentInputs } from "@/lib/record/interactions";
import { instrumentNetwork } from "@/lib/record/network";
import { createRrweb } from "@/lib/record/rrweb";

declare global {
  interface Window {
    __trailRecorder?: boolean;
    // Test hook: mirrors `active`, so the spike can assert a non-session page's
    // recorder gets disarmed by the relay's session check.
    __trailRecorderActive?: boolean;
  }
}

// Orchestrates the MAIN-world recorders (see lib/record/*) and the relay
// messages that arm/disarm them. This file only wires state and lifecycle;
// each instrumenter owns its capture logic.
export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  world: "MAIN",
  registration: "runtime",
  noScriptStartedPostMessage: true,
  main() {
    if (window.__trailRecorder) return;
    window.__trailRecorder = true;

    let active = true;
    let autoRedact = true; // default on; relay delivers the stored preference

    const setActive = (v: boolean) => {
      active = v;
      window.__trailRecorderActive = v;
    };

    const ctx: RecordContext = {
      emit: (d) => window.postMessage({ [POST_MESSAGE_KEY]: true, d }, "*"),
      isActive: () => active,
      pageUrl: () => location.href,
    };

    const rrweb = createRrweb(ctx, () => autoRedact);

    instrumentConsole(ctx);
    instrumentNetwork(ctx);
    instrumentClicks(ctx);
    instrumentInputs(ctx, () => autoRedact);

    addEventListener("message", (e) => {
      if (e.data?.[POST_MESSAGE_KEY] === "stop") {
        setActive(false);
        rrweb.stop();
        // Ack so the relay knows capture is sealed and can flush the final
        // batch without racing new events.
        window.postMessage({ [POST_MESSAGE_KEY]: "stopped" }, "*");
      } else if (e.data?.[POST_MESSAGE_KEY] === "start") {
        // Re-arm after a stop on the same page. The stale __trailRecorder guard
        // makes re-executing recorder.js a no-op, so re-activation has to come
        // through the relay as a message.
        setActive(true);
        if (!rrweb.running) rrweb.start();
      } else if (e.data?.[POST_MESSAGE_KEY] === "redact") {
        const on = e.data.value === true;
        if (on !== autoRedact) {
          autoRedact = on;
          // rrweb's masking options are fixed per recording: restart so the
          // visual replay honors the new preference.
          if (rrweb.running) rrweb.restart();
        }
      }
    });

    // ---- rrweb: visual replay only ----
    setActive(true);
    rrweb.start();

    // Announce the boot: a page that loaded mid-session inherits this recorder,
    // and the relay decides whether it belongs here by re-checking the session.
    window.postMessage({ [POST_MESSAGE_KEY]: "boot" }, "*");
  },
});
