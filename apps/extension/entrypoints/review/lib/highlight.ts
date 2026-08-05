import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import plaintext from "highlight.js/lib/languages/plaintext";
import xml from "highlight.js/lib/languages/xml";
import type { PrettyLang } from "@/lib/pretty";

let ready = false;
const ensureLanguages = () => {
  if (ready) return;
  ready = true;
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("xml", xml);
  hljs.registerLanguage("plaintext", plaintext);
};

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Formatted key/value lines ("key: value") get their keys tinted like JSON
// property names (hljs-attr). Everything is escaped.
const highlightKv = (code: string): string =>
  code
    .split("\n")
    .map((line) => {
      const idx = line.indexOf(": ");
      if (idx <= 0) return escapeHtml(line);
      return `<span class="hljs-attr">${escapeHtml(line.slice(0, idx))}</span>: ${escapeHtml(
        line.slice(idx + 2),
      )}`;
    })
    .join("\n");

// Highlight captured bodies for display. "json" and "kv" highlight their known
// shape directly; "auto" detects JSON/HTML via highlight.js and falls back to
// escaped verbatim text. The output is always escaped, so it is safe to inject
// as HTML.
export function highlightCode(code: string, lang: PrettyLang = "auto"): string {
  ensureLanguages();
  if (lang === "json") return hljs.highlight(code, { language: "json" }).value;
  if (lang === "kv") return highlightKv(code);
  const auto = hljs.highlightAuto(code, ["json", "xml"]);
  if (auto.language) return auto.value;
  return hljs.highlight(code, { language: "plaintext" }).value;
}
