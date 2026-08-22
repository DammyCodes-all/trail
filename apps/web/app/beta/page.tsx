import type { Metadata } from "next";
import { BetaHeader } from "@/components/beta/beta-header";
import { SiteFooter } from "@/components/landing/cta/site-footer";
import { BetaHero } from "@/components/beta/beta-hero";
import { ReportBugSection } from "@/components/beta/report-bug-section";
import { InstallSection } from "@/components/beta/install-section";

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
      <BetaHeader />

      <BetaHero />

      <InstallSection />

      <ReportBugSection />
      <SiteFooter />
    </main>
  );
}
