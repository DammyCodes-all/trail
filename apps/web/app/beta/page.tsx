import type { Metadata } from "next";
import Link from "next/link";
import { TrailLogo } from "@/components/trail-logo";
import { NavGithubLink } from "@/components/landing/nav-github-link";
import { SiteFooter } from "@/components/landing/cta/site-footer";
import { BetaHero } from "@/components/beta/beta-hero";
import { ReportBugSection } from "@/components/beta/report-bug-section";
import HowItWorks from "@/components/ui/how-it-works";
import { CopyCommand } from "@/components/beta/copy-command";

export const metadata: Metadata = {
  title: "TRAIL — Public Beta",
  description:
    "TRAIL is open for testing. Download the beta, load it unpacked in Chrome, and turn your next bug into a complete reproduction trail.",
  alternates: { canonical: "/beta" },
  openGraph: {
    title: "TRAIL — Public Beta",
    description:
      "Install TRAIL manually during the public beta. Record, replay, and report browser bugs without an SDK.",
    url: "/beta",
    siteName: "TRAIL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TRAIL — Public Beta",
    description:
      "Install the extension manually today. Chrome Web Store listing coming soon.",
  },
};

export default function BetaPage() {
  return (
    <main
      id="top"
      className="relative isolate flex-1 overflow-hidden bg-[#0d0f0e] text-[#f2f4f6]"
    >
      <section className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <header className="flex h-20 items-center justify-between sm:h-24">
          <Link
            href="/"
            className="relative flex min-h-11 items-center gap-2 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
            aria-label="TRAIL home"
          >
            <TrailLogo size={28} aria-hidden="true" />
            <span className="font-heading text-sm font-medium tracking-[0.2em] text-[#f2f4f6]">
              TRAIL
            </span>
          </Link>
          <nav
            className="flex items-center gap-1 sm:gap-3"
            aria-label="Primary navigation"
          >
            <NavGithubLink />
          </nav>
        </header>
      </section>

      <BetaHero />

      <section
        id="install"
        aria-label="How to install the beta"
        className="relative isolate overflow-hidden border-t border-white/[0.06] bg-[#0d0e10]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_40%_at_50%_0%,black_30%,transparent_75%)]"
        />
        <div className="mx-auto max-w-6xl px-5 pt-14 sm:px-8 sm:pt-16 lg:px-10">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#ff6a00]">
            Install in four steps
          </p>
          <h2 className="mt-3 max-w-2xl font-heading text-3xl font-bold leading-[1.05] text-[#f2f4f6] sm:text-[2.25rem]">
            Follow the trail.
          </h2>
        </div>
        <HowItWorks />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-5 pb-16 sm:px-8 sm:pb-20 lg:px-10">
          <span className="font-mono text-xs tracking-[0.05em] text-[#8b929c]">
            Paste this into your address bar:
          </span>
          <CopyCommand command="chrome://extensions" />
        </div>
      </section>

      <ReportBugSection />
      <SiteFooter />
    </main>
  );
}
