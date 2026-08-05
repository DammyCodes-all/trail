# TRAIL — browser extension

The main product in this monorepo (see the [root README](../README.md) for the full picture). A WXT + React extension that records a bug reproduction — clicks, typed input, console errors, failed network requests, and an rrweb session replay — then turns it into a maintainer-ready GitHub issue.

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
entrypoints/review/              Full-tab review: replay + timeline + export
lib/record/                      Individual instrumenters (console, network, inputs, rrweb)
lib/                              db, report, github, timeline, facts, session, constants
spike/                           Puppeteer verification scripts and experiments
```

## Things you'll touch

- `lib/constants.ts` — message keys, `REPLAY_SERVER_URL` (points at the local replay server, `http://localhost:8898`, by default; swap in the Vercel deployment for production), `chrome.storage` preference keys.
- `wxt.config.ts` — manifest, permissions, and the `escapeNonAscii` build plugin that keeps rrweb loadable by Chrome's content-script loader.
- `lib/github.ts` — the URL byte-budget fitter that keeps the prefilled issue under GitHub's ~8 KB `issues/new` limit.
