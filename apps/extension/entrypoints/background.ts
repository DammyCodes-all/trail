import {
  MSG_BATCH,
  MSG_OVERLAY_STATUS,
  MSG_OVERLAY_UPDATE,
  MSG_REDACT,
  MSG_START,
  MSG_START_RECORDER,
  MSG_STATUS,
  MSG_STOP,
  MSG_STOP_RECORDER,
  REDACT_KEY,
} from "@/lib/constants";
import {
  addEvents,
  clearEvents,
  getAllEvents,
  saveReport,
  saveSessionEvents,
} from "@/lib/db";
import {
  injectRecorderIntoPage,
  registerRecorderScripts,
  unregisterRecorderScripts,
} from "@/lib/recorder-scripts";
import { suggestTitle } from "@/lib/report";
import {
  clearCounts,
  DEFAULT_COUNTS,
  getCounts,
  getSession,
  setCounts,
  setSession,
  totalCounts,
} from "@/lib/session";
import type { TrailCounts, TrailSession } from "@/lib/types";

// Serializes MSG_BATCH handling: handlers share read-modify-write on counts, and
// two near-simultaneous flushes (interval + visibilitychange) would lose increments.
let batchChain: Promise<void> = Promise.resolve();
let overlayVersion = Date.now();

const nextOverlayVersion = () =>
  (overlayVersion = Math.max(Date.now(), overlayVersion + 1));

function pushOverlayStatus(
  session: TrailSession,
  counts: TrailCounts,
  recording = true,
): void {
  void browser.tabs
    .sendMessage(session.tabId, {
      type: MSG_OVERLAY_UPDATE,
      recording,
      counts: recording ? counts : DEFAULT_COUNTS,
      startedAt: session.startedAt,
      version: nextOverlayVersion(),
    })
    .catch(() => {});
}

async function startRecording(
  tabId?: number,
): Promise<{ ok: boolean; error?: string }> {
  let id = tabId;
  if (!id) {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    id = tab?.id;
  }
  if (!id)
    return {
      ok: false,
      error: "Open a normal web page to record, then try again.",
    };
  const tab = await browser.tabs.get(id);
  if (!tab?.url?.startsWith("http")) {
    return {
      ok: false,
      error: "Open a normal web page to record, then try again.",
    };
  }
  await clearEvents();
  await setCounts(DEFAULT_COUNTS);
  const session: TrailSession = { tabId: id, startedAt: Date.now() };

  try {
    await registerRecorderScripts();
    // Session must be live BEFORE the recorder is injected: the batch gate drops
    // everything without a session, and the recorder's very first event is the
    // rrweb full snapshot that the replay needs as its base frame.
    await setSession(session);
    await injectRecorderIntoPage(id);
  } catch (err) {
    await setSession(null);
    await clearCounts();
    return { ok: false, error: (err as Error).message };
  }

  // The recorder can't read chrome.storage (MAIN world), so deliver the redact
  // preference through the relay. Default to on when never set.
  const { [REDACT_KEY]: autoRedact } =
    await browser.storage.local.get(REDACT_KEY);
  await browser.tabs
    .sendMessage(id, { type: MSG_REDACT, value: autoRedact ?? true })
    .catch(() => {});

  // Re-arm a recorder left on this page by a previous stop. Idempotent: a freshly
  // injected recorder is already active and ignores the 'start' message.
  await browser.tabs
    .sendMessage(id, { type: MSG_START_RECORDER })
    .catch(() => {});

  pushOverlayStatus(session, DEFAULT_COUNTS);

  browser.action.setBadgeBackgroundColor({ color: "#ff6a00" });
  browser.action.setBadgeText({ text: "0" });
  return { ok: true };
}

