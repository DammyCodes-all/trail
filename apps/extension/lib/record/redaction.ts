// Redaction policy, shared by the event metadata recorder and the rrweb visual
// recorder. Capture-time only: anything not masked here is visible in replay.

const SENSITIVE =
  /pass|pwd|secret|token|otp|cvv|ssn|card|auth|api[-_]?key/i;

// An input's typed value must not be recorded when the user chose auto-redact,
// when it is a password, or when its identity looks sensitive.
export const shouldMaskInput = (
  el: HTMLInputElement,
  autoRedact: boolean,
): boolean =>
  autoRedact ||
  el.type === "password" ||
  SENSITIVE.test(
    el.name + el.id + (el.getAttribute("autocomplete") ?? ""),
  );

export const MASKED_PLACEHOLDER = "•".repeat(8);

// Free-text inputs mask in the visual replay (rrweb) when redact is on.
// color/range/select are excluded: their values are choices, not typed secrets.
const MASKED_FREE_TEXT = {
  text: true,
  email: true,
  search: true,
  tel: true,
  url: true,
  number: true,
  date: true,
  "datetime-local": true,
  month: true,
  week: true,
  time: true,
  textarea: true,
} as const;

// rrweb's masking options are fixed per recording; `redact` is read at start.
export const maskInputs = (redact: boolean) => ({
  ...(redact ? MASKED_FREE_TEXT : {}),
  password: true, // always, even when redact is off
});

// Header names whose values never leave the page. The key stays visible (so a
// report shows "an Authorization header was sent") but the value is replaced.
const SENSITIVE_HEADERS =
  /^authorization$|^cookie$|^set-cookie$|^proxy-authorization$|^www-authenticate$|^x-?api-?key$|^x-?auth-?token$/i;

export const redactHeaders = (
  headers: Record<string, string>,
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    out[name] = SENSITIVE_HEADERS.test(name) ? "[redacted]" : value;
  }
  return out;
};

// ---------------------------------------------------------------------------
// Value redaction for network payloads and console output. Unconditional, like
// header redaction: these run at capture time so scrubbed values never reach
// disk, a shared link, or the AI proxy. Structure is preserved — JSON keys and
// nesting, param names, paths, and non-sensitive values survive, so the report
// still shows the *shape* of what was sent. Value matching is conservative:
// mask when the key itself is sensitive, or when the value strongly looks like
// a secret (email, card, JWT/Bearer, provider-prefixed key, long token runs).
// ---------------------------------------------------------------------------

import { TRUNCATED_MARKER } from "@/lib/pretty";

export const REDACTED = "[redacted]";

const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const luhn = (digits: string): boolean => {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
};

// 13-19 digits, optionally space/hyphen separated (4242 4242 4242 4242). The
// final digit is a separate atom so a match always ends on a digit — a trailing
// separator stays outside the match and survives as prose.
const CARD_RE = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g;

// Strong secret shapes, maskable without a key hint. Emails keep their domain
// (which org failed is useful); everything else becomes a plain marker.
const EMAIL = "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}";
const JWT = "eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{4,}\\.[A-Za-z0-9_-]{4,}";
const BEARER = "Bearer\\s+[A-Za-z0-9._~+/=-]{20,}";
const SECRET_PREFIX = "(?:sk|pk|rk|ghp|gho|ghs|AKIA)[A-Za-z0-9_-]{16,}";
// Long alphanumeric runs (32+). Requires a digit *and* a letter so prose words
// survive; '/' and '+' are excluded so file paths and standard-base64 don't
// get eaten by this catch-all.
const TOKEN_RUN = "[A-Za-z0-9_-]{32,}";

const SHAPE_RE = new RegExp(
  `(${EMAIL})|(${JWT})|(${BEARER})|(${SECRET_PREFIX})|(${TOKEN_RUN})`,
  "g",
);

export const scrubShapes = (s: string): string =>
  s
    .replace(CARD_RE, (m) => {
      const digits = m.replace(/\D/g, "");
      return digits.length >= 13 && digits.length <= 19 && luhn(digits)
        ? REDACTED
        : m;
    })
    .replace(SHAPE_RE, (m, email: string, jwt: string, bearer: string, pref: string, run: string) => {
      if (email) return `${REDACTED}${m.slice(m.indexOf("@"))}`;
      if (jwt) return REDACTED;
      if (bearer) return REDACTED;
      if (pref) return REDACTED;
      return /[0-9]/.test(run) && /[A-Za-z]/.test(run) ? REDACTED : m;
    });

