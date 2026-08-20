import Link from "next/link";
import { TrailLogo } from "@/components/trail-logo";
import { AntiMetalButton } from "@/components/ui/anti-metal-button";
import { GridGlow } from "@/components/landing/hero/grid-glow";
import { GithubStarsLogo } from "@/components/animate-ui/primitives/animate/github-stars";
import { CTA_HREF, CTA_LABEL, GITHUB_HREF, X_HREF } from "@/lib/site";
import { XIcon } from "@/components/icons/x-icon";

export function ClosingCtaSection() {
  return (
    <section
      id="get-started"
      className="relative isolate overflow-hidden border-t border-white/10 bg-[#0d0f0e] px-5 py-24 sm:px-8 sm:py-32 lg:px-10 lg:py-40"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_50%,black_35%,transparent_78%)]"
      />
      <GridGlow />
      <div className="relative mx-auto max-w-3xl text-center">
        <TrailLogo
          size={40}
          aria-hidden="true"
          className="mx-auto text-[#ff6a00]"
        />
        <h2 className="mx-auto mt-8 max-w-2xl font-heading text-[clamp(1.75rem,5vw,3rem)] font-bold leading-[0.98] tracking-[-0.04em] text-[#f2f4f6]">
          The next bug already has a trail. Go find it.
        </h2>
        <p className="mx-auto mt-5 max-w-xl font-mono text-xs tracking-[0.08em] text-[#8b929c] sm:text-sm">
          No setup. No SDK. Just open the extension.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href={CTA_HREF}
            target="_blank"
            rel="noreferrer"
            data-cta="closing"
          >
            <AntiMetalButton
              label={CTA_LABEL}
              accentFrom="#ff6a00"
              accentTo="#ff8a1f"
            />
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1 font-mono text-xs text-[#626973]">
          <a
            href={GITHUB_HREF}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 outline-none transition-colors hover:text-[#f2f4f6] focus-visible:text-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
          >
            <GithubStarsLogo className="size-3.5" />
            GitHub
          </a>
          <span aria-hidden="true" className="text-white/10">
            ·
          </span>
          <a
            href={X_HREF}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 outline-none transition-colors hover:text-[#f2f4f6] focus-visible:text-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
          >
            <XIcon className="size-3.5" aria-hidden="true" />
            @dev_aluminate
          </a>
        </div>
      </div>
    </section>
  );
}
