# TRAIL

TRAIL is a browser extension that turns a bug you just hit into a maintainer-ready GitHub issue. Record the reproduction like a screencast, and TRAIL writes the report: the exact click sequence, what was typed, the console errors, the failed requests, and a playable session replay. All pulled from the browser, none of it from your memory.

Built for ReverieHacks 2026, Software Development track.

## The problem

Bug reports without reproduction steps are the default, not the exception. The reporter doesn't remember the click order, never opens the console, and can't tell you what "environment" means. The maintainer asks for a minimal reproduction. The reporter can't produce one. The issue sits open for months.

TRAIL does the remembering for you. No SDK, no app instrumentation, no account. It works on any page you visit, and the report comes out pre-shaped for GitHub.

## Demo

![Demo](demo.gif) <!-- replace: a GIF or screenshot of recording a bug, the review screen, and the prefilled GitHub issue -->

## What TRAIL does

- Records the whole session: clicks, typing, console errors, failed requests, and a playable replay.
- Masks passwords, emails, and card numbers at capture time. Sensitive values never reach disk, not "recorded then hidden."
- Generates a deterministic Markdown report plus a prefilled GitHub new-issue URL. Optionally drafts an AI title, summary, reproduction steps, and labels — local-first, so the report never depends on a model or a key.
- Maps the report onto the target repo's actual GitHub issue templates.
- Saves every report to history. Reopening one restores the full review screen: replay, timeline, exported report.
- Shares a session as a link. Paste it into another TRAIL popup and it imports into that person's history with the same review UI. Nothing uploads until you hit Share. Re-sharing an unchanged session reuses the existing link — the payload is hashed locally (title edits don't count), so it never re-uploads to blob storage.

## Tech stack

- WXT + React for the extension
- rrweb for session replay
- IndexedDB for local history
- Vercel Blob for shared replays, local files in dev
- Next.js scaffold for the landing page
- Puppeteer for end-to-end verification

## Getting started

You need pnpm 11+ and Node 20.9+. The repo pins pnpm via `devEngines`, so it installs the right version automatically. Chrome or Firefox for the extension.

```sh
git clone <repo>
cd trail
pnpm install
```

Three processes, all local:

1. **The extension.** `pnpm dev:extension` builds and launches Chrome with the unpacked extension loaded. Start a report, reproduce a bug, stop. The review tab opens with the replay and timeline.
2. **The replay server.** `pnpm dev:replay` runs on http://localhost:8898. Needed for shareable links. The extension points at it by default, so there's nothing to configure. Recipients paste a link into their own popup; the session is fetched from the link's own host, so both sides can run different servers.
3. **The landing page** (optional). `pnpm dev:web` serves the Next.js scaffold on http://localhost:3000.

Everything runs against local storage: reports in the extension's IndexedDB, shared replays in `apps/replay-server/.data/`. No accounts, no API keys. Three env vars exist, none needed for local dev: `BLOB_READ_WRITE_TOKEN` flips the share server to Vercel Blob for production (blobs are public with deterministic UUID paths, so a share link is a secret link — the id is unguessable, and reads are plain GETs), `WXT_PUBLIC_REPLAY_SERVER_URL` points a production extension build at the deployed server instead of the local twin (put it in `apps/extension/.env`, which is gitignored), and `GROQ_API_KEY` turns on the AI enhancement proxy on the replay server — without it the extension's AI step degrades to a local deterministic digest, so the report still works either way.

To check a change: `pnpm verify:extension` runs the typecheck, a production build, and a Puppeteer spike that drives a real page through the whole capture path. For a manual install: `pnpm build:extension`, then load `.output/chrome-mv3` from `chrome://extensions`. Want all three at once? `pnpm dev:all`.

## How it works

