import { RECORDER_ID } from "@trail/review/lib/constants";
import type { ScriptPublicPath } from "wxt/utils/inject-script";

const RECORDER_JS = "/content-scripts/recorder.js" as ScriptPublicPath;
const RELAY_JS = "/content-scripts/relay.js" as ScriptPublicPath;
const OVERLAY_JS = "/content-scripts/recording-overlay.js" as ScriptPublicPath;
const RELAY_MARKER = "data-trail-extension-relay";

// registerContentScripts covers FUTURE navigations; executeScript covers the
// page that's already open. You need both — that pair is the whole trick.
export async function registerRecorderScripts(): Promise<void> {
  // Guard against double registration (e.g. HMR re-exec or concurrent Start
  // calls): registerContentScripts throws "already exists" if the id is taken.
  try {
    const existing = await browser.scripting
      .getRegisteredContentScripts({ ids: [RECORDER_ID] })
      .catch(() => []);
    if (existing && existing.length) return;
  } catch {}
  try {
    await browser.scripting.registerContentScripts([
      {
        id: RECORDER_ID,
        js: [RECORDER_JS],
        matches: ["<all_urls>"],
        runAt: "document_start",
        world: "MAIN",
        persistAcrossSessions: false,
      },
    ]);
  } catch (e) {
    if (!String((e as Error)?.message ?? e).includes("already exists")) throw e;
  }
}

export async function injectRecorderIntoPage(tabId: number): Promise<void> {
  // The relay is also manifest-injected. Probe its shared DOM marker before
  // covering an already-open page with executeScript, or listeners accumulate.
  const relayReady = await browser.scripting
    .executeScript({
      target: { tabId },
      world: "ISOLATED",
      func: (marker) => document.documentElement?.hasAttribute(marker) === true,
      args: [RELAY_MARKER],
    })
    .then((results) => results?.[0]?.result === true)
    .catch(() => false);
  if (!relayReady) {
    await browser.scripting.executeScript({
      target: { tabId },
      world: "ISOLATED",
      files: [RELAY_JS],
    });
  }

  const overlayReady = await browser.scripting
    .executeScript({
      target: { tabId },
      world: "ISOLATED",
      func: () => !!document.getElementById("trail-recording-overlay"),
    })
    .then((results) => results?.[0]?.result === true)
    .catch(() => false);
  if (!overlayReady) {
    await browser.scripting.executeScript({
      target: { tabId },
      world: "ISOLATED",
      files: [OVERLAY_JS],
    });
  }

  // Do not blindly clear __trailRecorder — that defeats the guard in
  // recorder.content.ts and creates a second set of listeners/patches if a
  // recorder is already live. Probe first and skip the MAIN inject when present.
  const hasRecorder = await browser.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => !!(window as unknown as Record<string, unknown>).__trailRecorder,
    })
    .then((results) => results?.[0]?.result === true)
    .catch(() => false);
  if (hasRecorder) return;

  await browser.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    files: [RECORDER_JS],
  });
}

export async function unregisterRecorderScripts(): Promise<void> {
  await browser.scripting.unregisterContentScripts({ ids: [RECORDER_ID] });
}
