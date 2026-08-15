"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { TrailLogo } from "@/components/trail-logo";
import { attachStoryViewGate, createBrowserStory } from "./browser-story";

const trailEvents = [
  { label: 'Clicked "Run Test"', time: "00:04", tone: "bg-[#ff6a00]" },
  { label: "POST /api/run", time: "00:05", tone: "bg-[#4a9eff]" },
  { label: "500 Internal Server Error", time: "00:05", tone: "bg-[#ff4d4f]" },
  { label: "Console error captured", time: "00:05", tone: "bg-[#ff8a1f]" },
];

const timelineMarks = [
  { time: "00:00", percent: 0, color: "#626973" },
  { time: "00:04", percent: 33, color: "#ff6a00" },
  { time: "00:05", percent: 66, color: "#ff4d4f" },
  { time: "00:06", percent: 100, color: "#f2f4f6" },
];

const evidenceRows = [
  { category: "USER ACTION", label: 'Clicked "Run Test"', tone: "bg-[#ff6a00]" },
  { category: "NETWORK", label: "POST /api/run", tone: "bg-[#4a9eff]" },
  { category: "NETWORK", label: "500 Internal Server Error", tone: "bg-[#ff4d4f]" },
  { category: "CONSOLE", label: "Execution failed", tone: "bg-[#ff8a1f]" },
  { category: "TIMELINE", label: "00:04 → 00:05", tone: "bg-[#30d158]" },
];

