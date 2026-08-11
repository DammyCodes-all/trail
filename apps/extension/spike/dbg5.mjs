// Repro for: replayer stuck at 00:00 / progress layer not updating when the
// session has a compressed report-writing window (flag open → submit > 3s).
// Records a real session with a 4.5s writing window, opens the review, then
// drives play and polls the transport controls + progress.
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8899;
const BASE = `http://localhost:${PORT}`;
const REPLAY_BASE = 'http://localhost:8898';
const REPLAY_SRV = path.resolve(__dirname, '..', '..', 'replay-server', 'server', 'index.mjs');
const EXT_DIR = path.resolve(__dirname, '..', '.output', 'chrome-mv3');
const TEST_PAGE = path.resolve(__dirname, 'test-page.mjs');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function waitForReplayServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`${REPLAY_BASE}/api/replays/__health__`);
      if (res.status === 404) return true;
    } catch {}
    await sleep(200);
  }
  return false;
}

async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'trail-dbg5-'));
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
  throw new Error('extension SW not found');
}

async function openPopup(browser, extId) {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extId}/popup.html`);
  await page.waitForSelector('#start', { timeout: 8000, polling: 100 });
  return page;
}

async function startRecording(browser, popup, targetPage) {
  await popup.evaluate(() => document.querySelector('#start')?.click());
  await popup.waitForSelector('#begin', { timeout: 8000, polling: 100 });
  await popup.evaluate(() => document.querySelector('#begin')?.click());
  await popup.waitForFunction(
    () => document.querySelector('.pill')?.textContent === 'recording',
    { timeout: 8000, polling: 100 },
  );
  await targetPage.waitForFunction(() => window.__trailRecorder === true, {
    timeout: 8000,
    polling: 100,
  });
}

async function stopRecording(popup) {
  await popup.evaluate(() => {
    window.__trailEvents = undefined;
  });
  await popup.evaluate(() => document.querySelector('#stop')?.click());
  await popup.waitForFunction(() => Array.isArray(window.__trailEvents), {
    timeout: 10000,
    polling: 100,
  });
  return popup.evaluate(() => window.__trailEvents);
}

function main() {
  let testPageSrv;
  let replaySrv;
  let browser;
  return new Promise(async (resolve) => {
    try {
      testPageSrv = spawn(process.execPath, [TEST_PAGE], { stdio: 'ignore' });
      await sleep(800);
      replaySrv = spawn(process.execPath, [REPLAY_SRV], { stdio: 'ignore' });
      const replayUp = await waitForReplayServer();
      console.log('replay server up:', replayUp);

      browser = await launch();
      const extId = await getExtensionId(browser);
      console.log('extension id:', extId);

      const testPage = await browser.newPage();
      await testPage.goto(`${BASE}/page1.html`, { waitUntil: 'load' });
      await testPage.bringToFront();
      const popup = await openPopup(browser, extId);
      await testPage.bringToFront();
      await startRecording(browser, popup, testPage);
      console.log('recording');

      // Some real activity, then a LONG report-writing window (> 3s so the
      // replay compresses it).
      await testPage.click('#boom');
      await sleep(400);

      const flagFlow = await testPage.evaluate(async () => {
        const root = document.querySelector('#trail-recording-overlay')?.shadowRoot;
        const flagBtn = root?.querySelector('button[aria-label="Flag a problem"]');
        if (!flagBtn) return { ok: false, reason: 'flag button missing' };
        const fill = async () => {
          const exp = root?.querySelector('#trail-flag-expected');
          const act = root?.querySelector('#trail-flag-actual');
          if (!exp || !act) return false;
          const setVal = (el, v) => {
            const setter = Object.getOwnPropertyDescriptor(
              HTMLTextAreaElement.prototype,
              'value',
            ).set;
            setter.call(el, v);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          };
          setVal(exp, 'Should total $4.99');
          setVal(act, 'Total shows $9.98');
          return true;
        };
        flagBtn.click();
        await new Promise((r) => setTimeout(r, 150));
        if (!(await fill())) return { ok: false, reason: 'form fields missing' };
        // Writing window: >3s so the replay compresses it.
        await new Promise((r) => setTimeout(r, 4500));
        root?.querySelector('button[type="submit"]')?.click();
        await new Promise((r) => setTimeout(r, 300));
        return { ok: true };
      });
      console.log('flag flow:', flagFlow);

      await sleep(1500);
      const events = await stopRecording(popup);
      const flags = events.filter((e) => e.k === 'flag');
      console.log('flag events:', flags.map((e) => `${e.phase}:${e.t}`));
      const rrweb = events.filter((e) => e.k === 'rrweb').sort((a, b) => a.ev.timestamp - b.ev.timestamp);
      console.log('rrweb count:', rrweb.length);
      console.log('rrweb first ts:', rrweb[0]?.ev.timestamp, 'last ts:', rrweb.at(-1)?.ev.timestamp);

      // The review tab auto-opens on stop.
      const reviewTarget = await browser.waitForTarget(
        (t) => t.type() === 'page' && t.url().includes('review.html'),
        { timeout: 10000 },
      );
      const review = await reviewTarget.page();
      await review.waitForFunction(() => window.__trailMarkdown, {
        timeout: 10000,
        polling: 100,
      });
      const hooks = await review.evaluate(() => ({
        timeline: window.__trailTimeline,
        replayCount: window.__trailReplayCount,
        playerReady: window.__trailPlayerReady === true,
        spans: window.__trailReplaySpans ?? null,
      }));
      console.log('review hooks:', {
        replayCount: hooks.replayCount,
        playerReady: hooks.playerReady,
        spanCount: hooks.timeline.filter((s) => s.kind === 'flag').length,
      });

      // Is the replay panel actually compressing? Look for the skipped-window chip.
      const chip = await review.evaluate(() => {
        const els = [...document.querySelectorAll('div')];
        const hit = els.find((el) => el.textContent?.includes('of report writing'));
        return hit ? hit.textContent : null;
      });
      console.log('skipped-window chip:', chip);

      // Play and watch the transport readouts for ~5s.
      const playBtn = await review.$('button[aria-label="Play replay"]');
      console.log('play button present:', !!playBtn);
      const before = await review.evaluate(() => ({
        time: document.querySelector('input[aria-label="Replay position"]')?.value,
        label: [...document.querySelectorAll('span')].map((s) => s.textContent).filter((t) => /^\d+:\d{2}/.test(t ?? '')),
      }));
      console.log('before play:', JSON.stringify(before));
      if (playBtn) await playBtn.click();
      await sleep(500);
      const samples = [];
      for (let i = 0; i < 10; i++) {
        const sample = await review.evaluate(() => {
          const scrubber = document.querySelector('input[aria-label="Replay position"]');
          const progress = getComputedStyle(scrubber ?? document.body).getPropertyValue('--replay-progress');
          const times = [...document.querySelectorAll('span')]
            .map((s) => s.textContent)
            .filter((t) => /^\d+:\d{2}/.test(t ?? ''));
          return { value: scrubber?.value ?? null, progress, times };
        });
        samples.push(sample);
        await sleep(500);
      }
      console.log('during play:');
      for (const s of samples) console.log(' ', JSON.stringify(s));
      console.log('DONE');
      await browser.close();
      resolve(true);
    } catch (err) {
      console.error('DBG5 FAILURE:', err.message);
      try { await browser?.close(); } catch {}
      try { testPageSrv?.kill(); } catch {}
      try { replaySrv?.kill(); } catch {}
      resolve(false);
    }
  });
}

main().then((ok) => process.exit(ok ? 0 : 1));
