import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_DIR = path.resolve(__dirname, '..', '.output', 'chrome-mv3');
const REPLAY_SRV = path.resolve(__dirname, '..', '..', 'replay-server', 'server', 'index.mjs');
const PORT = 8899;
const BASE = `http://localhost:${PORT}`;
const REPLAY_BASE = 'http://localhost:8898';

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

// The extension points at localhost:8898 by default (REPLAY_SERVER_URL). Spawn
// the local twin; if something already listens there (e.g. pnpm dev:replay),
// reuse it — the health probe succeeds either way.
async function waitForReplayServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`${REPLAY_BASE}/api/replays/__health__`);
      if (res.status === 404) return true; // route exists → server is up
    } catch {
      // not up yet
    }
    await sleep(200);
  }
  return false;
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
  await page.waitForSelector('#start', { timeout: 8000, polling: 100 });
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
  await popup.evaluate(() => document.querySelector('#stop')?.click());
  await popup.waitForFunction(() => Array.isArray(window.__trailEvents), { timeout: 10000, polling: 100 });
  return popup.evaluate(() => window.__trailEvents);
}

async function getOverlayTotal(page) {
  return page.evaluate(() => {
    const label = document
      .querySelector('#trail-recording-overlay')
      ?.shadowRoot?.querySelector('.trail-overlay__total [aria-label]')
      ?.getAttribute('aria-label');
    const value = label?.match(/^\d+/)?.[0];
    return value === undefined ? -1 : Number(value);
  });
}

