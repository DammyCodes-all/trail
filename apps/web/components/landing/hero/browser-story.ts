import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type StoryMeasurements = {
  cursorStart: { x: number; y: number };
  firstClick: { x: number; y: number };
  reclick: { x: number; y: number };
  park: { x: number; y: number };
  cardLift: number;
  sweep: number;
};

export function createBrowserStory(rootEl: HTMLElement) {
  const q = gsap.utils.selector(rootEl);
  const content = q<HTMLElement>("[data-browser-content]")[0];
  const card = q<HTMLElement>("[data-browser-card]")[0];
  const panel = q<HTMLElement>("[data-trail-panel]")[0];
  const strip = q<HTMLElement>("[data-trail-strip]")[0];
  const runButton = q<HTMLElement>("[data-run-button]")[0];
  const editor = q<HTMLElement>("[data-browser-editor]")[0];
  const cursor = q<HTMLElement>("[data-browser-cursor]")[0];

  const contentRect = content.getBoundingClientRect();
  const toLocal = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left - contentRect.left + rect.width / 2,
      y: rect.top - contentRect.top + rect.height / 2,
    };
  };

  const editorRect = editor.getBoundingClientRect();
  const m: StoryMeasurements = {
    cursorStart: {
      x: editorRect.right - contentRect.left - 16,
      y: editorRect.top - contentRect.top + editorRect.height / 2,
    },
    firstClick: toLocal(runButton),
    reclick: { x: 0, y: 0 },
    park: { x: 0, y: 0 },
    cardLift: 0,
    sweep: 0,
  };

  gsap.set(panel, { yPercent: 0 });
  const panelRect = panel.getBoundingClientRect();
  m.cardLift = panelRect.height - 10;
  m.park = {
    x: panelRect.left - contentRect.left + 18,
    y: panelRect.top - contentRect.top + 20,
  };
  gsap.set(panel, { yPercent: 100 });

  m.reclick = { x: m.firstClick.x, y: m.firstClick.y - m.cardLift };
  m.sweep = strip.getBoundingClientRect().width - 2;

  const timeline = gsap.timeline({
    paused: true,
    repeat: 1,
    defaults: { ease: "power2.out" },
  });

  timeline
    .set(cursor, { x: m.cursorStart.x, y: m.cursorStart.y, opacity: 0 }, 0)
    .set("[data-click-ripple]", { scale: 0.5, opacity: 0 }, 0)
    .set(runButton, { scale: 1 }, 0)
    .set("[data-run-state='running']", { opacity: 0 }, 0)
    .set("[data-run-state='failed']", { opacity: 0 }, 0)
    .set("[data-hero-error]", { y: 4, opacity: 0 }, 0)
    .set(panel, { yPercent: 100 }, 0)
    .set("[data-trail-event]", { y: 8, opacity: 0 }, 0)
    .set("[data-trail-line]", { scaleX: 0, transformOrigin: "0% 50%" }, 0)
    .set("[data-trail-marker]", { scale: 0, opacity: 0 }, 0)
    .set("[data-trail-playhead]", { x: 0, opacity: 0 }, 0)
    .set("[data-replay-label]", { y: 6, opacity: 0 }, 0)
    .set("[data-evidence-panel]", { y: 24, opacity: 0 }, 0)
    .set("[data-evidence-row]", { y: 6, opacity: 0 }, 0)
    .set("[data-hero-captured]", { opacity: 0 }, 0)
    .set("[data-captured-summary]", { opacity: 0 }, 0)
    .set("[data-hero-recording]", { opacity: 1 }, 0);

  timeline
    .to(cursor, { opacity: 1, duration: 0.15 }, 0)
    .to(
      cursor,
      { x: m.cursorStart.x + 24, y: m.cursorStart.y + 6, duration: 0.5, ease: "sine.inOut" },
      0.15,
    )
    .to(cursor, { x: m.cursorStart.x - 10, duration: 0.5, ease: "sine.inOut" }, 0.75)
    .to(cursor, { y: m.cursorStart.y - 10, duration: 0.35, ease: "sine.inOut" }, 1.35)
    .to(
      cursor,
      { x: m.firstClick.x, y: m.firstClick.y, duration: 0.85, ease: "power2.inOut" },
      1.9,
    )
    .to("[data-click-ripple]", { scale: 1.7, opacity: 0, duration: 0.45 }, 2.75)
    .to(runButton, { scale: 0.96, duration: 0.1 }, 2.75)
    .to(runButton, { scale: 1, duration: 0.18, ease: "back.out(2)" }, 2.85)
    .to("[data-run-state='idle']", { opacity: 0, duration: 0.12 }, 2.95)
    .to("[data-run-state='running']", { opacity: 1, duration: 0.12 }, 2.95)
    .to("[data-run-state='running']", { opacity: 0, duration: 0.2 }, 3.1)
    .to("[data-run-state='failed']", { opacity: 1, duration: 0.2 }, 3.1)
    .to(runButton, { backgroundColor: "#141618", duration: 0.2 }, 3.1)
    .to("[data-hero-error]", { y: 0, opacity: 1, duration: 0.32 }, 3.5)
    .to(panel, { yPercent: 0, duration: 0.7, ease: "power3.inOut" }, 4.0)
    .to(card, { y: -m.cardLift, duration: 0.7, ease: "power3.inOut" }, 4.0)
    .to("[data-trail-event]", { y: 0, opacity: 1, duration: 0.35, stagger: 0.06 }, 4.2)
    .to(cursor, { x: m.park.x, y: m.park.y, duration: 0.45 }, 4.6)
    .to("[data-trail-line]", { scaleX: 1, duration: 0.8 }, 5.1)
    .to(
      "[data-trail-marker]",
      { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.6)", stagger: 0.08 },
      5.25,
    )
    .to("[data-replay-label]", { y: 0, opacity: 1, duration: 0.3 }, 6.2)
    .to(
      cursor,
      { x: m.reclick.x, y: m.reclick.y, duration: 0.7, ease: "power2.inOut" },
      6.35,
    )
    .to("[data-click-ripple]", { scale: 1.7, opacity: 0, duration: 0.45 }, 7.5)
    .to(runButton, { scale: 0.96, duration: 0.1 }, 7.5)
    .to(runButton, { scale: 1, duration: 0.18, ease: "back.out(2)" }, 7.6)
    .fromTo(
      "[data-trail-playhead]",
      { x: 0, opacity: 1 },
      { x: m.sweep, duration: 0.85, ease: "none" },
      7.65,
    )
    .to("[data-replay-label]", { opacity: 0, duration: 0.2 }, 8.45)
    .to("[data-evidence-panel]", { y: 0, opacity: 1, duration: 0.5 }, 9.0)
    .to(cursor, { opacity: 0, duration: 0.25 }, 9.1)
    .to("[data-evidence-row]", { y: 0, opacity: 1, duration: 0.35, stagger: 0.06 }, 9.15)
    .to("[data-evidence-panel]", { y: 24, opacity: 0, duration: 0.35 }, 10.3)
    .to("[data-trail-playhead]", { opacity: 0, duration: 0.2 }, 10.3)
    .to(panel, { yPercent: 100, duration: 0.5, ease: "power3.inOut" }, 10.5)
    .to(card, { y: 0, duration: 0.5, ease: "power3.inOut" }, 10.5)
    .to("[data-hero-recording]", { opacity: 0, duration: 0.18 }, 10.8)
    .to("[data-hero-captured]", { opacity: 1, duration: 0.3 }, 10.85)
    .to("[data-captured-summary]", { opacity: 1, duration: 0.3 }, 10.98)
    .to({}, { duration: 1.4 }, 11.2);

  timeline.progress(0, true);

  return timeline;
}

export function attachStoryViewGate(
  timeline: gsap.core.Timeline,
  triggerEl: HTMLElement,
) {
  if (!ScrollTrigger.isInViewport(triggerEl)) {
    timeline.pause();
  }
  const resume = () => {
    if (timeline.progress() >= 1) {
      timeline.restart();
    } else {
      timeline.play();
    }
  };
  const st = ScrollTrigger.create({
    trigger: triggerEl,
    start: "top bottom",
    end: "bottom top",
    onEnter: resume,
    onEnterBack: resume,
    onLeave: () => timeline.pause(),
    onLeaveBack: () => timeline.pause(),
  });
  return () => st.kill();
}