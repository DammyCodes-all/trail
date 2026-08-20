"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useFaqSectionMotion() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const copyLines = Array.from(
          section.querySelectorAll<HTMLElement>("[data-faq-copy]"),
        );
        const accordion = section.querySelector<HTMLElement>("[data-faq-accordion]");

        if (copyLines.length) gsap.set(copyLines, { autoAlpha: 0, y: 12 });
        if (accordion) gsap.set(accordion, { autoAlpha: 0, y: 14 });

        const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
        if (copyLines.length)
          tl.to(copyLines, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08 }, 0);
        if (accordion)
          tl.to(accordion, { autoAlpha: 1, y: 0, duration: 0.55 }, 0.22);

        let hasPlayed = false;
        const play = () => {
          if (hasPlayed) return;
          hasPlayed = true;
          tl.play(0);
        };
        const st = ScrollTrigger.create({
          trigger: section,
          start: "top 88%",
          once: true,
          onEnter: play,
        });
        if (st.isActive || st.progress > 0) play();
      }, section);

      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  return root;
}
