"use client";

import { RedactionMockup } from "./redaction-mockup";
import { useRedactionSectionMotion } from "./use-redaction-section-motion";

const SCOPE = ["Password fields", "Payment inputs", "Tokens & keys in logs"];

export function RedactionSection() {
  const root = useRedactionSectionMotion();

  return (
    <section
      id="privacy"
      ref={root}
      className="relative border-t border-white/10 bg-[#0d0e10] px-5 pb-14 pt-16 sm:px-8 sm:pb-16 sm:pt-20 lg:flex lg:min-h-dvh lg:flex-col lg:justify-center lg:px-10 lg:pb-16 lg:pt-16"
    >
      <div
        aria-hidden="true"
        data-glow
        className="glow-breathe pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 55% 45% at 82% 18%, rgba(255,120,20,0.055), transparent 70%), radial-gradient(ellipse 55% 45% at 14% 84%, rgba(80,160,255,0.045), transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-5xl">
        <div data-copy className="text-center">
          <p
            data-copy-line
            className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#ff8a1f]"
          >
            Privacy by default
          </p>
          <h2
            data-copy-line
            className="mx-auto mt-3 max-w-3xl font-heading text-[clamp(1.5rem,5vw,3.25rem)] font-bold leading-[1] tracking-[-0.04em] text-[#f2f4f6]"
          >
            Sensitive data never leaves the browser.
          </h2>
          <p
            data-copy-line
            className="mx-auto mt-4 max-w-xl text-sm leading-6 tracking-[-0.01em] text-[#8b929c] sm:text-base sm:leading-7"
          >
            Passwords, tokens, and personal fields are masked at the moment of
            capture — not scrubbed afterward.
          </p>
        </div>

        <RedactionMockup />

        <div
          data-log
          className="mx-auto mt-4 max-w-2xl overflow-hidden rounded-md border border-white/10 bg-[#0d0e10]/60"
        >
          <p className="border-b border-white/10 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#626973] sm:px-5">
            Network &amp; console · scrubbed at capture
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 font-mono text-[11px] leading-5 sm:px-5 sm:text-xs">
            <span className="font-semibold text-[#f2f4f6]/90">
              POST /api/checkout
            </span>
            <span>
              <span className="text-[#8b929c]">&quot;password&quot;: </span>
              <span className="text-[#ff8a1f]">&quot;[redacted]&quot;</span>
            </span>
            <span>
              <span className="text-[#ff8a1f]">[redacted]</span>
              <span className="text-[#8b929c]">@acme.com</span>
            </span>
            <span>
              <span className="text-[#8b929c]">token=</span>
              <span className="text-[#ff8a1f]">[redacted]</span>
            </span>
          </p>
        </div>

        <ul
          className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2"
          aria-label="What Trail redacts"
        >
          {SCOPE.map((item, i) => (
            <li key={item} data-scope-item className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8b929c]">
                {item}
              </span>
              {i < SCOPE.length - 1 ? (
                <span aria-hidden="true" className="text-[#626973]">
                  ·
                </span>
              ) : null}
            </li>
          ))}
        </ul>

        <p
          data-payoff
          className="mt-8 text-center font-heading text-2xl font-semibold tracking-[-0.02em] text-[#f2f4f6] sm:mt-10 sm:text-3xl"
        >
          What you don&apos;t want seen, isn&apos;t.
        </p>
      </div>
    </section>
  );
}