async function waitForOverlayTotalAbove(page, previous) {
  await page.waitForFunction(
    (minimum) => {
      const label = document
        .querySelector('#trail-recording-overlay')
        ?.shadowRoot?.querySelector('.trail-overlay__total [aria-label]')
        ?.getAttribute('aria-label');
      const value = label?.match(/^\d+/)?.[0];
      return value !== undefined && Number(value) > minimum;
    },
    { timeout: 8000, polling: 100 },
    previous,
  );
  return getOverlayTotal(page);
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
  let replaySrv;
  let browser;
  return new Promise(async (resolve) => {
    try {
      // ---- test page server ----
      testPageSrv = spawn(process.execPath, [path.join(__dirname, 'test-page.mjs')], {
        stdio: 'ignore',
      });
      await sleep(800);

      // ---- replay share server (local twin) ----
      replaySrv = spawn(process.execPath, [REPLAY_SRV], { stdio: 'ignore' });
      const replayUp = await waitForReplayServer();
      assert(replayUp, 'replay share server reachable on 8898');
      console.log(`replay server up: ${REPLAY_BASE}`);

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

      let popup = await openPopup(browser, extId);
      console.log('popup open');
      await testPage.bringToFront(); // active tab must be the page we record

      await clickStart(browser, popup, testPage);
      console.log('started recording');
      console.log('active tab at click:', await popup.evaluate(() => browser.tabs.query({ active: true, currentWindow: true }).then((t) => t[0]?.url)));
      console.log('recorder live on page1:', await testPage.evaluate(() => window.__trailRecorder));
      await testPage.bringToFront();

      // A page opened mid-session is NOT the session tab: the recorder it
      // inherits (registered for <all_urls>) must be disarmed by the relay's
      // session check, or it would keep capturing an unrelated page.
      const stray = await browser.newPage();
      await stray.goto(`${BASE}/stray.html`, { waitUntil: 'load' });
      await stray.waitForFunction(() => window.__trailRecorderActive === false, {
        timeout: 8000,
        polling: 100,
      });
      console.log('stray tab recorder disarmed');
      await stray.close();
      // newPage() left the stray tab focused; synthetic mouse events follow the
      // active tab, so bring the session page back to front before clicking.
      await testPage.bringToFront();

      // page1 interactions (after start)
      await testPage.click('#boom');
      await testPage.click('#dbl');
      await testPage.click('#dbl'); // identical adjacent repeat → one timeline group
      console.log('clicked boom');
      await testPage.click('#xhr');
      await testPage.evaluate(() =>
        fetch('/missing', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ qty: 2 }),
        }).catch(() => {}),
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
      // Privacy: the visual replay stream must not contain typed values either.
      const rrwebPayload = s1
        .filter((e) => e.k === 'rrweb')
        .map((e) => JSON.stringify(e.ev))
        .join('\n');
      assert(
        !rrwebPayload.includes('a@b.com') && !rrwebPayload.includes('hunter2'),
        'replay stream is masked: typed values never enter rrweb events',
      );
      const clickEvent = s1.find((e) => e.k === 'click' && e.tag === 'button');
      assert(clickEvent?.label, 'expected readable click label');
      const noise = s1.filter((e) => e.k === 'click' && (e.tag === 'input' || e.tag === 'body'));
      assert(
        noise.length === 0,
        `focus-clicks into text fields / blank space must not be counted (got ${noise.length})`,
      );
      assert(
        !s1.some((e) => e.url.includes('stray.html')),
        'events from the stray (non-session) tab never reach storage',
      );
      // The rrweb stream must open with a full snapshot: it's the base frame the
      // player renders. Losing it (e.g. to the session-start gate) blanks replay.
      const rrwebSorted = s1
        .filter((e) => e.k === 'rrweb')
        .sort((a, b) => a.ev.timestamp - b.ev.timestamp);
      const firstFull = rrwebSorted.find((e) => e.ev?.type === 2);
      assert(firstFull, 'rrweb stream has a full snapshot (base frame)');
      const firstIncr = rrwebSorted.find((e) => e.ev?.type === 3);
      assert(
        !firstIncr || firstIncr.ev.timestamp >= firstFull.ev.timestamp,
        'full snapshot precedes all incremental frames',
      );
      assert(
        s1.some((e) => e.k === 'click' && e.label?.includes('Pay now')),
        'final click before stop survives the teardown (no tail loss)',
      );
      console.log('SPIKE 1 PASS');

      // Phase 3: stopping auto-opens the review tab with replay + timeline + export.
      const reviewTarget = await browser.waitForTarget(
        (t) => t.type() === 'page' && t.url().includes('review.html'),
        { timeout: 10000 },
      );
      const review = await reviewTarget.page();
      await review.waitForFunction(() => window.__trailMarkdown, {
        timeout: 10000,
        polling: 100,
      });
      const reviewHooks = await review.evaluate(() => ({
        timeline: window.__trailTimeline,
        replayCount: window.__trailReplayCount,
        markdown: window.__trailMarkdown,
        issueUrl: window.__trailIssueUrl,
      }));
      assert(
        reviewHooks.timeline.some((s) => s.kind === 'click' && s.text.includes('Submit')),
        'review timeline includes the Submit click',
      );
      assert(
        reviewHooks.timeline.some((s) => s.kind === 'nav' && s.text.includes('page2.html')),
        'review timeline includes the page2 navigation',
      );
      assert(
        reviewHooks.timeline.some((s) => s.kind === 'input' && s.text === 'Type into Email'),
        'review timeline names the typed field (label[for])',
      );
      assert(
        reviewHooks.timeline.some((s) => s.kind === 'input' && s.text === 'Type into Password'),
        'review timeline names the password field (label[for])',
      );
      assert(
        reviewHooks.timeline.every((s) => s.kind !== 'input' || s.text !== 'Type into '),
        'review timeline never shows an unnamed typed field',
      );
      assert(reviewHooks.replayCount > 0, 'review has rrweb replay frames');
      const playerReady = await review.evaluate(() => window.__trailPlayerReady === true);
      assert(playerReady, 'rrweb-player Svelte component mounted');
      const replayControls = await review.evaluate(() => ({
        hasCustomScrubber: !!document.querySelector('input[aria-label="Replay position"]'),
        hasPlayButton: !!document.querySelector('button[aria-label="Play replay"]'),
        hasStockController: !!document.querySelector('.rr-controller'),
      }));
      assert(replayControls.hasCustomScrubber, 'review uses the custom replay scrubber');
      assert(replayControls.hasPlayButton, 'review exposes custom replay playback controls');
      assert(!replayControls.hasStockController, 'rrweb stock controls stay hidden');
      await review.evaluate(() => {
        document.querySelector('button[aria-label="Replay speed"]')?.click();
      });
      await review.waitForSelector('[data-slot="dropdown-menu-content"]', {
        timeout: 5000,
        polling: 100,
      });
      await review.evaluate(() => {
        const speed = [...document.querySelectorAll('[data-slot="dropdown-menu-item"]')].find(
          (item) => item.textContent?.trim() === '2x',
        );
        speed?.click();
      });
      await review.waitForFunction(
        () => document.querySelector('button[aria-label="Replay speed"]')?.textContent?.includes('2x'),
        { timeout: 5000, polling: 100 },
      );
      await review.evaluate(() => {
        document.querySelector('button[aria-label="Play replay"]')?.click();
      });
      await review.waitForFunction(
        () => typeof window.__trailReplayTime === 'number' && window.__trailReplayTime > 0,
        { timeout: 5000, polling: 100 },
      );
      await review.evaluate(() => {
        document.querySelector('button[aria-label="Pause replay"]')?.click();
      });
      assert(reviewHooks.markdown.includes('## Steps to Reproduce'), 'markdown has steps section');
      assert(reviewHooks.markdown.includes('Click Submit'), 'markdown has the click step');
      assert(!reviewHooks.markdown.includes('hunter2'), 'markdown never leaks the password');
      const incidentUi = await review.evaluate(() => ({
        text: document.body.innerText,
        repoVisible: !!document.querySelector('.repo'),
        title: window.__trailTitle,
      }));
      assert(!incidentUi.text.includes('High severity'), 'review omits the severity label');
      assert(incidentUi.text.includes('Evidence timeline'), 'review leads with chronological evidence');
      assert(incidentUi.text.includes('Session replay'), 'review shows the session replay');
      assert(incidentUi.text.includes('Network') && incidentUi.text.includes('Console'), 'review exposes grouped runtime evidence');
      assert(incidentUi.text.includes('Create GitHub Issue'), 'review has one focused GitHub action');
      assert(!incidentUi.repoVisible, 'repo configuration stays out of the report until requested');
      assert(
        incidentUi.title.startsWith('Submit failed:'),
        'report title connects the triggering action to the captured failure',
      );

      // Layout: desktop uses a two-column evidence grid — timeline left, replay
      // sticky on the right; mobile falls back to replay-first single column.
      await review.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      await sleep(250);
      const layout = await review.evaluate(() => {
        const grid = document.querySelector('[data-evidence-grid]');
        const replay = document.querySelector('[data-sticky-replay]');
        const timeline = [...document.querySelectorAll('section')].find((s) =>
          s.textContent?.includes('Evidence timeline'),
        );
        const replayRect = replay?.getBoundingClientRect();
        const timelineRect = timeline?.getBoundingClientRect();
        return {
          columns: grid
            ? getComputedStyle(grid).gridTemplateColumns.split(' ').length
            : 0,
          replayLeft: replayRect ? replayRect.x : -1,
          timelineLeft: timelineRect ? timelineRect.x : -1,
        };
      });
      assert(
        layout.columns === 2,
        `review uses a two-column evidence layout (got ${layout.columns})`,
      );
      assert(
        layout.replayLeft < layout.timelineLeft,
        'replay sits left of the timeline on desktop',
      );
      await review.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
      await sleep(400);
      const stickyTop = await review.evaluate(() => {
        const el = document.querySelector('[data-sticky-replay]');
        return el ? el.getBoundingClientRect().top : -1;
      });
      assert(
        stickyTop >= 0 && stickyTop < 120,
        `replay panel stays pinned near the viewport top while scrolling (top=${stickyTop})`,
      );
      await review.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await sleep(300);
      await review.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
      await sleep(250);
      const mobileLayout = await review.evaluate(() => {
        const grid = document.querySelector('[data-evidence-grid]');
        const replay = document.querySelector('[data-sticky-replay]');
        const timeline = [...document.querySelectorAll('section')].find((s) =>
          s.textContent?.includes('Evidence timeline'),
        );
        const replayRect = replay?.getBoundingClientRect();
        const timelineRect = timeline?.getBoundingClientRect();
        return {
          columns: grid
            ? getComputedStyle(grid).gridTemplateColumns.split(' ').length
            : 0,
          replayAboveTimeline:
            replayRect !== undefined && timelineRect !== undefined
              ? replayRect.y < timelineRect.y
              : false,
        };
      });
      assert(
        mobileLayout.columns === 1,
        `mobile falls back to a single column (got ${mobileLayout.columns})`,
      );
      assert(
        mobileLayout.replayAboveTimeline,
        'mobile orders the replay above the timeline for discoverability',
      );
      await review.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      await sleep(250);

      // Level dots: every timeline row carries a level indicator.
      const dotCount = await review.evaluate(
        () => document.querySelectorAll('[data-level]').length,
      );
      assert(dotCount > 0, 'timeline rows expose level dots');

      // Segmented quick filters narrow the timeline to the chosen level.
      const filterButtons = await review.evaluate(() =>
        [...document.querySelectorAll('button')]
          .map((b) => b.textContent?.trim())
          .filter((t) => ['All', 'Errors', 'Network', 'User', 'Console'].includes(t ?? '')),
      );
      assert(
        filterButtons.length === 5,
        `segmented quick filters render (got ${filterButtons.length})`,
      );
      const allRows = await review.evaluate(
        () => document.querySelectorAll('ol li').length,
      );
      await review.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(
          (b) => b.textContent?.trim() === 'Errors',
        );
        btn?.click();
      });
      await sleep(150);
      const errorRows = await review.evaluate(
        () => document.querySelectorAll('ol li').length,
      );
      assert(
        errorRows > 0 && errorRows < allRows,
        `Errors filter narrows the timeline (${errorRows} of ${allRows} rows)`,
      );
      await review.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(
          (b) => b.textContent?.trim() === 'All',
        );
        btn?.click();
      });
      await sleep(150);

      // Repetitive interactions compress into one expandable grouped row.
      const groupInfo = await review.evaluate(() => {
        const li = [...document.querySelectorAll('li')].find((el) =>
          el.textContent?.includes('interactions'),
        );
        if (!li) return null;
        const toggle = li.querySelector('button[aria-expanded]');
        return {
          text: li.textContent ?? '',
          open: toggle?.getAttribute('aria-expanded') ?? null,
        };
      });
      assert(
        groupInfo !== null && groupInfo.open !== null,
        'repetitive interactions collapse into a grouped row with a toggle',
      );
      assert(
        groupInfo.text.includes('Tap twice') && groupInfo.text.includes('2 interactions'),
        'grouped row names the interaction and its count',
      );
      const wasOpen = groupInfo.open === 'true';
      // Force the group closed (auto-expand may have opened it during
      // playback), then expand it and count the revealed sub-rows.
      for (let i = 0; i < 3 && wasOpen; i++) {
        await review.evaluate(() => {
          const li = [...document.querySelectorAll('li')].find((el) =>
            el.textContent?.includes('interactions'),
          );
          li?.querySelector('button[aria-expanded]')?.click();
        });
        await sleep(150);
      }
      const rowsBeforeToggle = await review.evaluate(
        () => document.querySelectorAll('ol li').length,
      );
      await review.evaluate(() => {
        const li = [...document.querySelectorAll('li')].find((el) =>
          el.textContent?.includes('interactions'),
        );
        li?.querySelector('button[aria-expanded]')?.click();
      });
      await sleep(200);
      const rowsAfterToggle = await review.evaluate(
        () => document.querySelectorAll('ol li').length,
      );
      assert(
        rowsAfterToggle > rowsBeforeToggle,
        'expanded group reveals the individual interactions',
      );

      // Network details: collapsed rows are compact; expanding shows headers,
      // request body and response body — with sensitive values redacted.
      await review.evaluate(() => {
        const fail = [...document.querySelectorAll('[data-net-row]')].find((r) =>
          r.textContent?.includes('/fail'),
        );
        fail?.querySelector('[data-details-toggle]')?.click();
      });
      await review.waitForFunction(
        () => {
          const fail = [...document.querySelectorAll('[data-net-row]')].find((r) =>
            r.textContent?.includes('/fail'),
          );
          return !!fail && fail.textContent?.includes('Response headers');
        },
        { timeout: 5000, polling: 100 },
      );
      const failDetails = await review.evaluate(() => {
        const fail = [...document.querySelectorAll('[data-net-row]')].find((r) =>
          r.textContent?.includes('/fail'),
        );
        return fail?.textContent ?? '';
      });
      assert(
        failDetails.includes('authorization'),
        'expanded failure shows the Authorization header name',
      );
      assert(failDetails.includes('[redacted]'), 'sensitive header values are redacted');
      assert(
        !failDetails.includes('hunter2'),
        'redacted header value never leaks the secret',
      );
      await review.evaluate(() => {
        const missing = [...document.querySelectorAll('[data-net-row]')].find((r) =>
          r.textContent?.includes('/missing'),
        );
        missing?.querySelector('[data-details-toggle]')?.click();
      });
      await review.waitForFunction(
        () => {
          const missing = [...document.querySelectorAll('[data-net-row]')].find((r) =>
            r.textContent?.includes('/missing'),
          );
          return !!missing && missing.textContent?.includes('Request body');
        },
        { timeout: 5000, polling: 100 },
      );
      const missingDetails = await review.evaluate(() => {
        const missing = [...document.querySelectorAll('[data-net-row]')].find((r) =>
          r.textContent?.includes('/missing'),
        );
        return missing?.textContent ?? '';
      });
      assert(
        missingDetails.includes('X-Trail-Test'),
        'response headers of the failed request are captured',
      );
      assert(
        missingDetails.includes('qty') && missingDetails.includes('2'),
        'request body of the failed request is captured',
      );

      // Console details: expanding a row reveals the full message and stack.
      await review.evaluate(() => {
        const boom = [...document.querySelectorAll('[data-console-row]')].find((r) =>
          r.textContent?.includes('price calc failed'),
        );
        boom?.querySelector('[data-details-toggle]')?.click();
      });
      await review.waitForFunction(
        () => {
          const boom = [...document.querySelectorAll('[data-console-row]')].find((r) =>
            r.textContent?.includes('price calc failed'),
          );
          return !!boom && boom.textContent?.includes('Stack trace');
        },
        { timeout: 5000, polling: 100 },
      );
      const consoleDetails = await review.evaluate(() => {
        const boom = [...document.querySelectorAll('[data-console-row]')].find((r) =>
          r.textContent?.includes('price calc failed'),
        );
        return boom?.textContent ?? '';
      });
      assert(
        consoleDetails.includes('Stack trace') && consoleDetails.includes('boom: price calc failed'),
        'expanded console row shows the full message and stack trace',
      );
      await review.evaluate(() => {
        const step = [...document.querySelectorAll('button')].find((el) =>
          el.textContent?.includes('Pay now'),
        );
        step?.click();
      });
      await review.waitForFunction(
        () => typeof window.__trailReplayTime === 'number' && window.__trailReplayTime > 0,
        { timeout: 5000, polling: 100 },
      );
      if (process.env.TRAIL_SCREENSHOT_DIR) {
        await review.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
        await sleep(250);
        await review.screenshot({
          path: path.join(process.env.TRAIL_SCREENSHOT_DIR, 'review-desktop.png'),
          fullPage: true,
        });
        await review.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
        await sleep(250);
        await review.screenshot({
          path: path.join(process.env.TRAIL_SCREENSHOT_DIR, 'review-mobile.png'),
          fullPage: true,
        });
        await review.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      }
      console.log('incident hierarchy + evidence seek PASS');
      // Open the issue action, fill the repo in its focused dialog, and verify
      // the fitted GitHub URL appears within the 414 budget.
      await review.evaluate(() => {
        const button = [...document.querySelectorAll('button')].find((el) =>
          /Create GitHub Issue|Open GitHub Issue/.test(el.textContent ?? ''),
        );
        button?.click();
      });
      await review.waitForSelector('[role="dialog"]', { timeout: 5000, polling: 100 });
      await review.focus('.repo');
      await review.type('.repo', 'acme/widget');
      await review.waitForFunction(
        () => window.__trailIssueUrl.includes('github.com/acme/widget'),
        { timeout: 5000, polling: 100 },
      );
      const issueUrl = await review.evaluate(() => window.__trailIssueUrl);
      assert(issueUrl.length > 0 && Buffer.byteLength(issueUrl) < 8192, 'fitted issue URL is short enough');
      // Phase 4: unknown repo → template detection must degrade to the generic body.
      await review.waitForFunction(
        () => window.__trailTemplateState === 'none' || window.__trailTemplateState === 'found',
        { timeout: 10000, polling: 100 },
      );
      const templateName = await review.evaluate(() => window.__trailTemplate);
      assert(templateName === null, 'unknown repo (acme/widget) resolves to no template — generic fallback');
      const body = decodeURIComponent(issueUrl.split('body=')[1] ?? '');
      assert(body.includes('## Steps to Reproduce'), 'fallback body keeps generic ## headings');
      console.log('template fallback PASS');
      console.log('review check PASS');

      // Phase 2: history shows the saved report. Auto-open closed the popup, so reopen.
      popup = await openPopup(browser, extId);
      const hasHistory = await popup.waitForSelector('.report', { timeout: 5000, polling: 100 });
      assert(!!hasHistory, 'report saved to history after stop');
      console.log('history check PASS');

      // Phase 3: reopening a saved report loads its snapshot events.
      await popup.evaluate(() => document.querySelector('.report')?.click());
      const reopenTarget = await browser.waitForTarget(
        (t) => t.type() === 'page' && t.url().includes('review.html?report='),
        { timeout: 10000 },
      );
      const reopen = await reopenTarget.page();
      await reopen.waitForFunction(() => window.__trailMarkdown, { timeout: 10000, polling: 100 });
      const reopenTimeline = await reopen.evaluate(() => window.__trailTimeline);
      assert(
        reopenTimeline.some((s) => s.kind === 'click' && s.text.includes('Submit')),
        'reopened report has the Submit step from its snapshot',
      );
      assert(
        reopenTimeline.some((s) => s.kind === 'click' && s.text.includes('Pay now')),
        'reopened report has the final Pay now step — the stop tail is in the snapshot',
      );
      console.log('reopen check PASS');
      // Close the phase-3 review tabs so SPIKE 2's stop leaves exactly one
      // review target for the share flow to pick up.
      for (const t of browser.targets()) {
        if (t.type() === 'page' && t.url().includes('review.html')) {
          const p = await t.page();
          await p?.close().catch(() => {});
        }
      }
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

      await testPage2.waitForFunction(
        () =>
          document
            .querySelector('#trail-recording-overlay')
            ?.shadowRoot?.querySelector('.trail-overlay__total [aria-label]'),
        { timeout: 8000, polling: 100 },
      );
      const initialOverlayTotal = await getOverlayTotal(testPage2);
      await testPage2.click('#boom'); // event before the kill
      const totalBeforeKill = await waitForOverlayTotalAbove(
        testPage2,
        initialOverlayTotal,
      );
      const killTime = await killServiceWorker(testPage2);
      await sleep(500);
      await testPage2.click('#xhr'); // event after the kill
      await testPage2.evaluate(() =>
        fetch('/missing', { method: 'POST' }).catch(() => {}),
      );
      const totalAfterKill = await waitForOverlayTotalAbove(
        testPage2,
        totalBeforeKill,
      );

      const s2 = await clickStop(popup);
      console.log('spike2 event counts:', summary(s2));
      console.log('overlay totals across SW kill:', {
        initialOverlayTotal,
        totalBeforeKill,
        totalAfterKill,
      });
      console.log('kill time:', new Date(killTime).toISOString());
      const before = s2.filter((e) => e.t <= killTime + 500);
      const after = s2.filter((e) => e.t > killTime + 500);
      assert(before.some((e) => e.k === 'click' && e.label?.includes('Submit')), 'expected event BEFORE SW kill');
      assert(after.some((e) => e.k === 'net'), 'expected event AFTER SW kill');
      console.log('SPIKE 2 PASS');

      // ============================================================
      // SPIKE 3 — share a session, paste-import it, auto-save to history
      // ============================================================
      console.log('\n=== SPIKE 3: replay share + paste-import ===');

      // The review tab SPIKE 2's stop opened is now the only review.html target.
      const shareReviewTarget = await browser.waitForTarget(
        (t) => t.type() === 'page' && t.url().includes('review.html'),
        { timeout: 10000 },
      );
      const shareReview = await shareReviewTarget.page();
      await shareReview.waitForFunction(() => window.__trailMarkdown, {
        timeout: 10000,
        polling: 100,
      });

      // Share ▾ → Copy Replay Link → the link hook must fill.
      await shareReview.evaluate(() => {
        const share = [...document.querySelectorAll('button')].find((b) =>
          b.textContent?.trim().startsWith('Share'),
        );
        share?.click();
      });
      await shareReview.waitForSelector('[data-slot="dropdown-menu-content"]', {
        timeout: 5000,
        polling: 100,
      });
      await shareReview.evaluate(() => {
        const item = [...document.querySelectorAll('[data-slot="dropdown-menu-item"]')].find((i) =>
          i.textContent?.includes('Copy Replay Link'),
        );
        item?.click();
      });
      await shareReview.waitForFunction(
        () => String(window.__trailReplayLink || '').startsWith(`${REPLAY_BASE}/api/replays/`),
        { timeout: 15000, polling: 100 },
      );
      const link = await shareReview.evaluate(() => window.__trailReplayLink);
      console.log('share link:', link);
      assert(
        new RegExp(`^${REPLAY_BASE}/api/replays/[A-Za-z0-9.-]{1,64}$`).test(link),
        'share link points at the replay JSON route',
      );
      const reviewHooks3 = await shareReview.evaluate(() => ({
        timeline: window.__trailTimeline,
        markdown: window.__trailMarkdown,
        replayCount: window.__trailReplayCount,
      }));

      // The link must serve the full session: versioned, report + all kinds.
      const payload = await shareReview.evaluate(async (l) => {
        const r = await fetch(l);
        return { status: r.status, body: await r.json() };
      }, link);
      assert(payload.status === 200, 'share link serves the session JSON');
      assert(payload.body.v === 2, 'shared payload is versioned (v: 2)');
      assert(
        typeof payload.body.report?.title === 'string' && payload.body.report.title.length > 0,
        'shared payload carries the report metadata',
      );
      const kinds = {};
      for (const e of payload.body.events) kinds[e.k] = (kinds[e.k] ?? 0) + 1;
      console.log('payload event kinds:', kinds);
      assert(
        kinds.rrweb > 0 && kinds.click > 0 && kinds.console > 0 && kinds.net > 0,
        'shared payload carries the full session (rrweb + click + console + net)',
      );
      const rrwebFirst = payload.body.events.find((e) => e.k === 'rrweb');
      assert(
        typeof rrwebFirst?.ev?.timestamp === 'number',
        'rrweb events carry player-ready timestamps',
      );

      // The public player routes are gone.
      const gone = await shareReview.evaluate(async () => {
        const a = await fetch(`${REPLAY_BASE}/r/anything`);
        const b = await fetch(`${REPLAY_BASE}/api/replays/anything.json`);
        return { page: a.status, json: b.status };
      });
      assert(
        gone.page === 404 && gone.json === 404,
        `public player routes removed (/r/ and .json — got ${gone.page}/${gone.json})`,
      );

      // Paste the link into a fresh popup → review tab auto-imports the session.
      popup = await openPopup(browser, extId);
      const beforeImport = await popup.evaluate(
        () => document.querySelectorAll('.report').length,
      );
      await popup.type('#share-link', link);
      await popup.click('#open-shared');
      const sharedTarget = await browser.waitForTarget(
        (t) => t.type() === 'page' && t.url().includes('review.html?share='),
        { timeout: 10000 },
      );
      const shared = await sharedTarget.page();
      await shared.waitForFunction(
        () => location.search.startsWith('?report='),
        { timeout: 20000, polling: 100 },
      );
      const importedSeq = await shared.evaluate(() =>
        new URLSearchParams(location.search).get('report'),
      );
      await shared.waitForFunction(() => Array.isArray(window.__trailTimeline), {
        timeout: 15000,
        polling: 100,
      });
      const importedHooks = await shared.evaluate(() => ({
        timeline: window.__trailTimeline,
        markdown: window.__trailMarkdown,
        replayCount: window.__trailReplayCount,
        title: window.__trailTitle,
      }));
      assert(
        JSON.stringify(importedHooks.timeline) === JSON.stringify(reviewHooks3.timeline),
        'imported review shows the identical timeline',
      );
      assert(
        importedHooks.markdown === reviewHooks3.markdown,
        'imported review shows the identical report',
      );
      assert(
        importedHooks.replayCount > 0 && importedHooks.replayCount === reviewHooks3.replayCount,
        'imported review replays the same frames',
      );
      assert(importedHooks.title.length > 0, 'imported report keeps its title');
      console.log('imported seq:', importedSeq, '| title:', importedHooks.title);
      await shared.close();

      // Auto-save: history gained exactly one row; re-paste dedupes.
      popup = await openPopup(browser, extId);
      const afterImport = await popup.evaluate(
        () => document.querySelectorAll('.report').length,
      );
      assert(
        afterImport === beforeImport + 1,
        `auto-save adds exactly one history row (${beforeImport} → ${afterImport})`,
      );
      await popup.type('#share-link', link);
      await popup.click('#open-shared');
      const dupTarget = await browser.waitForTarget(
        (t) => t.type() === 'page' && t.url().includes('review.html?share='),
        { timeout: 10000 },
      );
      const dup = await dupTarget.page();
      await dup.waitForFunction(() => location.search.startsWith('?report='), {
        timeout: 20000,
        polling: 100,
      });
      const dupSeq = await dup.evaluate(() =>
        new URLSearchParams(location.search).get('report'),
      );
      assert(
        dupSeq === importedSeq,
        `re-importing the same link resolves to the same saved report (${dupSeq} vs ${importedSeq})`,
      );
      await dup.close();
      popup = await openPopup(browser, extId);
      const afterDup = await popup.evaluate(
        () => document.querySelectorAll('.report').length,
      );
      assert(
        afterDup === beforeImport + 1,
        `re-paste does not duplicate history (${afterDup})`,
      );

      // Invalid link rejected in the popup before any tab opens.
      await popup.type('#share-link', 'https://example.com/not-a-trail-link');
      await popup.click('#open-shared');
      const shareError = await popup.evaluate(() =>
        document.querySelector('#share-error')?.textContent ?? '',
      );
      assert(shareError.length > 0, 'popup rejects a non-TRAIL link inline');
      console.log('SPIKE 3 PASS');

      await browser.close();
      testPageSrv.kill();
      replaySrv?.kill();
      console.log('\nALL SPIKES PASS');
      resolve(true);
    } catch (err) {
      try {
        await browser?.close();
      } catch {}
      try {
        testPageSrv?.kill();
      } catch {}
      try {
        replaySrv?.kill();
      } catch {}
      console.error('\nFAILURE:', err.message);
      process.exitCode = 1;
      resolve(false);
    }
  });
}

main();
