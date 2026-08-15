"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { AntiMetalButton } from "@/components/ui/anti-metal-button";
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
        "[data-hero-kicker],[data-hero-title],[data-hero-copy],[data-hero-actions],[data-hero-browser]",
      );
      targets.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0px)";
      });
    };

    if (sessionStorage.getItem("trail-intro-played")) {
      hideOverlay();
      revealContent();
      window.dispatchEvent(new Event("trail:browser-revealed"));
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
          onBrowserRevealed: () => {
            window.dispatchEvent(new Event("trail:browser-revealed"));
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
      className="flex flex-1 flex-col items-center justify-center pb-8 pt-12 text-center sm:pt-14 lg:pt-16"
    >
      <IntroOverlay />
      <p
        data-hero-kicker
        className="mb-5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#ff8a1f] motion-safe:opacity-0"
      >
        NO SDK · NO INSTRUMENTATION
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
        No more chasing reporters for steps you&apos;ll never get.
        <br />
        Trail records the real thing, click by click, error by error,
        <br />
        and files it as a ready GitHub issue.
      </p>
      <div
        data-hero-actions
        className="mt-9 flex w-full flex-col justify-center gap-3 motion-safe:opacity-0 sm:w-auto sm:flex-row"
      >
<a
          href="https://github.com/DammyCodes-all/trail"
          target="_blank"
          rel="noreferrer"
        >
          <AntiMetalButton
            label="Record your first bug"
            accentFrom="#ff6a00"
            accentTo="#ff8a1f"
          />
        </a>
      </div>

      <div className="mt-14 w-full sm:mt-16">
        <BrowserScene />
      </div>
    </div>
  );
}
