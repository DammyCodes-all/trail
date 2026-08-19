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
        const trailTint = section.querySelector<HTMLElement>(
          "[data-trail-tint]",
        );
        const columnHeadings = Array.from(
          section.querySelectorAll<HTMLElement>("[data-column-heading]"),
        );
        const rowCells = Array.from(
          section.querySelectorAll<HTMLElement>("[data-row-cell]"),
        );
        const payoff = section.querySelector<HTMLElement>("[data-payoff]");
        const payoffDot = section.querySelector<HTMLElement>(
          "[data-payoff-dot]",
        );

        if (
          !copy ||
          !panel ||
          !trailTint ||
          columnHeadings.length === 0 ||
          rowCells.length === 0 ||
          !payoff
        ) {
          return;
        }

        gsap.set(copy, { autoAlpha: 0, y: 14 });
        gsap.set(panel, { autoAlpha: 0, y: 18 });
        gsap.set(trailTint, { autoAlpha: 0 });
        gsap.set(columnHeadings, { autoAlpha: 0, y: 8 });
        gsap.set(rowCells, { autoAlpha: 0, y: 8 });
        gsap.set(payoff, { autoAlpha: 0, y: 8 });
        if (payoffDot) {
          gsap.set(payoffDot, {
            autoAlpha: 0,
            scale: 0.5,
            transformOrigin: "50% 50%",
          });
        }

        const timeline = gsap.timeline({
          paused: true,
          defaults: { ease: "power2.out" },
        });
        timeline
          .to(copy, { autoAlpha: 1, y: 0, duration: 0.32 }, 0)
          .to(panel, { autoAlpha: 1, y: 0, duration: 0.38 }, 0.14)
          .to(trailTint, { autoAlpha: 1, duration: 0.5 }, 0.2)
          .to(
            columnHeadings,
            { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.05 },
            0.4,
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
          const otherCell = cells[0];
          const trailCell = cells[1];
          const rowStart = 0.5 + rowNumber * 0.085;

          if (trailCell) {
            timeline.to(
              trailCell,
              { autoAlpha: 1, y: 0, duration: 0.12 },
              rowStart,
            );
          }
          if (otherCell) {
            timeline.to(
              otherCell,
              { autoAlpha: 1, y: 0, duration: 0.18 },
              rowStart + 0.06,
            );
          }
        });

        timeline.to(
          payoff,
          { autoAlpha: 1, y: 0, duration: 0.22 },
          0.95,
        );
        if (payoffDot) {
          timeline.to(
            payoffDot,
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.15,
              ease: "back.out(2)",
            },
            1.05,
          );
        }

        createOnceTrigger(section, "top 80%", timeline);
      }, section);

      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  return root;
}