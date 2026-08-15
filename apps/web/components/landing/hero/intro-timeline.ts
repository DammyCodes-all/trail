import { gsap } from "gsap";
import { introFragments } from "./intro-overlay";

type IntroTimelineCallbacks = {
  onOverlayFadeOut: () => void;
  onBrowserRevealed: () => void;
};

export function buildIntroTimeline(
  rootEl: HTMLElement,
  { onOverlayFadeOut, onBrowserRevealed }: IntroTimelineCallbacks,
) {
  const navMark = document.querySelector("[data-nav-logo]");
  const introLogo = rootEl.querySelector("[data-intro-logo]");

  let flight: { x: number; y: number; scale: number } | undefined;
  if (navMark && introLogo) {
    const navRect = navMark.getBoundingClientRect();
    const logoRect = introLogo.getBoundingClientRect();
    flight = {
      x:
        navRect.left +
        navRect.width / 2 -
        (logoRect.left + logoRect.width / 2),
      y:
        navRect.top +
        navRect.height / 2 -
        (logoRect.top + logoRect.height / 2),
      scale: navRect.width / logoRect.width,
    };
  }

  const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

  const pieces = gsap.utils.toArray<HTMLElement>(
    rootEl.querySelectorAll("[data-intro-piece]"),
  );

  pieces.forEach((piece, index) => {
    const fragment = introFragments[index];
    timeline.set(
      piece,
      {
        x: fragment.spreadX * window.innerWidth,
        y: fragment.spreadY * window.innerHeight,
        rotationX: fragment.tiltX,
        rotationY: fragment.tiltY,
        scale: 1.12,
        opacity: 0,
      },
      0,
    );
  });

  timeline.to(
    pieces,
    { opacity: 1, duration: 0.4, ease: "power2.out", stagger: 0.04 },
    0,
  );

  timeline.fromTo(
    "[data-intro-logo]",
    { rotation: 720 },
    { rotation: 0, duration: 2.6, ease: "power3.inOut" },
    0.05,
  );

  timeline.to(
    pieces,
    {
      x: 0,
      y: 0,
      rotationX: 0,
      rotationY: 0,
      scale: 1,
      duration: 2.6,
      ease: "power2.out",
      stagger: 0.05,
    },
    0.05,
  );

  timeline
    .to(
      "[data-intro-logo]",
      { scale: 1.03, duration: 0.15, ease: "power2.out" },
      2.9,
    )
    .to(
      "[data-intro-logo]",
      { scale: 1, duration: 0.3, ease: "back.out(1.4)" },
      3.05,
    );

  timeline.addLabel("assembled");

  if (flight) {
    timeline
      .to(
        "[data-intro-logo]",
        { ...flight, duration: 1, ease: "power3.inOut" },
        "assembled+=0.85",
      )
      .addLabel("landed");
  } else {
    timeline.addLabel("landed", "assembled+=0.85");
  }

  timeline
    .to(
      "[data-intro-overlay]",
      {
        duration: 0.45,
        opacity: 0,
        ease: "power2.out",
        onComplete: onOverlayFadeOut,
      },
      "landed-=0.05",
    )
    .to(
      "[data-intro-logo]",
      { duration: 0.4, opacity: 0, ease: "power2.out" },
      "landed+=0.05",
    )
    .fromTo(
      "[data-hero-kicker]",
      { y: 12 },
      { y: 0, opacity: 1, duration: 0.45 },
      "landed+=0.15",
    )
    .fromTo(
      "[data-hero-title]",
      { y: 20 },
      { y: 0, opacity: 1, duration: 0.6 },
      "<0.08",
    )
    .fromTo(
      "[data-hero-copy]",
      { y: 12 },
      { y: 0, opacity: 1, duration: 0.45 },
      "<0.1",
    )
    .fromTo(
      "[data-hero-actions]",
      { y: 12 },
      { y: 0, opacity: 1, duration: 0.4 },
      "<0.06",
    )
    .fromTo(
      "[data-hero-browser]",
      { y: 32 },
      { y: 0, opacity: 1, duration: 0.7 },
      "landed+=1.0",
    )
    .call(onBrowserRevealed, undefined, "landed+=1.0");

  return timeline;
}