import type { Metadata } from "next";
import { TrailLogo } from "@/components/trail-logo";

export const metadata: Metadata = {
  title: "TRAIL — Every bug has a trail",
  description:
    "Record what happened, replay it, and turn browser bugs into evidence.",
};

const events = [
  { label: 'Clicked "Submit"', time: "00:04", tone: "bg-[#ff6a00]" },
  { label: "POST /api/submit", time: "00:05", tone: "bg-[#4a9eff]" },
  { label: "500 Internal Error", time: "00:05", tone: "bg-[#ff4d4f]" },
];

function ArrowUpRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M3.5 12.5 12.5 3.5M6 3.5h6.5V10" />
    </svg>
  );
}

function BrowserScene() {
  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e10] text-left shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex h-12 items-center justify-between border-b border-white/10 px-4 sm:px-5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="font-mono text-[10px] text-[#8b929c] sm:text-xs">
          playground.example.com
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[10px] font-medium text-[#f2f4f6] sm:text-xs">
          <span className="size-1.5 rounded-full bg-[#ff6a00]" />
          TRAIL REC
        </div>
      </div>

      <div className="grid min-h-[360px] grid-rows-[1fr_auto] sm:min-h-[430px]">
        <div className="relative flex min-h-[230px] items-center justify-center overflow-hidden px-5 py-10 sm:min-h-[290px]">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:28px_28px]"
          />
          <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#141618] p-5 sm:p-7">
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#626973]">
                  Code Playground
                </p>
                <p className="mt-1 text-sm font-medium text-[#f2f4f6]">
                  Submit a quick test
                </p>
              </div>
              <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-[#8b929c]">
                JS
              </span>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#08090a] px-3 py-3 font-mono text-xs text-[#8b929c]">
              <span className="text-[#626973]">1</span>
              <span className="ml-4 text-[#f2f4f6]">console</span>
              <span>.log(</span>
              <span className="text-[#30d158]">&quot;hello&quot;</span>
              <span>);</span>
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="font-mono text-[10px] text-[#ff4d4f]">Request failed: 500</p>
              <span className="inline-flex min-h-10 items-center rounded-lg bg-[#ff6a00] px-4 text-sm font-semibold text-[#08090a]">
                Submit
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#08090a] px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrailLogo size={17} aria-hidden="true" />
              <span className="font-mono text-xs font-medium tracking-wide text-[#f2f4f6]">
                TRAIL
              </span>
            </div>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#30d158] sm:text-xs">
              <span className="size-1.5 rounded-full bg-[#30d158]" />
              Trail captured
            </span>
          </div>
          <ol className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            {events.map((event) => (
              <li
                key={event.label}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0d0e10] px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2 font-mono text-[10px] text-[#f2f4f6] sm:text-xs">
                  <span className={`size-1.5 shrink-0 rounded-full ${event.tone}`} />
                  <span className="truncate">{event.label}</span>
                </span>
                <time className="shrink-0 font-mono text-[10px] text-[#626973]">
                  {event.time}
                </time>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative isolate overflow-hidden bg-[#08090a] text-[#f2f4f6]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] bg-[radial-gradient(circle_at_50%_28%,rgba(255,106,0,0.12),transparent_44%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />

      <section className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-5 pb-14 sm:px-8 lg:px-10">
        <header className="flex h-20 items-center justify-between sm:h-24">
          <a
            href="#top"
            className="flex min-h-11 items-center gap-2 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
            aria-label="TRAIL home"
          >
            <TrailLogo size={28} aria-hidden="true" />
            <span className="font-heading text-base font-semibold tracking-[0.16em] text-[#f2f4f6]">
              TRAIL
            </span>
          </a>
          <nav className="flex items-center gap-1 sm:gap-3" aria-label="Primary navigation">
            <a
              className="rounded-md px-3 py-2 text-sm text-[#8b929c] outline-none transition-colors hover:text-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
              href="#how-it-works"
            >
              Product
            </a>
            <a
              className="rounded-md px-3 py-2 text-sm text-[#8b929c] outline-none transition-colors hover:text-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
              href="https://github.com/DammyCodes-all/trail"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
        </header>

        <div id="top" className="flex flex-1 flex-col items-center justify-center pb-8 pt-14 text-center sm:pt-20 lg:pt-24">
          <div className="mb-8 flex size-16 items-center justify-center rounded-2xl border border-[#ff6a00]/20 bg-[#ff6a00]/10 sm:mb-10 sm:size-20">
            <TrailLogo size={42} aria-hidden="true" />
          </div>
          <h1 className="max-w-4xl font-heading text-5xl font-bold leading-[0.98] tracking-[-0.045em] text-[#f2f4f6] sm:text-7xl lg:text-[5.9rem]">
            Every bug has a <span className="text-[#ff6a00]">trail.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#8b929c] sm:text-lg sm:leading-8">
            <span className="font-medium text-[#f2f4f6]">Record what happened. Replay it. Report it.</span>
            <br />
            Without asking users to explain everything.
          </p>
          <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <a
              href="https://github.com/DammyCodes-all/trail"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#ff6a00] px-5 text-sm font-semibold text-[#08090a] outline-none transition-colors hover:bg-[#ff8a1f] focus-visible:ring-2 focus-visible:ring-[#ff6a00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090a]"
            >
              Get TRAIL
              <ArrowUpRightIcon />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-5 text-sm font-medium text-[#f2f4f6] outline-none transition-colors hover:border-white/25 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[#ff6a00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090a]"
            >
              See how it works
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        <BrowserScene />
      </section>

      <section id="how-it-works" className="border-t border-white/10 bg-[#0d0e10] px-5 py-24 sm:px-8 sm:py-32 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#ff8a1f]">
              The missing context
            </p>
            <h2 className="mt-5 max-w-xl font-heading text-4xl font-semibold leading-tight tracking-[-0.035em] text-[#f2f4f6] sm:text-5xl">
              A screenshot doesn&apos;t tell you what happened.
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-[#8b929c]">
            TRAIL connects the user&apos;s action to the browser&apos;s response: clicks, input, console errors, failed requests, and a replayable session in one maintainer-ready report.
          </p>
        </div>
      </section>
    </main>
  );
}
