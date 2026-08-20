"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useClosingCtaSectionMotion() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const logo = section.querySelector<HTMLElement>("[data-cta-logo]");
        const headline = section.querySelector<HTMLElement>("[data-cta-headline]");
        const sub = section.querySelector<HTMLElement>("[data-cta-sub]");
        const action = section.querySelector<HTMLElement>("[data-cta-action]");
        const links = section.querySelector<HTMLElement>("[data-cta-links]");

        if (!headline) return;

        if (logo) gsap.set(logo, { autoAlpha: 0, scale: 0.88, transformOrigin: "50% 50%" });
        gsap.set(headline, { autoAlpha: 0, y: 18 });
        if (sub) gsap.set(sub, { autoAlpha: 0, y: 12 });
        if (action) gsap.set(action, { autoAlpha: 0, y: 14, scale: 0.97, transformOrigin: "50% 50%" });
        if (links) gsap.set(links, { autoAlpha: 0, y: 8 });

        const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });

        if (logo) tl.to(logo, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(1.2)" }, 0);
        tl.to(headline, { autoAlpha: 1, y: 0, duration: 0.62 }, 0.12);
        if (sub) tl.to(sub, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.28);
        if (action) tl.to(action, { autoAlpha: 1, y: 0, scale: 1, duration: 0.52, ease: "back.out(1.1)" }, 0.42);
        if (links) tl.to(links, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.62);

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
