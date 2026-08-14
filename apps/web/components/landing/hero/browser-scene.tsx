import { TrailLogo } from "@/components/trail-logo";

export const heroEvents = [
  { label: 'Clicked "Submit"', time: "00:04", tone: "bg-[#ff6a00]" },
  { label: "POST /api/submit", time: "00:05", tone: "bg-[#4a9eff]" },
  { label: "500 Internal Error", time: "00:05", tone: "bg-[#ff4d4f]" },
];

export function BrowserScene() {
  return (
    <div
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
              <p
                data-hero-error
                className="font-mono text-[10px] text-[#ff4d4f] motion-safe:opacity-0"
              >
                Request failed: 500
              </p>
              <span
                data-hero-submit
                className="inline-flex min-h-10 items-center rounded-lg bg-[#ff6a00] px-4 text-sm font-semibold text-[#08090a]"
              >
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
            <span className="relative flex min-h-4 items-center font-mono text-[10px] sm:text-xs">
              <span data-hero-recording className="flex items-center gap-1.5 text-[#f2f4f6]">
                <span className="size-1.5 rounded-full bg-[#ff6a00]" />
                Recording
              </span>
              <span
                data-hero-captured
                className="absolute right-0 flex items-center gap-1.5 whitespace-nowrap text-[#30d158] motion-safe:opacity-0"
              >
                <span className="size-1.5 rounded-full bg-[#30d158]" />
                Trail captured
              </span>
            </span>
          </div>
          <ol className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            {heroEvents.map((event) => (
              <li
                key={event.label}
                data-hero-event
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0d0e10] px-3 py-2.5 motion-safe:opacity-0"
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
