"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LitCell = {
  id: number;
  x: number;
  y: number;
  opacity: number;
};

const CELL = 12;
const SPAWN_DISTANCE = 8;
const MAX_OPACITY = 0.12;
const FADE_SPEED = 0.006;
const MAX_CELLS = 30;

/**
 * Cursor-reactive hero background: grid cells light up faintly as the cursor
 * passes over them, then fade out. Snapped to a 12px lattice (a subdivision of
 * the 24px hero grid) so the lit boxes stay tight under the cursor. Pure rAF +
 * React state — no GSAP, Lenis, or Framer Motion involvement; it never touches
 * content elements.
 */
export function GridGlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cells, setCells] = useState<LitCell[]>([]);
  const idRef = useRef(0);
  const lastRef = useRef({ x: -Infinity, y: -Infinity });

  const spawn = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / CELL) * CELL;
    const y = Math.floor((clientY - rect.top) / CELL) * CELL;
    if (Math.hypot(x - lastRef.current.x, y - lastRef.current.y) < SPAWN_DISTANCE) {
      return;
    }
    lastRef.current = { x, y };
    setCells((prev) => [
      ...prev.slice(-(MAX_CELLS - 1)),
      { id: idRef.current++, x, y, opacity: MAX_OPACITY },
    ]);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const onMove = (e: MouseEvent) => spawn(e.clientX, e.clientY);
    window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    const tick = () => {
      setCells((prev) =>
        prev
          .map((cell) => ({ ...cell, opacity: cell.opacity - FADE_SPEED }))
          .filter((cell) => cell.opacity > 0),
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [spawn]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {cells.map((cell) => (
        <div
          key={cell.id}
          className="absolute bg-white"
          style={{
            left: cell.x,
            top: cell.y,
            width: CELL,
            height: CELL,
            opacity: cell.opacity,
          }}
        />
      ))}
    </div>
  );
}