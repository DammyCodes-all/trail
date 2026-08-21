import { POST_MESSAGE_KEY, FLAG_KEY, FLAG_DEDUP_WINDOW_MS } from "@trail/review/lib/constants";
import type { RecordContext } from "@/lib/record/context";
import { instrumentConsole } from "@/lib/record/console";
import { instrumentClicks, instrumentInputs } from "@/lib/record/interactions";
import { instrumentKeys } from "@/lib/record/keys";
import { instrumentSubmits } from "@/lib/record/forms";
import { instrumentHovers } from "@/lib/record/hover";
import { instrumentViewport } from "@/lib/record/viewport";
import {
  instrumentNetwork,
  instrumentResourceErrors,
  instrumentWebSockets,
} from "@/lib/record/network";
import { emitMeta } from "@/lib/record/meta";
import { createRrweb } from "@/lib/record/rrweb";
import { cap } from "@/lib/record/format";
import type { FlagEvent, NavEvent } from "@trail/review/lib/types";

declare global {
  interface Window {
    __trailRecorder?: boolean | string;
    // Test hook: mirrors `active`, so the spike can assert a non-session page's
    // recorder gets disarmed by the relay's session check.
    __trailRecorderActive?: boolean;
    __trailConsolePatched?: boolean;
    __trailNetworkPatched?: boolean;
    __trailWebSocketPatched?: boolean;
    __trailResourceErrorPatched?: boolean;
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
    const w = window as unknown as Record<string, unknown>;
    if (w.__trailRecorder) return;
    // Set synchronously before any instrumentation so a concurrent injection
    // that races this one (e.g. registered MAIN script at document_start vs
    // injectRecorderIntoPage) sees truthy and bails, preventing double
    // listeners/patches.
    w.__trailRecorder = true;

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
    instrumentResourceErrors(ctx);
    instrumentWebSockets(ctx);
    instrumentClicks(ctx);
    instrumentInputs(ctx, () => autoRedact);
    instrumentKeys(ctx);
    instrumentSubmits(ctx);
    instrumentHovers(ctx);
    instrumentViewport(ctx);

    let lastFlag: { phase: string | undefined; note: string | undefined; t: number } | null = null;
    addEventListener("message", (e) => {
      if (e.data?.[POST_MESSAGE_KEY] === "stop") {
        setActive(false);
        lastFlag = null;
        rrweb.stop();
        // Ack so the relay knows capture is sealed and can flush the final
        // batch without racing new events.
        window.postMessage({ [POST_MESSAGE_KEY]: "stopped" }, "*");
      } else if (e.data?.[POST_MESSAGE_KEY] === "start") {
        // Re-arm after a stop on the same page. The stale __trailRecorder guard
        // makes re-executing recorder.js a no-op, so re-activation has to come
        // through the relay as a message.
        setActive(true);
        lastFlag = null;
        if (!rrweb.running) rrweb.start();
      } else if (e.data?.[POST_MESSAGE_KEY] === "redact") {
        const on = e.data.value === true;
        if (on !== autoRedact) {
          autoRedact = on;
          // rrweb's masking options are fixed per recording: restart so the
          // visual replay honors the new preference.
          if (rrweb.running) rrweb.restart();
        }
      } else if (e.data?.[POST_MESSAGE_KEY] === FLAG_KEY) {
        // The overlay posts per flag flow: an 'open' when the form appears, a
        // 'cancel' when it's dismissed without submitting, and a 'submit' with
        // the reporter's note. Only submits carry text; the window edges are
        // marker events. Events from before phase existed carry neither and
        // read as submits. The message still accepts the legacy expected/
        // actual pair (old overlay builds), but we only write the `note`.
        if (!active) return;
        const d = e.data.d as
          | {
              note?: string;
              expected?: string;
              actual?: string;
              phase?: 'open' | 'submit' | 'cancel';
            }
          | undefined;
        const rawPhase = d?.phase;
        const phase =
          rawPhase === 'open' ||
          rawPhase === 'submit' ||
          rawPhase === 'cancel'
            ? rawPhase
            : undefined;
        const notes = phase !== 'open' && phase !== 'cancel';
        const note = notes
          ? cap(d?.note || d?.expected || d?.actual || '', 240) || undefined
          : undefined;
        const now = Date.now();
        if (
          lastFlag &&
          lastFlag.phase === phase &&
          lastFlag.note === note &&
          Math.abs(now - lastFlag.t) < FLAG_DEDUP_WINDOW_MS
        ) {
          return;
        }
        lastFlag = { phase, note, t: now };
        const flag: FlagEvent = {
          k: 'flag',
          t: now,
          url: location.href,
          phase,
          note,
        };
        ctx.emit(flag);
      }
    });

    // ---- rrweb: visual replay only ----
    setActive(true);
    rrweb.start();

    // ---- Landmark: this document load ----
    // Every boot is a page load in the session tab, so emit it as a real event.
    // Same-URL refreshes otherwise leave no trace: buildTimeline() synthesizes
    // nav steps only when the URL changes. Stray-tab boots are dropped by the
    // background's session gate. navigation.type is sync at document_start;
    // the modern entry (getEntriesByType) may not be populated yet, so fall back.
    const reload =
      (performance.getEntriesByType?.("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined)?.type === "reload" ||
      (performance as unknown as { navigation?: { type: number } }).navigation
        ?.type === 1;
    const nav: NavEvent = { k: "nav", t: Date.now(), url: location.href, reload };
    ctx.emit(nav);
    // Capture-time environment: rides the same boot path as nav, so stray-tab
    // boots are dropped by the background's session gate exactly like nav is.
    emitMeta(ctx);

    // Announce the boot: a page that loaded mid-session inherits this recorder,
    // and the relay decides whether it belongs here by re-checking the session.
    window.postMessage({ [POST_MESSAGE_KEY]: "boot" }, "*");
  },
});
