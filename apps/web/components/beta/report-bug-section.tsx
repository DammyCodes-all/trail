import { Bug } from "lucide-react";
import { BETA_REPORT_HREF } from "@/lib/site";

export function ReportBugSection() {
  return (
    <section
      id="report-a-bug"
      className="relative border-t border-white/10 bg-[#0d0f0e] px-5 py-16 sm:px-8 sm:py-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_30%,transparent_75%)]"
      />
      <div className="mx-auto max-w-2xl rounded-lg border border-white/10 bg-[#151719] p-8 text-center shadow-[0_16px_48px_rgba(0,0,0,0.28)] sm:p-10">
        <Bug className="mx-auto size-7 text-[#ff6a00]" aria-hidden="true" />
        <h2 className="mt-5 font-heading text-2xl font-bold leading-tight text-[#f2f4f6] sm:text-3xl">
          Found a bug in TRAIL?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#8b929c]">
          Beta software breaks. That&apos;s the point. If TRAIL acts up, open
          an issue and tell me what happened.
        </p>
        <div className="mt-7 flex justify-center">
          <a
            href={BETA_REPORT_HREF}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-md border border-[#ff6a00]/40 bg-[#ff6a00]/10 px-5 font-mono text-xs font-medium uppercase tracking-[0.12em] text-[#ff8a1f] outline-none transition-colors duration-150 hover:border-[#ff6a00]/70 hover:bg-[#ff6a00]/[0.16] focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
          >
            Report a bug
          </a>
        </div>
      </div>
    </section>
  );
}
