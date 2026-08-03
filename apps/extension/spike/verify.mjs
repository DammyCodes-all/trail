import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_DIR = path.resolve(__dirname, '..', '.output', 'chrome-mv3');
const PORT = 8899;
const BASE = `http://localhost:${PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function summary(events) {
  const counts = {};
  for (const e of events) counts[e.k] = (counts[e.k] ?? 0) + 1;
  return counts;
}

function findChrome() {
  const browsersDir = path.resolve(__dirname, '..', '.browsers', 'chrome');
  if (fs.existsSync(browsersDir)) {
    for (const entry of fs.readdirSync(browsersDir)) {
      const p = path.join(browsersDir, entry, 'chrome-linux64', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  }
  return '/usr/bin/google-chrome';
}

async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'trail-spike-'));
  return puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: [
      `--disable-extensions-except=${EXT_DIR}`,
      `--load-extension=${EXT_DIR}`,
      `--user-data-dir=${profile}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--disable-background-networking',
    ],
  });
}

async function getExtensionId(browser) {
  for (let i = 0; i < 50; i++) {
    const sw = browser
      .targets()
      .find((t) => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'));
    if (sw) return new URL(sw.url()).host;
    await sleep(200);
  }
  throw new Error('extension service worker target not found');
}

async function openPopup(browser, extId) {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extId}/popup.html`);
  await page.waitForSelector('.btn', { timeout: 8000, polling: 100 });
  await page.evaluate(() => {
    window.alert = (m) => {
      window.__lastAlert = m;
    };
  });
  return page;
}

async function clickStart(browser, popup, targetPage) {
  // Home → Start Report, then setup → Begin Recording (two-step popup flow).
  await popup.evaluate(() => document.querySelector('#start')?.click());
  await popup.waitForSelector('#begin', { timeout: 8000, polling: 100 });
  await popup.evaluate(() => document.querySelector('#begin')?.click());
  await popup.waitForFunction(
    () => document.querySelector('.pill')?.textContent === 'recording',
    { timeout: 8000, polling: 100 },
  );
  // The pill appears once the SW marks the session live; make sure the recorder
  // is actually injected on the page before simulating real input.
  await targetPage.waitForFunction(() => window.__trailRecorder === true, {
    timeout: 8000,
    polling: 100,
  });
}

async function clickStop(popup) {
  // __trailEvents may already hold a previous session's array; reset it so the
  // wait below observes the stop handler actually re-populating it.
  await popup.evaluate(() => {
    window.__trailEvents = undefined;
  });
  await popup.evaluate(() => document.querySelector('.btn.stop')?.click());
  await popup.waitForFunction(() => Array.isArray(window.__trailEvents), { timeout: 10000, polling: 100 });
  return popup.evaluate(() => window.__trailEvents);
}

async function killServiceWorker(page) {
  const cdp = await page.createCDPSession();
  await cdp.send('ServiceWorker.enable');
  const versions = [];
  const onUpdate = (e) => versions.push(...e.versions);
  cdp.on('ServiceWorker.workerVersionUpdated', onUpdate);
  await sleep(1000);
  const sw = versions.find((v) => v.scriptURL.endsWith('background.js'));
  if (!sw) throw new Error('extension SW not found for termination');
  await cdp.send('ServiceWorker.stopWorker', { versionId: sw.versionId });
  cdp.off('ServiceWorker.workerVersionUpdated', onUpdate);
  return Date.now();
}

function main() {
  let testPageSrv;
  let browser;
  return new Promise(async (resolve) => {
    try {
      // ---- test page server ----
      testPageSrv = spawn(process.execPath, [path.join(__dirname, 'test-page.mjs')], {
        stdio: 'ignore',
      });
      await sleep(800);

      browser = await launch();
      const extId = await getExtensionId(browser);
      console.log(`extension id: ${extId}`);

      // ============================================================
      // SPIKE 1 — MAIN-world capture of clicks / input / console / network / rrweb
      // ============================================================
      console.log('\n=== SPIKE 1: MAIN-world capture ===');

      const testPage = await browser.newPage();
      await testPage.goto(`${BASE}/page1.html`, { waitUntil: 'load' });
      await testPage.bringToFront();

      const popup = await openPopup(browser, extId);
      console.log('popup open');
      await testPage.bringToFront(); // active tab must be the page we record

      await clickStart(browser, popup, testPage);
      console.log('started recording');
      console.log('active tab at click:', await popup.evaluate(() => browser.tabs.query({ active: true, currentWindow: true }).then((t) => t[0]?.url)));
      console.log('recorder live on page1:', await testPage.evaluate(() => window.__trailRecorder));
      await testPage.bringToFront();

      // page1 interactions (after start)
      await testPage.click('#boom');
      console.log('clicked boom');
      await testPage.click('#xhr');
      await testPage.evaluate(() =>
        fetch('/missing', { method: 'POST' }).catch(() => {}),
      );
      await testPage.focus('#email');
      await testPage.type('#email', 'a@b.com');
      await testPage.evaluate(() => document.getElementById('email').blur());
      await testPage.focus('#pass');
      await testPage.type('#pass', 'hunter2');
      await testPage.evaluate(() => document.getElementById('pass').blur());
      // A real user "clicks into" fields before typing; that focus-click must not
      // count as a report action (typing is already captured via change).
      await testPage.evaluate(() =>
        document.getElementById('email').dispatchEvent(new MouseEvent('click', { bubbles: true })),
      );

      // navigate to page2 (risk 4: recorder must survive navigation)
      await testPage.click('#next');
      console.log('clicked next');
      await testPage.waitForSelector('#pay', { timeout: 8000, polling: 100 });
      console.log('page2 loaded');
      await testPage.bringToFront();
      await testPage.click('#pay');

      await sleep(1500); // let batches flush
      const s1 = await clickStop(popup);

      console.log('spike1 event counts:', summary(s1));
      console.log('spike1 non-rrweb:', s1.filter((e) => e.k !== 'rrweb').map((e) => ({ k: e.k, t: e.t, url: e.url, target: e.target, label: e.label, status: e.status })));
      assert(s1.length > 5, 'expected a healthy number of captured events');
      assert(summary(s1).click >= 3, 'expected clicks (boom, xhr, next, pay)');
      assert(summary(s1).console >= 3, 'expected console errors');
      assert(summary(s1).net >= 3, 'expected failed network requests');
      assert(summary(s1).input >= 2, 'expected typed input events');
      assert(summary(s1).rrweb >= 1, 'expected rrweb replay events');
      assert(
        s1.some((e) => e.url.includes('page2.html')),
        'expected events captured after navigation to page2',
      );
      const passEvent = s1.find((e) => e.k === 'input' && e.masked);
      assert(passEvent, 'expected a masked password input event');
      assert(!passEvent.value.includes('hunter2'), 'password must be masked, never recorded');
      const clickEvent = s1.find((e) => e.k === 'click' && e.tag === 'button');
      assert(clickEvent?.label, 'expected readable click label');
      const noise = s1.filter((e) => e.k === 'click' && (e.tag === 'input' || e.tag === 'body'));
      assert(
        noise.length === 0,
        `focus-clicks into text fields / blank space must not be counted (got ${noise.length})`,
      );
      console.log('SPIKE 1 PASS');

      // Phase 2: popup returns home with a report in history after stopping.
      const wentHome = await popup.waitForSelector('#start', { timeout: 5000, polling: 100 });
      assert(!!wentHome, 'popup returns to home after stop');
      const hasHistory = await popup.waitForSelector('.report', { timeout: 5000, polling: 100 });
      assert(!!hasHistory, 'report saved to history after stop');
      console.log('history check PASS');
      await testPage.close();

      // ============================================================
      // SPIKE 2 — service worker dies mid-recording, nothing is lost
      // ============================================================
      console.log('\n=== SPIKE 2: SW termination mid-recording ===');

      const testPage2 = await browser.newPage();
      await testPage2.goto(`${BASE}/page1.html`, { waitUntil: 'load' });
      await testPage2.bringToFront();
      await clickStart(browser, popup, testPage2);
      await testPage2.bringToFront();

      await testPage2.click('#boom'); // event before the kill
      await sleep(1500); // flushed
      const killTime = await killServiceWorker(testPage2);
      await sleep(500);
      await testPage2.click('#xhr'); // event after the kill
      await testPage2.evaluate(() =>
        fetch('/missing', { method: 'POST' }).catch(() => {}),
      );
      await sleep(1500); // flushed through a restarted SW

      const s2 = await clickStop(popup);
      console.log('spike2 event counts:', summary(s2));
      console.log('kill time:', new Date(killTime).toISOString());
      const before = s2.filter((e) => e.t <= killTime + 500);
      const after = s2.filter((e) => e.t > killTime + 500);
      assert(before.some((e) => e.k === 'click' && e.label?.includes('Submit')), 'expected event BEFORE SW kill');
      assert(after.some((e) => e.k === 'net'), 'expected event AFTER SW kill');
      console.log('SPIKE 2 PASS');

      await browser.close();
      testPageSrv.kill();
      console.log('\nALL SPIKES PASS');
      resolve(true);
    } catch (err) {
      try {
        await browser?.close();
      } catch {}
      try {
        testPageSrv?.kill();
      } catch {}
      console.error('\nFAILURE:', err.message);
      process.exitCode = 1;
      resolve(false);
    }
  });
}

main();
