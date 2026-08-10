import type { KeyEvent } from "@/lib/types";
import type { RecordContext } from "./context";
import { labelFor } from "./labels";

// Text-entry controls: anywhere Enter is an actionable keypress. Buttons,
// checkboxes, radios and the other button-like inputs are excluded on
// purpose — Enter activates them natively and that activation surfaces as a
// synthetic click, which instrumentClicks already records. Capturing the
// key too would make every keyboard-only press (modals, copy buttons) a
// double step.
const CONTROL =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="image"]),textarea,select';

// Enter pressed on a form control is a report-worthy action: keyboard-driven
// repros ("type a query, press Enter") produce no click, and a submit that
// navigates immediately can fire no change event either — without this step
// such a bug leaves no trace. Shift+Enter is excluded: it is the newline
// convention (chat, comments, editors), not a send — recording it would put
// a phantom step at every intentional linebreak. A bare Enter in a plain
// textarea that just inserts a newline is the accepted cost: in chat UIs
// Enter sends (usually via JS — no submit event, no click) and the key step
// is the only trace that send happened. Other keys are the page's own
// business: typing is captured by the change handler, and shortcuts are
// noise.
export const instrumentKeys = (ctx: RecordContext) => {
  const { emit, isActive, pageUrl } = ctx;
  addEventListener("keydown", (e) => {
    if (!isActive()) return;
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter") return;
    // IME composition (pinyin etc.): Enter commits the candidate — it is not
    // a form submission, and recording it would fabricate a step.
    if (ke.isComposing) return;
    const el = e.target as Element | null;
    if (!el?.matches?.(CONTROL)) return;
    // Shift+Enter = newline, and nothing to report.
    if (ke.shiftKey && el.matches("textarea")) return;
    const ev: KeyEvent = {
      k: "key",
      key: "Enter",
      label: labelFor(el) ?? `<${el.tagName.toLowerCase()}>`,
      tag: el.tagName.toLowerCase(),
      t: Date.now(),
      url: pageUrl(),
    };
    emit(ev);
  }, true);
};