"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useSiteFooterMotion() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const footer = root.current;
    if (!footer) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const brand = footer.querySelector<HTMLElement>("[data-footer-brand]");
        const links = Array.from(footer.querySelectorAll<HTMLElement>("[data-footer-link]"));

        if (brand) gsap.set(brand, { autoAlpha: 0, x: -10 });
        if (links.length) gsap.set(links, { autoAlpha: 0, y: 6 });

        const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
        if (brand) tl.to(brand, { autoAlpha: 1, x: 0, duration: 0.45 }, 0);
        if (links.length) tl.to(links, { autoAlpha: 1, y: 0, duration: 0.32, stagger: 0.07 }, 0.12);

        let hasPlayed = false;
        const play = () => {
          if (hasPlayed) return;
          hasPlayed = true;
          tl.play(0);
        };
        const st = ScrollTrigger.create({
          trigger: footer,
          start: "top 98%",
          once: true,
          onEnter: play,
        });
        if (st.isActive || st.progress > 0) play();
      }, footer);

      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  return root;
}
