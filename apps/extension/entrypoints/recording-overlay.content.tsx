import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";
import {
  FLAG_KEY,
  MSG_OVERLAY_STATUS,
  MSG_OVERLAY_UPDATE,
  MSG_STOP,
  POST_MESSAGE_KEY,
} from "@/lib/constants";
import { totalCounts } from "@/lib/summary";
import { formatElapsedTime } from "@/lib/time";
import type { TrailCounts } from "@/lib/types";
import {
  bounded,
  coordsForPlacement,
  nearestPlacement,
  usableBounds,
  type Placement,
  type Point,
  type Size,
} from "@/lib/overlay/physics";
import {
  readPlacement,
  writePlacement,
} from "@/lib/overlay/placement";
import { overlayStyles } from "@/lib/overlay/styles";

type OverlayStatus = {
  recording: boolean;
  counts: TrailCounts;
  startedAt?: number;
  flags: number;
};

type OverlayMessage = Partial<OverlayStatus> & {
  error?: string;
  type?: string;
  version?: number;
};

const ZERO_COUNTS: TrailCounts = { click: 0, input: 0, console: 0, net: 0 };

const normalizeCounts = (counts?: Partial<TrailCounts>): TrailCounts => ({
  ...ZERO_COUNTS,
  ...(counts ?? {}),
});

