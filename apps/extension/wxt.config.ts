import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// rrweb's bundle contains literal U+FFFE (a Unicode non-character) used in its
// CSS byte-order-mark checks. Chrome's content-script loader uses a stricter
// UTF-8 validator than Python/Node and rejects U+FFFE as "not UTF-8 encoded",
// so executeScript/registerContentScripts refuse to load the file. Escaping
// every non-ASCII byte as a \uXXXX sequence is runtime-identical and keeps the
// emitted JS pure ASCII, which Chrome accepts.
function escapeNonAscii(): {
  name: string;
  apply: 'build';
  generateBundle: (opts: unknown, bundle: Record<string, unknown>) => void;
} {
  const escape = (s: string) => {
    let out = '';
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      if (cp > 0x7f) {
        if (cp <= 0xffff) {
          out += '\\u' + cp.toString(16).padStart(4, '0');
        } else {
          out +=
            '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0') +
            '\\u' + ch.charCodeAt(1).toString(16).padStart(4, '0');
        }
      } else {
        out += ch;
      }
    }
    return out;
  };

  return {
    name: 'trail:escape-non-ascii',
    apply: 'build',
    generateBundle(_opts, bundle) {
      for (const file of Object.values(bundle)) {
        if (!file || typeof file !== 'object') continue;
        const chunk = file as { type?: string; fileName?: string; code?: string };
        if (chunk.type !== 'chunk' || !chunk.fileName?.endsWith('.js')) continue;
        if (chunk.code && /[^\x00-\x7f]/.test(chunk.code)) chunk.code = escape(chunk.code);
      }
    },
  };
}

// Fail fast if required WXT_PUBLIC_* env is missing — share links would silently
// point to localhost and break demo. Dev can still use .env file; CI must export vars.
// WXT loads .env via dotenv, but process.env check here covers CI where .env is gitignored.
function assertRequiredEnv() {
  // Allow localhost fallback only for `wxt dev` (not for `wxt build`/`wxt zip`)
  const isDev = process.argv.includes("dev");
  if (isDev) return;
  const hasDotEnv = (() => {
    try {
      const fs = require("fs");
      const path = require("path");
      const p = path.join(__dirname, ".env");
      if (!fs.existsSync(p)) return false;
      const c = fs.readFileSync(p, "utf8");
      return /WXT_PUBLIC_WEB_URL/.test(c) && /WXT_PUBLIC_REPLAY_SERVER_URL/.test(c);
    } catch {
      return false;
    }
  })();
  const hasWeb = !!process.env.WXT_PUBLIC_WEB_URL || hasDotEnv;
  const hasReplay = !!process.env.WXT_PUBLIC_REPLAY_SERVER_URL || hasDotEnv;
  if (!hasWeb || !hasReplay) {
    throw new Error(
      "Missing WXT_PUBLIC_WEB_URL / WXT_PUBLIC_REPLAY_SERVER_URL. For local dev create apps/extension/.env, for prod: WXT_PUBLIC_WEB_URL=https://trail-bug.vercel.app WXT_PUBLIC_REPLAY_SERVER_URL=https://trail-roan.vercel.app pnpm zip:prod",
    );
  }
}
assertRequiredEnv();

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss(), escapeNonAscii()],
  }),
  manifest: {
    name: 'TRAIL',
    description: 'Capture a bug live, turn it into a maintainer-ready report.',
    permissions: ['scripting', 'storage', 'tabs', 'downloads', 'unlimitedStorage', 'clipboardWrite', 'favicon'],
    host_permissions: ['<all_urls>'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'",
    },
  },
});
