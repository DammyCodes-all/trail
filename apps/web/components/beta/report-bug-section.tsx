import { Bug } from "lucide-react";
import { BETA_REPORT_HREF } from "@/lib/site";

export function ReportBugSection() {
  return (
    <section
      id="report-a-bug"
      className="relative isolate overflow-hidden border-t border-white/10 bg-[#0d0f0e] px-5 py-20 sm:px-8 sm:py-28 lg:px-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_40%_at_50%_0%,black_30%,transparent_75%)]"
      />
      <div className="relative mx-auto max-w-2xl text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-[#ff6a00]/30 bg-[#ff6a00]/10">
          <Bug className="size-5 text-[#ff6a00]" aria-hidden="true" />
        </span>
        <h2 className="mt-6 font-heading text-3xl font-bold leading-[1.05] tracking-[-0.02em] text-[#f2f4f6] sm:text-[2.25rem]">
          Found a bug in TRAIL?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#8b929c] sm:text-base sm:leading-7">
          Beta software breaks. That&apos;s the point. If TRAIL acts up, open
          an issue and tell me what happened.
        </p>
        <div className="mt-8 flex justify-center">
          <a
            href={BETA_REPORT_HREF}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-[#ff6a00] px-6 text-sm font-medium text-[#0d0e10] shadow-[0_8px_24px_rgba(255,106,0,0.25)] outline-none transition-colors duration-150 hover:bg-[#ff8a1f] focus-visible:ring-2 focus-visible:ring-[#ff6a00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f0e]"
          >
            <Bug className="size-4" aria-hidden="true" />
            Report a bug
          </a>
        </div>
      </div>
    </section>
  );
}
