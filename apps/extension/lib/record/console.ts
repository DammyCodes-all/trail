import type { ConsoleEvent } from "@/lib/types";
import type { RecordContext } from "./context";
import { fmt } from "./format";

// Instrument console.error/warn, uncaught errors and unhandled rejections.
// Installed at document_start so early page errors are caught.
export const instrumentConsole = (ctx: RecordContext) => {
  const { emit, isActive, pageUrl } = ctx;

  for (const lv of ["error", "warn"] as const) {
    const orig = console[lv];
    console[lv] = function (...a: unknown[]) {
      if (isActive()) {
        const ev: ConsoleEvent = {
          k: "console",
          lv,
          msg: a.map(fmt).join(" "),
          t: Date.now(),
          url: pageUrl(),
        };
        emit(ev);
      }
      return orig.apply(this, a);
    };
  }

  addEventListener(
    "error",
    (e) => {
      if (!isActive()) return;
      const ev: ConsoleEvent = {
        k: "console",
        lv: "error",
        t: Date.now(),
        url: pageUrl(),
        msg: e.message,
        stack: e.error?.stack?.slice(0, 500),
      };
      emit(ev);
    },
    true,
  );

  addEventListener(
    "unhandledrejection",
    (e) => {
      if (!isActive()) return;
      const ev: ConsoleEvent = {
        k: "console",
        lv: "error",
        t: Date.now(),
        url: pageUrl(),
        msg: "Unhandled rejection: " + fmt(e.reason),
      };
      emit(ev);
    },
    true,
  );
};
