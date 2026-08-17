"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Check,
  Clock3,
  ListChecks,
  MousePointer2,
  Network,
  Play,
  Terminal,
  WifiOff,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

type Fact = {
  key: string;
  icon: LucideIcon;
  label: string;
  to: number;
  suffix: string;
  cls: string;
};

const FACTS: Fact[] = [
  { key: "duration", icon: Clock3, label: "Duration", to: 55, suffix: "s", cls: "text-[#f2f4f6]" },
  { key: "interactions", icon: MousePointer2, label: "Interactions", to: 14, suffix: "", cls: "text-[#ff6a00]" },
  { key: "evidence", icon: ListChecks, label: "Evidence events", to: 9, suffix: "", cls: "text-[#ff6a00]" },
  { key: "failed", icon: WifiOff, label: "Failed requests", to: 1, suffix: "", cls: "text-[#ff4d4f]" },
];

const ROWS = [
  { icon: Play, label: "Replay", value: "00:55" },
  { icon: Network, label: "Network", value: "1 failed" },
  { icon: Terminal, label: "Console", value: "1 error" },
];

export function ProblemSection() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const payoff = el.querySelector<HTMLElement>("[data-payoff]");
      const copy = el.querySelector<HTMLElement>("[data-copy]");

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
    }, el);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="the-problem"
      ref={root}
      className="border-t border-white/10 bg-[#0d0e10] px-5 py-32 sm:px-8 sm:py-40 lg:px-10"
    >
      <div className="mx-auto max-w-5xl">
        <div data-copy className="text-center">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#ff8a1f]">
            Beyond the error
          </p>
          <h2 className="mx-auto mt-5 max-w-3xl font-heading text-[clamp(1.75rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.035em] text-[#f2f4f6]">
            The error is only half <span className="text-[#ff6a00]">the story</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#8b929c] sm:text-lg sm:leading-8">
            Trail captures the clicks, requests, console errors, replay, and
            context around the moment things went wrong.
          </p>
        </div>

        <div data-stage className="relative mt-16 lg:mt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-24">
            <div className="w-full">
              <p className="mb-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#626973]">
                <X className="size-3" aria-hidden="true" />
                Without trail
              </p>
              <div
                data-fragments
                aria-hidden="true"
                className="pointer-events-none flex w-full max-w-sm flex-col items-start gap-4"
              >
              <div
                data-fragment
                data-drift-x="-10"
                data-drift-rot="-2"
                className="max-w-[250px] rounded-2xl rounded-bl-md border border-white/5 bg-white/5 px-3.5 py-2.5 text-[13px] leading-5 text-[#8b929c]"
              >
                &ldquo;The login button doesn&apos;t work.&rdquo;
              </div>
              <div
                data-fragment
                data-drift-x="-18"
                data-drift-rot="2"
                className="ml-6 text-[13px] text-[#626973]"
              >
                I don&apos;t know what I clicked.
              </div>
              <div
                data-fragment
                data-drift-x="12"
                data-drift-rot="-3"
                className="ml-3 w-44 overflow-hidden rounded-md border border-white/10 bg-[#141618] shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#0d0e10] px-2.5 py-1.5">
                  <span className="font-mono text-[8px] text-[#626973]">
                    acme.com
                  </span>
                </div>
                <div className="space-y-1.5 px-2.5 pb-3 pt-2.5">
                  <div className="h-1 w-8 rounded-sm bg-white/20" />
                  <div className="h-1.5 rounded-sm bg-white/10" />
                  <div className="h-1.5 rounded-sm bg-white/10" />
                  <div className="h-3 rounded-sm bg-white/20" />
                </div>
              </div>
              <div
                data-fragment
                data-drift-x="-14"
                data-drift-rot="1.5"
                className="ml-10 text-[13px] text-[#626973]"
              >
                Can you reproduce it?
              </div>
            </div>
            </div>

            <div className="relative mx-auto w-full max-w-[420px]">
              <p className="mb-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff6a00]">
                <Check className="size-3" aria-hidden="true" />
                With trail
              </p>
              <div
                data-card
                className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0a0b0d] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
              >
                <div
                  data-card-head
                  className="flex items-center gap-2 border-b border-white/10 px-4 py-3"
                >
                  <span
                    className="size-1.5 rounded-full bg-[#30d158]"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#f2f4f6]">
                    Session captured
                  </span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-white/10 sm:grid-cols-4">
                  {FACTS.map((fact) => (
                    <div key={fact.key} className="min-w-0 px-3 py-3">
                      <span className="flex items-center gap-2 text-[#626973]">
                        <fact.icon className="size-3 shrink-0" aria-hidden="true" />
                        <span className="text-[9.5px]">{fact.label}</span>
                      </span>
                      <span
                        data-fact
                        data-to={fact.to}
                        data-suffix={fact.suffix}
                        className={`mt-1 block truncate pl-5 font-heading text-sm font-semibold tabular-nums ${fact.cls}`}
                      >
                        {fact.to}
                        {fact.suffix}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-white/10 border-t border-white/10">
                  {ROWS.map((row) => (
                    <div
                      key={row.label}
                      data-card-row
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <row.icon className="size-4 shrink-0 text-[#626973]" aria-hidden="true" />
                      <span className="font-mono text-[11px] text-[#f2f4f6]/90">
                        {row.label}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-[#626973]">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p
          data-payoff
          className="mt-20 text-center font-heading text-2xl font-semibold tracking-[-0.02em] text-[#f2f4f6] sm:text-3xl"
        >
          Now the bug has context.
        </p>
      </div>
    </section>
  );
}