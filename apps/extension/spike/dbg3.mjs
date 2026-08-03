import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_DIR = path.resolve(__dirname, '..', '.output', 'chrome-mv3');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const srv = spawn(process.execPath, [path.join(__dirname, 'test-page.mjs')], { stdio: 'ignore' });
await sleep(800);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'trail-dbg-'));
const browser = await puppeteer.launch({
  executablePath: path.resolve(__dirname, '..', '.browsers', 'chrome', (await fs.promises.readdir(path.resolve(__dirname,'..','.browsers','chrome')))[0], 'chrome-linux64', 'chrome'),
  headless: 'new',
  args: [`--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`, `--user-data-dir=${profile}`, '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run'],
});
let extId;
for (let i = 0; i < 50 && !extId; i++) {
  const sw = browser.targets().find((t) => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'));
  if (sw) extId = new URL(sw.url()).host;
  else await sleep(200);
}
const testPage = await browser.newPage();
await testPage.goto(`http://localhost:8899/page1.html`, { waitUntil: 'load' });
await testPage.bringToFront();
const popup = await browser.newPage();
await popup.goto(`chrome-extension://${extId}/popup.html`, { waitUntil: 'load' });
await popup.waitForSelector('.btn');
await popup.evaluate(() => { window.alert = (m) => { window.__lastAlert = m; }; });
await testPage.bringToFront();
await popup.evaluate(() => document.querySelector('.btn.primary')?.click());
await sleep(2000);
console.log('activeTab check via popup:', await popup.evaluate(() => browser.tabs.query({active:true,currentWindow:true}).then(t => t[0]?.url)));
await testPage.bringToFront();
await testPage.click('#boom');   // REAL click on page1
console.log('boom clicked via real input');
await sleep(2500);
const status = await popup.evaluate(() => browser.runtime.sendMessage({ type: 'trail:status' }));
console.log('status:', JSON.stringify(status));
await browser.close();
srv.kill();
console.log('done');
