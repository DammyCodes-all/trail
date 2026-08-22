"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Motion for the /beta install-trail stage. GSAP owns the card entrances
 * (short staggered rise, once per visit). The connector line is owned by
 * Framer Motion inside how-it-works.tsx — one owner per element.
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

        gsap.set(cards, { autoAlpha: 0, y: 16 });

        const timeline = gsap.timeline({ paused: true });
        timeline.to(
          cards,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.08,
            ease: "power2.out",
          },
          0,
        );

        let hasPlayed = false;
        const play = () => {
          if (hasPlayed) return;
          hasPlayed = true;
          timeline.play(0);
        };

        const scrollTrigger = ScrollTrigger.create({
          trigger: el,
          start: "top 82%",
          once: true,
          onEnter: play,
        });
        if (scrollTrigger.isActive || scrollTrigger.progress > 0) play();
      }, el);
      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  return root;
}