// Quoted `"key": "value"` / `key="value"` pairs — the shape JSON bodies use.
const KEY_VALUE_RE = /(["']?)([A-Za-z0-9_.-]{1,64})\1\s*([:=])\s*(["'])((?:[^"\\]|\\.)*)\4/g;

// Unquoted `key=value` / `key: value` pairs — urlencoded bodies, logs, and
// truncated JSON. The boundary is consumed and re-emitted so overlapping
// matches (a=1&token=x) still line up.
const KV_UNQUOTED_RE =
  /(^|[&,;?\s])(["']?)([A-Za-z0-9_.-]{1,64})\2\s*([:=])\s*([^&,;\s"']+)/g;

const maskKeyValue = (s: string): string => {
  const quoted = s.replace(
    KEY_VALUE_RE,
    (m, qk: string, k: string, op: string, qv: string, v: string) =>
      SENSITIVE.test(k) ? `${qk}${k}${qk}${op}${qv}${REDACTED}${qv}` : m,
  );
  return quoted.replace(
    KV_UNQUOTED_RE,
    (m, b: string, qk: string, k: string, op: string, v: string) =>
      SENSITIVE.test(k) ? `${b}${qk}${k}${qk}${op}${REDACTED}` : m,
  );
};

// application/x-www-form-urlencoded bodies: split into pairs so values are
// decoded before key matching and shape checking (email=a%40b.com).
const maskUrlencoded = (s: string): string =>
  s
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq <= 0) return pair;
      const k = pair.slice(0, eq);
      const v = pair.slice(eq + 1);
      if (SENSITIVE.test(safeDecode(k))) return `${k}=${REDACTED}`;
      const scrubbed = scrubShapes(safeDecode(v));
      return scrubbed === v ? pair : `${k}=${scrubbed}`;
    })
    .join("&");

const looksUrlencoded = (s: string): boolean =>
  s.includes("=") && (s.includes("&") || !/[\s{}[\]]/.test(s));

// Recursive walk over parsed JSON: values under sensitive keys become the
// marker (numbers included — "cvv": 123 is as sensitive as a string), object
// values recurse so structure survives, and every string leaf is shape-
// scrubbed so secrets hiding under non-sensitive keys still get caught.
const redactJsonValue = (v: unknown, key?: string): unknown => {
  if (v === null || typeof v !== "object") {
    if (key !== undefined && SENSITIVE.test(key)) return REDACTED;
    return typeof v === "string" ? scrubShapes(v) : v;
  }
  if (Array.isArray(v)) return v.map((x) => redactJsonValue(x));
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) out[k] = redactJsonValue(x, k);
  return out;
};

// Scrub a captured request or response body. Format-aware: parseable JSON is
// walked (structure preserved), urlencoded bodies are pair-decoded, and
// anything else gets key-value and shape passes. Undefined stays undefined.
export const redactBody = (s: string | undefined): string | undefined => {
  if (s === undefined) return undefined;
  const truncated = s.endsWith(TRUNCATED_MARKER);
  const source = truncated ? s.slice(0, -TRUNCATED_MARKER.length) : s;
  const trimmed = source.trim();
  const suffix = truncated ? TRUNCATED_MARKER : "";

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const out = JSON.stringify(redactJsonValue(JSON.parse(source)));
      return out + suffix;
    } catch {
      // Truncated mid-document — the raw passes still scrub what's there.
    }
  } else if (looksUrlencoded(trimmed)) {
    return maskUrlencoded(source) + suffix;
  }

  return scrubShapes(maskKeyValue(source)) + suffix;
};

// Scrub free text that isn't a payload (console messages, network errors):
// key-value pairs and secret-shaped values, structure and prose intact.
export const redactText = (s: string): string => scrubShapes(maskKeyValue(s));

// Scrub the query string of a captured request URL. Scheme, host, and path are
// always kept; sensitive param names are masked entirely and every param value
// is shape-checked (decoded first). Relative targets are handled by masking
// their query fragment directly.
export const redactUrl = (u: string): string => {
  const qi = u.indexOf("?");
  if (qi === -1) return u;
  const pairs = u
    .slice(qi + 1)
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq <= 0) return pair;
      const k = pair.slice(0, eq);
      const v = pair.slice(eq + 1);
      if (SENSITIVE.test(safeDecode(k))) return `${k}=${REDACTED}`;
      const scrubbed = scrubShapes(safeDecode(v));
      return scrubbed === v ? pair : `${k}=${scrubbed}`;
    });
  return `${u.slice(0, qi)}?${pairs.join("&")}`;
};
