import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";
import { MSG_OVERLAY_STATUS, MSG_STOP } from "@/lib/constants";
import type { TrailCounts } from "@/lib/types";

type OverlayStatus = {
  recording: boolean;
  counts: TrailCounts;
  startedAt?: number;
};

type Edge = "left" | "right" | "top" | "bottom";
type Placement = { edge: Edge; offset: number };
type Size = { width: number; height: number };
type Point = { x: number; y: number; t: number };

const STORAGE_KEY = "trail:recording-overlay-placement";
const MARGIN = 12;
const ZERO_COUNTS: TrailCounts = { click: 0, input: 0, console: 0, net: 0 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const project = (velocity: number, decelerationRate = 0.998) =>
  ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);

const rubberband = (overshoot: number, dimension: number, constant = 0.55) =>
  (overshoot * dimension * constant) /
  (dimension + constant * Math.abs(overshoot));

const bounded = (
  value: number,
  min: number,
  max: number,
  dimension: number,
) => {
  if (value < min) return min + rubberband(value - min, dimension);
  if (value > max) return max + rubberband(value - max, dimension);
  return value;
};

const usableBounds = (size: Size) => {
  const maxX = Math.max(MARGIN, window.innerWidth - size.width - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - size.height - MARGIN);
  return { minX: MARGIN, minY: MARGIN, maxX, maxY };
};

const coordsForPlacement = (placement: Placement, size: Size) => {
  const { minX, minY, maxX, maxY } = usableBounds(size);
  if (placement.edge === "left") {
    return { x: minX, y: clamp(placement.offset, minY, maxY) };
  }
  if (placement.edge === "right") {
    return { x: maxX, y: clamp(placement.offset, minY, maxY) };
  }
  if (placement.edge === "top") {
    return { x: clamp(placement.offset, minX, maxX), y: minY };
  }
  return { x: clamp(placement.offset, minX, maxX), y: maxY };
};

const nearestPlacement = (
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
  size: Size,
): Placement => {
  const projectedX = x + project(velocityX);
  const projectedY = y + project(velocityY);
  const { minX, minY, maxX, maxY } = usableBounds(size);
  const distances: Array<{ edge: Edge; distance: number }> = [
    { edge: "left", distance: Math.abs(projectedX - minX) },
    { edge: "right", distance: Math.abs(projectedX - maxX) },
    { edge: "top", distance: Math.abs(projectedY - minY) },
    { edge: "bottom", distance: Math.abs(projectedY - maxY) },
  ];
  const edge =
    distances.sort((a, b) => a.distance - b.distance)[0]?.edge ?? "right";

  return {
    edge,
    offset:
      edge === "left" || edge === "right"
        ? clamp(projectedY, minY, maxY)
        : clamp(projectedX, minX, maxX),
  };
};

const readPlacement = async (): Promise<Placement> => {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY] as Partial<Placement> | undefined;
  if (
    value &&
    typeof value.offset === "number" &&
    ["left", "right", "top", "bottom"].includes(String(value.edge))
  ) {
    return { edge: value.edge as Edge, offset: value.offset };
  }
  return { edge: "right", offset: 96 };
};

const writePlacement = (placement: Placement) => {
  void browser.storage.local.set({ [STORAGE_KEY]: placement });
};

const normalizeCounts = (counts?: Partial<TrailCounts>): TrailCounts => ({
  click: counts?.click ?? 0,
  input: counts?.input ?? 0,
  console: counts?.console ?? 0,
  net: counts?.net ?? 0,
});

