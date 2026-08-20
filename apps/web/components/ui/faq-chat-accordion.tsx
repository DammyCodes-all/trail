"use client";

import * as React from "react";
import { motion } from "framer-motion";
import * as Accordion from "@radix-ui/react-accordion";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  icon?: string;
  iconPosition?: "left" | "right";
}

interface FaqAccordionProps {
  data: FAQItem[];
  className?: string;
  timestamp?: string;
  questionClassName?: string;
  answerClassName?: string;
}

export function FaqAccordion({
  data,
  className,
  timestamp = "Every day, 9:01 AM",
  questionClassName,
  answerClassName,
}: FaqAccordionProps) {
  const [openItem, setOpenItem] = React.useState<string | null>(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Let Lenis + ScrollTrigger know the page height changed so you can still reach the bottom.
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { ScrollTrigger } = require("gsap/ScrollTrigger");
        ScrollTrigger.refresh();
      } catch {}
      // Nudge Lenis — it reads the document height on its next raf.
      window.dispatchEvent(new Event("resize"));
    }, 340);
    return () => window.clearTimeout(id);
  }, [openItem]);

  return (
    <div className={cn("p-4", className)}>
      {timestamp && (
        <div className="mb-4 font-mono text-[10px] tracking-[0.16em] text-[#626973]">
          {timestamp}
        </div>
      )}

      <Accordion.Root
        type="single"
        collapsible
        value={openItem || ""}
        onValueChange={(value) => setOpenItem(value)}
      >
        {data.map((item) => (
          <Accordion.Item
            value={item.id.toString()}
            key={item.id}
            className="mb-2"
          >
            <Accordion.Header>
              <Accordion.Trigger className="flex w-full items-center justify-between gap-x-4 rounded-md px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]">
                <div
                  className={cn(
                    "relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left font-mono text-xs leading-5 transition-colors sm:text-sm",
                    openItem === item.id.toString()
                      ? "border-[#ff6a00]/30 bg-[#ff6a00]/15 text-[#ff8a1f]"
                      : "border-white/10 bg-white/[0.045] text-[#f2f4f6] hover:bg-white/[0.07]",
                    questionClassName,
                  )}
                >
                  {item.icon && (
                    <span
                      className={cn(
                        "absolute bottom-6 text-sm",
                        item.iconPosition === "right" ? "right-0" : "left-0",
                      )}
                      style={{
                        transform:
                          item.iconPosition === "right"
                            ? "rotate(7deg)"
                            : "rotate(-4deg)",
                      }}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                  )}
                  <span className="font-medium tracking-[-0.01em]">{item.question}</span>
                </div>

                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border text-[#8b929c] transition-colors",
                    openItem === item.id.toString()
                      ? "border-[#ff6a00]/30 bg-[#ff6a00]/10 text-[#ff6a00]"
                      : "border-white/10 bg-white/[0.03]",
                  )}
                  aria-hidden="true"
                >
                  {openItem === item.id.toString() ? (
                    <Minus className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content asChild forceMount>
              <motion.div
                initial="collapsed"
                animate={openItem === item.id.toString() ? "open" : "collapsed"}
                variants={{
                  open: { opacity: 1, height: "auto" },
                  collapsed: { opacity: 0, height: 0 },
                }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.32,
                  ease: [0.23, 1, 0.32, 1],
                }}
                className="overflow-hidden motion-reduce:transition-none"
              >
                <div className="ml-7 mt-2 md:ml-14">
                  <div
                    className={cn(
                      "relative max-w-[560px] rounded-2xl border border-white/10 bg-[#151719] px-4 py-3 font-mono text-xs leading-6 text-[#8b929c] sm:text-sm",
                      answerClassName,
                    )}
                  >
                    {item.answer}
                  </div>
                </div>
              </motion.div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  );
}
