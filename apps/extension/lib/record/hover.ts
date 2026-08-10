import type { HoverEvent } from "@trail/review/lib/types";
import type { RecordContext } from "./context";
import { labelFor } from "./labels";

// Hovers that reveal UI: menu buttons (aria-haspopup) and role-based menu
// surfaces. A plain hover is ambient and would drown the timeline; a hover
// that can't be replayed (the replay cannot show :hover state) is the only
// trace a menu-open bug leaves, so it becomes a step.
const REVEALS = '[aria-haspopup], [role="menu"], [role="listbox"]';

// Emitted once per hover "visit": the dedupe key is label#tag#reason (not
// element-unique — two identical menu buttons share it), so a per-key rearm
// splits them: re-hovering any element with that key within REARM_MS is the
// same repro moment, but coming back later (or hovering the twin menu after
// a pause) is a new signal. The key set is dropped when the page changes so
// a fresh navigation can re-report real reveals.
const REARM_MS = 3000;

// Pure rearm gate behind the listener (pinned by tests): `allow` answers
// "may a hover with this key fire now?", re-arming the key when it returns
// true. `clear` resets every key — the page-change signal.
export function makeRearmGate(rearmMs: number) {
  let last = new Map<string, number>();
  return {
    clear: () => {
      last = new Map<string, number>();
    },
    allow: (key: string, now: number): boolean => {
      const prev = last.get(key);
      if (prev !== undefined && now - prev < rearmMs) return false;
      last.set(key, now);
      return true;
    },
  };
}

export const instrumentHovers = (ctx: RecordContext) => {
  const { emit, isActive, pageUrl } = ctx;
  const gate = makeRearmGate(REARM_MS);
  let lastUrl = pageUrl();

  addEventListener(
    "mouseover",
    (e) => {
      if (!isActive()) return;
      const el = e.target as Element | null;
      const host = el?.closest?.(REVEALS) as HTMLElement | null;
      if (!host) return;

      const url = pageUrl();
      if (url !== lastUrl) {
        gate.clear();
        lastUrl = url;
      }

      const reason = host.hasAttribute("aria-haspopup")
        ? "aria-haspopup"
        : `role=${host.getAttribute("role")}`;
      const label = labelFor(host) ?? null;
      const tag = host.tagName.toLowerCase();
      const key = `${label ?? ""}#${tag}#${reason}`;
      const now = Date.now();
      if (!gate.allow(key, now)) return;

      const ev: HoverEvent = {
        k: "hover",
        label: label ?? `<${tag}>`,
        tag,
        reason,
        t: now,
        url,
      };
      emit(ev);
    },
    true,
  );
};