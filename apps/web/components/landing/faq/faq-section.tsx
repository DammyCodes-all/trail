"use client";

import { InteractiveAccordion } from "@/components/ui/interactive-accordion";
import { useFaqSectionMotion } from "./use-faq-section-motion";

const FAQ_DATA = [
  {
    id: 1,
    question: "Isn't this just a screen recorder?",
    answer:
      "A screen recording shows what happened. TRAIL captures why it happened. A video shows a click and an error. TRAIL connects that click to the console error, failed request, browser state, and steps to reproduce it.",
  },
  {
    id: 2,
    question: "Does TRAIL record everything I do?",
    answer:
      "No. Recording starts when you choose to capture a bug and stops when you finish. TRAIL collects just enough evidence to reproduce the issue without recording your whole browsing history.",
  },
  {
    id: 3,
    question: "What happens when there is no console error?",
    answer:
      "That is okay. A bug does not need a JavaScript exception to leave evidence. TRAIL can still capture the interaction trail, failed requests, page context, and other signals to help reproduce it.",
  },
  {
    id: 4,
    question: "Can it tell if the user caused the problem?",
    answer:
      "TRAIL can surface evidence that points toward user error, application failure, or an unclear path. It does not claim to know the root cause with certainty.",
  },
  {
    id: 5,
    question: "Can I send the report to GitHub?",
    answer:
      "Yes. TRAIL turns a captured session into a structured issue you can review and file in GitHub, with reproduction steps, console and network evidence, and the replay.",
  },
  {
    id: 6,
    question: "Does it use AI?",
    answer:
      "AI helps TRAIL organize and explain the evidence it captured. The underlying evidence always comes from the browser session itself. Observability first, AI second.",
  },
];

const ACCORDION_ITEMS = FAQ_DATA.map((item, i) => ({
  id: String(item.id),
  number: String(i + 1).padStart(2, "0"),
  title: item.question,
  content: item.answer,
}));

export function FaqSection() {
  const root = useFaqSectionMotion();

  return (
    <section
      id="faq"
      ref={root}
      className="relative isolate overflow-hidden border-t border-white/10 bg-[#0d0e10] px-5 py-16 sm:px-8 sm:py-20 lg:px-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_40%_at_50%_0%,black_30%,transparent_75%)]"
      />
      <div className="relative mx-auto max-w-5xl">
        <div className="text-center">
          <p
            data-faq-copy
            className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#ff6a00]"
          >
            FAQ
          </p>
          <h2
            data-faq-copy
            className="mx-auto mt-3 max-w-3xl font-heading text-[clamp(1.5rem,5vw,3.25rem)] font-bold leading-[1] tracking-[-0.04em] text-[#f2f4f6]"
          >
            Questions? We&apos;ve got the trail.
          </h2>
          <p
            data-faq-copy
            className="mx-auto mt-4 max-w-xl text-sm leading-6 tracking-[-0.01em] text-[#8b929c] sm:text-base sm:leading-7"
          >
            The answers to the things developers want to know before they start capturing a bug.
          </p>
        </div>

        <div data-faq-accordion className="mx-auto mt-8 max-w-3xl p-2 sm:p-2">
          <InteractiveAccordion items={ACCORDION_ITEMS} defaultOpen="1" className="w-full" />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_DATA.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          }),
        }}
      />
    </section>
  );
}
