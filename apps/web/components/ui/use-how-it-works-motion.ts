"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Motion for the /beta install-trail stage. GSAP owns the card entrances:
 * each card rises individually when it scrolls into view (per-card trigger,
 * once per visit) so stacked mobile layouts don't wait on offscreen siblings.
 * The connector line is owned by Framer Motion inside how-it-works.tsx —
 * one owner per element.
 *
 * Reduced motion / no JS: these sets live inside the no-preference branch,
 * so the static render keeps every card visible.
 */
export function useHowItWorksMotion() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-hiw-card]", el);
        if (!cards.length) return;

        for (const card of cards) {
          gsap.set(card, { autoAlpha: 0, y: 24 });

          let played = false;
          const play = () => {
            if (played) return;
            played = true;
            gsap.to(card, {
              autoAlpha: 1,
              y: 0,
              duration: 0.6,
              ease: "power2.out",
            });
          };

          const scrollTrigger = ScrollTrigger.create({
            trigger: card,
            start: "top 70%",
            once: true,
            onEnter: play,
          });
          if (scrollTrigger.isActive || scrollTrigger.progress > 0) play();
        }
      }, el);
      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  return root;
}