async function stopRecording(): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  try {
    await unregisterRecorderScripts();
    if (session) {
      // Deterministic teardown: the relay stops the recorder, waits for its
      // ack, then uploads the final tail as a `final` batch. This sendMessage
      // resolves only once that batch is persisted, so the session can be torn
      // down without a sleep and the tail is never lost.
      await browser.tabs
        .sendMessage(session.tabId, { type: MSG_STOP_RECORDER })
        .catch(() => {});
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  // Read counts AFTER the final flush so the saved report includes the tail.
  const counts = await getCounts();
  await setSession(null);
  await clearCounts();
  if (session) pushOverlayStatus(session, DEFAULT_COUNTS, false);
  browser.action.setBadgeText({ text: "" });

  // Save a report entry for the popup's history list. Best-effort: never fail a
  // stop because history writing hiccuped.
  if (session) {
    try {
      const events = await getAllEvents();
      const seq = await saveReport({
        title: suggestTitle(events),
        repo: "",
        startedAt: session.startedAt,
        endedAt: Date.now(),
        eventCount: events.length,
        counts,
        url: events[0]?.url ?? "",
      });
      // Snapshot the events so the report can be reopened after the next recording
      // clears the live store (history detail view).
      await saveSessionEvents(seq, events);
    } catch {
      // history is best-effort
    }
  }
  return { ok: true };
}

async function openReviewPage(): Promise<void> {
  await browser.tabs.create({ url: browser.runtime.getURL("/review.html") });
}

export default defineBackground(() => {
  // Rehydrate: if a session was active when the SW died, re-register the recorder
  // so future navigations keep recording. Already-open tabs still have the
  // injected recorder; Chrome wakes this SW for each batch.
  void (async () => {
    const session = await getSession();
    if (!session) return;
    try {
      await registerRecorderScripts();
    } catch {
      // The runtime registration can already exist after a normal SW restart.
    }
    try {
      const counts = await getCounts();
      browser.action.setBadgeBackgroundColor({ color: "#ff6a00" });
      browser.action.setBadgeText({ text: String(totalCounts(counts)) });
      pushOverlayStatus(session, counts);
    } catch {
      // Nothing to restore if session storage is unavailable.
    }
  })();

  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === MSG_BATCH) {
      batchChain = batchChain
        .then(async () => {
          const session = await getSession();
          // Gate by tab (matches is <all_urls>, so any page could be talking).
          // Final batches (the stop tail) must still be acked so the relay's
          // handshake can resolve — with {ok:false} when they're gated out.
          if (
            !session ||
            sender.tab?.id !== session.tabId ||
            !Array.isArray(msg.batch)
          ) {
            if (msg.final === true) sendResponse({ ok: false });
            return;
          }
          await addEvents(msg.batch);
          const counts = await getCounts();
          let countsChanged = false;
          for (const d of msg.batch as Array<{ k: string }>) {
            if (d.k === "click") {
              counts.click++;
              countsChanged = true;
            } else if (d.k === "input") {
              counts.input++;
              countsChanged = true;
            } else if (d.k === "console") {
              counts.console++;
              countsChanged = true;
            } else if (d.k === "net") {
              counts.net++;
              countsChanged = true;
            }
          }
          await setCounts(counts);
          if (countsChanged) pushOverlayStatus(session, counts);
          browser.action.setBadgeText({ text: String(totalCounts(counts)) });
          if (msg.final === true) sendResponse({ ok: true });
        })
        .catch(() => {
          // never let a batch failure stall the chain — but a stalled ack would
          // hang the stop handshake, so final batches always answer
          if (msg.final === true) sendResponse({ ok: false });
        });
      // Keep the channel open for the ack; fire-and-forget otherwise.
      return msg.final === true;
    }

    if (msg?.type === MSG_START) {
      void (async () => {
        try {
          sendResponse(await startRecording(msg.tabId as number | undefined));
        } catch (err) {
          sendResponse({ ok: false, error: (err as Error).message });
        }
      })();
      return true;
    }

    if (msg?.type === MSG_STOP) {
      void (async () => {
        try {
          sendResponse(await stopRecording());
          if (msg?.source === "overlay") {
            await openReviewPage();
          }
        } catch (err) {
          sendResponse({ ok: false, error: (err as Error).message });
        }
      })();
      return true;
    }

    if (msg?.type === MSG_STATUS) {
      void (async () => {
        try {
          const session = await getSession();
          const counts = await getCounts();
          sendResponse({ recording: !!session, counts });
        } catch (err) {
          sendResponse({
            recording: false,
            counts: DEFAULT_COUNTS,
            error: (err as Error).message,
          });
        }
      })();
      return true;
    }

    if (msg?.type === MSG_OVERLAY_STATUS) {
      const version = nextOverlayVersion();
      void (async () => {
        try {
          const session = await getSession();
          const recording = !!session && sender.tab?.id === session.tabId;
          sendResponse({
            recording,
            counts: recording ? await getCounts() : DEFAULT_COUNTS,
            startedAt: recording ? session.startedAt : undefined,
            version,
          });
        } catch (err) {
          sendResponse({
            recording: false,
            counts: DEFAULT_COUNTS,
            version,
            error: (err as Error).message,
          });
        }
      })();
      return true;
    }
  });
});