function RecordingOverlay() {
  const [status, setStatus] = React.useState<OverlayStatus>({
    recording: false,
    counts: ZERO_COUNTS,
    flags: 0,
  });
  const [now, setNow] = React.useState(Date.now());
  const [placement, setPlacement] = React.useState<Placement>({
    edge: "right",
    offset: 96,
  });
  const [positioned, setPositioned] = React.useState(false);
  const [flagOpen, setFlagOpen] = React.useState(false);
  const [flagExpected, setFlagExpected] = React.useState("");
  const [flagActual, setFlagActual] = React.useState("");
  const [flagToast, setFlagToast] = React.useState<string | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const flagButtonRef = React.useRef<HTMLButtonElement>(null);
  const flagExpectedRef = React.useRef<HTMLTextAreaElement>(null);
  const sizeRef = React.useRef<Size>({ width: 232, height: 108 });
  const flagToastTimerRef = React.useRef(0);
  const statusVersionRef = React.useRef(0);
  const dragRef = React.useRef<{
    pointerId: number;
    originPointerX: number;
    originPointerY: number;
    originX: number;
    originY: number;
    history: Point[];
  } | null>(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const stopRecording = React.useCallback(() => {
    void browser.runtime
      .sendMessage({ type: MSG_STOP, source: "overlay" })
      .catch(() => {});
  }, []);

  const applyPlacement = React.useCallback(
    (
      nextPlacement: Placement,
      velocity = { x: 0, y: 0 },
      immediate = false,
    ) => {
      const target = coordsForPlacement(nextPlacement, sizeRef.current);
      setPlacement(nextPlacement);
      writePlacement(nextPlacement);

      if (immediate || reduceMotion) {
        x.set(target.x);
        y.set(target.y);
        return;
      }

      animate(x, target.x, {
        type: "spring",
        bounce: 0.18,
        duration: 0.4,
        velocity: velocity.x,
      });
      animate(y, target.y, {
        type: "spring",
        bounce: 0.18,
        duration: 0.4,
        velocity: velocity.y,
      });
    },
    [reduceMotion, x, y],
  );

  React.useEffect(() => {
    void readPlacement().then((storedPlacement) => {
      setPlacement(storedPlacement);
      applyPlacement(storedPlacement, { x: 0, y: 0 }, true);
      setPositioned(true);
    });
  }, [applyPlacement]);

  React.useEffect(() => {
    let disposed = false;

    const applyStatus = (response: OverlayMessage) => {
      if (disposed || response.error) return;
      if (
        typeof response.version === "number" &&
        response.version < statusVersionRef.current
      ) {
        return;
      }
      if (typeof response.version === "number") {
        statusVersionRef.current = response.version;
      }
      const nextStatus: OverlayStatus = {
        recording: response.recording === true,
        counts: normalizeCounts(response.counts),
        startedAt:
          typeof response.startedAt === "number"
            ? response.startedAt
            : undefined,
        flags: typeof response.flags === "number" ? response.flags : 0,
      };
      setStatus((current) => {
        if (
          current.recording &&
          nextStatus.recording &&
          current.startedAt === nextStatus.startedAt &&
          totalCounts(nextStatus.counts) < totalCounts(current.counts)        ) {
          return current;
        }

        if (!nextStatus.recording) {
          return {
            ...nextStatus,
            startedAt: nextStatus.startedAt ?? current.startedAt,
          };
        }

        return nextStatus;
      });
    };

    const refresh = async () => {
      const response = await browser.runtime
        .sendMessage({ type: MSG_OVERLAY_STATUS })
        .catch(() => null);
      if (!response) return;
      applyStatus(response);
    };

    const handleMessage = (message: OverlayMessage) => {
      if (message?.type === MSG_OVERLAY_UPDATE) applyStatus(message);
    };

    browser.runtime.onMessage.addListener(handleMessage);
    void refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => {
      disposed = true;
      browser.runtime.onMessage.removeListener(handleMessage);
      window.clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    if (!status.recording) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [status.recording]);

  // When recording ends, tear down the flag UI so the next session starts clean.
  React.useEffect(() => {
    if (status.recording) return;
    setFlagOpen(false);
    setFlagToast(null);
    setFlagExpected("");
    setFlagActual("");
  }, [status.recording]);

  // The reporter must land in the first field the instant the form opens —
  // this happens mid-frustration, so no extra click.
  React.useEffect(() => {
    if (flagOpen) flagExpectedRef.current?.focus();
  }, [flagOpen]);

  const showFlagToast = (text: string) => {
    setFlagToast(text);
    window.clearTimeout(flagToastTimerRef.current);
    flagToastTimerRef.current = window.setTimeout(() => setFlagToast(null), 1600);
  };

  const submitFlag = (expected: string, actual: string) => {
    // Post to the page window like the relay's start/stop commands; the
    // MAIN-world recorder turns it into a captured 'flag' event.
    window.postMessage(
      { [POST_MESSAGE_KEY]: FLAG_KEY, d: { expected, actual } },
      "*",
    );
    setFlagOpen(false);
    setFlagExpected("");
    setFlagActual("");
    const at = formatElapsedTime(
      Date.now() - (status.startedAt ?? Date.now()),
    );
    showFlagToast(`Flagged at ${at}`);
    flagButtonRef.current?.focus();
  };

  const cancelFlag = () => {
    setFlagOpen(false);
    setFlagExpected("");
    setFlagActual("");
    flagButtonRef.current?.focus();
  };

  const onFlagKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelFlag();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.currentTarget === flagExpectedRef.current) {
        // Enter in the first field moves on to the second; the last field
        // (handled in its own handler) submits.
        const form = e.currentTarget.form;
        (form?.querySelector<HTMLTextAreaElement>("textarea:last-of-type"))?.focus();
        return;
      }
      submitFlag(flagExpected, flagActual);
    }
  };

  const onFlagActualKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelFlag();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitFlag(flagExpected, flagActual);
    }
  };

  React.useLayoutEffect(() => {
    if (!status.recording || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    sizeRef.current = { width: rect.width, height: rect.height };
    applyPlacement(placement, { x: 0, y: 0 }, !positioned);
  }, [applyPlacement, flagOpen, placement, positioned, status.recording]);

  React.useEffect(() => {
    const handleResize = () =>
      applyPlacement(placement, { x: 0, y: 0 }, reduceMotion === true);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [applyPlacement, placement, reduceMotion]);

  const releaseDrag = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);

      const last = drag.history.at(-1);
      const first = [...drag.history]
        .reverse()
        .find((point) => last && last.t - point.t >= 60);
      const elapsed = first && last ? Math.max(1, last.t - first.t) : 1;
      const velocityX =
        first && last ? ((last.x - first.x) / elapsed) * 1000 : 0;
      const velocityY =
        first && last ? ((last.y - first.y) / elapsed) * 1000 : 0;
      const nextPlacement = nearestPlacement(
        x.get(),
        y.get(),
        velocityX,
        velocityY,
        sizeRef.current,
      );

      applyPlacement(nextPlacement, { x: velocityX, y: velocityY });
    },
    [applyPlacement, x, y],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY, t: performance.now() };
    dragRef.current = {
      pointerId: event.pointerId,
      originPointerX: event.clientX,
      originPointerY: event.clientY,
      originX: x.get(),
      originY: y.get(),
      history: [point],
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const { minX, minY, maxX, maxY } = usableBounds(sizeRef.current);
    const nextX = drag.originX + event.clientX - drag.originPointerX;
    const nextY = drag.originY + event.clientY - drag.originPointerY;
    x.set(bounded(nextX, minX, maxX, window.innerWidth));
    y.set(bounded(nextY, minY, maxY, window.innerHeight));

    drag.history.push({
      x: event.clientX,
      y: event.clientY,
      t: performance.now(),
    });
    drag.history = drag.history.slice(-8);
  };

  if (!status.recording) return null;

  const total =
    status.counts.click +
    status.counts.input +
    status.counts.console +
    status.counts.net;
  const numberTransition = reduceMotion
    ? { stiffness: 500, damping: 100, mass: 0.1 }
    : { stiffness: 220, damping: 26, mass: 0.35 };

  return (
    <motion.div
      ref={panelRef}
      className={`trail-overlay rr-block${flagOpen ? " trail-overlay--flagging" : ""}`}
      role="status"
      aria-live="polite"
      style={{ x, y, opacity: positioned ? 1 : 0 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={releaseDrag}
      onPointerCancel={releaseDrag}
    >
      <div className="trail-overlay__top">
        <span className="trail-overlay__rec">
          <span className="trail-overlay__live" aria-hidden="true" />
          <span>REC</span>
        </span>
        <span className="trail-overlay__time">
          {status.startedAt ? formatElapsedTime(now - status.startedAt) : "00:00"}
        </span>
        <span className="trail-overlay__actions">
          <button
            ref={flagButtonRef}
            type="button"
            className={`trail-overlay__flag${flagOpen ? " trail-overlay__flag--open" : ""}`}
            aria-label="Flag a problem"
            aria-expanded={flagOpen}
            onPointerDownCapture={(event) => event.stopPropagation()}
            onMouseDownCapture={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setFlagOpen((open) => !open);
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" x2="4" y1="22" y2="15" />
            </svg>
            {status.flags > 0 && (
              <span className="trail-overlay__flag-badge" aria-hidden="true">
                {status.flags}
              </span>
            )}
          </button>
          <button
            type="button"
            className="trail-overlay__stop"
            aria-label="Stop recording"
            onPointerDownCapture={(event) => event.stopPropagation()}
            onMouseDownCapture={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              stopRecording();
            }}
          >
            Stop
          </button>
        </span>
      </div>
      <div className="trail-overlay__total">
        <SlidingNumber
          number={total}
          fromNumber={0}
          initiallyStable
          transition={numberTransition}
          aria-label={`${total} captured events`}
        />
        <span>events</span>
      </div>
      <div className="trail-overlay__metrics" aria-hidden="true">
        <Metric
          label="Clicks"
          value={status.counts.click}
          accent="neutral"
          transition={numberTransition}
        />
        <Metric
          label="Inputs"
          value={status.counts.input}
          accent="neutral"
          transition={numberTransition}
        />
        <Metric
          label="Issues"
          value={status.counts.console + status.counts.net}
          accent="error"
          transition={numberTransition}
        />
      </div>
      {flagOpen && (
        <form
          className="trail-overlay__form"
          onPointerDownCapture={(event) => event.stopPropagation()}
          onMouseDownCapture={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault();
            submitFlag(flagExpected, flagActual);
          }}
        >
          <div className="trail-overlay__field">
            <label htmlFor="trail-flag-expected">
              Expected behavior
            </label>
            <textarea
              ref={flagExpectedRef}
              id="trail-flag-expected"
              rows={2}
              value={flagExpected}
              onChange={(e) => setFlagExpected(e.target.value)}
              onKeyDown={onFlagKeyDown}
              placeholder="Optional, e.g. Checkout should accept the total"
            />
          </div>
          <div className="trail-overlay__field">
            <label htmlFor="trail-flag-actual">
              Current behavior
            </label>
            <textarea
              id="trail-flag-actual"
              rows={2}
              value={flagActual}
              onChange={(e) => setFlagActual(e.target.value)}
              onKeyDown={onFlagActualKeyDown}
              placeholder="Optional, e.g. The total shows double the price"
            />
          </div>
          <div className="trail-overlay__form-row">
            <span className="trail-overlay__hint">↵ flag it · esc cancels</span>
            <button
              type="button"
              className="trail-overlay__cancel"
              onClick={cancelFlag}
            >
              Cancel
            </button>
            <button type="submit" className="trail-overlay__submit">
              Flag it
            </button>
          </div>
        </form>
      )}
      {flagToast && <div className="trail-overlay__toast">{flagToast}</div>}
    </motion.div>
  );
}

function Metric({
  label,
  value,
  accent,
  transition,
}: {
  label: string;
  value: number;
  accent: "neutral" | "error";
  transition: { stiffness: number; damping: number; mass: number };
}) {
  return (
    <span className={`trail-overlay__metric trail-overlay__metric--${accent}`}>
      <SlidingNumber
        number={value}
        fromNumber={0}
        initiallyStable
        transition={transition}
      />
      <span>{label}</span>
    </span>
  );
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  world: "ISOLATED",
  main() {
    if (document.getElementById("trail-recording-overlay")) return;

    const host = document.createElement("trail-recording-overlay");
    host.id = "trail-recording-overlay";
    host.className = "rr-block";
    host.dataset.trailOverlay = "true";
    host.setAttribute("aria-hidden", "false");
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    const mount = document.createElement("div");
    style.textContent = overlayStyles;
    shadow.append(style, mount);
    document.documentElement.append(host);

    createRoot(mount).render(<RecordingOverlay />);
  },
});
