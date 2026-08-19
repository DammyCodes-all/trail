"use client";

import {
  Check,
  Flag,
  ListChecks,
  Monitor,
  Network,
  Play,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { GithubStarsLogo } from "@/components/animate-ui/primitives/animate/github-stars";
import { TrailConnector } from "@/components/landing/problem/trail-connector";

/**
 * The GitHub section's proof follows the extension's real export pipeline:
 * report ingredients converge on Trail, then one compiled report opens as a
 * prefilled GitHub new-issue form. GSAP owns the pills, SVG connector, and
 * card assembly; the complete final diagram remains visible without motion.
 */

type Ingredient = {
  icon: LucideIcon;
  label: string;
  value: string;
  iconClass: string;
  widthClass: string;
  enterFrom: "left" | "right";
};

const INGREDIENTS: Ingredient[] = [
  {
    icon: ListChecks,
    label: "Steps to reproduce",
    value: "6 events",
    iconClass: "text-[#8b929c]",
    widthClass: "lg:min-w-[250px]",
    enterFrom: "left",
  },
  {
    icon: Flag,
    label: "Reporter notes",
    value: "@00:09",
    iconClass: "text-[#4a9eff]",
    widthClass: "lg:min-w-[225px]",
    enterFrom: "right",
  },
  {
    icon: Terminal,
    label: "Console errors",
    value: "1 folded",
    iconClass: "text-[#ff4d4f]",
    widthClass: "lg:min-w-[238px]",
    enterFrom: "left",
  },
  {
    icon: Monitor,
    label: "Environment",
    value: "Chrome · macOS",
    iconClass: "text-[#8b929c]",
    widthClass: "lg:min-w-[258px]",
    enterFrom: "right",
  },
  {
    icon: Network,
    label: "Failed requests",
    value: "POST · 500",
    iconClass: "text-[#ff4d4f]",
    widthClass: "lg:min-w-[230px]",
    enterFrom: "left",
  },
  {
    icon: Play,
    label: "Session replay",
    value: "00:42",
    iconClass: "text-[#ff6a00]",
    widthClass: "lg:min-w-[218px]",
    enterFrom: "right",
  },
];

const ISSUE_SECTIONS = [
  {
    heading: "Steps to Reproduce",
    preview: "1. Open acme.com · 2. Click Sign in",
    previewClass: "text-[#8b929c]",
  },
  {
    heading: "Reporter Notes",
    preview: "@00:09 — Login button did nothing",
    previewClass: "text-[#8b929c]",
  },
  {
    heading: "Console Errors",
    preview: "401 Unauthorized ×3",
    previewClass: "text-[#ff4d4f]",
  },
  {
    heading: "Environment",
    preview: "Chrome 126 · macOS 14.5",
    previewClass: "text-[#8b929c]",
  },
  {
    heading: "Failed Requests",
    preview: "POST /api/login — 500",
    previewClass: "text-[#ff4d4f]",
  },
];

function ReportIngredients() {
  return (
    <ul
      data-report-ingredients
      aria-label="Evidence Trail combines into a report"
      className="mx-auto grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2 lg:col-start-1 lg:mx-0 lg:flex lg:h-full lg:max-w-none lg:flex-col lg:items-end lg:justify-between lg:gap-0 lg:py-6"
    >
      {INGREDIENTS.map((item) => (
        <li
          key={item.label}
          data-report-pill
          data-enter-from={item.enterFrom}
          className={`flex min-h-11 w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.18)] lg:w-auto ${item.widthClass}`}
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full border border-white/10 bg-[#141618]">
            <item.icon
              aria-hidden="true"
              className={`size-3 ${item.iconClass}`}
            />
          </span>
          <span className="min-w-0 truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[#f2f4f6]/90">
            {item.label}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[8.5px] tabular-nums text-[#626973]">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PrefilledIssue() {
  return (
    <div
      data-issue-card
      className="relative z-10 mx-auto w-full max-w-lg lg:col-start-3 lg:h-full lg:max-w-none"
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-1/2 z-20 hidden size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#ff6a00] lg:block"
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 z-20 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#ff6a00] lg:hidden"
      />

      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0a0b0d] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div
          data-issue-part
          className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 bg-[#0d0e10] px-4"
        >
          <GithubStarsLogo aria-hidden="true" className="size-3.5 text-[#8b929c]" />
          <span className="min-w-0 truncate font-mono text-[9px] text-[#8b929c]">
            github.com/acme/web/issues/new
          </span>
          <span className="ml-auto shrink-0 rounded-sm border border-[#ff6a00]/30 bg-[#ff6a00]/10 px-1.5 py-0.5 font-mono text-[8px] font-medium uppercase tracking-[0.14em] text-[#ff6a00]">
            Prefilled
          </span>
        </div>

        <div
          data-issue-part
          className="shrink-0 border-b border-white/10 px-4 py-2"
        >
          <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#626973]">
            Title
          </p>
          <p className="mt-1 truncate rounded-sm border border-white/10 bg-[#0d0e10] px-2.5 py-1 font-mono text-[10.5px] font-semibold text-[#f2f4f6]">
            Sign in failed: 401 Unauthorized
          </p>
        </div>

        <div
          data-issue-part
          className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-1.5 font-mono text-[9px] text-[#30d158]"
        >
          <Check aria-hidden="true" className="size-3 shrink-0" />
          <span className="truncate">
            Report follows Bug report (bug.yml)
          </span>
        </div>

        <div
          data-issue-part
          className="shrink-0 border-b border-white/10 px-4 py-1.5 font-mono text-[8.5px] text-[#4a9eff]"
        >
          &gt; <span className="font-semibold">Replay:</span> Open the captured
          session in TRAIL
        </div>

        <ul
          aria-label="Prefilled issue body"
          className="grid min-h-0 flex-1 grid-rows-5"
        >
          {ISSUE_SECTIONS.map((section) => (
            <li
              key={section.heading}
              data-issue-part
              className="flex min-h-0 flex-col justify-center border-b border-white/10 px-4 py-1"
            >
              <p className="font-mono text-[8px] font-medium text-[#ff6a00]">
                ### {section.heading}
              </p>
              <p
                className={`mt-0.5 truncate font-mono text-[8.5px] ${section.previewClass}`}
              >
                {section.preview}
              </p>
            </li>
          ))}
        </ul>

        <div
          data-issue-part
          className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-1.5"
        >
          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#626973]">
            Labels
          </span>
          <span className="rounded-full border border-[#30d158]/25 bg-[#30d158]/10 px-2 py-0.5 font-mono text-[8px] text-[#30d158]">
            bug
          </span>
          <span className="rounded-full border border-[#4a9eff]/25 bg-[#4a9eff]/10 px-2 py-0.5 font-mono text-[8px] text-[#4a9eff]">
            needs-triage
          </span>
        </div>

        <div
          data-issue-part
          className="flex min-h-9 shrink-0 items-center justify-between gap-3 px-4 py-1.5"
        >
          <span className="font-mono text-[8.5px] text-[#626973]">
            Review before submitting
          </span>
          <span className="shrink-0 rounded-sm bg-[#238636] px-2.5 py-1.5 text-[9px] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            Submit new issue
          </span>
        </div>
      </div>
    </div>
  );
}

export function GithubMapping() {
  return (
    <div
      data-map-stage
      aria-label="Trail combines replay, timeline, notes, console, environment, and network evidence into a prefilled GitHub issue."
      className="relative mx-auto mt-8 max-w-5xl sm:mt-10 lg:aspect-[5/2]"
    >
      <TrailConnector orientation="horizontal" variant="report" />

      <div className="relative z-10 grid lg:h-full lg:grid-cols-[31%_22%_47%]">
        <ReportIngredients />

        <div
          data-report-mobile-connector
          className="relative mx-auto h-[220px] w-full lg:hidden"
        >
          <TrailConnector orientation="vertical" variant="report" />
        </div>

        <PrefilledIssue />
      </div>
    </div>
  );
}
