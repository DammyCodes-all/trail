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

  // JSON (object or array) → re-indent. Truncated JSON that cannot parse is
  // repaired and formatted anyway (prettyTruncatedJson), so a capped body
  // still renders as readable, highlighted JSON.
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return {
        text: JSON.stringify(JSON.parse(source), null, 2) + suffix,
        lang: "json",
      };
    } catch {
      const repaired = prettyTruncatedJson(source);
      if (repaired !== null) {
        return { text: repaired + suffix, lang: "json" };
      }
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

// ---------------------------------------------------------------------------
// Tolerant JSON: best-effort repair of a body that was cut mid-document.
//
// A hand-rolled tokenizer (strings with escape handling, numbers, keywords,
// punctuation) drives a pretty-printer that adds indentation, drops a trailing
// comma, closes an unterminated string, and closes any open containers. The
// result is valid-enough JSON for display and highlighting. Returns null when
// the input is not JSON-shaped at all, so callers fall back to plain display.
// ---------------------------------------------------------------------------

interface JsonToken {
  type: "open" | "close" | "colon" | "comma" | "value";
  text: string;
  unterminated?: boolean;
}

const isJsonWhitespace = (c: string | undefined): boolean =>
  c === " " || c === "\t" || c === "\n" || c === "\r";

const isNumberChar = (c: string | undefined): boolean =>
  c !== undefined && /[0-9eE+\-.]/.test(c);

const isLetter = (c: string | undefined): boolean =>
  c !== undefined && /[a-zA-Z]/.test(c);

function tokenizeJson(s: string): JsonToken[] | null {
  const tokens: JsonToken[] = [];
  let i = 0;
  const n = s.length;

  while (i < n) {
    const c = s[i];
    if (isJsonWhitespace(c)) {
      i++;
      continue;
    }
    if (c === "{" || c === "[") {
      tokens.push({ type: "open", text: c });
      i++;
      continue;
    }
    if (c === "}" || c === "]") {
      tokens.push({ type: "close", text: c });
      i++;
      continue;
    }
    if (c === ":") {
      tokens.push({ type: "colon", text: ":" });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ type: "comma", text: "," });
      i++;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let text = '"';
      let unterminated = true;
      while (j < n) {
        const ch = s[j];
        if (ch === "\\") {
          text += ch;
          j++;
          if (j < n) {
            text += s[j];
            j++;
          }
          continue;
        }
        if (ch === '"') {
          text += '"';
          j++;
          unterminated = false;
          break;
        }
        text += ch;
        j++;
      }
      tokens.push({ type: "value", text, unterminated });
      i = j;
      continue;
    }
    if (c === "-" || (c !== undefined && c >= "0" && c <= "9")) {
      let j = i;
      let text = "";
      while (j < n && isNumberChar(s[j])) {
        text += s[j];
        j++;
      }
      if (text === "-") return null;
      tokens.push({ type: "value", text });
      i = j;
      continue;
    }
    if (isLetter(c)) {
      let j = i;
      let text = "";
      while (j < n && isLetter(s[j])) {
        text += s[j];
        j++;
      }
      if (text !== "true" && text !== "false" && text !== "null") return null;
      tokens.push({ type: "value", text });
      i = j;
      continue;
    }
    return null;
  }

  return tokens;
}

function formatTokens(tokens: JsonToken[]): string | null {
  if (!tokens.length) return null;
  if (tokens[0]?.type !== "open") return null;

  const INDENT = "  ";
  const stack: string[] = [];
  let out = "";
  let lineStart = true;

  const nl = (depth: number) => {
    out += "\n" + INDENT.repeat(depth);
    lineStart = true;
  };
  const emit = (text: string) => {
    out += text;
    lineStart = false;
  };
  const closeFor = (open: string) => (open === "{" ? "}" : "]");

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t) return null;
    const next = tokens[i + 1];

    if (t.type === "open") {
      if (stack.length === 0 && out.length > 0) return null;
      // Empty container ({}, []) stays on one line.
      if (next && next.type === "close" && next.text === closeFor(t.text)) {
        emit(t.text + next.text);
        i++;
        continue;
      }
      stack.push(t.text);
      emit(t.text);
      nl(stack.length);
      continue;
    }

    if (t.type === "close") {
      const want = stack.pop();
      if (want === undefined || closeFor(want) !== t.text) return null;
      if (!lineStart) nl(stack.length);
      emit(t.text);
      continue;
    }

    if (t.type === "comma") {
      // Drop a trailing comma before a closing bracket or the cut.
      if (
        !next ||
        (next.type === "close" && stack.at(-1) === (next.text === "}" ? "{" : "["))
      ) {
        continue;
      }
      emit(",");
      nl(stack.length);
      continue;
    }

    if (t.type === "colon") {
      // Drop a dangling colon with nothing after it.
      if (!next || next.type === "close") continue;
      emit(": ");
      continue;
    }

    // value
    if (stack.length === 0 && out.length > 0) return null;
    emit(t.text);
    if (t.unterminated) emit('"');
  }

  while (stack.length) {
    const open = stack.pop();
    if (!open) break;
    if (!lineStart) nl(stack.length);
    emit(closeFor(open));
  }

  return out;
}

export function prettyTruncatedJson(s: string): string | null {
  const tokens = tokenizeJson(s);
  if (tokens === null) return null;
  return formatTokens(tokens);
}
