"use client";

import Link from "next/link";
import { TrailLogo } from "@/components/trail-logo";
import { NavGithubLink } from "@/components/landing/nav-github-link";
import { useBetaHeaderMotion } from "./use-beta-header-motion";

/**
 * Beta page header. GSAP owns the short entrance (fade-down); hover and
 * focus states stay in CSS.
 */
export function BetaHeader() {
  const root = useBetaHeaderMotion();

  return (
    <section
      ref={root}
      className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10"
    >
      <header className="flex h-20 items-center justify-between sm:h-24">
        <Link
          data-beta-nav
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
          data-beta-nav
          className="flex items-center gap-1 sm:gap-3"
          aria-label="Primary navigation"
        >
          <NavGithubLink />
        </nav>
      </header>
    </section>
  );
}
