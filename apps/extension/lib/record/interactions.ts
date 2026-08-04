import type { ClickEvent, InputEvent } from "@/lib/types";
import type { RecordContext } from "./context";
import { cap } from "./format";
import { labelFor } from "./labels";
import { MASKED_PLACEHOLDER, shouldMaskInput } from "./redaction";

// A click is only a report-worthy *action* when it lands on an interactive
// control. Text-ish inputs and textareas are excluded: typing into them is
// already captured by the change handler, and counting the focus-clicks that
// precede every keystroke inflates the report. Blank background and inert
// wrappers (body, labels, plain divs) are noise, not steps.
const TEXT_LIKE =
  /^(text|email|password|search|tel|url|number|date|datetime-local|month|week|time|file)$/;
const CLICKABLE =
  "button,a[href],[role=button],[onclick],select,summary,details,input";

const actionTarget = (el: Element): Element | null => {
  if (
    el.closest?.(
      'trail-recording-overlay, #trail-recording-overlay, [data-trail-overlay="true"]',
    )
  )
    return null;
  const node = (el.closest?.(CLICKABLE) ?? el) as Element;
  const tag = node.tagName?.toLowerCase();
  if (tag === "input") {
    const type = (node as HTMLInputElement).type || "text";
    return TEXT_LIKE.test(type) ? null : node;
  }
  if (
    tag === "textarea" ||
    tag === "label" ||
    tag === "body" ||
    tag === "html"
  )
    return null;
  if (tag === "a" && !(node as HTMLAnchorElement).href) return null;
  return node;
};

export const instrumentClicks = (ctx: RecordContext) => {
  const { emit, isActive, pageUrl } = ctx;
  addEventListener(
    "click",
    (e) => {
      if (!isActive()) return;
      const node = actionTarget(e.target as Element);
      if (!node) return;
      const ev: ClickEvent = {
        k: "click",
        label: labelFor(node) ?? `<${node.tagName.toLowerCase()}>`,
        tag: node.tagName.toLowerCase(),
        t: Date.now(),
        url: pageUrl(),
      };
      emit(ev);
    },
    true,
  );
};

// Typed input, masked by default (see lib/record/redaction.ts).
export const instrumentInputs = (
  ctx: RecordContext,
  redact: () => boolean,
) => {
  const { emit, isActive, pageUrl } = ctx;
  addEventListener(
    "change",
    (e) => {
      if (!isActive()) return;
      const el = e.target as HTMLInputElement;
      if (!el.matches?.("input,textarea,select")) return;
      const hide = shouldMaskInput(el, redact());
      const ev: InputEvent = {
        k: "input",
        label: labelFor(el) ?? `<${el.tagName.toLowerCase()}>`,
        t: Date.now(),
        url: pageUrl(),
        masked: hide,
        value: hide ? MASKED_PLACEHOLDER : (cap(el.value, 100) ?? ""),
      };
      emit(ev);
    },
    true,
  );
};
