"use client";

import {
  Check,
  Clock3,
  Headset,
  Image as ImageIcon,
  ListChecks,
  MousePointer2,
  Network,
  Play,
  Terminal,
  WifiOff,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TrailConnector } from "./trail-connector";
import { useProblemSectionMotion } from "./use-problem-section-motion";

type Fact = {
  key: string;
  icon: LucideIcon;
  label: string;
  to: number;
  suffix: string;
  cls: string;
};

const FACTS: Fact[] = [
  {
    key: "duration",
    icon: Clock3,
    label: "Duration",
    to: 55,
    suffix: "s",
    cls: "text-[#f2f4f6]",
  },
  {
    key: "interactions",
    icon: MousePointer2,
    label: "Interactions",
    to: 14,
    suffix: "",
    cls: "text-[#ff6a00]",
  },
  {
    key: "evidence",
    icon: ListChecks,
    label: "Evidence events",
    to: 9,
    suffix: "",
    cls: "text-[#ff6a00]",
  },
  {
    key: "failed",
    icon: WifiOff,
    label: "Failed requests",
    to: 1,
    suffix: "",
    cls: "text-[#ff4d4f]",
  },
];

const ROWS = [
  { icon: Play, label: "Replay", value: "00:55" },
  { icon: Network, label: "Network", value: "1 failed" },
  { icon: Terminal, label: "Console", value: "1 error" },
];

