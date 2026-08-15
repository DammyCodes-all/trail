import type { Metadata } from "next";
import { TrailLogo } from "@/components/trail-logo";
import { HeroExperience } from "@/components/landing/hero/hero-experience";
import { NavGithubLink } from "@/components/landing/nav-github-link";

export const metadata: Metadata = {
  title: "TRAIL — Every bug has a trail",
  description:
    "Record what happened, replay it, and turn browser bugs into evidence.",
};

export default function Home() {
  return (
    <main className="relative isolate overflow-hidden bg-[#0d0f0e] text-[#f2f4f6]">
      <section className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-5 pb-14 sm:px-8 lg:px-10">
        <div aria-hidden="true" className="hero-grid -z-10" />
        <header className="flex h-20 items-center justify-between sm:h-24">
          <a
            href="#top"
            className="flex min-h-11 items-center gap-2 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
            aria-label="TRAIL home"
          >
            <TrailLogo size={28} data-nav-logo aria-hidden="true" />
            <span className="font-mono text-sm font-medium tracking-[0.2em] text-[#f2f4f6]">
              TRAIL
            </span>
          </a>
          <nav className="flex items-center gap-1 sm:gap-3" aria-label="Primary navigation">
            <NavGithubLink />
          </nav>
        </header>

        <HeroExperience />
      </section>

      <section id="how-it-works" className="border-t border-white/10 bg-[#0d0e10] px-5 py-24 sm:px-8 sm:py-32 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#ff8a1f]">
              The missing context
            </p>
            <h2 className="mt-5 max-w-xl font-heading text-4xl font-semibold leading-tight tracking-[-0.035em] text-[#f2f4f6] sm:text-5xl">
              A screenshot doesn&apos;t tell you what happened.
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-[#8b929c]">
            TRAIL connects the user&apos;s action to the browser&apos;s response: clicks, input, console errors, failed requests, and a replayable session in one maintainer-ready report.
          </p>
        </div>
      </section>
    </main>
  );
}
