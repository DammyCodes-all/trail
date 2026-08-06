# TRAIL

TRAIL is a browser extension that turns a bug you just hit into a maintainer-ready GitHub issue. You record the reproduction like a screencast, and TRAIL writes the report: the exact sequence of clicks, what was typed, the console errors, the failed requests, and a playable session replay — all pulled from the browser instead of from your memory.

Built for ReverieHacks 2026, Software Development track.

## Why it exists

Bug reports without reproduction steps are the default, not the exception. The reporter doesn't remember the exact click order, never opens the console, and can't tell you what "environment" means. The maintainer replies "please provide a minimal reproduction," the reporter can't, and the issue sits open for months.

TRAIL sits on the reporter's side and does the remembering for them. No SDK, no app instrumentation, no account — the extension works on any page you visit, and the report comes out pre-shaped for GitHub.

## How it works

1. **Open the extension.** The popup shows your report history, or an empty state if you haven't made one yet. Start Report is always visible.

2. **Set up.** One toggle: auto-redact, on by default. Passwords, emails, and card-number-shaped inputs are excluded at capture time — rrweb masks them at the source, so sensitive values are never recorded, not recorded-then-hidden. Hit Begin Recording.

3. **Reproduce the bug.** Interact with the page normally. A small draggable overlay shows live counts of clicks, console errors, and failed requests, so you can see capture is happening. In the background, rrweb records the full session while patched `console`/`fetch`/`XHR` hooks capture the diagnostics.

4. **Stop.** Capture ends immediately.

5. **Review.** A full-tab review screen opens with the replay on the left and a generated timeline on the right: `Navigated to /checkout → Typed in Email field → Clicked Submit → Console error → POST /api/submit failed, 500`. A backstop toggle redacts anything still flagged as sensitive after the fact.

6. **Export.** Enter the target repo (owner/repo, remembered between reports). TRAIL fetches the repo's GitHub issue templates and maps the report onto the actual template fields. Output is a deterministic Markdown report — no AI call anywhere in this path — plus a prefilled GitHub new-issue URL, with clipboard and `.md` download as fallbacks.

7. **Submit.** The prefilled GitHub page opens in a new tab. You review and submit it in GitHub's own UI. TRAIL never touches your GitHub account.

8. **Later.** The report is saved to history. Reopening it restores the same review screen: replay, timeline, exported report.

## Extension architecture

The tricky part is that a browser extension's content script lives in an isolated world — patches to `console.error` or `window.fetch` there patch copies of the functions the page never calls. So the recorder is split in two:

- **`recorder.content.ts`** registers in the **MAIN world** (`world: "MAIN"`, `document_start`), where patching the real page functions works. It wraps console, unhandled rejections, fetch/XHR, clicks, and inputs, and starts rrweb with `maskInputOptions` and `blockClass` for pre-capture redaction. Everything it captures is emitted as `window.postMessage({ __trail__: true, ... })`.
- **`relay.content.ts`** runs in the isolated world, listens for that postMessage, and batches events to the background service worker about once a second.

The service worker (`entrypoints/background.ts`) is deliberately stateless: it writes batches straight to IndexedDB and keeps only counts and session metadata in `chrome.storage.session`. That way, when Chrome kills the service worker mid-recording (which it will), the events already captured survive and the recording keeps going.

One wrinkle worth knowing about: the recorder registers twice — `registerContentScripts` covers future navigations, `executeScript` covers the already-open page. Multi-page reproductions work because of the pair.

Two build-time details:

- rrweb's bundle contains the Unicode non-character U+FFFE, which Chrome's content-script loader rejects as not UTF-8. A custom WXT plugin (`escapeNonAscii` in `wxt.config.ts`) escapes every non-ASCII byte to `\uXXXX` sequences, which are runtime-identical.
- GitHub's `issues/new` nginx 414s around 8 KB of URL. `lib/github.ts` builds the body to a fixed 7600-char budget, cutting sections in priority order and appending a "truncated" note when needed. The full report always lands on the clipboard.

## Repo layout

```
apps/extension        The extension itself (WXT + React + rrweb)
  entrypoints/        background SW, recorder, relay, overlay, popup, review tab
  lib/record/         console, network, interaction, rrweb, redaction instrumenters
  lib/                db (IndexedDB), report, github, timeline, facts, overlay physics
apps/replay-server    Replay share server: store a session, serve it back as JSON
  server/index.mjs    Local twin, file-backed storage, port 8898
  api/                Vercel functions: POST /api/replays, GET /api/replays/<id>
  lib/storage.js      Vercel Blob (token set) or local files (.data/)
apps/web              Next.js landing page (still the scaffold; Phase 5, deferred)
packages/tokens       @trail/tokens — design tokens as CSS
```

The replay share server works in two modes: with `BLOB_READ_WRITE_TOKEN` set it stores sessions in Vercel Blob (the serverless path); without it, it writes files to `.data/` locally. Same routes either way: `POST /api/replays` returns `{ id }`, and `GET /api/replays/<id>` serves the session JSON. Sharing is extension-to-extension: the reporter copies `https://<server>/api/replays/<id>`, and whoever receives it pastes it into the TRAIL popup — the review tab then imports the session straight into their history with the same review UI (replay, timeline, evidence) and no public web player page. The storage seam is one file (`lib/storage.js`), so swapping Vercel Blob for an S3-compatible store later touches nothing else.

## Local setup

You need pnpm 11+ (the repo pins `^11.16.0` via `devEngines`, and pnpm installs the right version automatically if it's missing) and Node 20.9+ — Next 16 requires at least that. Chrome or Firefox for the extension.

```sh
git clone <repo>
cd trail
pnpm install
```

From there, three processes:

1. **The extension.** `pnpm dev:extension` builds and launches Chrome with the unpacked extension loaded. Look for the TRAIL popup in the toolbar. Start a report, reproduce a bug on any page, stop — the review tab opens with the replay and timeline.
2. **The replay server.** `pnpm dev:replay` runs the local twin on http://localhost:8898. Needed for shareable replay links while developing — the extension points at it by default (`REPLAY_SERVER_URL` in `apps/extension/lib/constants.ts`), so there's no config to touch. Recipients paste the link into their TRAIL popup; the session is fetched from the link's own host, so both sides can run different servers.
3. **The landing page** (optional). `pnpm dev:web` serves the Next.js scaffold on http://localhost:3000.

Everything runs against local storage: reports live in the extension's IndexedDB, shared replays land in `apps/replay-server/.data/`. No accounts, no API keys.

To check a change: `pnpm verify:extension` runs the typecheck, a production build, and a Puppeteer spike that drives a real page through the whole capture path.

For a manual install: `pnpm build:extension`, then load `.output/chrome-mv3` as an unpacked extension from `chrome://extensions`.

Want all three processes at once? `pnpm dev:all` runs them in parallel.

## Non-goals

- No cross-origin iframe recording (`allFrames: false`).
- No AI in the core path — the report is fully deterministic.
- Click-to-select individual elements to exclude, AI duplicate-issue detection, direct GitHub API submission, and Linear/Jira support are stretch goals, only after the core path is solid.
