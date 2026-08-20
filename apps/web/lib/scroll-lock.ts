import Lenis from "lenis";

/**
 * Scroll lock shared between SmoothScroll (Lenis driver) and the intro
 * timeline. The Lenis instance is created lazily here so lockScroll() can
 * stop it even when it runs before SmoothScroll's effects (which happens on
 * mount — React defers passive effects past paint, but the intro locks on
 * the first frame). A stopped Lenis is what actually holds the page still:
 * `overflow: hidden` alone blocks native wheel/touch/keyboard but NOT Lenis's
 * programmatic scrollTo.
 */
let driver: Lenis | null = null;
let initialized = false;

export const initScrollDriver = (): Lenis | null => {
  if (initialized) {
    return driver;
  }
  initialized = true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return null;
  }
  driver = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  return driver;
};

export const destroyScrollDriver = () => {
  driver?.destroy();
  driver = null;
  initialized = false;
};

export const getScrollDriver = (): Lenis | null => driver;

export const scrollToHash = (hash: string) => {
  const id = hash.replace(/^#/, "") || "top";
  const target = id === "top" ? (document.querySelector<HTMLElement>("#top") ?? document.documentElement) : document.getElementById(id);
  if (!target) return;
  const lenis = getScrollDriver();
  if (lenis) {
    lenis.scrollTo(target as HTMLElement, {
      offset: 0,
      duration: 1.1,
    });
    history.pushState(null, "", `#${id}`);
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.pushState(null, "", `#${id}`);
  }
};

const SCROLL_KEYS = [
  " ",
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
];

const onKeyDown = (e: KeyboardEvent) => {
  if (SCROLL_KEYS.includes(e.key)) {
    e.preventDefault();
  }
};

export const lockScroll = () => {
  document.documentElement.style.overflow = "hidden";
  initScrollDriver()?.stop();
  window.addEventListener("keydown", onKeyDown);
};

export const unlockScroll = () => {
  document.documentElement.style.overflow = "";
  driver?.start();
  window.removeEventListener("keydown", onKeyDown);
};