"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function createOnceTrigger(
  trigger: Element,
  start: string,
  timeline: gsap.core.Timeline,
) {
  let hasPlayed = false;
  const play = () => {
    if (hasPlayed) {
      return;
    }

    hasPlayed = true;
    timeline.play(0);
  };

  const scrollTrigger = ScrollTrigger.create({
    trigger,
    start,
    once: true,
    onEnter: play,
  });

  if (scrollTrigger.isActive || scrollTrigger.progress > 0) {
    play();
  }
}

export function useSetupSectionMotion() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section) {
      return;
    }

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const copy = section.querySelector<HTMLElement>("[data-copy]");
        const panel = section.querySelector<HTMLElement>("[data-panel]");
        const trailSurface = section.querySelector<HTMLElement>(
          "[data-trail-surface]",
        );
        const columnHeadings = Array.from(
          section.querySelectorAll<HTMLElement>("[data-column-heading]"),
        );
        const rowCells = Array.from(
          section.querySelectorAll<HTMLElement>("[data-row-cell]"),
        );
        const payoff = section.querySelector<HTMLElement>("[data-payoff]");

        if (
          !copy ||
          !panel ||
          !trailSurface ||
          columnHeadings.length === 0 ||
          rowCells.length === 0 ||
          !payoff
        ) {
          return;
        }

        gsap.set(copy, { autoAlpha: 0, y: 14 });
        gsap.set(panel, { autoAlpha: 0, y: 18 });
        gsap.set(trailSurface, { autoAlpha: 0, x: 10 });
        gsap.set(columnHeadings, { autoAlpha: 0, y: 8 });
        gsap.set(rowCells, { autoAlpha: 0, y: 8 });
        gsap.set(payoff, { autoAlpha: 0, y: 8 });

        const timeline = gsap.timeline({
          paused: true,
          defaults: { ease: "power2.out" },
        });
        timeline
          .to(copy, { autoAlpha: 1, y: 0, duration: 0.35 }, 0)
          .to(panel, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.16)
          .to(
            trailSurface,
            { autoAlpha: 1, x: 0, duration: 0.3 },
            0.24,
          )
          .to(
            columnHeadings,
            { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.04 },
            0.42,
          );

        const rowIndexes = Array.from(
          new Set(
            rowCells
              .map((cell) => cell.dataset.rowIndex)
              .filter((index): index is string => Boolean(index)),
          ),
        );
        rowIndexes.forEach((index, rowNumber) => {
          const cells = rowCells.filter(
            (cell) => cell.dataset.rowIndex === index,
          );
          timeline.to(
            cells,
            { autoAlpha: 1, y: 0, duration: 0.18, stagger: 0.02 },
            0.48 + rowNumber * 0.06,
          );
        });

        timeline
          .to(payoff, { autoAlpha: 1, y: 0, duration: 0.25 }, 0.78);

        createOnceTrigger(section, "top 80%", timeline);
      }, section);

      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  return root;
}