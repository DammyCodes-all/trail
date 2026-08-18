"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ORDER = ["replay", "interactions", "network", "console", "environment"];

export function useEvidenceSectionScroll() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section) {
      return;
    }

    const context = gsap.context(() => {
      const stage = section.querySelector<HTMLElement>("[data-stage]");
      if (!stage) {
        return;
      }

      const annotations = new Map(
        Array.from(section.querySelectorAll<HTMLElement>("[data-annotation]")).map(
          (el) => [el.getAttribute("data-annotation"), el] as const,
        ),
      );
      const regions = new Map(
        Array.from(section.querySelectorAll<HTMLElement>("[data-region]")).map(
          (el) => [el.getAttribute("data-region"), el] as const,
        ),
      );
      const lines = new Map(
        Array.from(section.querySelectorAll<SVGPathElement>("[data-line]")).map(
          (el) => [el.getAttribute("data-line"), el] as const,
        ),
      );

      let current = -1;

      const setState = (index: number) => {
        if (index === current) {
          return;
        }
        current = index;
        const key = ORDER[index];
        annotations.forEach((el, k) => {
          el.classList.toggle("ev-annotation-active", k === key);
        });
        regions.forEach((el, k) => {
          el.classList.toggle("ev-region-active", k === key);
        });
        lines.forEach((el, k) => {
          el.classList.toggle("ev-line-active", k === key);
        });
      };

      setState(0);

      ScrollTrigger.create({
        trigger: stage,
        start: "top 70%",
        end: "bottom 55%",
        onUpdate: (self) => {
          setState(Math.min(ORDER.length - 1, Math.floor(self.progress * 5.25)));
        },
      });
    }, section);

    return () => context.revert();
  }, []);

  return root;
}