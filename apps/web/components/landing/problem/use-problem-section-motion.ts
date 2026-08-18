"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
          const withLabel = section.querySelector<HTMLElement>("[data-with-label]");
          const card = section.querySelector<HTMLElement>("[data-card]");
          const factCells = Array.from(
            section.querySelectorAll<HTMLElement>("[data-fact-cell]"),
          );
          const replayStrip = section.querySelector<HTMLElement>(
            "[data-replay-strip]",
          );
          const cardRows = Array.from(
            section.querySelectorAll<HTMLElement>("[data-card-row]"),
          );
          const statusDot = section.querySelector<HTMLElement>("[data-status-dot]");
          const connector = section.querySelector<SVGSVGElement>("[data-connector]");
          const feederPaths = Array.from(
            section.querySelectorAll<SVGPathElement>("[data-connector-feeder]"),
          );
          const outputPath = section.querySelector<SVGPathElement>(
            "[data-connector-output]",
          );
          const connectorNode = section.querySelector<SVGGElement>(
            "[data-connector-node]",
          );
          const flowLayers = Array.from(
            section.querySelectorAll<SVGElement>("[data-connector-flow-layer]"),
          );
          const flowPaths = Array.from(
            section.querySelectorAll<SVGPathElement>("[data-connector-flow]"),
          );
          const connectorLogo = section.querySelector<SVGGElement>(
            "[data-connector-logo]",
          );

          if (
            !stage ||
            !withoutLabel ||
            roughItems.length === 0 ||
            !withLabel ||
            !card ||
            factCells.length === 0 ||
            !replayStrip ||
            cardRows.length === 0 ||
            !statusDot ||
            !connector ||
            feederPaths.length === 0 ||
            !outputPath ||
            !connectorNode ||
            flowLayers.length === 0 ||
            flowPaths.length === 0 ||
            !connectorLogo
          ) {
            return;
          }

          const ambientLoop = gsap.timeline({ paused: true, repeat: -1 });
          ambientLoop
            .fromTo(
              flowPaths,
              { strokeDashoffset: 0 },
              { strokeDashoffset: -66, duration: 3.6, ease: "none" },
              0,
            )
            .fromTo(
              connectorLogo,
              { rotation: 0 },
              {
                rotation: 360,
                svgOrigin: "126 70",
                duration: 0.8,
                ease: "power1.inOut",
              },
              2.55,
            );

          let connectorVisible = false;
          let entranceComplete = false;

          const syncAmbientLoop = () => {
            if (connectorVisible && entranceComplete) {
              ambientLoop.play();
            } else {
              ambientLoop.pause();
            }
          };

          const visibility = ScrollTrigger.create({
            trigger: connector,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => {
              connectorVisible = self.isActive;
              syncAmbientLoop();
            },
          });
          connectorVisible = visibility.isActive;

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
          gsap.set(feederPaths, {
            strokeDasharray: "1 1",
            strokeDashoffset: 1,
          });
          gsap.set(connectorNode, {
            opacity: 0.55,
            scale: 0.96,
            svgOrigin: "126 70",
          });
          gsap.set(outputPath, {
            strokeDasharray: "1 1",
            strokeDashoffset: 1,
          });
          gsap.set(flowLayers, { opacity: 0 });
          gsap.set([withLabel, card], { autoAlpha: 0, y: 14 });
          gsap.set(factCells, { opacity: 0 });
          gsap.set(replayStrip, { opacity: 0 });
          gsap.set(cardRows, { opacity: 0 });

          const timeline = gsap.timeline({ paused: true });

          timeline
            .fromTo(
              withoutLabel,
              { opacity: 0 },
              {
                opacity: 1,
                duration: 0.3,
                ease: "power2.out",
              },
              0,
            )
            .to(
              roughItems,
              {
                autoAlpha: 1,
                duration: 0.22,
                stagger: 0.09,
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
                duration: 0.55,
                stagger: 0.09,
                ease: "back.out(1.1)",
              },
              0.08,
            )
            .fromTo(
              feederPaths,
              { strokeDasharray: "1 1", strokeDashoffset: 1 },
              {
                strokeDashoffset: 0,
                duration: 0.75,
                stagger: 0.07,
                ease: "power1.inOut",
              },
              0.98,
            )
            .fromTo(
              connectorNode,
              {
                opacity: 0.55,
                scale: 0.96,
                svgOrigin: "126 70",
              },
              {
                opacity: 1,
                scale: 1,
                duration: 0.3,
                ease: "power2.out",
              },
              1.68,
            )
            .fromTo(
              outputPath,
              { strokeDasharray: "1 1", strokeDashoffset: 1 },
              {
                strokeDashoffset: 0,
                duration: 0.65,
                ease: "power1.inOut",
              },
              1.92,
            )
            .to(
              flowLayers,
              {
                opacity: 0.85,
                duration: 0.25,
                ease: "power2.out",
              },
              2.34,
            )
            .call(
              () => {
                entranceComplete = true;
                syncAmbientLoop();
              },
              undefined,
              2.42,
            )
            .fromTo(
              [withLabel, card],
              { autoAlpha: 0, y: 14 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.4,
                ease: "power2.out",
              },
              2.42,
            )
            .fromTo(
              statusDot,
              { scale: 1 },
              { scale: 1.65, duration: 0.16, ease: "power2.out" },
              2.64,
            )
            .to(
              statusDot,
              { scale: 1, duration: 0.24, ease: "power1.inOut" },
              2.8,
            )
            .fromTo(
              factCells,
              { opacity: 0 },
              {
                opacity: 1,
                duration: 0.28,
                stagger: 0.06,
                ease: "power2.out",
              },
              2.75,
            )
            .fromTo(
              replayStrip,
              { opacity: 0 },
              { opacity: 1, duration: 0.25, ease: "power2.out" },
              3.09,
            )
            .fromTo(
              cardRows,
              { opacity: 0 },
              {
                opacity: 1,
                duration: 0.25,
                stagger: 0.08,
                ease: "power2.out",
              },
              3.23,
            );

          let hasPlayed = false;
          const entrance = ScrollTrigger.create({
            trigger: stage,
            start: "top 82%",
            once: true,
            onEnter: () => {
              if (hasPlayed) {
                return;
              }

              hasPlayed = true;
              timeline.play(0);
            },
          });

          if (entrance.isActive && !hasPlayed) {
            hasPlayed = true;
            timeline.play(0);
          }

          syncAmbientLoop();
        }, section);

        return () => context.revert();
      },
    );

    media.add(
      "(max-width: 1023px) and (prefers-reduced-motion: no-preference)",
      () => {
        const context = gsap.context(() => {
          const stage = section.querySelector<HTMLElement>("[data-stage]");
          const sides = Array.from(
            section.querySelectorAll<HTMLElement>("[data-comparison-side]"),
          );

          if (!stage || sides.length === 0) {
            return;
          }

          gsap.set(sides, { autoAlpha: 0, y: 12 });

          const timeline = gsap.timeline({ paused: true });
          timeline
            .fromTo(
              sides,
              { autoAlpha: 0, y: 12 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.45,
                stagger: 0.18,
                ease: "power2.out",
              },
            );

          ScrollTrigger.create({
            trigger: stage,
            start: "top 88%",
            once: true,
            onEnter: () => timeline.play(0),
          });
        }, section);

        return () => context.revert();
      },
    );

    return () => media.revert();
  }, []);

  return root;
}
