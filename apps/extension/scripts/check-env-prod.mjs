#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

let hasDotEnv = false;
try {
  if (fs.existsSync(envPath)) {
    const c = fs.readFileSync(envPath, "utf8");
    hasDotEnv = /WXT_PUBLIC_WEB_URL/.test(c) && /WXT_PUBLIC_REPLAY_SERVER_URL/.test(c);
  }
} catch {}

const hasWeb = !!process.env.WXT_PUBLIC_WEB_URL || hasDotEnv;
const hasReplay = !!process.env.WXT_PUBLIC_REPLAY_SERVER_URL || hasDotEnv;
if (!hasWeb || !hasReplay) {
  // Vercel is now the default (see packages/review/src/lib/constants.ts) — prod builds
  // without explicit env will still point at the deployed servers. Keep a notice so
  // local-dev overrides remain discoverable.
  console.warn(
    'ℹ️  WXT_PUBLIC_WEB_URL / WXT_PUBLIC_REPLAY_SERVER_URL not set — using Vercel defaults (https://trail-bug.vercel.app / https://trail-roan.vercel.app) for prod build. For local dev create apps/extension/.env with http://localhost:3000 / http://localhost:8898',
  );
}
