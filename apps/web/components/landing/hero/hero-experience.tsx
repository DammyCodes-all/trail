"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { BrowserScene } from "./browser-scene";
import { IntroOverlay } from "./intro-overlay";
import { buildIntroTimeline } from "./intro-timeline";

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
        buildIntroTimeline(rootEl, {
          onOverlayFadeOut: () => {
            window.clearTimeout(watchdog);
            document.body.style.overflow = previousOverflow;
          },
        });
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
          <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </motion.a>
        <motion.a
          href="#how-it-works"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-5 text-sm font-medium text-[#f2f4f6] outline-none transition-colors hover:border-white/25 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[#ff6a00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090a]"
        >
          See how it works
          <ArrowDown className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </motion.a>
      </div>

      <div className="mt-14 w-full sm:mt-16">
        <BrowserScene />
      </div>
    </div>
  );
}