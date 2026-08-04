import { RECORDER_ID } from "@/lib/constants";
import type { ScriptPublicPath } from "wxt/utils/inject-script";

const RECORDER_JS = "/content-scripts/recorder.js" as ScriptPublicPath;
const RELAY_JS = "/content-scripts/relay.js" as ScriptPublicPath;
const OVERLAY_JS = "/content-scripts/recording-overlay.js" as ScriptPublicPath;

// registerContentScripts covers FUTURE navigations; executeScript covers the
// page that's already open. You need both — that pair is the whole trick.
export async function registerRecorderScripts(): Promise<void> {
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
}

export async function injectRecorderIntoPage(tabId: number): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId },
    world: "ISOLATED",
    files: [RELAY_JS, OVERLAY_JS],
  });
  await browser.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    files: [RECORDER_JS],
  });
}

export async function unregisterRecorderScripts(): Promise<void> {
  await browser.scripting.unregisterContentScripts({ ids: [RECORDER_ID] });
}
