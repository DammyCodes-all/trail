"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * The quietest timeline on the page — the star is the cursor, the one
 * thing here that moves, and it never stops moving. A plain pointer
 * drifts idly across the mockup, pausing here and there like someone
 * scanning a screen without knowing yet what's wrong, then settles on
 * the one wrong field and holds. Only on the first pass does the pin
 * appear, and the note card a beat after — the section's whole argument
 * in sequence: nothing automated caught this, someone had to actually
 * look. Once the entrance passes, the cursor loops the same scan
 * forever, ending each cycle resting on the flag.
 *
 * Cursor waypoints are fractions of the measured screen size, so the
 * choreography holds at every width. Initial states are declared here
 * (fromTo / set) so the CSS default stays fully visible for no-JS and
 * reduced-motion; the cursor itself is decorative and stays hidden
 * without animation.
 */
export function useFlagSectionMotion() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const copyLines = Array.from(
          section.querySelectorAll<HTMLElement>("[data-copy-line]"),
        );
        const mockup = section.querySelector<HTMLElement>("[data-flag-mockup]");
        const screen = section.querySelector<HTMLElement>("[data-flag-screen]");
        const cursor = section.querySelector<HTMLElement>("[data-flag-cursor]");
        const pin = section.querySelector<HTMLElement>("[data-flag-pin]");
        const note = section.querySelector<HTMLElement>("[data-flag-note]");
        const payoff = section.querySelector<HTMLElement>("[data-payoff]");

        if (!mockup) return;

        const timeline = gsap.timeline({ paused: true });

        if (copyLines.length > 0) {
          timeline.fromTo(
            copyLines,
            { autoAlpha: 0, y: 16 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.65,
              stagger: 0.08,
              ease: "power2.out",
            },
            0,
          );
        }

        timeline.fromTo(
          mockup,
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" },
          0.35,
        );

        // ---- the cursor's search, then a landing on the flagged field ----
        // The work of the section: eyes on the screen, scanning down —
        // top, subtotal, the total — until they land exactly on the
        // currency. The pin pops in the instant they land; the note card
        // answers a beat later.
        const cursorSize = { w: 0, h: 0 };
        const TIP = 1.5; // cursor tip offset, so the arrow points at the spot
        const spots: Array<{ fx: number; fy: number; d: number; hold: number }> = [
          { fx: 0.5, fy: 0.08, d: 0.6, hold: 0.5 }, // the top of the card
          { fx: 0.76, fy: 0.58, d: 0.5, hold: 0.35 }, // the subtotal
          { fx: 0.2, fy: 0.71, d: 0.5, hold: 0.4 }, // beside the Total label
        ];
        const settle = { fx: 0.72, fy: 0.73, d: 0.4 }; // right on NGN
        const settleHold = 1.0; // first pass: a long beat on the flag
        const loopHold = 0.9; // later cycles
        let at = 1.05;
        let arriveAt = at;
        let cursorLoop: gsap.core.Timeline | null = null;
        if (screen && cursor) {
          timeline.set(cursor, { autoAlpha: 1 }, 0.95);
          timeline.call(
            () => {
              const r = screen.getBoundingClientRect();
              cursorSize.w = r.width;
              cursorSize.h = r.height;
            },
            undefined,
            0.95,
          );

          for (const spot of spots) {
            timeline.to(
              cursor,
              {
                x: () => spot.fx * cursorSize.w - TIP,
                y: () => spot.fy * cursorSize.h - TIP,
                duration: spot.d,
                ease: "power1.inOut",
              },
              at,
            );
            at += spot.d + spot.hold;
          }
          arriveAt = at + settle.d;
          timeline.to(
            cursor,
            {
              x: () => settle.fx * cursorSize.w - TIP,
              y: () => settle.fy * cursorSize.h - TIP,
              duration: settle.d,
              ease: "power2.out",
            },
            at,
          );
          timeline.to(cursor, { duration: settleHold }, arriveAt);
          at = arriveAt + settleHold;

          // ---- the ambient loop ----
          // After the entrance passes, the cursor never stops: a beat on
          // the flag, a sweep back to the top, then the same search and
          // landing again — an endless quiet looking. One element,
          // transform-only, like the github section's ambient flow layer.
          cursorLoop = gsap.timeline({ paused: true, repeat: -1 });
          const rest = 0.4; // pause on the flag before looking away
          const sweep = 0.5; // the return trip up the screen
          cursorLoop.to(cursor, { duration: rest }, 0);
          let loopAt = rest;
          cursorLoop.to(
            cursor,
            {
              x: () => spots[0]!.fx * cursorSize.w - TIP,
              y: () => spots[0]!.fy * cursorSize.h - TIP,
              duration: sweep,
              ease: "power2.inOut",
            },
            loopAt,
          );
          loopAt += sweep;
          for (const spot of spots) {
            cursorLoop.to(
              cursor,
              {
                x: () => spot.fx * cursorSize.w - TIP,
                y: () => spot.fy * cursorSize.h - TIP,
                duration: spot.d,
                ease: "power1.inOut",
              },
              loopAt,
            );
            loopAt += spot.d + spot.hold;
          }
          cursorLoop.to(
            cursor,
            {
              x: () => settle.fx * cursorSize.w - TIP,
              y: () => settle.fy * cursorSize.h - TIP,
              duration: settle.d,
              ease: "power2.out",
            },
            loopAt,
          );
          loopAt += settle.d;
          cursorLoop.to(cursor, { duration: loopHold }, loopAt);
        }

        // The noticing: the pin pops the moment the cursor lands on the
        // currency, the note card answers a beat later.
        if (pin) {
          timeline.fromTo(
            pin,
            { autoAlpha: 0, scale: 0.8 },
            { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(1.4)" },
            arriveAt + 0.05,
          );
        }

        if (note) {
          timeline.fromTo(
            note,
            { autoAlpha: 0, y: 8 },
            { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" },
            arriveAt + 0.45,
          );
        }

        // Measured alignment: pin the note to the flagged row so the
        // leader line crosses the card's edge at the exact height of the
        // total. Recomputed on resize, and cleared when the note stacks
        // below the card. The static lg:pt-48 class stays as the layout
        // fallback.
        // The connector is drawn at the flagged row's height via a single CSS
        // custom property on the mockup — the line and the note card both
        // derive from that one measured value, with static defaults for
        // no-JS and reduced-motion.
        const noteCard = note?.querySelector<HTMLElement>("[data-flag-note-card]");
        const alignNote = () => {
          if (!(mockup && pin && noteCard)) return;
          const m = mockup.getBoundingClientRect();
          const p = pin.getBoundingClientRect();
          if (noteCard.getBoundingClientRect().left > p.right) {
            mockup.style.setProperty(
              "--flag-row-top",
              `${p.y + p.height / 2 - m.y}px`,
            );
            mockup.style.setProperty(
              "--flag-note-half",
              `${noteCard.offsetHeight / 2}px`,
            );
          }
        };
        alignNote();
        window.addEventListener("resize", alignNote);

        // The entrance hands the cursor to its ambient loop when it's
        // done: from the resting hold on the flag, the scan repeats.
        if (cursorLoop) {
          timeline.eventCallback("onComplete", () => cursorLoop.play(0));
        }

        let hasPlayed = false;
        const play = () => {
          if (hasPlayed) return;
          hasPlayed = true;
          timeline.play(0);
        };
        const trigger = ScrollTrigger.create({
          trigger: section,
          start: "top 80%",
          once: true,
          onEnter: play,
        });
        if (trigger.isActive || trigger.progress > 0) play();

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

    return () => media.revert();
  }, []);

  return root;
}