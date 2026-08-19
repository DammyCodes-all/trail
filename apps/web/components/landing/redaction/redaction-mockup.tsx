"use client";

import type { ReactNode } from "react";
import { ImageComparison } from "@/components/ui/image-comparison";
import { cn } from "@/lib/utils";

/**
 * The redaction section's proof — one checkout form, compared by dragging:
 * left of the handle is the page as the reporter saw it, in light theme;
 * right of the handle is "What Trail sees", the same page reading as dark
 * theme with every typed value replaced by a hatched bar. Dragging is the
 * verification — the visitor reveals each field at their own pace. The live
 * side is the base layer, so the default frame shows the ordinary page with
 * the redacted capture waiting at the right.
 *
 * The slider is a direct manipulation under the visitor's pointer (no
 * animation); the section entrance belongs to GSAP — it animates the wrapper
 * and sweeps the hatched bars across the redacted fields once, it never
 * animates the drag interaction. The drag handle's hover and drag states
 * belong to Motion.
 */

function RedactionBar() {
  return (
    <span
      aria-hidden="true"
      data-redact-bar
      className="block h-5 w-full rounded-[2px] bg-[#0a0b0d] lg:h-6"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 7px)",
      }}
    />
  );
}

function Field({
  label,
  children,
  light,
  className,
}: {
  label: string;
  children: ReactNode;
  light: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <span
        className={cn(
          "font-mono text-[10px] uppercase tracking-[0.16em]",
          light ? "text-[#6b7078]" : "text-[#626973]",
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          "mt-1 flex h-9 items-center overflow-hidden rounded-sm border px-3 font-mono text-xs lg:h-10 lg:text-sm",
          light
            ? "border-[#d9dce1] bg-white text-[#17191c]"
            : "border-white/10 bg-[#0d0e10] text-[#f2f4f6]",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function CheckoutForm({
  redacted,
  light,
}: {
  redacted: boolean;
  light: boolean;
}) {
  return (
    <div
      className={cn(
        "p-4 sm:p-5 lg:p-6",
        light ? "bg-[#f8f9fa]" : "bg-[#08090a]",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-md border font-heading text-sm font-semibold lg:size-10",
            light
              ? "border-[#d9dce1] bg-white text-[#17191c]"
              : "border-white/10 bg-[#141618] text-[#f2f4f6]",
          )}
        >
          A
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "font-heading text-sm font-semibold tracking-[-0.01em]",
              light ? "text-[#17191c]" : "text-[#f2f4f6]",
            )}
          >
            Acme — Annual plan
          </p>
          <p
            className={cn(
              "font-mono text-[10px]",
              light ? "text-[#6b7078]" : "text-[#8b929c]",
            )}
          >
            1 seat &middot; renews 2027
          </p>
        </div>
        <p
          className={cn(
            "ml-auto shrink-0 font-heading text-sm font-semibold",
            light ? "text-[#17191c]" : "text-[#f2f4f6]",
          )}
        >
          $120
        </p>
      </div>

      <div
        className={cn(
          "mt-4 border-t pt-3 lg:mt-5 lg:pt-4",
          light ? "border-[#e4e6ea]" : "border-white/10",
        )}
      >
        <p
          className={cn(
            "font-heading text-sm font-semibold",
            light ? "text-[#17191c]" : "text-[#f2f4f6]",
          )}
        >
          Payment
        </p>
        <div className="mt-2.5 grid gap-2.5 lg:mt-3 lg:grid-cols-2">
          <Field label="First name" light={light}>
            {redacted ? <RedactionBar /> : "Jordan"}
          </Field>
          <Field label="Email" light={light}>
            {redacted ? <RedactionBar /> : "jordan@example.com"}
          </Field>
          <Field label="Card number" light={light} className="lg:col-span-2">
            {redacted ? <RedactionBar /> : "4242 •••• •••• 4242"}
          </Field>
          <Field label="Expiry" light={light}>
            {redacted ? <RedactionBar /> : "09/29"}
          </Field>
          <Field label="CVV" light={light}>
            {redacted ? <RedactionBar /> : "•••"}
          </Field>
        </div>
      </div>

      <div
        className={cn(
          "mt-4 grid h-9 place-items-center rounded-sm border font-mono text-xs font-semibold lg:mt-5 lg:h-10",
          light
            ? "border-[#d9dce1] bg-[#17191c] text-white"
            : "border-white/10 bg-[#141618] text-[#f2f4f6]",
        )}
      >
        Pay $120
      </div>
    </div>
  );
}

export function RedactionMockup() {
  return (
    <div
      data-mockup
      aria-label="Compare the live checkout page with what Trail records"
      className="mx-auto mt-8 max-w-md sm:mt-10 sm:max-w-lg lg:max-w-5xl"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b929c]">
          Live view
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ff8a1f]">
          What Trail sees
        </span>
      </div>

      <ImageComparison
        label="Compare the live checkout page with what Trail records"
        className="border border-[#1e2124] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        initialInset={20}
        base={<CheckoutForm redacted={false} light />}
        reveal={<CheckoutForm redacted light={false} />}
      />
    </div>
  );
}