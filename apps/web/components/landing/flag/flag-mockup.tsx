"use client";

/**
 * The flag section's whole argument: an ordinary, unbroken-looking
 * confirmation screen with exactly one mark on it. Everything is the
 * page's neutral "live view" palette (the same light tones the redaction
 * section uses for a page the reporter saw) — the only color in the frame
 * is the orange ⚑ pin on the totals row. A hairline leader links the note
 * card beside it to the flagged row, and the value itself carries a
 * barely-there cream chip — a sticky-note mark, not an error.
 *
 * The pin is the exact flag glyph the extension's recording overlay uses.
 */

const FLAG_GLYPH = (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" x2="4" y1="22" y2="15" />
  </svg>
);

export function FlagMockup() {
  return (
    <div
      data-flag-mockup
      role="img"
      aria-label="An order confirmation page. A reporter has flagged the total for showing the wrong currency."
      className="relative mx-auto mt-8 max-w-md sm:mt-10 lg:grid lg:max-w-[42.75rem] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-3 [--flag-row-top:228px] [--flag-note-half:42px]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(50%_50%_at_50%_45%,rgba(242,244,246,0.09),transparent_72%)]"
      />
      <div
        data-flag-screen
        aria-hidden="true"
        className="relative border border-[#1e2124] bg-[#f8f9fa] shadow-[0_16px_48px_rgba(0,0,0,0.28)]"
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-md border border-[#d9dce1] bg-white font-heading text-sm font-semibold text-[#17191c]">
              A
            </div>
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold tracking-[-0.01em] text-[#17191c]">
                Acme
              </p>
              <p className="font-mono text-[10px] text-[#6b7078]">
                Order #4821
              </p>
            </div>
          </div>

          <p className="mt-4 font-heading text-lg font-semibold tracking-[-0.01em] text-[#17191c]">
            Order confirmed
          </p>
          <p className="mt-1 text-[13px] leading-5 text-[#6b7078]">
            Thanks, Jordan. We&apos;ll email your receipt to
            jordan@example.com.
          </p>

          <div className="mt-4 border-t border-[#e4e6ea] pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#17191c]">
                Acme — Annual plan
              </span>
              <span className="text-[13px] text-[#6b7078]">1 seat</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[13px] text-[#6b7078]">Subtotal</span>
              <span className="text-[13px] text-[#17191c]">NGN 120.00</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#e4e6ea] pt-3">
            <span className="font-heading text-sm font-semibold text-[#17191c]">
              Total
            </span>
            <span className="flex items-center gap-2">
              <span className="-mx-1 rounded-[3px] bg-[#f3ecd9] px-1 font-heading text-sm font-semibold text-[#17191c]">
                NGN 120.00
              </span>
              <span
                data-flag-pin
                className="relative grid size-5 place-items-center text-[#ff6a00]"
                aria-hidden="true"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full bg-[#ff6a00]/20 motion-safe:animate-ping motion-reduce:hidden"
                  style={{ animationDuration: "1.6s" }}
                />
                {FLAG_GLYPH}
              </span>
            </span>
          </div>

          <div className="mt-4 grid h-9 place-items-center rounded-sm border border-[#d9dce1] bg-[#17191c] font-mono text-xs font-semibold text-white">
            Back to store
          </div>
        </div>

        <span
          data-flag-cursor
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-20 opacity-0"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1.5 1.5v10.3l3-3 2 3.7 1.9-1-2-3.7H11L1.5 1.5z"
              fill="#0d0f0e"
              stroke="#f2f4f6"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      <svg
        data-flag-leader
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 12 3"
        className="pointer-events-none absolute right-56 top-[calc(var(--flag-row-top,228px)-1.5px)] z-10 hidden h-[3px] w-3 lg:block"
      >
        <path
          d="M 0.5 1.5 H 8"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1"
        />
        <circle cx="10" cy="1.5" r="1.4" fill="rgba(255,255,255,0.55)" />
      </svg>

      <div
        data-flag-note
        className="relative mx-auto mt-4 w-56 lg:mx-0 lg:mt-[calc(var(--flag-row-top,228px)-var(--flag-note-half,38px))]"
      >
        <div
          data-flag-note-card
          className="rounded-md border border-white/10 bg-[#151719] px-3 py-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#f2f4f6]">
            <span
              aria-hidden="true"
              className="grid size-4 place-items-center text-[#ff6a00]"
            >
              {FLAG_GLYPH}
            </span>
            Reporter flagged this
          </p>
          <div className="mt-2 space-y-1.5 font-mono text-[11px] leading-4">
            <p>
              <span className="font-medium text-[#9aa0a8]">Expected: </span>
              <span className="font-bold tracking-wide text-[#f2f4f6]">USD</span>
            </p>
            <p>
              <span className="font-medium text-[#9aa0a8]">Actual: </span>
              <span className="font-bold tracking-wide text-[#f2f4f6]">NGN</span>
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 pl-1">
          <span aria-hidden="true" className="h-3.5 w-px bg-white/15" />
          <p className="font-mono text-[10px] text-[#626973]">
            → added to report
          </p>
        </div>
      </div>
    </div>
  );
}