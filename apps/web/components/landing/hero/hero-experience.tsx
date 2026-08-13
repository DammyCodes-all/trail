"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TrailLogo } from "@/components/trail-logo";

const events = [
  { label: 'Clicked "Submit"', time: "00:04", tone: "bg-[#ff6a00]" },
  { label: "POST /api/submit", time: "00:05", tone: "bg-[#4a9eff]" },
  { label: "500 Internal Error", time: "00:05", tone: "bg-[#ff4d4f]" },
];

const introFragments = [
  {
    clipPath: "polygon(34% 0, 66% 0, 71% 36%, 32% 36%)",
    sweepClass: "rotate-[-55deg]",
    offsetClass: "translate-x-[225px]",
    flap: [22, -16, 10, 0],
  },
  {
    clipPath: "polygon(0 23%, 39% 23%, 40% 64%, 0 64%)",
    sweepClass: "rotate-[-135deg]",
    offsetClass: "translate-x-[200px]",
    flap: [-18, 13, -7, 0],
  },
  {
    clipPath: "polygon(61% 23%, 100% 23%, 100% 64%, 60% 64%)",
    sweepClass: "rotate-[55deg]",
    offsetClass: "translate-x-[200px]",
    flap: [-20, 14, -8, 0],
  },
  {
    clipPath: "polygon(10% 57%, 49% 57%, 49% 100%, 10% 100%)",
    sweepClass: "rotate-[135deg]",
    offsetClass: "translate-x-[230px]",
    flap: [18, -12, 7, 0],
  },
  {
    clipPath: "polygon(51% 57%, 90% 57%, 90% 100%, 51% 100%)",
    sweepClass: "rotate-[95deg]",
    offsetClass: "translate-x-[230px]",
    flap: [16, -11, 6, 0],
  },
];

function ArrowUpRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M3.5 12.5 12.5 3.5M6 3.5h6.5V10" />
    </svg>
  );
}

