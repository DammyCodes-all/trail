"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Beta hero motion: staged entrance for copy, CTA, and the extensions mockup.
 * Stage order (and the mockup's slight scale) is declared per element via
 * data-beta-hero values; the connector arrow fades in once the mockup lands
 * (opacity only — CSS owns its marching-dash animation).
 *
 * Reduced motion / no JS: these sets live inside the no-preference branch,
 * so the static render keeps everything visible.
 */
export function useBetaHeroMotion() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        // [selector, from-vars, position] — groups missing from the DOM are skipped
        const stages: Array<
          [string, gsap.TweenVars, number]
        > = [
          ['[data-beta-hero="eyebrow"]', { y: 12 }, 0],
          ['[data-beta-hero="headline"]', { y: 14 }, 0.05],
          ['[data-beta-hero="sub"]', { y: 12 }, 0.12],
          ['[data-beta-hero="cta"]', { y: 10 }, 0.18],
          [
            '[data-beta-hero="mockup"]',
            { y: 24, scale: 0.98 },
            0.22,
          ],
          ['[data-beta-hero="meta"]', { y: 8 }, 0.42],
        ];

        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        let any = false;
        for (const [selector, fromVars, position] of stages) {
          const els = section.querySelectorAll<HTMLElement>(selector);
          if (!els.length) continue;
          any = true;
          tl.fromTo(
            els,
            { autoAlpha: 0, ...fromVars },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.45 },
            position,
          );
        }

        const arrow = section.querySelector<HTMLElement>("[data-hero-arrow]");
        if (arrow) {
          any = true;
          tl.fromTo(
            arrow,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.3 },
            0.55,
          );
        }

        if (!any) return;
      }, section);
      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  return root;
}
