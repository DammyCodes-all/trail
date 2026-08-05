// Display-only shaping of captured request/response bodies. Pure and DOM-free,
// so it is safe to use anywhere (timeline, report, exports).

export type PrettyLang = "json" | "kv" | "auto";

export interface PrettyResult {
  text: string;
  lang: PrettyLang;
}

// Capture appends this marker to capped bodies; it would break JSON.parse, so
// it is stripped before shaping and re-appended to the shaped output.
const TRUNCATED_MARKER = "\n...(truncated)";

export function prettyBody(raw: string): PrettyResult {
  const truncated = raw.endsWith(TRUNCATED_MARKER);
  const source = truncated ? raw.slice(0, -TRUNCATED_MARKER.length) : raw;
  const trimmed = source.trim();
  const suffix = truncated ? TRUNCATED_MARKER : "";

  // JSON (object or array) → re-indent.
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return {
        text: JSON.stringify(JSON.parse(source), null, 2) + suffix,
        lang: "json",
      };
    } catch {
      // Truncated mid-token or malformed — fall through to plain display.
    }
  }

  // application/x-www-form-urlencoded → one pair per line.
  if (trimmed.includes("&") && trimmed.includes("=")) {
    const pairs = [...new URLSearchParams(source).entries()];
    if (pairs.length >= 2) {
      return {
        text: pairs.map(([key, value]) => `${key}: ${value}`).join("\n") + suffix,
        lang: "kv",
      };
    }
  }

  return { text: raw, lang: "auto" };
}
