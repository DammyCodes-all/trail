"use client";

import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { GridGlow } from "@/components/landing/hero/grid-glow";
import { TrailLogo } from "@/components/trail-logo";
import { AntiMetalButton } from "@/components/ui/anti-metal-button";
import { BETA_DOWNLOAD_HREF, BETA_VERSION } from "@/lib/site";
import { useBetaHeroMotion } from "./use-beta-hero-motion";

/**
 * Beta hero, built as an installation experience rather than a marketing
 * banner: copy and download action on the left, a chrome://extensions
 * mockup on the right.
 */

function ExtensionsCard() {
  return (
    <div className="relative w-full max-w-[400px]">
      {/* Directional hint: flow arrives from the download side. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 84 12"
        className="absolute right-full top-[74px] mr-3 hidden h-3 w-[84px] lg:block"
      >
        <style>{`
          @keyframes hiw-hero-link-march {
            to { stroke-dashoffset: -24; }
          }
          .hiw-hero-link {
            stroke-dasharray: 6 6;
            animation: hiw-hero-link-march 1.2s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .hiw-hero-link { animation: none; }
          }
        `}</style>
        <path
          d="M 0 6 H 74"
          fill="none"
          stroke="#ff6a00"
          strokeOpacity="0.55"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="hiw-hero-link"
        />
        <path d="M 74 1.5 L 82 6 L 74 10.5 Z" fill="#ff6a00" fillOpacity="0.8" />
      </svg>
      <div
        data-beta-hero
        className="overflow-hidden rounded-xl border border-white/10 bg-[#101214] shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-5 py-3.5">
          <span className="text-sm font-medium text-[#c6cbd2]">Extensions</span>
          <span className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8b929c]">
              Developer mode
            </span>
            <span
              aria-hidden="true"
              className="relative inline-flex h-5 w-9 rounded-full bg-[#ff6a00]"
            >
              <span className="absolute right-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm" />
            </span>
          </span>
        </div>
        <div className="border-b border-white/[0.06] px-5 py-3">
          <span className="inline-flex cursor-default items-center gap-2 rounded-md border border-dashed border-[#ff6a00]/50 bg-[#ff6a00]/[0.08] px-3 py-1.5 font-mono text-[11px] font-medium text-[#ff8a1f]">
            <FolderOpen className="size-3.5" aria-hidden="true" />
            Load unpacked
          </span>
          <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#626973]">
            TRAIL goes here
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3.5 rounded-lg border border-[#ff6a00]/25 bg-[#ff6a00]/[0.05] p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-[#ff6a00]/30 bg-[#0d0e10]">
              <TrailLogo size={22} aria-hidden="true" className="text-[#ff6a00]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-heading text-sm font-semibold text-[#f2f4f6]">
                TRAIL
                <span className="rounded border border-[#ff6a00]/40 bg-[#ff6a00]/10 px-1.5 py-px font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#ff8a1f]">
                  Beta
                </span>
              </p>
              <p className="mt-0.5 truncate text-xs leading-5 text-[#8b929c]">
                {BETA_VERSION} · Turns bug repros into GitHub issues
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8b929c]">
              <span
                aria-hidden="true"
                className="inline-block size-1.5 rounded-full bg-[#37d67a]"
              />
              Loaded
            </span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[#626973]">
        chrome://extensions · loaded unpacked
      </p>
    </div>
  );
}

export function BetaHero() {
  const root = useBetaHeroMotion();

  return (
    <section
      ref={root}
      className="relative isolate overflow-hidden px-5 pb-24 pt-14 sm:px-8 sm:pb-28 sm:pt-20 lg:flex lg:min-h-[calc(100dvh-6rem)] lg:flex-col lg:items-center lg:justify-center lg:px-10"
    >
      <div aria-hidden="true" className="hero-grid -z-10" />
      <GridGlow />
      <div className="mx-auto grid max-w-6xl items-center gap-10 sm:grid-cols-2 sm:gap-8">
        <div className="max-w-xl">
          <p
            data-beta-hero
            className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#ff6a00]"
          >
            Public Beta
          </p>
          <h1
            data-beta-hero
            className="mt-4 font-heading text-4xl font-bold leading-[1.04] tracking-[-0.03em] text-[#f2f4f6] sm:text-[3rem]"
          >
            Install the beta.
          </h1>
          <p
            data-beta-hero
            className="mt-4 max-w-md text-sm leading-6 text-[#8b929c] sm:text-base sm:leading-7"
          >
            Load it unpacked, reproduce a bug, and TRAIL turns the session
            into a GitHub issue. No account, no SDK.
          </p>
          <div data-beta-hero className="mt-7">
            <Link
              href={BETA_DOWNLOAD_HREF}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg"
            >
              <AntiMetalButton
                label="Download TRAIL Beta"
                accentFrom="#ff6a00"
                accentTo="#ff8a1f"
              />
            </Link>
          </div>
        </div>

        <div className="justify-self-center sm:justify-self-end">
          <ExtensionsCard />
        </div>
      </div>

      <footer
        data-beta-hero
        className="mx-auto mt-16 hidden w-full max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#626973] sm:flex sm:mt-20 lg:mt-24"
      >
        <span className="text-[#8b929c]">{BETA_VERSION}</span>
        <span aria-hidden="true" className="text-white/20">
          ·
        </span>
        <span>Chrome extension</span>
        <span aria-hidden="true" className="text-white/20">
          ·
        </span>
        <span>Manual install</span>
        <span aria-hidden="true" className="text-white/20">
          ·
        </span>
        <span>No account</span>
        <span aria-hidden="true" className="text-white/20">
          ·
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-1.5 rounded-full bg-[#37d67a]"
          />
          Local-first
        </span>
      </footer>
    </section>
  );
}
