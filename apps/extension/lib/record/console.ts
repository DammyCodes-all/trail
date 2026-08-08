import type { ConsoleEvent } from "@/lib/types";
import type { RecordContext } from "./context";
import { fmt } from "./format";
import { redactText } from "./redaction";

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
          // Console output often echoes request payloads (login errors, API
          // bodies), so messages are scrubbed for secrets at capture time.
          msg: redactText(a.map(fmt).join(" ")),
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
        msg: redactText(e.message),
        stack: e.error?.stack
          ? redactText(e.error.stack.slice(0, 2000))
          : undefined,
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
        msg: "Unhandled rejection: " + redactText(fmt(e.reason)),
      };
      emit(ev);
    },
    true,
  );
};
