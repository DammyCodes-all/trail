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
};

const ZERO_COUNTS: TrailCounts = { click: 0, input: 0, console: 0, net: 0 };

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
