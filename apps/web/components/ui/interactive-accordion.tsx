"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export interface AccordionItem {
  id: string
  number: string
  title: string
  content: string
}

interface InteractiveAccordionProps {
  items: AccordionItem[]
  defaultOpen?: string | null
  className?: string
}

export function InteractiveAccordion({ items, defaultOpen = null, className }: InteractiveAccordionProps) {
  const [activeId, setActiveId] = useState<string | null>(defaultOpen ?? items[0]?.id ?? null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Keep Lenis + ScrollTrigger in sync when height changes — fixes "can't scroll to bottom when FAQ is open"
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { ScrollTrigger } = require("gsap/ScrollTrigger")
        ScrollTrigger.refresh()
      } catch {}
      window.dispatchEvent(new Event("resize"))
    }, 340)
    return () => window.clearTimeout(id)
  }, [activeId])

  return (
    <div className={className ?? "w-full max-w-3xl"}>
      <div className="space-y-0">
        {items.map((item, index) => {
          const isActive = activeId === item.id
          const isHovered = hoveredId === item.id

          return (
            <div key={item.id}>
              <motion.button
                onClick={() => setActiveId(isActive ? null : item.id)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="w-full group relative text-left"
                initial={false}
                aria-expanded={isActive}
              >
                <div className="flex items-center gap-4 py-5 px-1 sm:gap-6 sm:px-1">
                  {/* Number with animated circle */}
                  <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
                    <motion.div
                      className="absolute inset-0 rounded-full bg-[#f2f4f6]"
                      initial={false}
                      animate={{
                        scale: isActive ? 1 : isHovered ? 0.85 : 0,
                        opacity: isActive ? 1 : isHovered ? 0.12 : 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                    />
                    <motion.span
                      className="relative z-10 text-sm font-medium tracking-wide font-mono"
                      animate={{
                        color: isActive ? "#0d0f0e" : "#626973",
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.number}
                    </motion.span>
                  </div>

                  {/* Title */}
                  <motion.h3
                    className="text-base font-medium tracking-tight pr-2 sm:text-xl"
                    animate={{
                      x: isActive || isHovered ? 4 : 0,
                      color: isActive ? "#f2f4f6" : isHovered ? "#f2f4f6" : "#8b929c",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  >
                    {item.title}
                  </motion.h3>

                  {/* Animated indicator */}
                  <div className="ml-auto flex items-center gap-3 shrink-0">
                    <motion.div
                      className="flex items-center justify-center w-8 h-8"
                      animate={{ rotate: isActive ? 45 : 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      <motion.svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="text-[#8b929c]"
                        animate={{
                          opacity: isActive || isHovered ? 1 : 0.4,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.path
                          d="M8 1V15M1 8H15"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          initial={false}
                        />
                      </motion.svg>
                    </motion.div>
                  </div>
                </div>

                {/* Animated underline */}
                <motion.div className="absolute bottom-0 left-0 right-0 h-px bg-white/10 origin-left" initial={false} />
                <motion.div
                  className="absolute bottom-0 left-0 h-px bg-[#f2f4f6] origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX: isActive ? 1 : isHovered ? 0.3 : 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                />
              </motion.button>

              {/* Content */}
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: "auto",
                      opacity: 1,
                      transition: {
                        height: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2, delay: 0.1 },
                      },
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                      transition: {
                        height: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.1 },
                      },
                    }}
                    className="overflow-hidden"
                  >
                    <motion.p
                      className="pl-14 sm:pl-16 pr-6 sm:pr-12 py-5 sm:py-6 text-[#8b929c] leading-6 sm:leading-relaxed font-mono text-xs sm:text-sm"
                      initial={{ y: -10 }}
                      animate={{ y: 0 }}
                      exit={{ y: -10 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                    >
                      {item.content}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Keep original demo data for storybook-style preview
const defaultItems: AccordionItem[] = [
  {
    id: "design",
    number: "01",
    title: "Design",
    content:
      "We craft pixel-perfect interfaces that blend aesthetics with functionality, creating memorable digital experiences.",
  },
  {
    id: "development",
    number: "02",
    title: "Development",
    content: "Building robust, scalable solutions with modern technologies that stand the test of time and traffic.",
  },
  {
    id: "strategy",
    number: "03",
    title: "Strategy",
    content: "Data-driven insights and creative thinking combine to position your brand for lasting success.",
  },
  {
    id: "growth",
    number: "04",
    title: "Growth",
    content: "Sustainable scaling strategies that transform startups into industry leaders through measurable results.",
  },
]

export function UniqueAccordion() {
  return <InteractiveAccordion items={defaultItems} defaultOpen="design" className="w-full max-w-xl" />
}
