"use client";

import { GithubMapping } from "./github-mapping";
import { useGithubSectionMotion } from "./use-github-section-motion";

export function GithubSection() {
  const root = useGithubSectionMotion();

  return (
    <section
      id="github-native"
      ref={root}
      className="relative isolate overflow-hidden border-t border-white/10 bg-[#0d0e10] px-5 pb-14 pt-16 sm:px-8 sm:pb-16 sm:pt-20 lg:px-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_40%_at_50%_0%,black_30%,transparent_75%)]"
      />
      <div className="relative mx-auto max-w-5xl">
        <div data-copy className="text-center">
          <p
            data-copy-line
            className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#ff6a00]"
          >
            GitHub-native
          </p>
          <h2
            data-copy-line
            className="mx-auto mt-3 max-w-3xl font-heading text-[clamp(1.5rem,5vw,3.25rem)] font-bold leading-[1] tracking-[-0.04em] text-[#f2f4f6]"
          >
            Evidence in. Issue out.
          </h2>
          <p
            data-copy-line
            className="mx-auto mt-4 max-w-xl text-sm leading-6 tracking-[-0.01em] text-[#8b929c] sm:text-base sm:leading-7"
          >
            Trail compiles replay, timeline, console, network, and reporter
            context into the issue template your team already uses.
          </p>
        </div>

        <GithubMapping />

        <p
          data-callout
          className="mt-4 text-center font-mono text-[11px] tracking-[0.02em] text-[#626973] sm:text-xs"
        >
          <span
            aria-hidden="true"
            className="mr-2 inline-block size-[6px] rounded-full bg-[#ff6a00] align-[2px]"
          />
          Works with your existing template and labels. You review before
          submitting.
        </p>

        <p
          data-payoff
          className="mt-8 text-center font-heading text-2xl font-semibold tracking-[-0.02em] text-[#f2f4f6] sm:mt-10 sm:text-3xl"
        >
          Same issue. Just already written.
        </p>
      </div>
    </section>
  );
}
