"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Motion for the /beta install section header ("Install in four steps" /
 * "Follow the trail.") and the address-bar row below HowItWorks. GSAP owns
 * these reveals (once per visit). The HowItWorks cards keep their own
 * internal motion hook — one owner per element.
 *
 * Reduced motion / no JS: these sets live inside the no-preference branch,
 * so the static render keeps everything visible.
 */
export function useInstallSectionMotion() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const heads = gsap.utils.toArray<HTMLElement>(
          "[data-install-head]",
          el,
        );
        const copyRow = el.querySelector<HTMLElement>("[data-install-copy]");

        if (!heads.length && !copyRow) return;

        if (heads.length) gsap.set(heads, { autoAlpha: 0, y: 22 });
        if (copyRow) gsap.set(copyRow, { autoAlpha: 0, y: 18 });

        const headTimeline = heads.length
          ? gsap
              .timeline({ paused: true })
              .to(
                heads,
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.6,
                  stagger: 0.07,
                  ease: "power2.out",
                },
                0,
              )
          : null;
        const copyTimeline = copyRow
          ? gsap
              .timeline({ paused: true })
              .to(
                copyRow,
                { autoAlpha: 1, y: 0, duration: 0.55, ease: "power2.out" },
                0,
              )
          : null;

        let headPlayed = false;
        let copyPlayed = false;
        const playHead = () => {
          if (headPlayed || !headTimeline) return;
          headPlayed = true;
          headTimeline.play(0);
        };
        const playCopyRow = () => {
          if (copyPlayed || !copyTimeline) return;
          copyPlayed = true;
          copyTimeline.play(0);
        };

        const headTrigger = ScrollTrigger.create({
          trigger: el,
          start: "top 72%",
          once: true,
          onEnter: playHead,
        });
        if (headTrigger.isActive || headTrigger.progress > 0) playHead();

        const copyTrigger = ScrollTrigger.create({
          trigger: copyRow ?? el,
          start: "top 74%",
          once: true,
          onEnter: playCopyRow,
        });
        if (copyTrigger.isActive || copyTrigger.progress > 0) playCopyRow();
      }, el);
      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  return root;
}
