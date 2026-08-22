"use client";

import React from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useHowItWorksMotion } from "./use-how-it-works-motion";

export interface Step {
  title: string;
  description: string;
}

export interface HowItWorksProps {
  features?: Step[];
  className?: string;
}

const Pin = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z" />
  </svg>
);

const Card = ({
  number,
  title,
  description,
  rotate,
  className,
}: {
  number: string;
  title: string;
  description: string;
  rotate?: string;
  className?: string;
}) => (
  <div
    data-hiw-card
    className={`relative w-full max-w-[360px] md:absolute md:w-[280px] ${rotate} ${className ?? ""}`}
  >
    <div className="rounded-lg border border-white/10 bg-[#151719] p-2 shadow-[0_16px_48px_rgba(0,0,0,0.28)]">
      <Pin className="mx-auto mb-5 h-8 w-8 text-[#ff6a00]" />
      <div className="relative flex h-full flex-col overflow-hidden rounded-md border border-[#ff6a00]/25 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(255,106,0,0.12),rgba(255,106,0,0.03))] p-4">
        <span
          data-hiw-num
          className="mb-4 font-mono text-3xl font-medium tracking-[0.08em] text-[#ff6a00]"
        >
          {number}
        </span>
        <h3 className="mb-2 font-heading text-xl font-semibold leading-tight tracking-normal text-[#f2f4f6]">
          {title}
        </h3>
        <p className="text-sm leading-6 text-[#8b929c]">{description}</p>
      </div>
    </div>
    <style>{`
      [data-hiw-card] { transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1); }
      [data-hiw-card]:hover { z-index: 30; }
      @media (hover: hover) and (pointer: fine) {
        [data-hiw-card]:hover { transform: scale(1.04); }
      }
      @media (prefers-reduced-motion: reduce) {
        [data-hiw-card] { transition: none; }
      }
    `}</style>
  </div>
);

/**
 * Card layout as data so the connector path is derived from the same source.
 * `className` must stay a literal string — Tailwind's scanner cannot see
 * interpolated arbitrary-value classes. `top`/`offset` mirror those literals
 * for the path math; CARD_WIDTH matches md:w-[280px].
 */
const CARD_WIDTH = 280;
const CARD_ANCHOR_HEIGHT = 250;

type CardPlacement = {
  className: string;
  top: number;
  side: "left" | "right";
  offset: number;
  rotate: string;
};

const CARD_PLACEMENTS: CardPlacement[] = [
  {
    className: "md:top-0 md:left-[12%]",
    top: 0,
    side: "left",
    offset: 12,
    rotate: "-rotate-2",
  },
  {
    className: "md:top-[200px] md:right-[10%]",
    top: 200,
    side: "right",
    offset: 10,
    rotate: "rotate-3",
  },
  {
    className: "md:top-[400px] md:left-[12%]",
    top: 400,
    side: "left",
    offset: 12,
    rotate: "rotate-1",
  },
  {
    className: "md:top-[600px] md:right-[8%]",
    top: 600,
    side: "right",
    offset: 8,
    rotate: "-rotate-3",
  },
];

const STAGE_WIDTH = 1000;

function centerOf(placement: CardPlacement): { x: number; y: number } {
  const x =
    placement.side === "left"
      ? (placement.offset / 100) * STAGE_WIDTH + CARD_WIDTH / 2
      : STAGE_WIDTH - (placement.offset / 100) * STAGE_WIDTH - CARD_WIDTH / 2;
  return { x, y: placement.top + CARD_ANCHOR_HEIGHT / 2 };
}

/**
 * One dashed snake through every card center, in the reference component's
 * pattern: horizontal control points swing wide of each column so the line
 * swoops between rows instead of cutting straight across.
 */
function connectorPath(placements: CardPlacement[]): string {
  if (placements.length === 0) return "";
  const points = placements.map(centerOf);
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    const dir = to.x > from.x ? 1 : -1;
    d += ` C ${from.x + dir * 210} ${from.y}, ${to.x - dir * 160} ${to.y}, ${to.x} ${to.y}`;
  }
  return d;
}

const DEFAULT_FEATURES: Step[] = [
  {
    title: "Download",
    description: "One click, one zip. Nothing installed yet.",
  },
  {
    title: "Extract",
    description: "Unzip it wherever you like. Desktop works.",
  },
  {
    title: "Install",
    description:
      "Open chrome://extensions, flip on Developer mode, click Load unpacked, and pick the folder.",
  },
  {
    title: "Record",
    description:
      "Reproduce the bug once. TRAIL records the session while you do.",
  },
];

// Stage height by step count, matching the reference component's mapping.
function stageHeight(count: number): number {
  if (count <= 1) return 400;
  if (count === 2) return 450;
  if (count === 3) return 800;
  return 900;
}

export default function HowItWorks({
  features,
  className,
}: HowItWorksProps) {
  const root = useHowItWorksMotion();
  const reduceMotion = useReducedMotion();

  const data = features && features.length > 0 ? features : DEFAULT_FEATURES;
  // The beta page always shows four steps; fall back to the stock five-card
  // layout only if a future caller passes more than we have placements for.
  const placements = CARD_PLACEMENTS;
  const height = stageHeight(data.length);
  const pathD = connectorPath(
    placements.slice(0, Math.max(data.length, 2)),
  );

  return (
    <LazyMotion features={domAnimation}>
      <div
        ref={root}
        data-hiw-root
        className={`relative max-md:pb-10 max-md:pt-10 px-8 sm:py-16 ${className ?? ""}`}
      >
        <div className="relative z-10 mx-auto max-w-6xl">
          <div
            className="relative mx-auto flex h-auto w-full max-w-[1000px] flex-col gap-8 md:block md:h-[var(--md-height)]"
            style={{ "--md-height": `${height}px` } as React.CSSProperties}
          >
            {data.length > 1 && (
              <svg
                aria-hidden="true"
                viewBox={`0 0 ${STAGE_WIDTH} ${height}`}
                preserveAspectRatio="none"
                className="pointer-events-none absolute left-0 top-0 z-0 hidden size-full md:block text-neutral-300 dark:text-neutral-500"
              >
                <path
                  d={pathD}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.15"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="opacity-50"
                />
                {/* Flow layer, same anatomy as the problem-section connector
                    but in the reference component's neutral palette:
                    dasharray "6 16", offset -44 (two seamless cycles), 1.6s. */}
                <m.path
                  d={pathD}
                  fill="none"
                  stroke="currentColor"
                  className="text-white/55 motion-reduce:opacity-0"
                  strokeWidth="2.5"
                  strokeDasharray="6 16"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ strokeDashoffset: 0 }}
                  animate={
                    reduceMotion
                      ? { strokeDashoffset: 0 }
                      : { strokeDashoffset: -44 }
                  }
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 1.6, repeat: Infinity, ease: "linear" }
                  }
                />
              </svg>
            )}

            {data.map((step, index) => {
              const placement = placements[index % placements.length];
              return (
                <Card
                  key={step.title}
                  number={`0${index + 1}`}
                  title={step.title}
                  description={step.description}
                  rotate={placement.rotate}
                  className={placement.className}
                />
              );
            })}
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}
