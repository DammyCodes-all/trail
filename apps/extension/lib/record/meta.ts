import type { MetaEvent } from "@trail/review/lib/types";
import type { RecordContext } from "./context";

// Capture-time environment, emitted at every document boot. The Environment
// section must describe the machine that RECORDED the session — the report
// is rendered from events, on whatever machine happens to open it, so
// deriving UA/viewport at render time from the reviewer's browser describes
// the reviewer. Consumers take the earliest meta event of the session.
export const emitMeta = (ctx: RecordContext): void => {
  const ev: MetaEvent = {
    k: "meta",
    userAgent: navigator.userAgent,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
    t: Date.now(),
    url: location.href,
  };
  ctx.emit(ev);
};