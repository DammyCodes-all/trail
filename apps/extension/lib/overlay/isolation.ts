// Event isolation for the recording overlay.
//
// The overlay's UI lives inside a shadow root on the page, so any event that
// originates in it (typing in the flag form, clicking buttons, dragging)
// would otherwise reach the site's own handlers — retargeted at the shadow
// boundary, but still delivered. That leaks three ways:
//   - keyboard shortcuts: a site's window/document keydown handlers fire
//     while the user types into the flag form
//   - "outside click" reactions: page-level click/pointer handlers treat
//     overlay clicks as clicks on the page and close dropdowns, run
//     focus-out validation, etc.
//   - focus side effects: opening the flag form fires focusin/focusout on
//     the page, tripping dirty-markers and autosave logic
//
// Fix: a bubble-phase listener on the shadow root. An event already visited
// the overlay's own targets (React's handlers are on deeper nodes — the
// flag form keys, drag, buttons all still work), and stopping propagation
// here cuts the path right before it crosses the shadow boundary. Everything
// attached by the site below document/window that runs on the path after
// this point is silenced:
//   host → document → window (bubble)
//
// One limit, inherent to the platform: page handlers registered with
// capture at window/document run before the shadow root exists on the path
// — windowCAP → documentCAP → … → shadowRoot. No listener inside the shadow
// can precede them, so capture-bound page shortcuts (extremely rare — sites
// bind shortcuts non-capturing) still fire. The overlay cannot silence
// those; nothing in the page DOM can.
const ISOLATED_EVENTS = [
  // keyboard: page shortcuts must not hear overlay typing or the flag keys
  "keydown",
  "keyup",
  "keypress",
  // text input: global search/typing handlers on the page
  "input",
  "beforeinput",
  // pointer/click — "outside click" reactions (dropdowns, focus traps)
  "pointerdown",
  "pointerup",
  "mousedown",
  "mouseup",
  "click",
  "dblclick",
  "contextmenu",
  // wheel over the panel should not scroll the page beneath
  "wheel",
  // focus moves into/out of the overlay — dirty markers, autosave
  "focusin",
  "focusout",
] as const;

// Attach the isolation stop to an overlay shadow root. Returns a detach
// function (unused today — the overlay lives for the page's lifetime — but
// kept for symmetric teardown and tests).
export function isolateOverlayShadow(shadow: ShadowRoot): () => void {
  const stop = (e: Event) => {
    e.stopPropagation();
  };
  for (const type of ISOLATED_EVENTS) {
    shadow.addEventListener(type, stop, false);
  }
  return () => {
    for (const type of ISOLATED_EVENTS) {
      shadow.removeEventListener(type, stop, false);
    }
  };
}