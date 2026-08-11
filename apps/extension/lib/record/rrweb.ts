import { record, takeFullSnapshot } from "rrweb";
import type { RecordContext } from "./context";
import { maskInputs } from "./redaction";

export interface RrwebHandle {
  readonly running: boolean;
  start: () => void;
  stop: () => void;
  restart: () => void;
}

// Visual replay recording. rrweb's masking options are fixed per recording, so
// a mid-session redaction change requires a stop → start → full-snapshot cycle.
export const createRrweb = (
  ctx: RecordContext,
  redact: () => boolean,
): RrwebHandle => {
  let stop: (() => void) | undefined;
  let running = false;

  const start = () => {
    try {
      stop = record({
        emit: (ev) => {
          if (ctx.isActive())
            ctx.emit({
              k: "rrweb",
              ev,
              t: ev.timestamp,
              url: ctx.pageUrl(),
            });
        },
        recordAfter: "DOMContentLoaded",
        maskInputOptions: maskInputs(redact()),
        blockClass: "rr-block",
        checkoutEveryNms: 30_000,
        // Throttle the high-frequency streams: the replayer applies every due
        // event in one burst per frame, so dense mouse/scroll traffic is what
        // makes high-speed playback janky. Input is deliberately NOT sampled
        // ("last" would capture only change events and drop keystrokes from
        // fields that are never blurred) — typing fidelity is a core TRAIL
        // feature. Clicks are kept in full.
        sampling: {
          mousemove: 100,
          scroll: 200,
          mouseInteraction: {
            MouseUp: false,
            MouseDown: false,
            Click: true,
            DblClick: true,
            Focus: false,
            Blur: false,
            ContextMenu: true,
            TouchStart: false,
            TouchEnd: false,
          },
        },
        errorHandler: () => true, // never let a recording bug break the page
      });
      running = true;
    } catch {
      // never break the page if rrweb can't start
    }
  };

  const stopRecording = () => {
    stop?.();
    stop = undefined;
    running = false;
  };

  return {
    get running() {
      return running;
    },
    start,
    stop: stopRecording,
    restart: () => {
      // Frames captured before the toggle keep whatever state they were
      // recorded with; the full snapshot marks a clean masked boundary.
      stopRecording();
      start();
      takeFullSnapshot();
    },
  };
};
