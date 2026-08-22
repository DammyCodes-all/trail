"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Beta header motion: short fade-down on mount so the nav is usable almost
 * immediately. Under reduced motion nothing runs and the static render is
 * fully visible.
 */
export function useBetaHeaderMotion() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const els = Array.from(
          section.querySelectorAll<HTMLElement>("[data-beta-nav]"),
        );
        if (!els.length) return;

        gsap.set(els, { autoAlpha: 0, y: -8 });
        gsap
          .timeline({ defaults: { ease: "power2.out" } })
          .to(els, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.06 }, 0);
      }, section);
      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  return root;
}
