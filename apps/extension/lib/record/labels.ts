import { cap } from "./format";

// Candidates are skipped when empty: inputs report no textContent, and an
// empty string must not short-circuit the fallbacks (placeholder, name/id).
const first = (s: unknown) => {
  const v = cap(s);
  return v ? v : null;
};

// aria-labelledby: the element's own computed name assembled from the
// referenced elements' text — the most common naming source a label chain
// misses entirely. Referenced ids only; recursion is not followed
// (aria-labelledby chains that reference other labelledby ids are rare).
const labelledBy = (e: Element): string | null => {
  const ids = e.getAttribute?.("aria-labelledby");
  if (!ids) return null;
  const parts: string[] = [];
  for (const id of ids.split(/\s+/).filter(Boolean)) {
    const part = first(e.ownerDocument?.getElementById(id)?.textContent);
    if (part) parts.push(part);
  }
  return parts.length ? parts.join(" ") : null;
};

// Readable name for a clicked/typed element.
export const labelFor = (el: Element): string | null => {
  const forLabel = (e: Element): string | null => {
    const id = e.getAttribute?.("id");
    if (!id) return null;
    const escaped = id.replace(/["\\]/g, "\\$&");
    return first(
      e.ownerDocument?.querySelector(`label[for="${escaped}"]`)?.textContent,
    );
  };
  // Icon-only controls: a link/button wrapping an <img alt> or an inline
  // <svg><title> gets its name from the graphic, not the (empty) text.
  const childImageAlt = (e: Element): string | null =>
    first(e.querySelector?.("img[alt]")?.getAttribute?.("alt"));
  const childSvgTitle = (e: Element): string | null =>
    first(e.querySelector?.("svg title")?.textContent);
  return (
    first(el.getAttribute?.("aria-label")) ??
    first(el.textContent) ??
    labelledBy(el) ??
    forLabel(el) ??
    first(el.closest?.("label")?.textContent) ??
    first(el.getAttribute?.("placeholder")) ??
    first(el.getAttribute?.("alt")) ??
    first(el.getAttribute?.("autocomplete")) ??
    childImageAlt(el) ??
    childSvgTitle(el) ??
    first(el.getAttribute?.("title")) ??
    first(el.getAttribute?.("name") || el.id) ??
    `<${el.tagName.toLowerCase()}>`
  );
};

// Form names come from reference, never from the form's own text: a <form>'s
// textContent is every field it wraps ("Email Password Sign in"), which is
// exactly the wrong label for a submit step. aria-label wins, then
// aria-labelledby references, then title/name — then the anonymous <form>
// fallback. The textContent candidate labelFor uses is deliberately absent.
export const formLabelFor = (el: Element): string =>
  first(el.getAttribute?.("aria-label")) ??
  labelledBy(el) ??
  first(el.getAttribute?.("title")) ??
  first(el.getAttribute?.("name")) ??
  "<form>";
