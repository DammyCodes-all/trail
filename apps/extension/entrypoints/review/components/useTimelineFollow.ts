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
  // The first play of the session brings the active row to the reading
  // position, wherever the user had scrolled to — so pressing play always
  // drops them into the follow animation. Later plays respect the user's
  // position instead of hijacking.
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

  // Clamp a desired scroll position to the document. Both follow targets go
  // through here so "how far down the viewport should this sit" is stated
  // once.
  const clampY = useCallback(
    (el: HTMLElement, viewportFraction: number) =>
      Math.max(
        0,
        Math.min(
          el.getBoundingClientRect().top +
            window.scrollY -
            window.innerHeight * viewportFraction,
          document.documentElement.scrollHeight - window.innerHeight,
        ),
      ),
    [],
  );

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

  // First play is the one moment we override the user's scroll position: press
  // play and the active row comes to you, wherever you had wandered. It also
  // clears steering, so a user who scrolled away before ever playing still
  // lands in the follow rhythm rather than starting out disengaged. Every
  // later play respects where they are.
  //
  // Declared before the follow effect so it wins the commit they share: React
  // runs effects in order, and this one is the override.
  //
  // The row can be missing — a replay scrubbed deep into a capped timeline has
  // its active row behind "show more". Fall back to the card, and let the
  // follow effect take over once the row mounts.
  useEffect(() => {
    if (!isPlaying || playedOnceRef.current) return;
    const el = rowEls.current[activeIndex];
    // No active row yet (replay at 0, or the row is still behind "show more"):
    // fall back to the card so the first play still frames the timeline.
    const anchor = el ?? cardRef.current;
    if (!anchor) return;

    playedOnceRef.current = true;
    steeringRef.current = false;
    setSteering(false);
    // Claim the row so the follow effect, which runs later in this same
    // commit, doesn't fire a second competing glide at the same target.
    if (el) lastFollowedRef.current = activeIndex;
    glideTo(clampY(anchor, el ? 0.3 : 0.12), true);
  }, [isPlaying, activeIndex, glideTo, clampY]);

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

    const target = clampY(el, 0.3);

    // Deadband: don't glide for a row already near the reading position —
    // constant micro-pulls are what made the follow feel like a hijack.
    // Seeks (paused row clicks) snap instead of gliding.
    if (isPlaying && Math.abs(window.scrollY - target) < window.innerHeight * 0.2) {
      lastFollowedRef.current = activeIndex;
      return;
    }

    glideTo(target, isPlaying);
  }, [activeIndex, isPlaying, followNonce, glideTo, clampY]);

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
