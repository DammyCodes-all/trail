"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Beta hero motion: short staggered entrance for the copy block and the
 * extensions mockup. Plays on mount; under reduced motion nothing runs and
 * the static render is fully visible.
 */
export function useBetaHeroMotion() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const lines = Array.from(
          section.querySelectorAll<HTMLElement>("[data-beta-hero]"),
        );
        if (!lines.length) return;

        gsap.set(lines, { autoAlpha: 0, y: 12 });
        gsap
          .timeline({ defaults: { ease: "power2.out" } })
          .to(lines, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08 }, 0);
      }, section);
      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  return root;
}
