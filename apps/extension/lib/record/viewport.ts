import type { ViewportEvent } from "@trail/review/lib/types";
import type { RecordContext } from "./context";

// Material viewport resizes only: a responsive-layout bug needs the resize
// step ("resize to 375px then the nav breaks"), but production sites resize
// the viewport for dozens of reasons — devtools docking, window snappers,
// OS rotation. A change smaller than 50px in BOTH dimensions is jitter
// (scrollbar appearance, a few pixels of snap adjustment), not a repro
// step; a single-axis change of 50px+ (docking devtools to the side) is a
// real layout event and fires. Trailing debounce folds drag-resizes into
// one step; the step carries the final size, which is what a repro resizes
// TO.
const MIN_DELTA = 50;
const DEBOUNCE_MS = 250;

// Pure gate behind the listener, split out so the jitter rule is pinned by
// tests: skip only when neither axis moved at least MIN_DELTA.
export function isMaterialResize(
  prevW: number,
  prevH: number,
  w: number,
  h: number,
): boolean {
  return Math.abs(w - prevW) >= MIN_DELTA || Math.abs(h - prevH) >= MIN_DELTA;
}

export const instrumentViewport = (ctx: RecordContext) => {
  const { emit, isActive, pageUrl } = ctx;
  let emittedFor = "";
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    timer = undefined;
    if (!isActive()) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dims = `${w}×${h}`;
    if (document.hidden || dims === emittedFor) return;
    emittedFor = dims;
    const ev: ViewportEvent = {
      k: "viewport",
      w,
      h,
      t: Date.now(),
      url: pageUrl(),
    };
    emit(ev);
  };

  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  addEventListener(
    "resize",
    () => {
      if (!isActive()) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (!isMaterialResize(lastW, lastH, w, h)) return;
      lastW = w;
      lastH = h;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    },
    true,
  );
};