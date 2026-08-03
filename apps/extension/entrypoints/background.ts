import type { ScriptPublicPath } from 'wxt/utils/inject-script';
import {
  MSG_BATCH,
  MSG_REDACT,
  MSG_START,
  MSG_START_RECORDER,
  MSG_STATUS,
  MSG_STOP,
  MSG_STOP_RECORDER,
  RECORDER_ID,
  REDACT_KEY,
} from '@/lib/constants';
import { addEvents, clearEvents, getAllEvents, saveReport } from '@/lib/db';
import { suggestTitle } from '@/lib/report';
import type { TrailCounts, TrailSession } from '@/lib/types';

const RECORDER_JS = '/content-scripts/recorder.js' as ScriptPublicPath;

const DEFAULT_COUNTS: TrailCounts = { click: 0, console: 0, net: 0 };

// Serializes MSG_BATCH handling: handlers share read-modify-write on counts, and
// two near-simultaneous flushes (interval + visibilitychange) would lose increments.
let batchChain: Promise<void> = Promise.resolve();

async function getSession(): Promise<TrailSession | null> {
  const { session } = await browser.storage.session.get('session');
  return (session as TrailSession) ?? null;
}

async function setSession(session: TrailSession | null): Promise<void> {
  if (session) await browser.storage.session.set({ session });
  else await browser.storage.session.remove('session');
}

async function getCounts(): Promise<TrailCounts> {
  const { counts } = await browser.storage.session.get('counts');
  return { ...DEFAULT_COUNTS, ...(counts as Partial<TrailCounts>) };
}

async function startRecording(tabId?: number): Promise<{ ok: boolean; error?: string }> {
  let id = tabId;
  if (!id) {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    id = tab?.id;
  }
  if (!id) return { ok: false, error: 'Open a normal web page to record, then try again.' };
  const tab = await browser.tabs.get(id);
  if (!tab?.url?.startsWith('http')) {
    return { ok: false, error: 'Open a normal web page to record, then try again.' };
  }
  await clearEvents();
  await browser.storage.session.set({ counts: DEFAULT_COUNTS });

  try {
    // registerContentScripts covers FUTURE navigations; executeScript covers the
    // page that's already open. You need both — that pair is the whole trick.
    await browser.scripting.registerContentScripts([
      {
        id: RECORDER_ID,
        js: [RECORDER_JS],
        matches: ['<all_urls>'],
        runAt: 'document_start',
        world: 'MAIN',
        persistAcrossSessions: false,
      },
    ]);
    await browser.scripting.executeScript({
      target: { tabId: id },
      world: 'MAIN',
      files: [RECORDER_JS],
    });
  } catch (err) {
    await browser.storage.session.remove('counts');
    return { ok: false, error: (err as Error).message };
  }

  // The recorder can't read chrome.storage (MAIN world), so deliver the redact
  // preference through the relay. Default to on when never set.
  const { [REDACT_KEY]: autoRedact } = await browser.storage.local.get(REDACT_KEY);
  await browser.tabs
    .sendMessage(id, { type: MSG_REDACT, value: autoRedact ?? true })
    .catch(() => {});

  // Re-arm a recorder left on this page by a previous stop. Idempotent: a freshly
  // injected recorder is already active and ignores the 'start' message.
  await browser.tabs.sendMessage(id, { type: MSG_START_RECORDER }).catch(() => {});

  // Session goes live only once the recorder is actually injected, so "recording"
  // never reports true while the page still has no recorder.
  await setSession({ tabId: id, startedAt: Date.now() });

  browser.action.setBadgeBackgroundColor({ color: '#dc2626' });
  browser.action.setBadgeText({ text: '0' });
  return { ok: true };
}

async function stopRecording(): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  const counts = await getCounts();
  try {
    await browser.scripting.unregisterContentScripts({ ids: [RECORDER_ID] });
    if (session) {
      await browser.tabs.sendMessage(session.tabId, { type: MSG_STOP_RECORDER }).catch(() => {});
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  // Let the relay's final buffer flush (MSG_BATCH) land BEFORE tearing the session
  // down: the batch handler gates on `session`, so clearing it first would drop the
  // tail of the recording.
  await new Promise((r) => setTimeout(r, 400));
  await setSession(null);
  await browser.storage.session.remove('counts');
  browser.action.setBadgeText({ text: '' });

  // Save a report entry for the popup's history list. Best-effort: never fail a
  // stop because history writing hiccuped.
  if (session) {
    try {
      const events = await getAllEvents();
      await saveReport({
        title: suggestTitle(events),
        repo: '',
        startedAt: session.startedAt,
        endedAt: Date.now(),
        eventCount: events.length,
        counts,
        url: events[0]?.url ?? '',
      });
    } catch {
      // history is best-effort
    }
  }
  return { ok: true };
}

export default defineBackground(() => {
  // Rehydrate: if a session was active when the SW died, re-register the recorder
  // so future navigations keep recording. Already-open tabs still have the
  // injected recorder; Chrome wakes this SW for each batch.
  void (async () => {
    const session = await getSession();
    if (!session) return;
    try {
      await browser.scripting.registerContentScripts([
        {
          id: RECORDER_ID,
          js: [RECORDER_JS],
          matches: ['<all_urls>'],
          runAt: 'document_start',
          world: 'MAIN',
          persistAcrossSessions: false,
        },
      ]);
      const counts = await getCounts();
      const total = counts.click + counts.console + counts.net;
      browser.action.setBadgeBackgroundColor({ color: '#dc2626' });
      browser.action.setBadgeText({ text: String(total) });
    } catch {
      // nothing to do if re-registration fails
    }
  })();

  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === MSG_BATCH) {
      batchChain = batchChain
        .then(async () => {
          const session = await getSession();
          // Gate by tab (matches is <all_urls>, so any page could be talking).
          if (!session || sender.tab?.id !== session.tabId || !Array.isArray(msg.batch)) return;
          await addEvents(msg.batch);
          const counts = await getCounts();
          for (const d of msg.batch as Array<{ k: string }>) {
            if (d.k === 'click') counts.click++;
            else if (d.k === 'console') counts.console++;
            else if (d.k === 'net') counts.net++;
          }
          await browser.storage.session.set({ counts });
          browser.action.setBadgeText({ text: String(counts.click + counts.console + counts.net) });
        })
        .catch(() => {}); // never let a batch failure stall the chain
      return; // async, no response needed
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
          sendResponse({ recording: false, counts: DEFAULT_COUNTS, error: (err as Error).message });
        }
      })();
      return true;
    }
  });
});
