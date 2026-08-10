# TRAIL — web viewer

The web surface of TRAIL (part of the [root monorepo](../README.md)): renders shared replay links so anyone can review a session without the extension.

## What it does

- `/r/<id>` — a share link. The server component fetches the session payload from the replay server (`NEXT_PUBLIC_REPLAY_SERVER_URL`, default `http://localhost:8898`) and renders the same review UI the extension uses — replay, timeline, evidence, report, exports. The review UI itself lives in `@trail/review` (see `packages/review`).
- **Handoff gate** — when the TRAIL extension is installed, the viewer detects it via a postMessage probe through the extension's content-script relay, shows an "Open in TRAIL" button with a 10-second countdown, and posts the share link to the extension (which opens its own review tab and saves the session to its history). No extension, or the countdown expires, and the viewer just renders the review inline. "View in browser instead" skips the handoff at any time.
- Imports land in the viewer's **own** IndexedDB (`trail-web`, via the shared `createDb` factory in `@trail/review/lib/db`) — separate from the extension's profile history, idempotent per source link.

## Local dev

```sh
pnpm dev          # http://localhost:3000
```

Needs the replay server running (`pnpm dev:replay` at the monorepo root) to serve payloads. Env vars (see the root README): `NEXT_PUBLIC_REPLAY_SERVER_URL` and `NEXT_PUBLIC_WEB_URL`, both optional locally.

## Layout

```
app/r/[id]/        Shared-link page: server fetch + error screen
components/shared-view.tsx   Handoff gate (probe, countdown, bridge post) + ReviewApp mount
lib/loader.ts      Web loader/platform seams for ReviewApp
lib/db.ts          The web viewer's own IndexedDB store
app/globals.css    Mirror of the extension's app.css (tokens, fonts, replay styles)
```
