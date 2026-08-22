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
} from "./trail-connector-motion";

gsap.registerPlugin(ScrollTrigger);

type EvidenceElements = {
  label: HTMLElement;
  card: HTMLElement;
  head: HTMLElement;
  factCells: HTMLElement[];
  replayStrip: HTMLElement;
  replayTrack: HTMLElement;
  replayProgress: HTMLElement;
  replayPlayhead: HTMLElement;
  rows: HTMLElement[];
  statusDot: HTMLElement;
};

function getEvidence(section: HTMLElement): EvidenceElements | null {
  const label = section.querySelector<HTMLElement>("[data-with-label]");
  const card = section.querySelector<HTMLElement>("[data-card]");
  const head = section.querySelector<HTMLElement>("[data-card-head]");
  const factCells = Array.from(
    section.querySelectorAll<HTMLElement>("[data-fact-cell]"),
  );
  const replayStrip = section.querySelector<HTMLElement>("[data-replay-strip]");
  const replayTrack = section.querySelector<HTMLElement>("[data-replay-track]");
  const replayProgress = section.querySelector<HTMLElement>(
    "[data-replay-progress]",
  );
  const replayPlayhead = section.querySelector<HTMLElement>(
    "[data-replay-playhead]",
  );
  const rows = Array.from(
    section.querySelectorAll<HTMLElement>("[data-card-row]"),
  );
  const statusDot = section.querySelector<HTMLElement>("[data-status-dot]");

  if (
    !label ||
    !card ||
    !head ||
    factCells.length === 0 ||
    !replayStrip ||
    !replayTrack ||
    !replayProgress ||
    !replayPlayhead ||
    rows.length === 0 ||
    !statusDot
  ) {
    return null;
  }

  return {
    label,
    card,
    head,
    factCells,
    replayStrip,
    replayTrack,
    replayProgress,
    replayPlayhead,
    rows,
    statusDot,
  };
}

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

function setReplayStart(evidence: EvidenceElements) {
  gsap.set(evidence.replayProgress, {
    scaleX: 0,
    transformOrigin: "0% 50%",
  });
  gsap.set(evidence.replayPlayhead, {
    x: () =>
      -Math.max(
        0,
        evidence.replayTrack.clientWidth - evidence.replayPlayhead.offsetWidth,
      ),
  });
}

function addReplay(
  timeline: gsap.core.Timeline,
  evidence: EvidenceElements,
  at: number,
  duration: number,
) {
  timeline
    .to(
      evidence.replayProgress,
      { scaleX: 1, duration, ease: "power1.inOut" },
      at,
    )
    .to(evidence.replayPlayhead, { x: 0, duration, ease: "power1.inOut" }, at);
}

