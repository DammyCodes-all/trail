"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
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
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

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
    draggingRef.current = true;
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
  };

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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 bg-white/10"
        style={{ left: `${inset}%` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 z-10 grid h-9 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-sm border border-white/15 bg-[#141618] shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
        style={{ left: `${inset}%` }}
      >
        <GripVertical className="size-3.5 text-[#8b929c]" />
      </div>
    </div>
  );
}