"use client";

import { GridGlow } from "@/components/landing/hero/grid-glow";
import { FlagMockup } from "./flag-mockup";
import { useFlagSectionMotion } from "./use-flag-section-motion";

export function FlagSection() {
  const root = useFlagSectionMotion();

  return (
    <section
      id="flag"
      ref={root}
      className="relative isolate overflow-hidden border-t border-white/10 bg-[#0d0e10] px-5 pb-14 pt-16 sm:px-8 sm:pb-16 sm:pt-20 lg:px-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_40%_at_50%_0%,black_30%,transparent_75%)]"
      />
      <GridGlow />
      <div className="relative mx-auto max-w-5xl">
        <div data-copy className="text-center">
          <p
            data-copy-line
            className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#ff6a00]"
          >
            When nothing fails
          </p>
          <h2
            data-copy-line
            className="mx-auto mt-3 max-w-2xl font-heading text-[clamp(1.375rem,4vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.04em] text-[#f2f4f6]"
          >
            Some bugs don&apos;t break anything. They&apos;re just wrong.
          </h2>
          <p
            data-copy-line
            className="mx-auto mt-4 max-w-lg text-sm leading-6 tracking-[-0.01em] text-[#8b929c]"
          >
            A wrong value, a silent mismatch, a confirmation that says the
            wrong thing — Trail lets reporters flag the moment, even when
            nothing fails.
          </p>
        </div>

        <FlagMockup />

        <p
          data-payoff
          className="mt-10 text-center font-heading text-2xl font-semibold tracking-[-0.02em] text-[#f2f4f6] sm:text-3xl"
        >
          If it looks wrong, that&apos;s reason enough.
        </p>
      </div>
    </section>
  );
}