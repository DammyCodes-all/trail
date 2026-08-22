"use client";

import HowItWorks from "@/components/ui/how-it-works";
import { CopyCommand } from "@/components/beta/copy-command";
import { useInstallSectionMotion } from "./use-install-section-motion";

/**
 * /beta install section: header, the four-step guide (self-animated), and
 * the address-bar command row. Header and row reveals are owned by
 * use-install-section-motion; hover/press states stay in CSS.
 */
export function InstallSection() {
  const root = useInstallSectionMotion();

  return (
    <section
      id="install"
      ref={root}
      aria-label="How to install the beta"
      className="relative isolate overflow-hidden border-t border-white/[0.06] bg-[#0d0e10]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_40%_at_50%_0%,black_30%,transparent_75%)]"
      />
      <div className="mx-auto max-w-6xl px-5 pt-14 sm:px-8 sm:pt-16 lg:px-10">
        <p
          data-install-head
          className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#ff6a00]"
        >
          Install in four steps
        </p>
        <h2
          data-install-head
          className="mt-3 max-w-2xl font-heading text-3xl font-bold leading-[1.05] text-[#f2f4f6] sm:text-[2.25rem]"
        >
          Follow the trail.
        </h2>
      </div>
      <HowItWorks />
      <div
        data-install-copy
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-5 pb-16 sm:px-8 sm:pb-20 lg:px-10"
      >
        <span className="font-mono text-xs tracking-[0.05em] text-[#8b929c]">
          Paste this into your address bar:
        </span>
        <CopyCommand command="chrome://extensions" />
      </div>
    </section>
  );
}
