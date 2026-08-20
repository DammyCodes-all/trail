"use client";

import { InteractiveAccordion } from "@/components/ui/interactive-accordion";
import { useFaqSectionMotion } from "./use-faq-section-motion";

const FAQ_DATA = [
  {
    id: 1,
    question: "Will you see my passwords or card numbers?",
    answer:
      "No. They are hidden in your browser before anything is saved. Passwords and payment fields are replaced with [redacted] and never reach our servers.",
  },
  {
    id: 2,
    question: "Do you need my GitHub token?",
    answer:
      "No. Trail opens a ready to send GitHub issue in your browser. You review it and submit it yourself. The full report is also copied to your clipboard.",
  },
  {
    id: 3,
    question: "What happens when I hit Share?",
    answer:
      "Nothing uploads until you choose Share. We create a private link like /r/abc123 for that session. Sharing the same session again reuses the link.",
  },
  {
    id: 4,
    question: "Does the AI see my replay?",
    answer:
      "No. It only sees a short text summary of steps and errors, not the video. If no AI key is set on the server, Trail just uses the normal report.",
  },
  {
    id: 5,
    question: "Do I need to install anything on my site?",
    answer:
      "No. Just open the extension and hit Record. It works on any site with no setup. You can even flag something that just looks wrong.",
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
            Got questions? Trail has answers.
          </h2>
          <p
            data-faq-copy
            className="mx-auto mt-4 max-w-xl text-sm leading-6 tracking-[-0.01em] text-[#8b929c] sm:text-base sm:leading-7"
          >
            The bits teams ask before they hit record — answered in the same chat you already know.
          </p>
        </div>

        <div data-faq-accordion className="mx-auto mt-8 max-w-3xl border border-white/10 bg-[#0d0e10]/40 p-2 sm:p-6">
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
