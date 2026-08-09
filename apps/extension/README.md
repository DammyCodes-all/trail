# TRAIL — browser extension

The main product in this monorepo (see the [root README](../README.md) for the full picture). A WXT + React extension that records a bug reproduction — clicks, typed input, console errors, failed network requests, and an rrweb session replay — then turns it into a maintainer-ready GitHub issue. While you review, a local AI pass drafts a title, summary, reproduction steps, and labels from a redaction-safe session digest; it runs against the replay server's Groq proxy when a key is configured, and degrades to the deterministic pipeline when it isn't.

## Scripts

| Script | What it does |
|-|-|
| `pnpm dev` | WXT dev mode, launches Chrome with the extension loaded |
| `pnpm dev:firefox` | Same, in Firefox |
| `pnpm build` / `pnpm build:firefox` | Production build |
| `pnpm zip` / `pnpm zip:firefox` | Build + zip for store submission |
| `pnpm compile` | TypeScript check only (`tsc --noEmit`) |
| `pnpm verify` | Full gate: typecheck, build, then a Puppeteer spike that drives a real page through the capture path |

Output lands in `.output/` — load `.output/chrome-mv3` as an unpacked extension if you're testing manually.

## Layout

```
entrypoints/background.ts        Service worker: batches to IndexedDB, session state
entrypoints/recorder.content.ts  MAIN-world recorder (console/net/interactions/rrweb)
entrypoints/relay.content.ts     Isolated-world relay: postMessage → background
entrypoints/recording-overlay.content.tsx  Live capture indicator
entrypoints/popup/               History, pre-record setup, recording view
entrypoints/review/              Full-tab review: replay + timeline + export + AI draft
lib/record/                      Individual instrumenters (console, network, inputs, rrweb)
lib/                              db, report, github, timeline, facts, session, constants
lib/ai.ts                        Session digest → AI draft; builds the model request
lib/ai-merge.ts                  Merges AI output into the report without clobbering user edits
lib/ai-cache.ts                  Session-hash-keyed cache of AI results
lib/timeline-rows.ts             Timeline rows from events (shared by card and summary)
spike/                           Puppeteer verification scripts and experiments
```

## Things you'll touch

- `lib/constants.ts` — message keys, `REPLAY_SERVER_URL` (points at the local replay server, `http://localhost:8898`, by default; swap in the Vercel deployment for production), `chrome.storage` preference keys.
- `wxt.config.ts` — manifest, permissions, and the `escapeNonAscii` build plugin that keeps rrweb loadable by Chrome's content-script loader.
- `lib/github.ts` — the URL byte-budget fitter that keeps the prefilled issue under GitHub's ~8 KB `issues/new` limit.
- `lib/ai.ts` — builds a redaction-safe session digest and drafts a title, summary, steps, and labels via the replay server's `/api/ai/enhance` proxy (report pass via OpenRouter; the separate `/api/ai/title` pass via Groq). Falls back to the deterministic pipeline when the server lacks the corresponding key (the spike asserts this path stays correct). Results are cached in `browser.storage.local` keyed by session hash.
- `spike/verify.mjs` — drives a real page through capture and review; also asserts the AI fallback leaves the report deterministic.
