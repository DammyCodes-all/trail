"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import {
  Check,
  Flag,
  MousePointer2,
  TextCursorInput,
  TriangleAlert,
} from "lucide-react";

/**
 * The trail — the hero's main event, drawn at hero-illustration scale.
 * One inverted throw-arc: calm high-left, the error breaks at the trough,
 * recovery climbs back to the glowing resolution. The stroke itself carries
 * the story — dim gray at the start, warming to orange at the end, dissolving
 * just past the final node. Five squircle badges sit along the curve,
 * escalating in size and richness toward the payoff. The line draws in once
 * after the copy settles, badges stamp in sequence, node 5 pulses and
 * everything rests. GSAP owns this scene; the intro overlay coordinates the
 * start via the `trail:browser-revealed` event.
 */

const TRAIL_PATH = "M 40 90 C 320 430, 880 430, 1160 90";

type TrailPoint = {
  id: string;
  fraction: number;
  fallback: { left: string; top: string };
  label: string;
  labelSide: "above" | "below";
  labelTone: "gray" | "amber";
  tipSide: "above" | "below";
  tip: string;
  kind: "muted" | "error" | "flag" | "report";
  glow?: { opacity: number };
};

const TRAIL_POINTS: TrailPoint[] = [
  {
    id: "click",
    fraction: 0.15,
    fallback: { left: "15%", top: "44%" },
    label: "click",
    labelSide: "above",
    labelTone: "gray",
    tipSide: "below",
    tip: 'click #23 · "Continue" button · 14:02:31',
    kind: "muted",
  },
  {
    id: "input",
    fraction: 0.3,
    fallback: { left: "30%", top: "61%" },
    label: "input",
    labelSide: "below",
    labelTone: "gray",
    tipSide: "above",
    tip: 'input #12 · "trail@x.dev" · email field · 9 chars',
    kind: "muted",
  },
  {
    id: "error",
    fraction: 0.5,
    fallback: { left: "50%", top: "69%" },
    label: "console.error",
    labelSide: "above",
    labelTone: "amber",
    tipSide: "below",
    tip: "Uncaught TypeError: add is not a function",
    kind: "error",
    glow: { opacity: 0.18 },
  },
  {
    id: "flag",
    fraction: 0.66,
    fallback: { left: "69%", top: "64%" },
    label: "flag",
    labelSide: "below",
    labelTone: "gray",
    tipSide: "above",
    tip: 'flag #7 · reporter: "pricing page broken" · 14:03:05',
    kind: "flag",
    glow: { opacity: 0.15 },
  },
  {
    id: "report",
    fraction: 0.86,
    fallback: { left: "86%", top: "43%" },
    label: "report generated",
    labelSide: "below",
    labelTone: "gray",
    tipSide: "above",
    tip: "trail-report.md · opened as GitHub issue #128",
    kind: "report",
    glow: { opacity: 0.22 },
  },
];

function TrailBadgeIcon({ point }: { point: TrailPoint }) {
  if (point.kind === "muted") {
    return point.id === "click" ? (
      <MousePointer2 className="size-[13px] text-[#7d8790]" strokeWidth={2} />
    ) : (
      <TextCursorInput className="size-[13px] text-[#7d8790]" strokeWidth={2} />
    );
  }
  if (point.kind === "error") {
    return <TriangleAlert className="size-5 text-white" strokeWidth={2} />;
  }
  if (point.kind === "flag") {
    return <Flag className="size-[22px] text-white" strokeWidth={2.2} />;
  }
  return <Check className="size-[26px] text-white" strokeWidth={2.5} />;
}

