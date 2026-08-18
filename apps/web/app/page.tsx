import type { Metadata } from "next";
import { TrailLogo } from "@/components/trail-logo";
import { HeroExperience } from "@/components/landing/hero/hero-experience";
import { GridGlow } from "@/components/landing/hero/grid-glow";
import { NavGithubLink } from "@/components/landing/nav-github-link";
import { ProblemSection } from "@/components/landing/problem/problem-section";

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
        <GridGlow />
        <header className="flex h-20 items-center justify-between sm:h-24">
          <a
            href="#top"
            className="relative flex min-h-11 items-center gap-2 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
            aria-label="TRAIL home"
          >
            <TrailLogo size={28} data-nav-logo aria-hidden="true" />
            <span className="font-heading text-sm font-medium tracking-[0.2em] text-[#f2f4f6]">
              TRAIL
            </span>
          </a>
          <nav className="flex items-center gap-1 sm:gap-3" aria-label="Primary navigation">
            <NavGithubLink />
          </nav>
        </header>

        <HeroExperience />
      </section>

      <ProblemSection />
    </main>
  );
}
