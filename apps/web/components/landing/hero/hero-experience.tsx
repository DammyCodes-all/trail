"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { AntiMetalButton } from "@/components/ui/anti-metal-button";
import { IntroOverlay } from "./intro-overlay";
import { ReportMockup } from "./report-mockup";

export function HeroExperience() {
  const scope = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const rootEl = scope.current;
    if (!rootEl) {
      return;
    }

    const overlay = rootEl.querySelector<HTMLElement>("[data-intro-overlay]");
    const introLogo = rootEl.querySelector<HTMLElement>("[data-intro-logo]");
    const introMark = rootEl.querySelector<HTMLElement>("[data-intro-mark]");
    const introPath = rootEl.querySelector<SVGPathElement>("[data-intro-path]");
    const wordmark = rootEl.querySelector<HTMLElement>("[data-intro-wordmark]");
    if (!overlay || !introLogo || !introMark || !introPath || !wordmark) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let removeScroll: (() => void) | undefined;

    const reportReady = () => {
      window.dispatchEvent(new Event("trail:report-revealed"));
    };

    const context = gsap.context(() => {
      let flight:
        | {
            mark: { x: number; y: number; scale: number };
            text: { x: number; y: number; scale: number };
          }
        | undefined;

      const measureFlight = () => {
        const navMark = document.querySelector<HTMLElement>("[data-nav-logo]");
        const navText =
          navMark?.parentElement?.querySelector<HTMLElement>("span");
        if (!navMark || !navText) {
          flight = undefined;
          return;
        }
        const navRect = navMark.getBoundingClientRect();
        const navTextRect = navText.getBoundingClientRect();
        const markRect = introMark.getBoundingClientRect();
        const wordmarkRect = wordmark.getBoundingClientRect();

        const fontSize =
          parseFloat(getComputedStyle(navText).fontSize) || 14;
        const scale = (fontSize * 778) / (1000 * wordmarkRect.height);
        const landingHeight = wordmarkRect.height * scale;

        const spanBaseline =
          navTextRect.top +
          (navTextRect.height - fontSize) / 2 +
          fontSize * 0.935;
        const landingTop = spanBaseline - landingHeight * (738 / 778);

        flight = {
          mark: {
            x:
              navRect.left +
              navRect.width / 2 -
              (markRect.left + markRect.width / 2),
            y:
              navRect.top +
              navRect.height / 2 -
              (markRect.top + markRect.height / 2),
            scale: navRect.width / markRect.width,
          },
          text: {
            x:
              navTextRect.left +
              navTextRect.width / 2 -
              (wordmarkRect.left + wordmarkRect.width / 2),
            y: landingTop + landingHeight / 2 - (wordmarkRect.top + wordmarkRect.height / 2),
            scale,
          },
        };
      };

      const heroLines = gsap.utils.toArray<HTMLElement>(
        rootEl.querySelectorAll("[data-hero-anim]"),
      );
      const introText = rootEl.querySelector<SVGPathElement>(
        "[data-intro-text]",
      );

      const timeline = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.out" },
      });

      if (reducedMotion || !introText) {
        timeline
          .to(overlay, { duration: 0.45, opacity: 0, ease: "power2.out" }, 0)
          .to(
            introLogo,
            { duration: 0.4, opacity: 0, ease: "power2.out" },
            0.15,
          )
          .set(overlay, { display: "none" }, 0.55)
          .call(reportReady, undefined, 0.6);
      } else {
        const draw = {
          duration: 2.1,
          ease: "easeInOut",
        } as const;
        const drawTargets = [introPath, introText];
        const strokeTargets: gsap.TweenVars = { strokeDasharray: "1 1" };
        const fillTargets: gsap.TweenVars = { fillOpacity: 1 };

        timeline
          .to(drawTargets, { ...strokeTargets, ...draw }, 0)
          .to(drawTargets, { ...fillTargets, ...draw }, 0)
          .to(
            drawTargets,
            {
              strokeWidth: 0.25,
              duration: 0.35,
              ease: "power1.inOut",
            },
            "assembled",
          );

        timeline.addLabel("assembled", 1.5);
        timeline.call(measureFlight, undefined, "assembled-=0.3");

        const markFlight = {
          x: () => flight?.mark.x ?? 0,
          y: () => flight?.mark.y ?? 0,
          scale: () => flight?.mark.scale ?? 1,
        };
        const textFlight = {
          x: () => flight?.text.x ?? 0,
          y: () => flight?.text.y ?? 0,
          scale: () => flight?.text.scale ?? 1,
        };

        timeline
          .to(
            introMark,
            { ...markFlight, duration: 1.05, ease: "power3.inOut" },
            "assembled-=0.25",
          )
          .to(
            wordmark,
            { ...textFlight, duration: 1.05, ease: "power3.inOut" },
            "assembled-=0.25",
          )
          .addLabel("landed", "assembled+=0.8");

        timeline
          .to(
            overlay,
            { duration: 0.5, opacity: 0, ease: "power2.out" },
            "landed-=0.05",
          )
          .to(
            introLogo,
            { duration: 0.4, opacity: 0, ease: "power2.out" },
            "landed+=0.05",
          )
          .fromTo(
            heroLines,
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              duration: 0.65,
              ease: "power2.out",
              stagger: 0.08,
            },
            "landed-=0.05",
          )
          .set(overlay, { display: "none" })
          .call(reportReady, undefined, "landed+=0.15");
      }

      let introPlayed = false;

      const startIntro = () => {
        if (introPlayed) {
          return;
        }
        introPlayed = true;
        gsap.set(overlay, { display: "flex", opacity: 1 });
        if (!reducedMotion) {
          gsap.set(introPath, {
            strokeDasharray: "0 1",
            strokeWidth: 14,
            fillOpacity: 0,
          });
          gsap.set(introText, {
            strokeDasharray: "0 1",
            strokeWidth: 28,
            fillOpacity: 0,
          });
        }
        timeline.play();
      };

      const onScroll = () => {
        if (introPlayed) {
          return;
        }
        if (window.scrollY <= 8) {
          startIntro();
        }
      };

      if (window.scrollY <= 8) {
        startIntro();
      } else {
        gsap.set(overlay, { display: "none" });
        reportReady();
        window.addEventListener("scroll", onScroll, { passive: true });
        removeScroll = () => window.removeEventListener("scroll", onScroll);
      }
    }, rootEl);

    return () => {
      removeScroll?.();
      context.revert();
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
        data-hero-anim
        className="mb-5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#ff8a1f]"
      >
        NO SDK · NO INSTRUMENTATION
      </p>
      <h1
        data-hero-anim
        className="max-w-4xl font-heading text-[clamp(1.75rem,7vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.045em] text-[#f2f4f6]"
      >
        Every bug leaves a <span className="text-[#ff6a00]">trail.</span>
      </h1>
      <p
        data-hero-anim
        className="mt-6 max-w-xl text-base leading-7 tracking-[-0.01em] text-[#8b929c] sm:text-lg sm:leading-8"
      >
        Stop chasing it. Trail follows it for you, click by click, error by
        error, straight into a GitHub issue.
      </p>
      <div
        data-hero-anim
        className="mt-11 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row"
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
      <ReportMockup />
    </div>
  );
}