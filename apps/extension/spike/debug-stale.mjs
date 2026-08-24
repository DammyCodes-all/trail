import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.resolve(here, "..", ".output", "chrome-mv3");
const testPageServer = path.resolve(here, "test-page.mjs");
const baseUrl = "http://localhost:8899";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

function findChrome() {
  const browsersDir = path.resolve(here, "..", ".browsers", "chrome");
  if (fs.existsSync(browsersDir)) {
    for (const entry of fs.readdirSync(browsersDir)) {
      const executable = path.join(
        browsersDir,
        entry,
        "chrome-linux64",
        "chrome",
      );
      if (fs.existsSync(executable)) return executable;
    }
  }
  return "/usr/bin/google-chrome";
}

async function getExtensionId(browser) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const worker = browser
      .targets()
      .find(
        (target) =>
          target.type() === "service_worker" &&
          target.url().startsWith("chrome-extension://"),
      );
    if (worker) return new URL(worker.url()).host;
    await sleep(100);
  }
  throw new Error("extension service worker target not found");
}

async function openPopup(browser, extensionId) {
  const popup = await browser.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForSelector("#start", { timeout: 8000, polling: 50 });
  return popup;
}


async function startSession(popup, targetPage, session) {
  await popup.evaluate(() => document.querySelector("#start")?.click());
  await popup.waitForSelector("#begin", { timeout: 8000, polling: 50 });
  await targetPage.bringToFront();
  const tabId = await popup.evaluate(async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab.id;
  });

  await popup.evaluate(() => document.querySelector("#begin")?.click());
  await targetPage.waitForFunction(
    () => window.__trailRecorderActive === true,
    { timeout: 8000, polling: 50 },
  );
  return tabId;
}

async function stopSession(browser, extensionId, tabId, session) {
  const popup = await browser.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForSelector("#stop", { timeout: 8000, polling: 50 });

  await popup.evaluate(() => {
    window.__trailEvents = undefined;
    document.querySelector("#stop")?.click();
  });
  await popup.waitForFunction(() => Array.isArray(window.__trailEvents), {
    timeout: 10000,
    polling: 50,
  });
  const events = await popup.evaluate(() => window.__trailEvents);
  await popup.close();
  return events;
}

let browser;
let server;

try {
  server = spawn(process.execPath, [testPageServer], { stdio: "ignore" });
  await sleep(500);

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "trail-lifecycle-"));
  browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: "new",
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      `--user-data-dir=${profile}`,
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--disable-background-networking",
    ],
  });

  const extensionId = await getExtensionId(browser);
  const targetPage = await browser.newPage();
  await targetPage.goto(`${baseUrl}/page1.html`, { waitUntil: "load" });

  const clickCounts = [];
  for (let session = 1; session <= 3; session += 1) {
    // Simulate the user reloading the built extension between recordings.
    // Everything already open keeps orphaned contexts + stale DOM/MAIN-world
    // artifacts — exactly the "previous tabs" scenario.
    if (session > 1) {
      console.log(`--- reloading extension before session ${session} ---`);
      const reloader = await browser.newPage();
      await reloader.goto(`chrome-extension://${extensionId}/popup.html`);
      // Fire-and-forget: runtime.reload() tears down the calling page.
      await reloader
        .evaluate(() => setTimeout(() => chrome.runtime.reload(), 0))
        .catch(() => {});
      await sleep(300);
      await reloader.close().catch(() => {});
      // Wait for the new incarnation's service worker.
      let reloaded = false;
      for (let attempt = 0; attempt < 100 && !reloaded; attempt += 1) {
        const worker = browser
          .targets()
          .find(
            (t) =>
              t.type() === "service_worker" &&
              t.url().startsWith(`chrome-extension://${extensionId}`),
          );
        if (worker) {
          try {
            const cdp = await worker.createCDPSession();
            await cdp.send("Runtime.evaluate", { expression: "1" });
            reloaded = true;
          } catch {
            await sleep(100);
          }
        } else {
          await sleep(100);
        }
      }
      assert(reloaded, "extension service worker did not come back after reload");
      await sleep(500);
    }

    const popup = await openPopup(browser, extensionId);
    console.log(`session ${session}: popup open, starting recording...`);
    const tabId = await startSession(popup, targetPage, session);
    console.log(`session ${session}: recording started (tab ${tabId}), clicking...`);
    await targetPage.bringToFront();
    await targetPage.click("#dbl");
    await sleep(250);
    const events = await stopSession(browser, extensionId, tabId, session);
    const count = events.filter(
      (event) => event.k === "click" && event.label === "Tap twice",
    ).length;
    clickCounts.push(count);
    console.log(`session ${session}: ${count} captured click event(s)`);
  }

  assert(
    clickCounts.every((count) => count === 1),
    `one physical click must remain one captured click after restarts; got ${clickCounts.join(", ")}`,
  );
  console.log("recording lifecycle PASS");
} finally {
  await browser?.close().catch(() => {});
  server?.kill("SIGTERM");
}
