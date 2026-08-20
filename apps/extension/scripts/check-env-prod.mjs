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
  console.error(
    '❌ Missing WXT_PUBLIC_WEB_URL / WXT_PUBLIC_REPLAY_SERVER_URL for prod build. Create apps/extension/.env from .env.example or export: WXT_PUBLIC_WEB_URL=https://trail-bug.vercel.app WXT_PUBLIC_REPLAY_SERVER_URL=https://trail-roan.vercel.app',
  );
  process.exit(1);
}
