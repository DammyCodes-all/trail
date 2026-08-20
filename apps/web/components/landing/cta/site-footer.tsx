"use client";

import Link from "next/link";
import { TrailLogo } from "@/components/trail-logo";
import { GridGlow } from "@/components/landing/hero/grid-glow";
import { GithubStarsLogo } from "@/components/animate-ui/primitives/animate/github-stars";
import { GITHUB_HREF, X_HREF } from "@/lib/site";
import { XIcon } from "@/components/icons/x-icon";
import { useSiteFooterMotion } from "./use-site-footer-motion";
import { scrollToHash } from "@/lib/scroll-lock";

export function SiteFooter() {
  const root = useSiteFooterMotion();

  return (
    <footer
      ref={root}
      className="relative isolate overflow-hidden border-t border-white/[0.06] bg-[#0d0f0e] px-5 py-8 sm:px-8 lg:px-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_40%_at_50%_0%,black_30%,transparent_75%)]"
      />
      <GridGlow />
      <div className="relative mx-auto flex max-w-7xl flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <a
            data-footer-brand
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToHash("#top");
            }}
            className="flex items-center gap-2 rounded-md px-1 py-1 text-[#8b929c] outline-none transition-colors hover:text-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
            aria-label="TRAIL — back to top"
          >
            <TrailLogo size={20} aria-hidden="true" />
            <span className="font-heading text-xs font-medium tracking-[0.2em]">
              TRAIL
            </span>
          </a>
          <span className="hidden font-mono text-xs tracking-[0.08em] text-[#626973]/70 sm:inline">
            © 2026 TRAIL
          </span>
        </div>

        <nav
          aria-label="Footer"
          className="flex items-center gap-1 font-mono text-xs text-[#626973] sm:gap-3"
        >
          <a
            href="#privacy"
            onClick={(e) => {
              e.preventDefault();
              scrollToHash("#privacy");
            }}
            className="hidden cursor-pointer rounded-md px-2 py-1 outline-none transition-colors hover:text-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#ff6a00] sm:inline-flex"
          >
            Privacy
          </a>
          <a
            href="#faq"
            onClick={(e) => {
              e.preventDefault();
              scrollToHash("#faq");
            }}
            className="hidden cursor-pointer rounded-md px-2 py-1 outline-none transition-colors hover:text-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#ff6a00] sm:inline-flex"
          >
            FAQ
          </a>
          <a
            data-footer-link
            href={GITHUB_HREF}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 outline-none transition-colors hover:text-[#f2f4f6] focus-visible:text-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
          >
            <GithubStarsLogo className="size-3.5" />
            GitHub
          </a>
          <a
            data-footer-link
            href={X_HREF}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 outline-none transition-colors hover:text-[#f2f4f6] focus-visible:text-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
          >
            <XIcon className="size-3.5" aria-hidden="true" />
            Twitter
          </a>
        </nav>
      </div>
    </footer>
  );
}