1. **Open the extension.** The popup shows report history, or an empty state if you haven't made one yet. Start Report is always visible.
2. **Set up.** One toggle: auto-redact, on by default. Passwords, emails, and card-number-shaped inputs are excluded at capture time. rrweb masks them at the source, so sensitive values are never recorded, not recorded-then-hidden. Hit Begin Recording.
3. **Reproduce the bug.** Interact with the page normally. A small draggable overlay shows live counts of clicks, console errors, and failed requests, so you can see capture is happening. In the background, rrweb records the session while patched console/fetch/XHR hooks capture the diagnostics.
4. **Stop.** Capture ends immediately.
5. **Review.** A full-tab review screen opens with the replay on the left and a generated timeline on the right: `Navigated to /checkout → Typed in Email field → Clicked Submit → Console error → POST /api/submit failed, 500`. A backstop toggle redacts anything still flagged as sensitive after the fact.
6. **Export.** Enter the target repo (owner/repo, remembered between reports). TRAIL fetches the repo's GitHub issue templates and maps the report onto the actual template fields. While you review, a local AI pass drafts a title, summary, reproduction steps, and labels from the redaction-safe session digest — sent to the replay server's Groq proxy (or skipped entirely if no `GROQ_API_KEY` is set), cached by session hash, and merged so the final output is a deterministic Markdown report, plus a prefilled GitHub new-issue URL, with clipboard and `.md` download as fallbacks.
7. **Submit.** The prefilled GitHub page opens in a new tab. You review and submit it in GitHub's own UI. TRAIL never touches your GitHub account.
8. **Later.** The report is saved to history. Reopening it restores the same review screen.

### How it's built

A browser extension's content script lives in an isolated world, so patches to `console.error` or `window.fetch` there patch copies of functions the page never calls. The recorder is split in two:

- **`recorder.content.ts`** registers in the MAIN world (`world: "MAIN"`, `document_start`), where patching the real page functions works. It wraps console, unhandled rejections, fetch/XHR, clicks, and inputs, and starts rrweb with `maskInputOptions` and `blockClass` for pre-capture redaction. Everything it captures is emitted as `window.postMessage({ __trail__: true, ... })`.
- **`relay.content.ts`** runs in the isolated world, listens for that postMessage, and batches events to the background service worker about once a second.

The service worker is deliberately stateless: it writes batches straight to IndexedDB and keeps only counts and session metadata in `chrome.storage.session`. When Chrome kills the service worker mid-recording, which it will, the events already captured survive and the recording keeps going.

Two build-time details worth knowing:

- rrweb's bundle contains the Unicode non-character U+FFFE, which Chrome's content-script loader rejects as not UTF-8. A custom WXT plugin (`escapeNonAscii` in `wxt.config.ts`) escapes every non-ASCII byte to `\uXXXX` sequences, which are runtime-identical.
- GitHub's `issues/new` nginx 414s around 8 KB of URL. `lib/github.ts` builds the body to a fixed 7600-char budget, cutting sections in priority order and appending a "truncated" note when needed. The full report always lands on the clipboard.

Repo layout:

```
apps/extension        The extension itself (WXT + React + rrweb)
apps/replay-server    Replay share server: store a session, serve it back as JSON + AI proxy
apps/web              Next.js landing page (still the scaffold)
packages/tokens       @trail/tokens — design tokens as CSS
```

## Roadmap

- A real landing page (currently the Next.js scaffold)
- AI duplicate-issue detection
- Direct GitHub API submission
- Linear/Jira support

## Known limitations

- No cross-origin iframe recording (`allFrames: false`).
- AI is a draft, not a source of truth: it fills the title, summary, steps, and labels, but the structured report stays deterministic and correct without it. The AI pass needs a `GROQ_API_KEY` on the replay server; without one the extension falls back to a local digest.
- Shared sessions cap at 30 MB on the server.
- GitHub new-issue URLs 414 past roughly 8 KB, so very long reports get truncated in the URL. The full report is always on the clipboard.

## License

TBD.

## Contact

Built with ❤️ by Olagunju AL-ameen(@dev_aluminate). Find me at [X/Twitter](https://x.com/dev_aluminate) and [portfolio](https://thealuminate.dev/).
