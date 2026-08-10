"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReviewApp } from "@trail/review/app";
import { POST_MESSAGE_KEY } from "@trail/review/lib/constants";
import type { SharedReportPayload } from "@trail/review/lib/types";
import { Button } from "@trail/review/ui/button";
import { TrailLogo } from "@trail/review/ui/trail-logo";
import { createWebLoader } from "@/lib/loader";

// How long the handoff gate waits before opening TRAIL on its own.
const HANDOFF_COUNTDOWN_SECS = 10;
// How long the probe (and the open-share round-trip) may take before we fall
// back to the inline review. 500ms is too tight for a relay injected at
// document_idle on a cold tab — a false "absent" skips the gate entirely.
const PROBE_TIMEOUT_MS = 1000;
const OPEN_ACK_TIMEOUT_MS = 3000;

type ExtensionState = "probing" | "present" | "absent";
type HandoffState = "idle" | "sending" | "opened" | "failed";

export default function SharedView({
  payload,
  link,
}: {
  payload: SharedReportPayload;
  link: string;
}) {
  const [extension, setExtension] = useState<ExtensionState>("probing");
  const [handoff, setHandoff] = useState<HandoffState>("idle");
  const [countdown, setCountdown] = useState(HANDOFF_COUNTDOWN_SECS);
  const handedOffRef = useRef(false);

  // Presence probe: the relay answers a postMessage round-trip only when the
  // extension is installed. The probe is a module-level one-shot — the reply
  // carries no correlation, so a single probe owns the listener.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.source === window &&
        (e.data as Record<string, unknown>)?.[POST_MESSAGE_KEY] === "probe-ack"
      ) {
        window.clearTimeout(timer);
        setExtension("present");
      }
    };
    window.addEventListener("message", onMessage);
    window.postMessage({ [POST_MESSAGE_KEY]: "probe" }, "*");
    const timer = window.setTimeout(() => {
      setExtension("absent");
    }, PROBE_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
  }, []);

  const handoffNow = useCallback(() => {
    if (handedOffRef.current) return;
    handedOffRef.current = true;
    setHandoff("sending");
    const onMessage = (e: MessageEvent) => {
      if (
        e.source === window &&
        (e.data as Record<string, unknown>)?.[POST_MESSAGE_KEY] === "open-ack"
      ) {
        window.clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        const ok = (e.data as { ok?: boolean }).ok === true;
        setHandoff(ok ? "opened" : "failed");
      }
    };
    window.addEventListener("message", onMessage);
    window.postMessage({ [POST_MESSAGE_KEY]: "open-share", link }, "*");
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      setHandoff("failed");
    }, OPEN_ACK_TIMEOUT_MS);
  }, [link]);

  // Countdown tick.
  useEffect(() => {
    if (extension !== "present" || handoff !== "idle") return;
    const interval = window.setInterval(
      () => setCountdown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => clearInterval(interval);
  }, [extension, handoff]);

  // At zero, hand off to the extension on its own.
  useEffect(() => {
    if (extension === "present" && handoff === "idle" && countdown <= 0) {
      handoffNow();
    }
  }, [countdown, extension, handoff, handoffNow]);

  const review = useMemo(() => createWebLoader(payload, link), [payload, link]);

  if (extension === "probing") {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-foreground" />
      </div>
    );
  }

  if (extension === "present" && handoff === "idle") {
    return (
      <div className="grid flex-1 place-items-center px-6">
        <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
          <TrailLogo size={56} aria-label="TRAIL logo" />
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-xl font-semibold text-foreground">
              This replay was shared with TRAIL
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Open it in the TRAIL extension for the full review experience —
              timeline, evidence, replay and a ready-to-file bug report.
            </p>
          </div>
          <Button
            id="handoff-open"
            className="h-11 min-w-52 rounded-md px-6"
            onClick={handoffNow}
          >
            Open in TRAIL{countdown > 0 ? ` (${countdown}s)` : ""}
          </Button>
          <button
            id="handoff-inline"
            className="text-[13px] text-muted-foreground underline-offset-4 hover:underline"
            // "failed" doubles as "dismissed": the inline review is the
            // non-handoff terminal state.
            onClick={() => setHandoff("failed")}
          >
            View in browser instead
          </button>
        </div>
      </div>
    );
  }

  if (handoff === "sending" || handoff === "opened") {
    return (
      <div className="grid flex-1 place-items-center px-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <TrailLogo size={56} aria-label="TRAIL logo" />
          <h1 className="font-heading text-lg font-semibold text-foreground">
            {handoff === "sending"
              ? "Opening in TRAIL…"
              : "TRAIL is opening this replay"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {handoff === "sending"
              ? "The extension is loading the shared session."
              : "Switch to the TRAIL tab to review it."}
          </p>
        </div>
      </div>
    );
  }

  return <ReviewApp loader={review.loader} platform={review.platform} />;
}
