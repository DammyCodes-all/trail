"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  addConnectorEntrance,
  createAmbientController,
  DESKTOP_CONNECTOR_TIMING,
  getConnector,
  MOBILE_CONNECTOR_TIMING,
  setConnectorStart,
} from "@/components/landing/problem/trail-connector-motion";

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

function setPillsStart(pills: HTMLElement[], distance: number) {
  gsap.set(pills, {
    autoAlpha: 0,
    x: (index, item: HTMLElement) =>
      item.dataset.enterFrom === "right" ? distance : -distance,
    y: 6,
    scale: 0.96,
    transformOrigin: (index, item: HTMLElement) =>
      item.dataset.enterFrom === "right" ? "100% 50%" : "0% 50%",
  });
}

function addPillEntrance(
  timeline: gsap.core.Timeline,
  pills: HTMLElement[],
  at = 0,
) {
  timeline
    .to(
      pills,
      {
        autoAlpha: 1,
        duration: 0.16,
        stagger: 0.06,
        ease: "power2.out",
      },
      at,
    )
    .to(
      pills,
      {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.42,
        stagger: 0.06,
        ease: "back.out(1.1)",
      },
      at,
    );
}

function setCardStart(card: HTMLElement, parts: HTMLElement[]) {
  gsap.set(card, {
    autoAlpha: 0,
    x: 36,
    y: 8,
    scale: 0.98,
    transformOrigin: "100% 50%",
  });
  gsap.set(parts, { autoAlpha: 0, y: 6 });
}

function addCardEntrance(
  timeline: gsap.core.Timeline,
  card: HTMLElement,
  parts: HTMLElement[],
  at = 0,
  transform: { x?: number; y?: number } = { x: 0, y: 0 },
) {
  timeline
    .to(
      card,
      { autoAlpha: 1, duration: 0.16, ease: "power2.out" },
      at,
    )
    .to(
      card,
      {
        ...transform,
        scale: 1,
        duration: 0.38,
        ease: "back.out(1.05)",
      },
      at,
    )
    .to(
      parts,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.2,
        stagger: 0.045,
        ease: "power2.out",
      },
      at + 0.18,
    );
}

export function useGithubSectionMotion() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section) {
      return;
    }

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const copyLines = Array.from(
          section.querySelectorAll<HTMLElement>("[data-copy-line]"),
        );
        const callout = section.querySelector<HTMLElement>("[data-callout]");
        const payoff = section.querySelector<HTMLElement>("[data-payoff]");

        if (copyLines.length > 0) {
          gsap.fromTo(
            copyLines,
            { autoAlpha: 0, y: 16 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.65,
              stagger: 0.08,
              ease: "power2.out",
              scrollTrigger: { trigger: copyLines[0], start: "top 88%" },
            },
          );
        }

        if (callout) {
          gsap.fromTo(
            callout,
            { autoAlpha: 0, y: 12 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.35,
              ease: "power2.out",
              scrollTrigger: { trigger: callout, start: "top 90%" },
            },
          );
        }

        if (payoff) {
          gsap.fromTo(
            payoff,
            { autoAlpha: 0, y: 14 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              ease: "power2.out",
              scrollTrigger: { trigger: payoff, start: "top 90%" },
            },
          );
        }
      }, section);

      return () => context.revert();
    });

    media.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const context = gsap.context(() => {
          const stage = section.querySelector<HTMLElement>("[data-map-stage]");
          const pills = Array.from(
            section.querySelectorAll<HTMLElement>("[data-report-pill]"),
          );
          const connector = getConnector(section, "report-horizontal");
          const card = section.querySelector<HTMLElement>("[data-issue-card]");
          const parts = Array.from(
            section.querySelectorAll<HTMLElement>("[data-issue-part]"),
          );

          if (!stage || pills.length === 0 || !connector || !card || parts.length === 0) {
            return;
          }

          const ambient = createAmbientController(connector);
          setPillsStart(pills, 32);
          setConnectorStart(connector);
          setCardStart(card, parts);

          const timeline = gsap.timeline({ paused: true });
          addPillEntrance(timeline, pills, 0);
          addConnectorEntrance(
            timeline,
            connector,
            DESKTOP_CONNECTOR_TIMING,
            0.58,
          );
          addCardEntrance(timeline, card, parts, 1.38);
          timeline.call(() => ambient.ready(), undefined, 2.18);

          createOnceTrigger(stage, "top 82%", timeline);
        }, section);

        return () => context.revert();
      },
    );

    media.add(
      "(max-width: 1023px) and (prefers-reduced-motion: no-preference)",
      () => {
        const context = gsap.context(() => {
          const ingredients = section.querySelector<HTMLElement>(
            "[data-report-ingredients]",
          );
          const pills = Array.from(
            section.querySelectorAll<HTMLElement>("[data-report-pill]"),
          );
          const connectorSlot = section.querySelector<HTMLElement>(
            "[data-report-mobile-connector]",
          );
          const connector = getConnector(section, "report-vertical");
          const card = section.querySelector<HTMLElement>("[data-issue-card]");
          const parts = Array.from(
            section.querySelectorAll<HTMLElement>("[data-issue-part]"),
          );

          if (
            !ingredients ||
            pills.length === 0 ||
            !connectorSlot ||
            !connector ||
            !card ||
            parts.length === 0
          ) {
            return;
          }

          const ambient = createAmbientController(connector);
          setPillsStart(pills, 24);
          setConnectorStart(connector);
          gsap.set(card, {
            autoAlpha: 0,
            y: 20,
            scale: 0.97,
            transformOrigin: "50% 0%",
          });
          gsap.set(parts, { autoAlpha: 0, y: 6 });

          const pillsTimeline = gsap.timeline({ paused: true });
          addPillEntrance(pillsTimeline, pills, 0);

          const connectorTimeline = gsap.timeline({ paused: true });
          addConnectorEntrance(
            connectorTimeline,
            connector,
            MOBILE_CONNECTOR_TIMING,
          );
          connectorTimeline.call(() => ambient.ready(), undefined, 1.12);

          const cardTimeline = gsap.timeline({ paused: true });
          addCardEntrance(cardTimeline, card, parts, 0, { y: 0 });

          createOnceTrigger(ingredients, "top 86%", pillsTimeline);
          createOnceTrigger(connectorSlot, "top 84%", connectorTimeline);
          createOnceTrigger(card, "top 86%", cardTimeline);
        }, section);

        return () => context.revert();
      },
    );

    return () => media.revert();
  }, []);

  return root;
}