export function ProblemSection() {
  const root = useProblemSectionMotion();

  return (
    <section
      id="the-problem"
      ref={root}
      className="border-t border-white/10 bg-[#0d0e10] px-5 pb-32 pt-20 sm:px-8 sm:pb-40 sm:pt-24 lg:px-10"
    >
      <div className="mx-auto max-w-5xl">
        <div data-copy className="text-center">
          <h2 className="mx-auto max-w-3xl font-heading text-[clamp(1.75rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.035em] text-[#f2f4f6]">
            Guesswork in. Evidence out.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#8b929c] sm:text-lg sm:leading-8">
            One of these is what most bug reports look like. The other is what
            Trail sends instead.
          </p>
        </div>

        <div data-stage className="relative isolate mt-10 lg:mt-12">
          <TrailConnector orientation="horizontal" />
          <div className="relative z-10 grid items-start gap-0 lg:grid-cols-2 lg:gap-28">
            <div data-comparison-side="without" className="w-full">
              <p
                data-without-label
                className="mb-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8b929c]"
              >
                <X className="size-3" aria-hidden="true" />
                Without trail
              </p>
              <div
                data-fragments
                aria-hidden="true"
                className="pointer-events-none flex w-full max-w-sm flex-col items-start gap-4"
              >
                <div data-rough-item data-enter-from="left" className="self-start">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b929c]">
                    <span
                      className="size-1.5 rounded-full bg-[#ff4d4f]"
                      aria-hidden="true"
                    />
                    Ticket #4821
                    <span className="text-[#8b929c]/70">&middot; open</span>
                  </div>
                </div>
                <div
                  data-rough-item
                  data-enter-from="left"
                  className="self-start"
                >
                  <div className="-rotate-[1.5deg] max-w-[250px] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-3.5 py-2.5 text-[13px] leading-5 text-[#8b929c]">
                    &ldquo;The login button doesn&apos;t work.&rdquo;
                  </div>
                </div>
                <div
                  data-rough-item
                  data-enter-from="left"
                  className="ml-2 self-start"
                >
                  <p className="rotate-[1deg] font-mono text-[11px] leading-5 text-[#ff4d4f]">
                    <span className="text-[#8b929c]">[14:03:22]</span>{" "}
                    TypeError: cannot read &apos;value&apos; of null
                  </p>
                </div>
                <div
                  data-rough-item
                  data-enter-from="left"
                  className="ml-4 self-start"
                >
                  <div className="-rotate-[2deg] w-44 overflow-hidden rounded-md border border-dotted border-white/20 bg-white/[0.02]">
                    <div className="flex items-center gap-1.5 border-b border-dotted border-white/20 px-2.5 py-1.5">
                      <ImageIcon
                        className="size-2.5 text-[#8b929c]"
                        aria-hidden="true"
                      />
                      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#8b929c]">
                        Product screenshot
                      </span>
                      <span className="ml-auto font-mono text-[8px] text-[#626973]/60">
                        acme-143022.png
                      </span>
                    </div>
                    <div className="space-y-1.5 px-2.5 pb-3 pt-2.5">
                      <div className="h-1 w-8 rounded-sm bg-white/20" />
                      <div className="h-1.5 rounded-sm bg-white/10" />
                      <div className="h-1.5 rounded-sm bg-white/10" />
                      <div className="h-3 rounded-sm bg-white/20" />
                    </div>
                  </div>
                </div>
                <div
                  data-rough-item
                  data-enter-from="right"
                  className="self-end"
                >
                  <div className="flex rotate-[1.5deg] items-end gap-2">
                    <div className="max-w-[230px] rounded-2xl rounded-br-md border border-white/10 bg-white/[0.07] px-3.5 py-2.5 text-[13px] leading-5 text-[#8b929c]">
                      Can you reproduce it?
                    </div>
                    <div className="grid size-5 shrink-0 place-items-center rounded-full bg-[#1c1e22] ring-1 ring-white/10">
                      <Headset
                        className="size-3 text-[#626973]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
                <div
                  data-rough-item
                  data-enter-from="left"
                  className="self-start"
                >
                  <div className="-rotate-[1deg] max-w-[230px] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-3.5 py-2.5 text-[13px] leading-5 text-[#8b929c]">
                    I don&apos;t know what I clicked.
                  </div>
                </div>
              </div>
            </div>

            <div
              data-mobile-connector-slot
              className="relative z-0 my-7 h-[180px] lg:hidden"
            >
              <TrailConnector orientation="vertical" />
            </div>

            <div
              data-comparison-side="with"
              className="relative mx-auto w-full max-w-[420px]"
            >
              <p
                data-with-label
                className="mb-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff6a00]"
              >
                <Check className="size-3" aria-hidden="true" />
                With trail
              </p>
              <div
                data-card
                className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0a0b0d] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
              >
                <div
                  data-card-head
                  className="flex items-center gap-2 border-b border-white/10 px-4 py-4"
                >
                  <span
                    data-status-dot
                    className="size-1.5 rounded-full bg-[#30d158]"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#f2f4f6]">
                    Session captured
                  </span>
                </div>
                <div className="grid grid-cols-2">
                  {FACTS.map((fact) => (
                    <div
                      key={fact.key}
                      data-fact-cell
                      className="min-w-0 border-white/10 px-4 py-4 odd:border-r [&:nth-child(n+3)]:border-t"
                    >
                      <span className="flex items-center gap-2 text-[#8b929c]">
                        <fact.icon
                          className="size-3 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-[10px] leading-4">{fact.label}</span>
                      </span>
                      <span
                        data-fact
                        data-to={fact.to}
                        data-suffix={fact.suffix}
                        className={`mt-2 block truncate pl-5 font-heading text-lg font-semibold leading-none tabular-nums ${fact.cls}`}
                      >
                        {fact.to}
                        {fact.suffix}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  data-replay-strip
                  aria-hidden="true"
                  className="border-t border-white/10 px-4 py-4"
                >
                  <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8b929c]">
                    Replay timeline
                  </p>
                  <div data-replay-track className="relative h-2">
                    <div className="absolute inset-x-0 top-[3.5px] h-px bg-white/10" />
                    <div
                      data-replay-progress
                      className="absolute inset-x-0 top-[3.5px] h-px origin-left bg-[#ff6a00]/60"
                    />
                    <span className="absolute left-0 top-1/2 size-2 -translate-y-1/2 rounded-full bg-[#8b929c] ring-2 ring-[#0a0b0d]" />
                    <span className="absolute left-[32%] top-1/2 size-2 -translate-y-1/2 rounded-full bg-[#8b929c] ring-2 ring-[#0a0b0d]" />
                    <span className="absolute left-[62%] top-1/2 size-2 -translate-y-1/2 rounded-full bg-[#8b929c] ring-2 ring-[#0a0b0d]" />
                    <span
                      data-replay-playhead
                      className="absolute right-0 top-0 size-2 rounded-full bg-[#ff6a00] shadow-[0_0_8px_rgba(255,106,0,0.6)]"
                    />
                  </div>
                  <div className="mt-1 flex items-baseline justify-between font-mono text-[9px] text-[#626973]">
                    <span>00:00</span>
                    <span>00:55</span>
                  </div>
                </div>
                <div className="divide-y divide-white/10 border-t border-white/10">
                  {ROWS.map((row) => (
                    <div
                      key={row.label}
                      data-card-row
                      className="flex items-center gap-3 px-4 py-3.5"
                    >
                      <row.icon
                        className="size-4 shrink-0 text-[#626973]"
                        aria-hidden="true"
                      />
                      <span className="font-mono text-[11px] text-[#f2f4f6]/90">
                        {row.label}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-[#626973]">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div data-payoff className="mt-14">
          <p className="text-center font-heading text-2xl font-semibold tracking-[-0.02em] text-[#f2f4f6] sm:text-3xl">
            Now the bug has context.
          </p>
        </div>
      </div>
    </section>
  );
}
