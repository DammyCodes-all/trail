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
import { FaqSection } from "@/components/landing/faq/faq-section";
import { ClosingCtaSection } from "@/components/landing/cta/closing-cta-section";
import { SiteFooter } from "@/components/landing/cta/site-footer";

export const metadata: Metadata = {
  title: "TRAIL — Every bug has a trail",
  description:
    "Chrome extension that records what happened, replays it, and turns browser bugs into evidence — no SDK, data stays in the browser.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "TRAIL — Every bug has a trail",
    description:
      "Record, replay, and report browser bugs without an SDK. Open source, GitHub-native, privacy by default.",
    url: "/",
    siteName: "TRAIL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TRAIL — Every bug has a trail",
    description: "No SDK. Just open the extension. Trail follows the bug for you.",
  },
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
            <Link
              href="/beta"
              className="inline-flex items-center rounded-md border border-[#ff6a00]/40 bg-[#ff6a00]/10 px-3 py-2 font-mono text-xs font-medium uppercase tracking-[0.12em] text-[#ff8a1f] outline-none transition-colors hover:border-[#ff6a00]/70 hover:bg-[#ff6a00]/[0.16] focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
            >
              Public Beta
            </Link>
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
      <FaqSection />
      <ClosingCtaSection />
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "TRAIL",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Chrome",
            isAccessibleForFree: true,
            url: "https://github.com/DammyCodes-all/trail",
            description:
              "Chrome extension that records browser sessions and turns bugs into GitHub issues — no SDK, privacy by default.",
          }),
        }}
      />
    </main>
  );
}
