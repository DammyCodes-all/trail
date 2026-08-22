"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Motion for the /beta report-bug section: icon leads, then headline, copy,
 * and CTA rise in. Plays once when scrolled into view.
 *
 * Reduced motion / no JS: these sets live inside the no-preference branch,
 * so the static render keeps everything visible.
 */
export function useReportBugMotion() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const icon = el.querySelector<HTMLElement>('[data-report="icon"]');
        const lines = gsap.utils.toArray<HTMLElement>(
          '[data-report="line"]',
          el,
        );
        const cta = el.querySelector<HTMLElement>('[data-report="cta"]');

        if (!icon && !lines.length && !cta) return;

        const tl = gsap.timeline({ paused: true });

        if (icon) {
          gsap.set(icon, { autoAlpha: 0, y: 16 });
          tl.to(
            icon,
            { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" },
            0,
          );
        }
        if (lines.length) {
          gsap.set(lines, { autoAlpha: 0, y: 18 });
          tl.to(
            lines,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.55,
              stagger: 0.06,
              ease: "power2.out",
            },
            0.12,
          );
        }
        if (cta) {
          gsap.set(cta, { autoAlpha: 0, y: 16 });
          tl.to(
            cta,
            { autoAlpha: 1, y: 0, duration: 0.55, ease: "power2.out" },
            lines.length ? 0.24 : 0.12,
          );
        }

        let hasPlayed = false;
        const play = () => {
          if (hasPlayed) return;
          hasPlayed = true;
          tl.play(0);
        };

        const scrollTrigger = ScrollTrigger.create({
          trigger: el,
          start: "top 70%",
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