export function useProblemSectionMotion() {
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
        const payoff = section.querySelector<HTMLElement>("[data-payoff]");

        if (copy) {
          gsap.fromTo(
            copy,
            { autoAlpha: 0, y: 18 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              ease: "power2.out",
              scrollTrigger: { trigger: copy, start: "top 88%" },
            },
          );
        }

        if (payoff) {
          gsap.fromTo(
            payoff,
            { autoAlpha: 0, y: 18 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              ease: "power2.out",
              scrollTrigger: { trigger: payoff, start: "top 88%" },
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
          const stage = section.querySelector<HTMLElement>("[data-stage]");
          const withoutLabel = section.querySelector<HTMLElement>(
            "[data-without-label]",
          );
          const roughItems = Array.from(
            section.querySelectorAll<HTMLElement>("[data-rough-item]"),
          );
          const connector = getConnector(section, "horizontal");
          const evidence = getEvidence(section);

          if (
            !stage ||
            !withoutLabel ||
            roughItems.length === 0 ||
            !connector ||
            !evidence
          ) {
            return;
          }

          const ambient = createAmbientController(connector, 2.4);
          setConnectorStart(connector);
          setReplayStart(evidence);

          gsap.set(withoutLabel, { opacity: 0 });
          gsap.set(roughItems, {
            autoAlpha: 0,
            x: (index, item: HTMLElement) =>
              item.dataset.enterFrom === "right" ? 36 : -36,
            y: 8,
            scale: 0.94,
            transformOrigin: (index, item: HTMLElement) =>
              item.dataset.enterFrom === "right" ? "100% 50%" : "0% 50%",
          });
          gsap.set(evidence.label, {
            autoAlpha: 0,
            x: 24,
            scale: 0.96,
            transformOrigin: "100% 50%",
          });
          gsap.set(evidence.card, {
            autoAlpha: 0,
            x: 36,
            y: 8,
            scale: 0.98,
            transformOrigin: "100% 50%",
          });
          gsap.set(
            [
              evidence.head,
              ...evidence.factCells,
              evidence.replayStrip,
              ...evidence.rows,
            ],
            { autoAlpha: 0, y: 6 },
          );

          const timeline = gsap.timeline({ paused: true });
          timeline
            .to(
              withoutLabel,
              { opacity: 1, duration: 0.3, ease: "power2.out" },
              0,
            )
            .to(
              roughItems,
              {
                autoAlpha: 1,
                duration: 0.16,
                stagger: 0.06,
                ease: "power2.out",
              },
              0.08,
            )
            .to(
              roughItems,
              {
                x: 0,
                y: 0,
                scale: 1,
                duration: 0.42,
                stagger: 0.06,
                ease: "back.out(1.1)",
              },
              0.08,
            );

          addConnectorEntrance(
            timeline,
            connector,
            DESKTOP_CONNECTOR_TIMING,
            0.58,
          );

          timeline
            .to(
              evidence.label,
              { autoAlpha: 1, duration: 0.16, ease: "power2.out" },
              1.38,
            )
            .to(
              evidence.label,
              {
                x: 0,
                scale: 1,
                duration: 0.3,
                ease: "back.out(1.1)",
              },
              1.38,
            )
            .to(
              evidence.card,
              { autoAlpha: 1, duration: 0.16, ease: "power2.out" },
              1.46,
            )
            .to(
              evidence.card,
              {
                x: 0,
                y: 0,
                scale: 1,
                duration: 0.34,
                ease: "back.out(1.05)",
              },
              1.46,
            )
            .to(
              evidence.head,
              { autoAlpha: 1, y: 0, duration: 0.2, ease: "power2.out" },
              1.62,
            )
            .to(
              evidence.factCells,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.2,
                stagger: 0.05,
                ease: "power2.out",
              },
              1.72,
            )
            .fromTo(
              evidence.statusDot,
              { scale: 1 },
              { scale: 1.65, duration: 0.13, ease: "power2.out" },
              1.76,
            )
            .to(
              evidence.statusDot,
              { scale: 1, duration: 0.18, ease: "power1.inOut" },
              1.89,
            )
            .to(
              evidence.replayStrip,
              { autoAlpha: 1, y: 0, duration: 0.2, ease: "power2.out" },
              2.02,
            );

          addReplay(timeline, evidence, 2.12, 0.42);

          timeline
            .to(
              evidence.rows,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.2,
                stagger: 0.05,
                ease: "power2.out",
              },
              2.48,
            )
            .call(() => ambient.ready(), undefined, 2.82);

          createOnceTrigger(stage, "top 82%", timeline);
        }, section);

        return () => context.revert();
      },
    );

    media.add(
      "(max-width: 1023px) and (prefers-reduced-motion: no-preference)",
      () => {
        const context = gsap.context(() => {
          const withoutSide = section.querySelector<HTMLElement>(
            "[data-comparison-side='without']",
          );
          const withoutLabel = section.querySelector<HTMLElement>(
            "[data-without-label]",
          );
          const roughItems = Array.from(
            section.querySelectorAll<HTMLElement>("[data-rough-item]"),
          );
          const connectorSlot = section.querySelector<HTMLElement>(
            "[data-mobile-connector-slot]",
          );
          const connector = getConnector(section, "vertical");
          const withSide = section.querySelector<HTMLElement>(
            "[data-comparison-side='with']",
          );
          const evidence = getEvidence(section);

          if (
            !withoutSide ||
            !withoutLabel ||
            roughItems.length === 0 ||
            !connectorSlot ||
            !connector ||
            !withSide ||
            !evidence
          ) {
            return;
          }

          const ambient = createAmbientController(connector, 2.8);
          setConnectorStart(connector);
          setReplayStart(evidence);

          gsap.set(withoutLabel, { opacity: 0 });
          gsap.set(roughItems, {
            autoAlpha: 0,
            x: (index, item: HTMLElement) =>
              item.dataset.enterFrom === "right" ? 24 : -24,
            y: 6,
            scale: 0.96,
            transformOrigin: (index, item: HTMLElement) =>
              item.dataset.enterFrom === "right" ? "100% 50%" : "0% 50%",
          });
          gsap.set(evidence.label, {
            autoAlpha: 0,
            y: 12,
            scale: 0.97,
            transformOrigin: "50% 100%",
          });
          gsap.set(evidence.card, {
            autoAlpha: 0,
            y: 20,
            scale: 0.97,
            transformOrigin: "50% 0%",
          });
          gsap.set(
            [
              evidence.head,
              ...evidence.factCells,
              evidence.replayStrip,
              ...evidence.rows,
            ],
            { autoAlpha: 0, y: 6 },
          );

          const reportTimeline = gsap.timeline({ paused: true });
          reportTimeline
            .to(
              withoutLabel,
              { opacity: 1, duration: 0.28, ease: "power2.out" },
              0,
            )
            .to(
              roughItems,
              {
                autoAlpha: 1,
                duration: 0.16,
                stagger: 0.055,
                ease: "power2.out",
              },
              0.06,
            )
            .to(
              roughItems,
              {
                x: 0,
                y: 0,
                scale: 1,
                duration: 0.4,
                stagger: 0.055,
                ease: "back.out(1.1)",
              },
              0.06,
            );

          const connectorTimeline = gsap.timeline({ paused: true });
          addConnectorEntrance(
            connectorTimeline,
            connector,
            MOBILE_CONNECTOR_TIMING,
          );
          connectorTimeline.call(() => ambient.ready(), undefined, 1.12);

          const evidenceTimeline = gsap.timeline({ paused: true });
          evidenceTimeline
            .to(
              evidence.label,
              { autoAlpha: 1, duration: 0.16, ease: "power2.out" },
              0,
            )
            .to(
              evidence.label,
              {
                y: 0,
                scale: 1,
                duration: 0.34,
                ease: "back.out(1.1)",
              },
              0,
            )
            .to(
              evidence.card,
              { autoAlpha: 1, duration: 0.16, ease: "power2.out" },
              0.12,
            )
            .to(
              evidence.card,
              {
                y: 0,
                scale: 1,
                duration: 0.4,
                ease: "back.out(1.05)",
              },
              0.12,
            )
            .to(
              evidence.head,
              { autoAlpha: 1, y: 0, duration: 0.2, ease: "power2.out" },
              0.28,
            )
            .to(
              evidence.factCells,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.2,
                stagger: 0.05,
                ease: "power2.out",
              },
              0.4,
            )
            .fromTo(
              evidence.statusDot,
              { scale: 1 },
              { scale: 1.65, duration: 0.13, ease: "power2.out" },
              0.44,
            )
            .to(
              evidence.statusDot,
              { scale: 1, duration: 0.18, ease: "power1.inOut" },
              0.57,
            )
            .to(
              evidence.replayStrip,
              { autoAlpha: 1, y: 0, duration: 0.2, ease: "power2.out" },
              0.68,
            );

          addReplay(evidenceTimeline, evidence, 0.8, 0.42);

          evidenceTimeline.to(
            evidence.rows,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.2,
              stagger: 0.055,
              ease: "power2.out",
            },
            1.38,
          );

          createOnceTrigger(withoutSide, "top 86%", reportTimeline);
          createOnceTrigger(connectorSlot, "top 84%", connectorTimeline);
          createOnceTrigger(withSide, "top 86%", evidenceTimeline);
        }, section);

        return () => context.revert();
      },
    );

    return () => media.revert();
  }, []);

  return root;
}
