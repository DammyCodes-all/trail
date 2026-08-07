import { useCallback, useEffect, useRef, useState } from "react";

// Follow-scroll: keep the active row at a fixed reading position (30% down
// the viewport) so the timeline scrolls up in rhythm with the replay. The
// user is always in control: any scroll input (wheel, touch, scroll keys,
// scrollbar drag) disengages follow for good until they click "Jump to
// latest". While playing on a desktop layout the follow glides with an
// eased rAF loop that retargets from wherever it is; paused/scrub row
// changes snap (the user initiated the jump), and reduced motion snaps
// instead of gliding. A play/pause toggle that doesn't move the row never
// scrolls.
export function useTimelineFollow({
  activeIndex,
  isPlaying,
  currentTime,
}: {
  activeIndex: number;
  isPlaying: boolean;
  currentTime: number;
}) {
  const rowEls = useRef<(HTMLLIElement | null)[]>([]);
  const lastFollowedRef = useRef<number | null>(null);
  const followRafRef = useRef(0);
  const steeringRef = useRef(false);
  const lastWrittenRef = useRef(-1);
  // The first play of the session fixes the view on the timeline — the page
  // opens at the top (see the follow effect) and the reporter should watch
  // the replay unfold. Later plays respect the user's position instead of
  // hijacking.
  const playedOnceRef = useRef(false);
  const cardRef = useRef<HTMLElement | null>(null);
  // Never auto-scroll on initial load: the page must open at the top and only
  // move once the replay is played or the user seeks. `seenTimeRef` marks the
  // mount and distinguishes "time changed" (a seek) from re-renders (filter
  // changes, group expansion) that must not scroll the page.
  const seenTimeRef = useRef<number | null>(null);
  const timeRef = useRef(currentTime);
  timeRef.current = currentTime;
  const [steering, setSteering] = useState(false);
  const [followNonce, setFollowNonce] = useState(0);

  const cancelFollow = useCallback(() => {
    cancelAnimationFrame(followRafRef.current);
    followRafRef.current = 0;
  }, []);

  // Mark our own scrolls so the window scroll listener doesn't read them as
  // user steering.
  const scrollToY = useCallback((y: number) => {
    lastWrittenRef.current = y;
    window.scrollTo(0, y);
  }, []);

  // The one glide implementation: an rAF lerp toward a target scroll
  // position, snapping the final frame. `animate` is the caller's intent —
  // live follow and the first-play jump glide, user seeks snap. Both
  // follow-scroll and the jump land here so the motion language can't drift.
  const glideTo = useCallback(
    (target: number, animate: boolean) => {
      cancelFollow();
      const glide =
        animate &&
        window.matchMedia("(min-width: 1024px)").matches &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!glide) {
        scrollToY(target);
        return;
      }
      const step = () => {
        const next = window.scrollY + (target - window.scrollY) * 0.22;
        if (Math.abs(target - next) < 0.5) {
          scrollToY(target);
          followRafRef.current = 0;
          return;
        }
        scrollToY(next);
        followRafRef.current = requestAnimationFrame(step);
      };
      followRafRef.current = requestAnimationFrame(step);
    },
    [cancelFollow, scrollToY],
  );

  const disengage = useCallback(() => {
    steeringRef.current = true;
    setSteering(true);
    cancelFollow();
  }, [cancelFollow]);

  useEffect(() => {
    const scrollKeys = new Set([
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      " ",
    ]);
    const onWheel = () => disengage();
    const onTouchStart = () => disengage();
    const onKeyDown = (event: KeyboardEvent) => {
      if (!scrollKeys.has(event.key)) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        target.closest(
          "button, input, textarea, select, [contenteditable='true']",
        )
      ) {
        return;
      }
      disengage();
    };
    const onScroll = () => {
      if (Math.abs(window.scrollY - lastWrittenRef.current) <= 1) return;
      disengage();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [disengage]);

  useEffect(() => {
    if (steeringRef.current) return;
    const el = rowEls.current[activeIndex];
    if (!el) return;

    // The first run is the mount: land at the top of the page and never
    // scroll. After that, only move when playing or when the replay time
    // changed (a seek the user initiated) — filter changes and group
    // expansions shift indices without changing time and must not scroll.
    const time = timeRef.current;
    const firstRun = seenTimeRef.current === null;
    const timeChanged = seenTimeRef.current !== time;
    seenTimeRef.current = time;
    if (firstRun) return;
    if (!isPlaying && !timeChanged) return;

    if (lastFollowedRef.current === activeIndex) return;
    lastFollowedRef.current = activeIndex;

    const target = Math.max(
      0,
      Math.min(
        el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3,
        document.documentElement.scrollHeight - window.innerHeight,
      ),
    );

    // Deadband: don't glide for a row already near the reading position —
    // constant micro-pulls are what made the follow feel like a hijack.
    // Seeks (paused row clicks) snap instead of gliding.
    if (isPlaying && Math.abs(window.scrollY - target) < window.innerHeight * 0.2) {
      lastFollowedRef.current = activeIndex;
      return;
    }

    glideTo(target, isPlaying);
  }, [activeIndex, isPlaying, followNonce, glideTo]);

  // First play: fix the view on the timeline so the follow animation is in
  // sight. Same motion language as follow — rAF lerp on desktop, instant
  // snap otherwise.
  useEffect(() => {
    if (!isPlaying || playedOnceRef.current) return;
    playedOnceRef.current = true;
    const card = cardRef.current;
    if (!card) return;
    const target = Math.max(
      0,
      Math.min(
        card.getBoundingClientRect().top +
          window.scrollY -
          window.innerHeight * 0.12,
        document.documentElement.scrollHeight - window.innerHeight,
      ),
    );
    glideTo(target, true);
  }, [isPlaying, glideTo]);

  const jumpToLatest = useCallback(() => {
    lastFollowedRef.current = null;
    steeringRef.current = false;
    setSteering(false);
    setFollowNonce((nonce) => nonce + 1);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(followRafRef.current);
    },
    [],
  );

  return { steering, jumpToLatest, cardRef, rowEls };
}
