"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  animate as motionAnimate,
  motion,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "motion/react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Drag-to-compare slider for two stacked layers. `base` sits underneath and
 * is visible left of the handle; `reveal` is clipped with `clip-path: inset`
 * and visible right of the handle. Unlike a fixed tab switch, every position
 * is controlled by the visitor — the gesture is the comparison.
 *
 * Pointer events with capture handle mouse and touch on one code path
 * (release outside the track still ends the drag); `touch-action: pan-y`
 * keeps vertical page scrolling on touch while horizontal drags go to the
 * slider. The track itself is the keyboard-accessible slider control.
 */

type ImageComparisonProps = {
  base: ReactNode;
  reveal: ReactNode;
  className?: string;
  initialInset?: number;
  label: string;
};

export function ImageComparison({
  base,
  reveal,
  className,
  initialInset = 50,
  label,
}: ImageComparisonProps) {
  const [inset, setInset] = useState<number>(initialInset);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const reduce = useReducedMotion();
  const canHover = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  )[0];
  const [hasWiggled, setHasWiggled] = useState(false);
  const wiggleControls = useRef<AnimationPlaybackControls | null>(null);

  const wiggle = () => {
    if (hasWiggled || reduce) {
      return;
    }
    setHasWiggled(true);
    wiggleControls.current = motionAnimate(
      inset,
      [inset, inset + 8, Math.max(4, inset - 6), inset],
      {
        duration: 0.9,
        ease: [0.34, 1.56, 0.64, 1],
        onUpdate: (v) => setInset(Math.min(100, Math.max(0, Math.round(v)))),
      },
    );
  };

  useEffect(() => () => wiggleControls.current?.stop(), []);

  const updateFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setInset(Math.min(100, Math.max(0, pct)));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    wiggleControls.current?.stop();
    draggingRef.current = true;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) {
      return;
    }
    updateFromClientX(e.clientX);
  };

  const stopDrag = () => {
    draggingRef.current = false;
    setDragging(false);
  };

  const handleScale = reduce ? 1 : dragging ? 1.2 : hovered ? 1.12 : 1;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 5;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setInset((v) => Math.max(0, v - step));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setInset((v) => Math.min(100, v + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setInset(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setInset(100);
    }
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(inset)}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onMouseEnter={() => {
        if (canHover) {
          setHovered(true);
        }
      }}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative w-full cursor-ew-resize touch-pan-y overflow-hidden rounded-lg outline-none select-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]",
        className,
      )}
    >
      {base}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${inset}%)` }}
      >
        {reveal}
      </div>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0"
        style={{ left: `${inset}%` }}
        animate={{ scale: handleScale }}
        transition={{ scale: { type: "spring", stiffness: 500, damping: 32 } }}
        viewport={{ once: true, amount: 0.5 }}
        onViewportEnter={wiggle}
      >
        <div className="absolute inset-y-0 w-px -translate-x-1/2 bg-white/10" />
        <div className="absolute top-1/2 z-10 grid h-9 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-sm border border-white/15 bg-[#141618] shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <GripVertical className="size-3.5 text-[#8b929c]" />
        </div>
      </motion.div>
    </div>
  );
}