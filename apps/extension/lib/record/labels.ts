import { cap } from "./format";

// Readable name for a clicked/typed element. Candidates are skipped when empty:
// inputs report no textContent, and an empty string must not short-circuit the
// fallbacks (placeholder, name/id).
export const labelFor = (el: Element): string | null => {
  const first = (s: unknown) => {
    const v = cap(s);
    return v ? v : null;
  };
  const forLabel = (e: Element): string | null => {
    const id = e.getAttribute?.("id");
    if (!id) return null;
    const escaped = id.replace(/["\\]/g, "\\$&");
    return first(
      e.ownerDocument?.querySelector(`label[for="${escaped}"]`)?.textContent,
    );
  };
  return (
    first(el.getAttribute?.("aria-label")) ??
    first(el.textContent) ??
    forLabel(el) ??
    first(el.closest?.("label")?.textContent) ??
    first(el.getAttribute?.("placeholder")) ??
    first(el.getAttribute?.("alt")) ??
    first(el.getAttribute?.("autocomplete")) ??
    first(el.getAttribute?.("name") || el.id) ??
    `<${el.tagName.toLowerCase()}>`
  );
};
