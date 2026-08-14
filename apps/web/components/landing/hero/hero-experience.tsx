"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { TrailLogo } from "@/components/trail-logo";

const events = [
  { label: 'Clicked "Submit"', time: "00:04", tone: "bg-[#ff6a00]" },
  { label: "POST /api/submit", time: "00:05", tone: "bg-[#4a9eff]" },
  { label: "500 Internal Error", time: "00:05", tone: "bg-[#ff4d4f]" },
];

type IntroFragment = {
  id: string;
  clipPath: string;
  spreadX: number;
  spreadY: number;
  tiltX: number;
  tiltY: number;
};

const introFragments: IntroFragment[] = [
  {
    id: "top",
    clipPath: "polygon(34% 0, 66% 0, 71% 36%, 32% 36%)",
    spreadX: 0,
    spreadY: -0.45,
    tiltX: -8,
    tiltY: 0,
  },
  {
    id: "upper-left",
    clipPath: "polygon(0 21%, 39% 21%, 40% 64%, 0 64%)",
    spreadX: -0.5,
    spreadY: -0.28,
    tiltX: -6,
    tiltY: 6,
  },
  {
    id: "upper-right",
    clipPath: "polygon(61% 21%, 100% 21%, 100% 64%, 60% 64%)",
    spreadX: 0.5,
    spreadY: -0.28,
    tiltX: 6,
    tiltY: -6,
  },
  {
    id: "bottom-left",
    clipPath: "polygon(0 57%, 49% 57%, 49% 100%, 0 100%)",
    spreadX: -0.38,
    spreadY: 0.42,
    tiltX: -4,
    tiltY: 8,
  },
  {
    id: "bottom-right",
    clipPath: "polygon(51% 57%, 100% 57%, 100% 100%, 51% 100%)",
    spreadX: 0.38,
    spreadY: 0.42,
    tiltX: 4,
    tiltY: -8,
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
      <div
        data-intro-logo
        className="relative size-64 sm:size-72"
        style={{ perspective: 1000 }}
      >
        <div
          data-intro-glow
          className="absolute -inset-12 rounded-full bg-[#ff6a00]/15 blur-3xl motion-safe:opacity-0"
        />
        {introFragments.map((fragment) => (
          <div
            key={fragment.id}
            data-intro-piece
            className="absolute inset-0 motion-safe:opacity-0"
            style={{ clipPath: fragment.clipPath }}
          >
            <TrailLogo className="size-full" />
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
      className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e10] text-left shadow-[0_24px_80px_rgba(0,0,0,0.45)] motion-safe:opacity-0"
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
                className="font-mono text-[10px] text-[#ff4d4f] motion-safe:opacity-0"
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
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0d0e10] px-3 py-2.5 motion-safe:opacity-0"
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

    const rootEl = scope.current;
    if (!rootEl) {
      return;
    }

    const hideOverlay = () => {
      const overlay = document.querySelector("[data-intro-overlay]");
      if (overlay instanceof HTMLElement) {
        overlay.style.display = "none";
      }
    };

    const revealContent = () => {
      const targets = rootEl.querySelectorAll<HTMLElement>(
        "[data-hero-kicker],[data-hero-title],[data-hero-copy],[data-hero-actions],[data-hero-browser],[data-hero-error],[data-hero-event],[data-hero-captured]",
      );
      targets.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0px)";
      });
    };

    if (sessionStorage.getItem("trail-intro-played")) {
      hideOverlay();
      revealContent();
      return;
    }
    sessionStorage.setItem("trail-intro-played", "1");

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let revertContext: (() => void) | undefined;

    const finishIntro = () => {
      window.clearTimeout(watchdog);
      document.body.style.overflow = previousOverflow;
      hideOverlay();
      revealContent();
    };

    const watchdog = window.setTimeout(finishIntro, 7000);

    try {
      const context = gsap.context(() => {
            const navMark = document.querySelector("[data-nav-logo]");
            const introLogo = rootEl.querySelector("[data-intro-logo]");

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

            const pieces = gsap.utils.toArray<HTMLElement>(
              rootEl.querySelectorAll("[data-intro-piece]"),
            );

            pieces.forEach((piece, index) => {
              const fragment = introFragments[index];
              timeline.set(
                piece,
                {
                  x: fragment.spreadX * window.innerWidth,
                  y: fragment.spreadY * window.innerHeight,
                  rotationX: fragment.tiltX,
                  rotationY: fragment.tiltY,
                  scale: 1.12,
                  opacity: 0,
                },
                0,
              );
            });

            timeline.to(
              pieces,
              { opacity: 1, duration: 0.4, ease: "power2.out", stagger: 0.04 },
              0,
            );

            timeline.fromTo(
              "[data-intro-logo]",
              { rotation: 720 },
              { rotation: 0, duration: 2.6, ease: "power3.inOut" },
              0.05,
            );

            timeline.to(
              pieces,
              {
                x: 0,
                y: 0,
                rotationX: 0,
                rotationY: 0,
                scale: 1,
                duration: 2.6,
                ease: "power2.out",
                stagger: 0.05,
              },
              0.05,
            );

            timeline
              .to(
                "[data-intro-logo]",
                { scale: 1.03, duration: 0.15, ease: "power2.out" },
                2.9,
              )
              .to(
                "[data-intro-logo]",
                { scale: 1, duration: 0.3, ease: "back.out(1.4)" },
                3.05,
              );

            timeline
              .addLabel("assembled")
              .fromTo(
                "[data-intro-glow]",
                { scale: 0.9 },
                { opacity: 0.6, scale: 1.25, duration: 0.6, ease: "power2.out" },
                "assembled-=0.35",
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
                  { ...flight, duration: 1, ease: "power3.inOut" },
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
                    window.clearTimeout(watchdog);
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
              .fromTo(
                "[data-hero-kicker]",
                { y: 12 },
                { y: 0, opacity: 1, duration: 0.45 },
                "landed+=0.15",
              )
              .fromTo(
                "[data-hero-title]",
                { y: 20 },
                { y: 0, opacity: 1, duration: 0.6 },
                "<0.08",
              )
              .fromTo(
                "[data-hero-copy]",
                { y: 12 },
                { y: 0, opacity: 1, duration: 0.45 },
                "<0.1",
              )
              .fromTo(
                "[data-hero-actions]",
                { y: 12 },
                { y: 0, opacity: 1, duration: 0.4 },
                "<0.06",
              )
              .fromTo(
                "[data-hero-browser]",
                { y: 32 },
                { y: 0, opacity: 1, duration: 0.7 },
                "landed+=1.0",
              )
              .to("[data-hero-submit]", { duration: 0.13, scale: 0.94, ease: "power2.in" }, "+=0.55")
              .to("[data-hero-submit]", { duration: 0.2, scale: 1, ease: "back.out(2)" })
              .fromTo(
                "[data-hero-error]",
                { y: 4 },
                { y: 0, opacity: 1, duration: 0.32 },
                "+=0.22",
              )
              .fromTo(
                "[data-hero-event]",
                { y: 8 },
                { y: 0, opacity: 1, duration: 0.35, stagger: 0.28 },
                "<0.04",
              )
              .to("[data-hero-recording]", { duration: 0.18, opacity: 0 }, "<0.3")
              .to("[data-hero-captured]", { duration: 0.3, opacity: 1 }, "<0.04");
          }, scope);

          revertContext = () => context.revert();
        } catch (error) {
          console.error("Intro animation failed:", error);
          finishIntro();
        }

    return () => {
      window.clearTimeout(watchdog);
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
        className="mb-5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#ff8a1f] motion-safe:opacity-0"
      >
        Browser evidence, captured
      </p>
      <h1
        data-hero-title
        className="max-w-4xl font-heading text-5xl font-bold leading-[0.98] tracking-[-0.045em] text-[#f2f4f6] motion-safe:opacity-0 sm:text-7xl lg:text-[5.9rem]"
      >
        Every bug has a <span className="text-[#ff6a00]">trail.</span>
      </h1>
      <p
        data-hero-copy
        className="mt-7 max-w-xl text-base leading-7 text-[#8b929c] motion-safe:opacity-0 sm:text-lg sm:leading-8"
      >
        <span className="font-medium text-[#f2f4f6]">Record what happened. Replay it. Report it.</span>
        <br />
        Without asking users to explain everything.
      </p>
      <div
        data-hero-actions
        className="mt-9 flex w-full flex-col justify-center gap-3 motion-safe:opacity-0 sm:w-auto sm:flex-row"
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