const formatElapsed = (startedAt?: number, now = Date.now()) => {
  if (!startedAt) return "00:00";
  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

function RecordingOverlay() {
  const [status, setStatus] = React.useState<OverlayStatus>({
    recording: false,
    counts: ZERO_COUNTS,
  });
  const [now, setNow] = React.useState(Date.now());
  const [placement, setPlacement] = React.useState<Placement>({
    edge: "right",
    offset: 96,
  });
  const [positioned, setPositioned] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const sizeRef = React.useRef<Size>({ width: 232, height: 108 });
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

    const refresh = async () => {
      const response = await browser.runtime
        .sendMessage({ type: MSG_OVERLAY_STATUS })
        .catch(() => null);
      if (disposed || !response) return;
      setStatus({
        recording: response.recording === true,
        counts: normalizeCounts(response.counts),
        startedAt:
          typeof response.startedAt === "number"
            ? response.startedAt
            : undefined,
      });
    };

    void refresh();
    const interval = window.setInterval(refresh, 450);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    if (!status.recording) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [status.recording]);

  React.useLayoutEffect(() => {
    if (!status.recording || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    sizeRef.current = { width: rect.width, height: rect.height };
    applyPlacement(placement, { x: 0, y: 0 }, !positioned);
  }, [applyPlacement, placement, positioned, status.recording]);

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
      className="trail-overlay rr-block"
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
          {formatElapsed(status.startedAt, now)}
        </span>
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
          transition={numberTransition}
        />
        <Metric
          label="Inputs"
          value={status.counts.input}
          transition={numberTransition}
        />
        <Metric
          label="Issues"
          value={status.counts.console + status.counts.net}
          transition={numberTransition}
        />
      </div>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  transition,
}: {
  label: string;
  value: number;
  transition: { stiffness: number; damping: number; mass: number };
}) {
  return (
    <span className="trail-overlay__metric">
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

const styles = `
  :host {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    pointer-events: none;
    color-scheme: dark;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  .trail-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 232px;
    pointer-events: auto;
    touch-action: none;
    user-select: none;
    cursor: grab;
    isolation: isolate;
    border: 1px solid rgba(255, 138, 31, 0.36);
    border-radius: 18px;
    background:
      radial-gradient(circle at 18% 0%, rgba(255, 138, 31, 0.12), transparent 34%),
      linear-gradient(180deg, rgba(24, 24, 24, 0.94), rgba(8, 8, 8, 0.98)),
      #050505;
    box-shadow:
      0 18px 48px rgba(0, 0, 0, 0.34),
      0 0 0 1px rgba(255, 106, 0, 0.06) inset;
    backdrop-filter: blur(20px) saturate(155%);
    color: #fff7ed;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: 11px 12px 12px;
    will-change: transform;
  }

  .trail-overlay::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 26%),
      linear-gradient(90deg, rgba(255, 138, 31, 0.08), transparent 26% 74%, rgba(255, 106, 0, 0.06));
    mix-blend-mode: screen;
    opacity: 0.72;
  }

  .trail-overlay:active {
    cursor: grabbing;
  }

  .trail-overlay__top {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
    font-size: 10px;
    line-height: 1;
    letter-spacing: 0.1em;
    color: #ff8a1f;
  }

  .trail-overlay__rec {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    border-radius: 999px;
    background: transparent;
    padding: 0;
    text-transform: uppercase;
    font-weight: 700;
  }

  .trail-overlay__live {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #ff6a00;
    box-shadow:
      0 0 0 3px rgba(255, 106, 0, 0.16),
      0 0 14px rgba(255, 106, 0, 0.72);
  }

  .trail-overlay__time {
    color: rgba(255, 247, 237, 0.68);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    letter-spacing: 0;
    white-space: nowrap;
  }

  .trail-overlay__stop {
    appearance: none;
    border: 1px solid rgba(255, 77, 77, 0.58);
    background: rgba(18, 10, 10, 0.82);
    color: #ffb7b7;
    border-radius: 12px;
    padding: 5px 10px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 0 0 1px rgba(255, 77, 77, 0.08) inset;
    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      transform 140ms ease,
      color 140ms ease;
  }

  .trail-overlay__stop:hover {
    background: rgba(255, 77, 77, 0.14);
    border-color: rgba(255, 77, 77, 0.92);
    color: #ffd5d5;
  }

  .trail-overlay__stop:active {
    transform: translateY(1px);
  }

  .trail-overlay__stop:focus-visible {
    outline: 2px solid #ff4d4d;
    outline-offset: 2px;
  }

  .trail-overlay__total {
    display: flex;
    align-items: baseline;
    gap: 7px;
    margin-top: 10px;
  }

  .trail-overlay__total [data-slot="sliding-number"] {
    font-size: 38px;
    font-weight: 800;
    line-height: 0.92;
    letter-spacing: -0.04em;
    color: #fff7ed;
  }

  .trail-overlay__total > span:last-child {
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 138, 31, 0.88);
  }

  .trail-overlay__metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-top: 11px;
  }

  .trail-overlay__metric {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 5px;
    border: 1px solid rgba(255, 106, 0, 0.18);
    border-radius: 12px;
    background: rgba(5, 5, 5, 0.78);
    padding: 7px 7px 7px 8px;
    font-size: 10px;
    line-height: 1;
    color: rgba(255, 247, 237, 0.68);
  }

  .trail-overlay__metric [data-slot="sliding-number"] {
    color: #ff8a1f;
    font-size: 14px;
    font-weight: 760;
    letter-spacing: 0;
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: no-preference) {
    .trail-overlay__live {
      animation: trail-live-pulse 1.2s ease-in-out infinite;
    }
  }

  @keyframes trail-live-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }

  @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
    .trail-overlay {
      background: #050505;
      backdrop-filter: none;
      border-color: #ff8a1f;
    }
  }
`;

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
    style.textContent = styles;
    shadow.append(style, mount);
    document.documentElement.append(host);

    createRoot(mount).render(<RecordingOverlay />);
  },
});
