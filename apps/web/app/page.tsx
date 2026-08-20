import type { Metadata } from "next";
import Link from "next/link";
import { TrailLogo } from "@/components/trail-logo";
import { HeroExperience } from "@/components/landing/hero/hero-experience";
import { GridGlow } from "@/components/landing/hero/grid-glow";
import { NavGithubLink } from "@/components/landing/nav-github-link";
import { ProblemSection } from "@/components/landing/problem/problem-section";
import { SetupSection } from "@/components/landing/setup/setup-section";
import { RedactionSection } from "@/components/landing/redaction/redaction-section";
import { GithubSection } from "@/components/landing/github/github-section";
import { FlagSection } from "@/components/landing/flag/flag-section";
import { ClosingCtaSection } from "@/components/landing/cta/closing-cta-section";
import { SiteFooter } from "@/components/landing/cta/site-footer";

export const metadata: Metadata = {
  title: "TRAIL — Every bug has a trail",
  description:
    "Record what happened, replay it, and turn browser bugs into evidence.",
};

export default function Home() {
  return (
    <main id="top" className="relative isolate overflow-hidden bg-[#0d0f0e] text-[#f2f4f6]">
      <GridGlow />
      <section className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-5 pb-14 sm:px-8 lg:px-10">
        <div aria-hidden="true" className="hero-grid -z-10" />
        <header className="flex h-20 items-center justify-between sm:h-24">
          <Link
            href="#top"
            className="relative flex min-h-11 items-center gap-2 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
            aria-label="TRAIL home"
          >
            <TrailLogo size={28} data-nav-logo aria-hidden="true" />
            <span className="font-heading text-sm font-medium tracking-[0.2em] text-[#f2f4f6]">
              TRAIL
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3" aria-label="Primary navigation">
            <NavGithubLink />
          </nav>
        </header>

        <HeroExperience />
      </section>

      <ProblemSection />
      <SetupSection />
      <RedactionSection />
      <GithubSection />
      <FlagSection />
      <ClosingCtaSection />
      <SiteFooter />
    </main>
  );
}
