"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function createOnceTrigger(
  trigger: Element,
  start: string,
  timeline: gsap.core.Timeline,
) {
  let hasPlayed = false;
  const play = () => {
    if (hasPlayed) {
      return;
    }

    hasPlayed = true;
    timeline.play(0);
  };

  const scrollTrigger = ScrollTrigger.create({
    trigger,
    start,
    once: true,
    onEnter: play,
  });

  if (scrollTrigger.isActive || scrollTrigger.progress > 0) {
    play();
  }
}

export function useRedactionSectionMotion() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section) {
      return;
    }

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const copyLines = Array.from(
          section.querySelectorAll<HTMLElement>("[data-copy-line]"),
        );
        const mockup = section.querySelector<HTMLElement>("[data-mockup]");
        const log = section.querySelector<HTMLElement>("[data-log]");
        const scopeItems = Array.from(
          section.querySelectorAll<HTMLElement>("[data-scope-item]"),
        );
        const payoff = section.querySelector<HTMLElement>("[data-payoff]");
        const bars = Array.from(
          section.querySelectorAll<HTMLElement>("[data-redact-bar]"),
        );
        const glow = section.querySelector<HTMLElement>("[data-glow]");

        if (
          copyLines.length === 0 ||
          !mockup ||
          !log ||
          scopeItems.length === 0 ||
          !payoff
        ) {
          return;
        }

        if (glow) {
          gsap.fromTo(
            glow,
            { y: -60 },
            {
              y: 60,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "bottom top",
                scrub: 1.2,
              },
            },
          );
        }

        gsap.set(copyLines, { autoAlpha: 0, y: 16 });
        gsap.set(mockup, { autoAlpha: 0, y: 24 });
        gsap.set(log, { autoAlpha: 0, y: 12 });
        gsap.set(scopeItems, { autoAlpha: 0, y: 8 });
        gsap.set(payoff, { autoAlpha: 0, y: 14 });
        if (bars.length > 0) {
          gsap.set(bars, { scaleX: 0, transformOrigin: "left center" });
        }

        const timeline = gsap.timeline({
          paused: true,
          defaults: { ease: "power2.out" },
        });
        timeline
          .to(
            copyLines,
            { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.08 },
            0,
          )
          .to(mockup, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.42)
          .to(log, { autoAlpha: 1, y: 0, duration: 0.35 }, 0.58)
          .to(
            scopeItems,
            { autoAlpha: 1, y: 0, duration: 0.2, stagger: 0.06 },
            0.68,
          )
          .to(payoff, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.9)
          .fromTo(
            bars,
            { scaleX: 0, transformOrigin: "left center" },
            { scaleX: 1, duration: 0.45, stagger: 0.07 },
            1.3,
          );

        createOnceTrigger(section, "top 80%", timeline);
      }, section);

      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  return root;
}
