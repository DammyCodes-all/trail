"use client";

import { useEffect, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  destroyScrollDriver,
  initScrollDriver,
  scrollToHash,
} from "@/lib/scroll-lock";

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis owns the page scroll loop. It runs through the GSAP ticker and
 * forwards scroll updates to ScrollTrigger so scrub-linked timelines stay in
 * sync. Disabled under prefers-reduced-motion — native scrolling remains.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = initScrollDriver();
    let tick: ((time: number) => void) | null = null;
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time: number) => {
        lenis.raf(time * 1000);
      };
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#" || !href.startsWith("#")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.pathname !== window.location.pathname || url.search !== window.location.search) return;
      e.preventDefault();
      scrollToHash(href);
    };

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      if (lenis && tick) {
        gsap.ticker.remove(tick);
        destroyScrollDriver();
      }
    };
  }, []);

  return children;
}