function IntroOverlay() {
  return (
    <div
      data-intro-overlay
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#08090a] motion-reduce:hidden"
    >
      <div data-intro-logo className="relative size-64 sm:size-72">
        <div
          data-intro-glow
          className="absolute -inset-12 rounded-full bg-[#ff6a00]/15 blur-3xl motion-safe:scale-90 motion-safe:opacity-0"
        />
        {introFragments.map((fragment) => (
          <div
            key={fragment.clipPath}
            data-intro-sweep
            className={`absolute inset-0 ${fragment.sweepClass}`}
          >
            <div
              data-intro-piece
              className={`absolute inset-0 scale-110 motion-safe:opacity-0 ${fragment.offsetClass}`}
              style={{ clipPath: fragment.clipPath }}
            >
              <TrailLogo className="size-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrowserScene() {
  return (
    <div
      data-hero-browser
      className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e10] text-left shadow-[0_24px_80px_rgba(0,0,0,0.45)] motion-safe:translate-y-8 motion-safe:opacity-0"
    >
      <div className="flex h-12 items-center justify-between border-b border-white/10 px-4 sm:px-5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="font-mono text-[10px] text-[#8b929c] sm:text-xs">
          playground.example.com
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[10px] font-medium text-[#f2f4f6] sm:text-xs">
          <span className="size-1.5 rounded-full bg-[#ff6a00]" />
          TRAIL REC
        </div>
      </div>

      <div className="grid min-h-[360px] grid-rows-[1fr_auto] sm:min-h-[430px]">
        <div className="relative flex min-h-[230px] items-center justify-center overflow-hidden px-5 py-10 sm:min-h-[290px]">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:28px_28px]"
          />
          <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#141618] p-5 sm:p-7">
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#626973]">
                  Code Playground
                </p>
                <p className="mt-1 text-sm font-medium text-[#f2f4f6]">
                  Submit a quick test
                </p>
              </div>
              <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-[#8b929c]">
                JS
              </span>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#08090a] px-3 py-3 font-mono text-xs text-[#8b929c]">
              <span className="text-[#626973]">1</span>
              <span className="ml-4 text-[#f2f4f6]">console</span>
              <span>.log(</span>
              <span className="text-[#30d158]">&quot;hello&quot;</span>
              <span>);</span>
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <p
                data-hero-error
                className="font-mono text-[10px] text-[#ff4d4f] motion-safe:translate-y-1 motion-safe:opacity-0"
              >
                Request failed: 500
              </p>
              <span
                data-hero-submit
                className="inline-flex min-h-10 items-center rounded-lg bg-[#ff6a00] px-4 text-sm font-semibold text-[#08090a]"
              >
                Submit
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#08090a] px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrailLogo size={17} aria-hidden="true" />
              <span className="font-mono text-xs font-medium tracking-wide text-[#f2f4f6]">
                TRAIL
              </span>
            </div>
            <span className="relative flex min-h-4 items-center font-mono text-[10px] sm:text-xs">
              <span data-hero-recording className="flex items-center gap-1.5 text-[#f2f4f6]">
                <span className="size-1.5 rounded-full bg-[#ff6a00]" />
                Recording
              </span>
              <span
                data-hero-captured
                className="absolute right-0 flex items-center gap-1.5 whitespace-nowrap text-[#30d158] motion-safe:opacity-0"
              >
                <span className="size-1.5 rounded-full bg-[#30d158]" />
                Trail captured
              </span>
            </span>
          </div>
          <ol className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            {events.map((event) => (
              <li
                key={event.label}
                data-hero-event
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0d0e10] px-3 py-2.5 motion-safe:translate-y-2 motion-safe:opacity-0"
              >
                <span className="flex min-w-0 items-center gap-2 font-mono text-[10px] text-[#f2f4f6] sm:text-xs">
                  <span className={`size-1.5 shrink-0 rounded-full ${event.tone}`} />
                  <span className="truncate">{event.label}</span>
                </span>
                <time className="shrink-0 font-mono text-[10px] text-[#626973]">
                  {event.time}
                </time>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function HeroExperience() {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let revertContext: (() => void) | undefined;
    let isCurrent = true;

    void import("gsap").then(({ gsap }) => {
      if (!isCurrent || !scope.current) {
        return;
      }

      const context = gsap.context(() => {
        const navMark = document.querySelector("[data-nav-logo]");
        const introLogo = scope.current?.querySelector("[data-intro-logo]");

        let flight: { x: number; y: number; scale: number } | undefined;
        if (navMark && introLogo) {
          const navRect = navMark.getBoundingClientRect();
          const logoRect = introLogo.getBoundingClientRect();
          flight = {
            x:
              navRect.left +
              navRect.width / 2 -
              (logoRect.left + logoRect.width / 2),
            y:
              navRect.top +
              navRect.height / 2 -
              (logoRect.top + logoRect.height / 2),
            scale: navRect.width / logoRect.width,
          };
        }

        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

        const sweeps = gsap.utils.toArray<HTMLElement>(
          scope.current.querySelectorAll("[data-intro-sweep]"),
        );
        const pieces = gsap.utils.toArray<HTMLElement>(
          scope.current.querySelectorAll("[data-intro-piece]"),
        );

        pieces.forEach((piece, index) => {
          const position = index * 0.08;
          timeline
            .to(
              piece,
              {
                keyframes: {
                  rotation: introFragments[index].flap,
                  easeEach: "power2.inOut",
                  durationEach: 0.16,
                },
              },
              position + 0.05,
            )
            .to(
              piece,
              { opacity: 1, duration: 0.4, ease: "power2.out" },
              position,
            )
            .to(
              piece,
              { x: 0, scale: 1, duration: 1.1, ease: "power2.in" },
              position,
            )
            .to(
              sweeps[index],
              { rotation: 0, duration: 1.15, ease: "power3.inOut" },
              position,
            );
        });

        timeline
          .addLabel("assembled")
          .to(
            "[data-intro-glow]",
            { opacity: 0.6, scale: 1.15, duration: 0.45, ease: "power2.out" },
            "assembled-=0.35",
          )
          .fromTo(
            "[data-intro-logo]",
            { scale: 1.03 },
            { scale: 1, duration: 0.3, ease: "back.out(2)" },
            "assembled+=0.2",
          )
          .to(
            "[data-intro-glow]",
            { opacity: 0, duration: 0.25, ease: "power2.out" },
            "assembled+=0.6",
          );

        if (flight) {
          timeline
            .to(
              "[data-intro-logo]",
              { ...flight, duration: 0.8, ease: "power3.inOut" },
              "assembled+=0.85",
            )
            .addLabel("landed");
        } else {
          timeline.addLabel("landed", "assembled+=0.85");
        }

        timeline
          .to(
            "[data-intro-overlay]",
            {
              duration: 0.45,
              opacity: 0,
              ease: "power2.out",
              onComplete: () => {
                document.body.style.overflow = previousOverflow;
              },
            },
            "landed-=0.05",
          )
          .to(
            "[data-intro-logo]",
            { duration: 0.4, opacity: 0, ease: "power2.out" },
            "landed+=0.05",
          )
          .to("[data-hero-kicker]", { duration: 0.45, opacity: 1, y: 0 }, "landed+=0.15")
          .to("[data-hero-title]", { duration: 0.6, opacity: 1, y: 0 }, "<0.08")
          .to("[data-hero-copy]", { duration: 0.45, opacity: 1, y: 0 }, "<0.1")
          .to("[data-hero-actions]", { duration: 0.4, opacity: 1, y: 0 }, "<0.06")
          .to("[data-hero-browser]", { duration: 0.7, opacity: 1, y: 0 }, "landed+=1.0")
          .to("[data-hero-submit]", { duration: 0.13, scale: 0.94, ease: "power2.in" }, "+=0.55")
          .to("[data-hero-submit]", { duration: 0.2, scale: 1, ease: "back.out(2)" })
          .to("[data-hero-error]", { duration: 0.32, opacity: 1, y: 0 }, "+=0.22")
          .to(
            "[data-hero-event]",
            { duration: 0.35, opacity: 1, y: 0, stagger: 0.28 },
            "<0.04",
          )
          .to("[data-hero-recording]", { duration: 0.18, opacity: 0 }, "<0.3")
          .to("[data-hero-captured]", { duration: 0.3, opacity: 1 }, "<0.04");
      }, scope);

      revertContext = () => context.revert();
    });

    return () => {
      isCurrent = false;
      revertContext?.();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      ref={scope}
      id="top"
      className="flex flex-1 flex-col items-center justify-center pb-8 pt-20 text-center sm:pt-24 lg:pt-28"
    >
      <IntroOverlay />
      <p
        data-hero-kicker
        className="mb-5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#ff8a1f] motion-safe:translate-y-3 motion-safe:opacity-0"
      >
        Browser evidence, captured
      </p>
      <h1
        data-hero-title
        className="max-w-4xl font-heading text-5xl font-bold leading-[0.98] tracking-[-0.045em] text-[#f2f4f6] motion-safe:translate-y-5 motion-safe:opacity-0 sm:text-7xl lg:text-[5.9rem]"
      >
        Every bug has a <span className="text-[#ff6a00]">trail.</span>
      </h1>
      <p
        data-hero-copy
        className="mt-7 max-w-xl text-base leading-7 text-[#8b929c] motion-safe:translate-y-3 motion-safe:opacity-0 sm:text-lg sm:leading-8"
      >
        <span className="font-medium text-[#f2f4f6]">Record what happened. Replay it. Report it.</span>
        <br />
        Without asking users to explain everything.
      </p>
      <div
        data-hero-actions
        className="mt-9 flex w-full flex-col justify-center gap-3 motion-safe:translate-y-3 motion-safe:opacity-0 sm:w-auto sm:flex-row"
      >
        <motion.a
          href="https://github.com/DammyCodes-all/trail"
          target="_blank"
          rel="noreferrer"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#ff6a00] px-5 text-sm font-semibold text-[#08090a] outline-none transition-colors hover:bg-[#ff8a1f] focus-visible:ring-2 focus-visible:ring-[#ff6a00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090a]"
        >
          Get TRAIL
          <ArrowUpRightIcon />
        </motion.a>
        <motion.a
          href="#how-it-works"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-5 text-sm font-medium text-[#f2f4f6] outline-none transition-colors hover:border-white/25 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[#ff6a00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090a]"
        >
          See how it works
          <span aria-hidden="true">↓</span>
        </motion.a>
      </div>

      <div className="mt-14 w-full sm:mt-16">
        <BrowserScene />
      </div>
    </div>
  );
}