export function Trail() {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = scope.current;
    if (!scene) {
      return;
    }

    const line = scene.querySelector<SVGPathElement>("[data-trail-line]");
    if (!line) {
      return;
    }

    const positionNodes = () => {
      const length = line.getTotalLength();
      scene
        .querySelectorAll<HTMLElement>("[data-trail-node]")
        .forEach((node, index) => {
          const point = TRAIL_POINTS[index];
          if (!point) {
            return;
          }
          const { x, y } = line.getPointAtLength(length * point.fraction);
          node.style.left = `${((x / 1200) * 100).toFixed(3)}%`;
          node.style.top = `${((y / 500) * 100).toFixed(3)}%`;
        });
    };

    positionNodes();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const hideContext = gsap.context(() => {
      gsap.set(scene, { autoAlpha: 0 });
    }, scene);

    let runContext: gsap.Context | undefined;

    const run = () => {
      const length = line.getTotalLength();

      runContext = gsap.context(() => {
        const marks = gsap.utils.toArray<HTMLElement>(
          scene.querySelectorAll("[data-trail-mark]"),
        );
        const glows = gsap.utils.toArray<HTMLElement>(
          scene.querySelectorAll("[data-trail-glow]"),
        );
        const labels = gsap.utils.toArray<HTMLElement>(
          scene.querySelectorAll("[data-trail-label]"),
        );
        const reportMark = marks[marks.length - 1];
        const reportGlow = glows[glows.length - 1];

        gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });

        const timeline = gsap.timeline();
        timeline
          .set(scene, { autoAlpha: 1 }, 0)
          .set(marks, { scale: 0.6, opacity: 0 }, 0)
          .set(glows, { opacity: 0 }, 0)
          .set(labels, { opacity: 0 }, 0)
          .to(line, { strokeDashoffset: 0, duration: 1.1, ease: "none" }, 0)
          .to(
            marks,
            {
              scale: 1,
              opacity: 1,
              duration: 0.32,
              ease: "back.out(1.7)",
              stagger: 0.12,
            },
            "+=0.3",
          )
          .to(
            glows,
            {
              opacity: (_: number, el: Element) =>
                parseFloat(el.getAttribute("data-glow-opacity") ?? "0"),
              duration: 0.45,
              ease: "power2.out",
              stagger: 0.12,
            },
            "<0.05",
          )
          .fromTo(
            labels,
            { y: 4 },
            {
              y: 0,
              opacity: 1,
              duration: 0.24,
              ease: "power2.out",
              stagger: 0.12,
            },
            "<0.06",
          )
          .to(
            reportMark,
            { scale: 1.18, duration: 0.3, ease: "power2.out" },
            "+=0.25",
          )
          .to(
            reportGlow,
            { opacity: 0.45, duration: 0.3, ease: "power2.out" },
            "<",
          )
          .to(reportMark, { scale: 1, duration: 0.45, ease: "back.out(2.2)" })
          .to(
            reportGlow,
            { opacity: 0.22, duration: 0.5, ease: "power2.out" },
            "<",
          );
      }, scene);
    };

    let started = false;
    const start = () => {
      if (started) {
        return;
      }
      started = true;
      window.clearTimeout(fallback);
      run();
    };

    window.addEventListener("trail:browser-revealed", start, { once: true });
    const fallback = window.setTimeout(start, 6000);

    return () => {
      window.removeEventListener("trail:browser-revealed", start);
      window.clearTimeout(fallback);
      hideContext.revert();
      runContext?.revert();
    };
  }, []);

  return (
    <div
      ref={scope}
      data-trail-scene
      aria-hidden="true"
      className="pointer-events-none relative mx-auto mt-8 w-full sm:-mt-13"
      style={{ aspectRatio: "12 / 5" }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 500"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="trail-stroke"
            x1="0"
            y1="0"
            x2="1200"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#3f474f" />
            <stop offset="0.55" stopColor="#3f474f" />
            <stop offset="0.72" stopColor="#b06f35" />
            <stop offset="0.84" stopColor="#ff8a1f" />
            <stop offset="0.93" stopColor="#ff6a00" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ff6a00" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          data-trail-line
          d={TRAIL_PATH}
          className="fill-none"
          style={{
            stroke: "url(#trail-stroke)",
            strokeWidth: 3.5,
            strokeLinecap: "round",
          }}
        />
      </svg>

      {TRAIL_POINTS.map((point) => (
        <div
          key={point.id}
          data-trail-node
          className="trail-node pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: point.fallback.left, top: point.fallback.top }}
        >
          {point.glow ? (
            <span
              aria-hidden="true"
              data-trail-glow
              data-glow-opacity={point.glow.opacity}
              className={`trail-glow trail-glow--${point.id}`}
              style={{ opacity: point.glow.opacity }}
            />
          ) : null}
          <span
            data-trail-mark
            className={`trail-mark trail-mark--${point.id} will-change-transform`}
          >
            <TrailBadgeIcon point={point} />
          </span>
          <span
            data-trail-label
            className={`trail-label font-mono ${
              point.labelTone === "amber" ? "text-[#ffb066]" : "text-[#d6dbe1]"
            }`}
          >
            {point.label}
          </span>
          <div
            data-trail-tip
            className={`trail-tip trail-tip--${point.tipSide} font-mono`}
          >
            {point.tip}
          </div>
        </div>
      ))}

      <style>{`
        .trail-mark {
          display: grid;
          place-items: center;
          border-radius: 28%;
        }
        .trail-mark--click {
          width: 30px;
          height: 30px;
          background: #23282d;
          box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08);
        }
        .trail-mark--input {
          width: 30px;
          height: 30px;
          background: #23282d;
          box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08);
        }
        .trail-mark--error {
          width: 46px;
          height: 46px;
          background: linear-gradient(135deg, #ffc24b 0%, #ff8a1f 55%, #ff6a00 100%);
          box-shadow:
            inset 0 1px 0 rgb(255 255 255 / 0.32),
            inset 0 -1px 0 rgb(0 0 0 / 0.25);
        }
        .trail-mark--flag {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #ffa050 0%, #ff6a00 100%);
          box-shadow:
            inset 0 1px 0 rgb(255 255 255 / 0.28),
            inset 0 -1px 0 rgb(0 0 0 / 0.25);
        }
        .trail-mark--report {
          width: 62px;
          height: 62px;
          background: linear-gradient(135deg, #ff5f00 0%, #ff8a1f 45%, #ffb35c 100%);
          box-shadow:
            inset 0 1px 0 rgb(255 255 255 / 0.32),
            inset 0 -1px 0 rgb(0 0 0 / 0.25);
        }

        .trail-glow {
          position: absolute;
          left: 50%;
          top: 50%;
          translate: -50% -50%;
          border-radius: 9999px;
          pointer-events: none;
          will-change: opacity;
        }
        .trail-glow--error {
          width: 84px;
          height: 84px;
          background: #ff8a1f;
          filter: blur(22px);
        }
        .trail-glow--flag {
          width: 92px;
          height: 92px;
          background: #ff6a00;
          filter: blur(24px);
        }
        .trail-glow--report {
          width: 120px;
          height: 120px;
          background: #ff7a1a;
          filter: blur(28px);
        }

        .trail-label {
          position: absolute;
          left: 50%;
          translate: -50% 0;
          font-size: 11px;
          letter-spacing: 0.06em;
          white-space: nowrap;
          pointer-events: none;
        }
        @media (min-width: 640px) {
          .trail-label {
            font-size: 12px;
          }
        }
        .trail-label--above { bottom: calc(100% + 14px); }
        .trail-label--below { top: calc(100% + 14px); }

        .trail-tip {
          position: absolute;
          left: 50%;
          translate: -50% 0;
          transform: translateY(4px);
          opacity: 0;
          transition: opacity 150ms ease-out, transform 150ms ease-out;
          pointer-events: none;
          z-index: 10;
          background: #101316;
          border: 1px solid rgb(255 255 255 / 0.1);
          border-radius: 6px;
          padding: 5px 9px;
          font-size: 11px;
          letter-spacing: 0.02em;
          color: #a7adb5;
          white-space: nowrap;
        }
        .trail-tip--above { bottom: calc(100% + 18px); }
        .trail-tip--below { top: calc(100% + 18px); }

        @media (hover: hover) and (pointer: fine) {
          .trail-node:hover .trail-tip {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .trail-tip { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