export function BrowserScene() {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const rootEl = scope.current;
    if (!rootEl) {
      return;
    }

    let detachGate: (() => void) | undefined;
    let context: gsap.Context | undefined;
    let started = false;

    const startStory = () => {
      if (started) {
        return;
      }
      started = true;
      context = gsap.context(() => {
        gsap.to("[data-rec-dot]", {
          scale: 1.45,
          opacity: 0.35,
          yoyo: true,
          repeat: -1,
          duration: 0.8,
          ease: "sine.inOut",
        });
        const story = createBrowserStory(rootEl);
        detachGate = attachStoryViewGate(story, rootEl);
      }, rootEl);
    };

    window.addEventListener("trail:browser-revealed", startStory, { once: true });

    return () => {
      window.removeEventListener("trail:browser-revealed", startStory);
      detachGate?.();
      context?.revert();
    };
  }, []);

  return (
    <div
      ref={scope}
      data-hero-browser
      className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e10] text-left shadow-[0_24px_80px_rgba(0,0,0,0.45)] motion-safe:opacity-0"
    >
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
          <span data-rec-dot className="size-1.5 rounded-full bg-[#ff6a00]" />
          TRAIL REC
        </div>
      </div>

      <div className="grid min-h-[360px] grid-rows-[1fr_auto] sm:min-h-[430px]">
        <div
          data-browser-content
          className="relative flex min-h-[260px] items-center justify-center overflow-hidden px-5 py-10 sm:min-h-[320px]"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:28px_28px]"
          />
          <div
            data-browser-card
            className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#141618] p-5 sm:p-7"
          >
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
            <div
              data-browser-editor
              className="rounded-lg border border-white/10 bg-[#08090a] px-3 py-3 font-mono text-xs text-[#8b929c]"
            >
              <span className="text-[#626973]">1</span>
              <span className="ml-4 text-[#f2f4f6]">console</span>
              <span>.log(</span>
              <span className="text-[#30d158]">&quot;Hello TRAIL&quot;</span>
              <span>);</span>
            </div>
            <div className="relative mt-5 flex items-center justify-between gap-4">
              <p
                data-hero-error
                className="font-mono text-[10px] text-[#ff4d4f] motion-safe:opacity-0"
              >
                Something went wrong. Please try again.
              </p>
              <span
                data-run-button
                className="relative inline-flex min-h-10 min-w-[8.5rem] cursor-pointer select-none items-center justify-center overflow-hidden rounded-lg bg-[#ff6a00] text-sm font-semibold text-[#08090a]"
              >
                <span data-run-state="idle" className="inline-flex items-center gap-1.5">
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    aria-hidden="true"
                    className="fill-current"
                  >
                    <path d="M1.2 0.7a0.7 0.7 0 0 1 1.06-0.6l5 3a0.7 0.7 0 0 1 0 1.2l-5 3A0.7 0.7 0 0 1 1.2 6.7V0.7z" />
                  </svg>
                  Run Test
                </span>
                <span
                  data-run-state="running"
                  className="absolute font-mono text-xs motion-safe:opacity-0"
                >
                  Running…
                </span>
                <span
                  data-run-state="failed"
                  className="absolute font-mono text-xs text-[#ff4d4f] motion-safe:opacity-0"
                >
                  Execution failed
                </span>
                <span
                  data-click-ripple
                  className="absolute left-[calc(50%-32px)] top-[calc(50%-32px)] size-16 rounded-full bg-white/40 motion-safe:opacity-0"
                />
              </span>
              <span
                data-replay-label
                className="absolute -top-6 right-0 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#141618] px-2.5 py-1 font-mono text-[10px] text-[#f2f4f6] motion-safe:opacity-0"
              >
                <svg
                  width="7"
                  height="7"
                  viewBox="0 0 8 8"
                  aria-hidden="true"
                  className="fill-current"
                >
                  <path d="M1.2 0.7a0.7 0.7 0 0 1 1.06-0.6l5 3a0.7 0.7 0 0 1 0 1.2l-5 3A0.7 0.7 0 0 1 1.2 6.7V0.7z" />
                </svg>
                Replay
              </span>
            </div>
          </div>

          <svg
            data-browser-cursor
            className="absolute left-0 top-0 z-30 motion-safe:opacity-0"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            aria-hidden="true"
          >
            <path
              d="M2 1l9 4.6-4.1 1.2L4.2 12 2 1z"
              fill="#f2f4f6"
              stroke="#08090a"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>

          <div
            data-trail-panel
            className="absolute inset-x-0 bottom-0 z-10 rounded-t-xl border-x border-t border-white/10 bg-[#0d0e10]/95 p-4 backdrop-blur sm:p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrailLogo size={14} aria-hidden="true" />
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#f2f4f6]">
                  Trail
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#626973]">
                Session trail
              </span>
            </div>
            <ol className="grid gap-1.5">
              {trailEvents.map((event) => (
                <li
                  key={event.label}
                  data-trail-event
                  className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-[#141618] px-3 py-2"
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
            <div data-trail-strip className="relative mt-4 h-6">
              <div
                data-trail-line
                className="absolute inset-x-0 top-[calc(50%-0.5px)] h-px bg-white/15"
              />
              {timelineMarks.map((mark) => (
                <span
                  key={mark.time}
                  data-trail-marker
                  className="absolute top-[calc(50%-4.5px)]"
                  style={{ left: `calc(${mark.percent}% - 4.5px)` }}
                >
                  <TrailLogo size={9} color={mark.color} aria-hidden="true" />
                </span>
              ))}
              <div
                data-trail-playhead
                className="absolute left-0 top-[calc(50%-6px)] h-3 w-0.5 rounded-full bg-[#ff6a00] motion-safe:opacity-0"
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[9px] text-[#626973]">
              <span>00:00</span>
              <span>00:04</span>
              <span>00:05</span>
              <span>00:06</span>
            </div>
          </div>

          <div
            data-evidence-panel
            className="absolute inset-0 z-20 flex flex-col rounded-b-xl border border-white/10 bg-[#0d0e10] p-4 motion-safe:opacity-0 sm:p-5"
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-[#626973]">Replay</span>
              <span className="flex items-center gap-1.5 font-mono text-xs font-medium text-[#f2f4f6]">
                <span className="size-1.5 rounded-full bg-[#ff6a00]" />
                Evidence
              </span>
            </div>
            <div className="mt-4 grid gap-1.5">
              {evidenceRows.map((row) => (
                <div
                  key={row.label}
                  data-evidence-row
                  className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-[#141618] px-3 py-2"
                >
                  <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#626973]">
                    <span className={`size-1.5 rounded-full ${row.tone}`} />
                    {row.category}
                  </span>
                  <span className="truncate font-mono text-[10px] text-[#f2f4f6] sm:text-xs">
                    {row.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#08090a] px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrailLogo size={17} aria-hidden="true" />
              <span className="font-mono text-xs font-medium tracking-wide text-[#f2f4f6]">
                TRAIL
              </span>
            </div>
            <span className="relative flex min-h-4 items-center font-mono text-[10px] sm:text-xs">
              <span
                data-hero-recording
                className="flex items-center gap-1.5 text-[#f2f4f6] motion-safe:opacity-0"
              >
                <span className="size-1.5 rounded-full bg-[#ff6a00]" />
                Recording
              </span>
              <span
                data-hero-captured
                className="absolute right-0 flex items-center gap-1.5 whitespace-nowrap text-[#30d158]"
              >
                <span className="size-1.5 rounded-full bg-[#30d158]" />
                Trail captured
              </span>
            </span>
          </div>
          <p
            data-captured-summary
            className="font-mono text-[10px] text-[#626973]"
          >
            4 events · 1 error · 1 failed request
          </p>
        </div>
      </div>
    </div>
  );
}