"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Expand,
  ExternalLink,
  Flag,
  Globe2,
  Keyboard,
  ListChecks,
  Monitor,
  MousePointer2,
  Network,
  Pause,
  Play,
  Share2,
  Terminal,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { TrailLogo } from "@/components/trail-logo";
import type { LucideIcon } from "lucide-react";

/**
 * The hero's product mockup — a faithful miniature of the Trail review view,
 * set inside a browser window: incident header, facts strip, session replay
 * player, evidence timeline with working filters, and the Network / Console
 * evidence toggles.
 *
 * The markup ships in its final "report ready" state (so no-JS and
 * prefers-reduced-motion users see a complete static report). When
 * `trail:report-revealed` fires, GSAP rewinds the scene and loops a silent
 * mini-replay of the incident inside the player: a cursor types into the app,
 * the sign-in fails, the timeline lights up, and the report assembles.
 * GSAP owns every animated element here — CSS stays the source of layout.
 */

const EMAIL = "demo@acme.com";
const PASSWORD_DOTS = "•••••••••••";
const SCRUB_SECONDS = 42;

type FactTone = "warn" | "error";

type Fact = {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: FactTone;
  static?: boolean;
};

const FACTS: Fact[] = [
  { key: "duration", icon: Clock3, label: "Duration", value: "42s" },
  { key: "flags", icon: Flag, label: "Reporter flags", value: "1", tone: "warn" },
  { key: "interactions", icon: MousePointer2, label: "Interactions", value: "14" },
  { key: "evidence", icon: ListChecks, label: "Evidence events", value: "9" },
  { key: "failed", icon: WifiOff, label: "Failed requests", value: "1", tone: "error" },
  { key: "console", icon: Terminal, label: "Console errors", value: "1", tone: "error" },
  { key: "env", icon: Monitor, label: "Environment", value: "macOS 14.5", static: true },
];

type RowCat = "user" | "network" | "console";

// Timeline row tones, mapped 1:1 to the review app's tone model: navigation
// is a green-dot blue-icon landmark, plain interactions are neutral, network
// and console failures are destructive (tinted card, ringed dot, red text),
// and reporter flags are info-blue with their own tint.
type RowTone = "nav" | "action" | "error" | "flag";

type Row = {
  time: string;
  tone: RowTone;
  icon: LucideIcon;
  label: string;
  cat: RowCat;
  chip?: string;
  status?: string;
};

const TONE_DOT: Record<RowTone, string> = {
  nav: "#30d158",
  action: "#2e3338",
  error: "#ff4d4f",
  flag: "#4a9eff",
};

const TONE_RING: Record<RowTone, string | undefined> = {
  nav: undefined,
  action: undefined,
  error: "0 0 0 2px rgba(255,77,79,0.15)",
  flag: "0 0 0 2px rgba(74,158,255,0.25)",
};

const TONE_ICON: Record<RowTone, string> = {
  nav: "bg-[#4a9eff]/10 text-[#4a9eff]",
  action: "bg-white/5 text-[#8b929c]",
  error: "bg-[#ff4d4f]/10 text-[#ff4d4f]",
  flag: "bg-[#4a9eff]/10 text-[#4a9eff]",
};

const TONE_CARD: Record<RowTone, string> = {
  nav: "",
  action: "",
  error: "border border-[#ff4d4f]/30 bg-[#ff4d4f]/5",
  flag: "border border-[#4a9eff]/30 bg-[#4a9eff]/5",
};

const TONE_TEXT: Record<RowTone, string> = {
  nav: "font-medium text-[#f2f4f6]",
  action: "text-[#f2f4f6]/85",
  error: "font-medium text-[#ff4d4f]",
  flag: "text-[#4a9eff]",
};

const ROWS: Row[] = [
  { time: "00:00", tone: "nav", icon: Globe2, label: "Navigate to acme.com", cat: "user" },
  {
    time: "00:05",
    tone: "action",
    icon: Keyboard,
    label: "Type demo@acme.com into Email",
    cat: "user",
  },
  { time: "00:08", tone: "action", icon: MousePointer2, label: "Click Sign in", cat: "user" },
  {
    time: "00:09",
    tone: "error",
    icon: WifiOff,
    label: "POST /api/login failed",
    cat: "network",
    status: "500",
  },
  {
    time: "00:09",
    tone: "error",
    icon: Terminal,
    label: "Console error: 401 Unauthorized",
    cat: "console",
    chip: "×3",
  },
  {
    time: "00:12",
    tone: "flag",
    icon: Flag,
    label: 'Flag: "Login button did nothing"',
    cat: "user",
  },
];

type FilterKey = "all" | "errors" | "network" | "user" | "console";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "errors", label: "Errors" },
  { key: "network", label: "Network" },
  { key: "user", label: "User" },
  { key: "console", label: "Console" },
];

const matches = (row: Row, f: FilterKey) =>
  f === "all" || (f === "errors" ? row.tone === "error" : row.cat === f);

type EvidencePanel = {
  key: "network" | "console";
  icon: LucideIcon;
  label: string;
  count: number;
  tone: FactTone;
  rows: {
    time: string;
    method?: string;
    line: string;
    lineCls?: string;
    trail?: string;
    rowCls?: string;
  }[];
};

const EVIDENCE: EvidencePanel[] = [
  {
    key: "network",
    icon: Network,
    label: "Network",
    count: 1,
    tone: "warn",
    rows: [
      {
        time: "00:09",
        method: "POST",
        line: "/api/login",
        trail: "500",
        rowCls: "bg-[#ff4d4f]/10 text-[#ff4d4f]",
      },
    ],
  },
  {
    key: "console",
    icon: Terminal,
    label: "Console",
    count: 3,
    tone: "error",
    rows: [
      {
        time: "00:09",
        line: "Console error: 401 Unauthorized",
        lineCls: "text-[#ff4d4f]",
      },
    ],
  },
];

const FACT_TONE = { warn: "text-[#ffb020]", error: "text-[#ff4d4f]" } as const satisfies Record<
  FactTone,
  string
>;

function BrowserChrome() {
  return (
    <div className="flex h-8 items-end gap-0.5 bg-[#0d0e10] px-3 pt-1">
      <span className="flex h-6 items-center gap-1.5 rounded-t-lg bg-[#141618] px-2.5 font-mono text-[9px] text-[#8b929c]">
        <Globe2 className="size-2.5 shrink-0" />
        acme.com
      </span>
      <span className="flex h-6 items-center gap-1.5 rounded-t-lg bg-[#08090a] px-2.5 font-mono text-[9.5px] text-[#f2f4f6] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <TrailLogo size={10} color="#ff6a00" aria-hidden="true" />
        Trail report
      </span>
    </div>
  );
}

export function ReportMockup() {
  const root = useRef<HTMLDivElement>(null);
  const loopRef = useRef<gsap.core.Timeline | null>(null);
  const chevrons = useRef<Map<string, HTMLElement>>(new Map());
  const [filter, setFilter] = useState<FilterKey>("all");
  const [playing, setPlaying] = useState(true);
  const [panels, setPanels] = useState<Record<string, boolean>>({});

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    if (window.matchMedia("(max-width: 1023px)").matches) {
      return;
    }

    // Hide the report shell before first paint: the entrance rise (fired on
    // `trail:report-revealed`) is what reveals it, never a flash of the static
    // state. Reduced-motion users returned above and keep the CSS-visible
    // static report.
    const shellEl = el.querySelector<HTMLElement>("[data-mock-shell]");
    if (shellEl) {
      gsap.set(shellEl, { autoAlpha: 0, y: 28 });
    }

    let context: gsap.Context | undefined;

    const start = () => {
      if (context) {
        return;
      }
      context = gsap.context(() => {
        const shell = el.querySelector<HTMLElement>("[data-mock-shell]");
        const player = el.querySelector<HTMLElement>("[data-mock-player]");
        const cursor = el.querySelector<HTMLElement>("[data-mock-cursor]");
        const emailField = el.querySelector<HTMLElement>("[data-mock-field='email']");
        const pwdField = el.querySelector<HTMLElement>("[data-mock-field='password']");
        const btn = el.querySelector<HTMLElement>("[data-mock-signin]");
        const btnIdle = el.querySelector<HTMLElement>("[data-mock-idle]");
        const btnRunning = el.querySelector<HTMLElement>("[data-mock-running]");
        const ripple = el.querySelector<HTMLElement>("[data-mock-ripple]");
        const errorBanner = el.querySelector<HTMLElement>("[data-mock-error]");
        const captured = el.querySelector<HTMLElement>("[data-mock-captured]");
        const scrubFill = el.querySelector<HTMLElement>("[data-mock-scrub]");
        const timecode = el.querySelector<HTMLElement>("[data-mock-timecode]");
        const typedEmail = el.querySelector<HTMLElement>("[data-mock-typed='email']");
        const typedPwd = el.querySelector<HTMLElement>("[data-mock-typed='password']");
        const phEmail = el.querySelector<HTMLElement>("[data-mock-ph='email']");
        const phPwd = el.querySelector<HTMLElement>("[data-mock-ph='password']");
        const rows = gsap.utils.toArray<HTMLElement>(el.querySelectorAll("[data-mock-row]"));
        const factSpans = new Map(
          Array.from(el.querySelectorAll<HTMLElement>("[data-mock-fact]")).map((s) => [
            s.getAttribute("data-mock-fact"),
            s,
          ]),
        );

        if (
          !shell ||
          !player ||
          !cursor ||
          !emailField ||
          !pwdField ||
          !btn ||
          !btnIdle ||
          !btnRunning ||
          !ripple ||
          !errorBanner ||
          !captured ||
          !scrubFill ||
          !timecode ||
          !typedEmail ||
          !typedPwd ||
          !phEmail ||
          !phPwd
        ) {
          return;
        }

        el.querySelectorAll<HTMLElement>("[data-evidence-chevron]").forEach((node) => {
          chevrons.current.set(node.getAttribute("data-evidence-chevron") ?? "", node);
        });

        // One-shot entrance: the report window rises in as the intro overlay
        // lifts. Kept off the looping timeline (which rewinds each cycle) so
        // the shell enters once; no-JS and reduced-motion users never reach
        // `start`, so the CSS static state stays fully visible.
        const reveal = gsap.timeline({ defaults: { ease: "power2.out" } });
        reveal
          .set(shell, { autoAlpha: 0, y: 28 })
          .to(shell, { autoAlpha: 1, y: 0, duration: 0.6 });

        const measure = (node: HTMLElement) => {
          const box = player.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) {
            return { x: 40, y: 40 };
          }
          const r = node.getBoundingClientRect();
          return {
            x: r.left + r.width / 2 - box.left - 3,
            y: r.top + r.height / 2 - box.top - 3,
          };
        };
        const rest = () => {
          const box = player.getBoundingClientRect();
          return {
            x: Math.max(14, box.width * 0.05),
            y: Math.max(14, box.height - 14),
          };
        };

        const fmtTime = (s: number) =>
          `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;

        const setFact = (key: string, v: number) => {
          const span = factSpans.get(key);
          if (!span) {
            return;
          }
          span.textContent = key === "duration" ? `${Math.round(v)}s` : String(Math.round(v));
          if (key === "failed" || key === "console") {
            span.classList.toggle(FACT_TONE.error, v > 0);
          }
          if (key === "flags") {
            span.classList.toggle(FACT_TONE.warn, v > 0);
          }
        };

        const clearActive = () => {
          rows.forEach((r) => r.querySelector(".mock-row-card")?.classList.remove("mock-active"));
        };
        const setActive = (i: number) => {
          clearActive();
          rows[i]?.querySelector(".mock-row-card")?.classList.add("mock-active");
        };

        const emailP = { t: 0 };
        const pwdP = { t: 0 };
        const scrubP = { p: 0 };

        const placeScrub = () => {
          scrubFill.style.width = `${scrubP.p * 100}%`;
          timecode.textContent = fmtTime(scrubP.p * SCRUB_SECONDS);
        };

        const reset = () => {
          gsap.set([cursor, ripple, errorBanner, captured, btnRunning], { autoAlpha: 0 });
          gsap.set([btnIdle], { autoAlpha: 1 });
          gsap.set(btn, { scale: 1 });
          gsap.set(cursor, { x: rest().x, y: rest().y });
          typedEmail.textContent = "";
          typedPwd.textContent = "";
          gsap.set([phEmail, phPwd], { autoAlpha: 1 });
          gsap.set(rows, { autoAlpha: 0.15, y: 8 });
          clearActive();
          ["duration", "flags", "interactions", "evidence", "failed", "console"].forEach((k) =>
            setFact(k, 0),
          );
          scrubP.p = 0;
          placeScrub();
        };

        const loop = gsap.timeline({
          paused: true,
          repeat: -1,
          defaults: { ease: "power2.out" },
        });
        loopRef.current = loop;

        loop
          .call(reset, undefined, 0)
          .fromTo(cursor, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.1)
          .to(
            cursor,
            {
              x: () => measure(emailField).x,
              y: () => measure(emailField).y,
              duration: 0.55,
              ease: "power2.inOut",
            },
            0.15,
          )
          .set(phEmail, { autoAlpha: 0 }, 0.75)
          .to(
            emailP,
            {
              t: 1,
              duration: 1.2,
              ease: "none",
              onUpdate: () => {
                typedEmail.textContent = EMAIL.slice(0, Math.round(emailP.t * EMAIL.length));
              },
            },
            0.75,
          )
          .to(
            cursor,
            {
              x: () => measure(pwdField).x,
              y: () => measure(pwdField).y,
              duration: 0.4,
              ease: "power2.inOut",
            },
            2.1,
          )
          .set(phPwd, { autoAlpha: 0 }, 2.55)
          .to(
            pwdP,
            {
              t: 1,
              duration: 0.75,
              ease: "none",
              onUpdate: () => {
                typedPwd.textContent = PASSWORD_DOTS.slice(
                  0,
                  Math.round(pwdP.t * PASSWORD_DOTS.length),
                );
              },
            },
            2.55,
          )
          .to(
            cursor,
            {
              x: () => measure(btn).x,
              y: () => measure(btn).y,
              duration: 0.35,
              ease: "power2.inOut",
            },
            3.35,
          )
          .to(btn, { scale: 0.96, duration: 0.12, yoyo: true, repeat: 1 }, 3.75)
          .fromTo(
            ripple,
            { scale: 0.4, autoAlpha: 0.9 },
            { scale: 2.2, autoAlpha: 0, duration: 0.45 },
            3.75,
          )
          .to(btnIdle, { autoAlpha: 0, duration: 0.12 }, 3.9)
          .to(btnRunning, { autoAlpha: 1, duration: 0.12 }, 3.9)
          .fromTo(errorBanner, { autoAlpha: 0, y: 4 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 4.35);

        rows.forEach((row, i) => {
          const at = 4.9 + i * 0.22;
          loop.fromTo(row, { autoAlpha: 0.15, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.28 }, at);
          loop.call(setActive, [i], at + 0.06);
        });

        const count = (key: string, to: number, at: number, dur: number) => {
          const p = { v: 0 };
          loop.to(
            p,
            {
              v: to,
              duration: dur,
              ease: "power1.inOut",
              onUpdate: () => setFact(key, p.v),
            },
            at,
          );
        };

        count("flags", 1, 6.45, 0.5);
        count("failed", 1, 6.45, 0.5);
        count("console", 1, 6.45, 0.5);
        count("interactions", 14, 6.6, 0.6);
        count("evidence", 9, 6.6, 0.6);
        count("duration", SCRUB_SECONDS, 7.0, 1.0);

        loop
          .fromTo(
            scrubP,
            { p: 0 },
            { p: 1, duration: 9.4, ease: "none", onUpdate: placeScrub },
            1.0,
          )
          .fromTo(captured, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 9.2);

        loop.play();
        reveal.play();
      }, el);
    };

    const onReveal = () => start();
    window.addEventListener("trail:report-revealed", onReveal, { once: true });

    return () => {
      window.removeEventListener("trail:report-revealed", onReveal);
      loopRef.current = null;
      context?.revert();
    };
  }, []);

  const togglePlay = () => {
    const l = loopRef.current;
    if (playing) {
      l?.pause();
    } else {
      l?.play();
    }
    setPlaying(!playing);
  };

  const togglePanel = (key: string) => {
    const next = !panels[key];
    setPanels((p) => ({ ...p, [key]: next }));
    const chevron = chevrons.current.get(key);
    if (chevron && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.to(chevron, { rotation: next ? 90 : 0, duration: 0.25, ease: "power2.out" });
    }
  };

  const shownCount = ROWS.filter((r) => matches(r, filter)).length;

  return (
    <div
      ref={root}
      data-report-mockup
      aria-label="Trail report demo"
      className="relative mx-auto mt-12 w-full max-w-5xl text-left sm:mt-14"
    >
      <div className="hidden lg:block">
        <div
          data-mock-shell
          className="overflow-hidden rounded-lg border border-white/10 bg-[#0d0e10] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        >
          <BrowserChrome />

        <div className="bg-[#08090a]">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-12 items-center justify-between">
            <div className="flex items-center gap-2">
              <TrailLogo size={15} color="#ff6a00" aria-hidden="true" />
              <span className="font-mono text-[11px] font-medium tracking-[0.2em] text-[#f2f4f6]">
                TRAIL
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 items-center gap-1.5 rounded-sm border border-white/10 px-2.5 font-mono text-[10px] text-[#8b929c]">
                <Share2 className="size-3" />
                Share
                <ChevronDown className="size-2.5" />
              </span>
              <span className="flex h-7 items-center gap-1.5 rounded-sm bg-white px-2.5 text-[10px] font-semibold text-black">
                <ExternalLink className="size-3" />
                Create GitHub Issue
              </span>
            </div>
          </div>

          <div className="pb-4 pt-4">
            <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-[#f2f4f6] sm:text-xl">
              POST /api/login failed (500)
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-[#8b929c] sm:text-xs">
              Trail captured the sequence, page context, and runtime failures needed to
              investigate this incident.
            </p>
          </div>

          <div className="grid grid-cols-2 border-y border-white/10 sm:grid-cols-3 lg:grid-cols-7 lg:divide-x lg:divide-white/10">
            {FACTS.map((fact, i) => (
              <div
                key={fact.key}
                className={`min-w-0 py-3 sm:py-3.5 ${
                  i === 0 ? "lg:pr-5" : i === FACTS.length - 1 ? "lg:pl-5" : "lg:px-5"
                }`}
              >
                <span className="flex items-center gap-2 text-[#626973]">
                  <fact.icon className="size-3 shrink-0" aria-hidden="true" />
                  <span className="text-[9.5px]">{fact.label}</span>
                </span>
                <span
                  data-mock-fact={fact.key}
                  className={`mt-1 block truncate pl-5 font-heading text-sm font-semibold tabular-nums ${
                    fact.tone ? FACT_TONE[fact.tone] : "text-[#f2f4f6]"
                  }`}
                >
                  {fact.value}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 border-b border-white/10 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:gap-x-10">
            <div className="min-w-0 py-4">
            <div className="flex items-center justify-between">
              <span className="font-heading text-xs font-semibold text-[#f2f4f6]">
                Session replay
              </span>
              <span className="flex items-center gap-2 font-mono text-[10px] text-[#626973]">
                <span>00:42</span>
                <span className="rounded-sm border border-white/10 bg-[#141618] px-1.5 py-0.5 text-[#f2f4f6]">
                  1×
                </span>
                <Expand className="size-3.5" />
              </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-sm border border-[#2e3338] bg-[#08090a]">
              <div data-mock-player className="relative aspect-video overflow-hidden">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:28px_28px]"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[82%] max-w-[320px] rounded-md border border-white/10 bg-[#141618] p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#626973]">
                        Acme
                      </p>
                      <span className="rounded-sm border border-white/10 px-1.5 py-0.5 font-mono text-[8px] text-[#8b929c]">
                        app
                      </span>
                    </div>
                    <h3 className="mt-2 font-heading text-sm font-semibold text-[#f2f4f6]">
                      Sign in
                    </h3>
                    <div className="mt-3">
                      <label className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#626973]">
                        Email
                      </label>
                      <div
                        data-mock-field="email"
                        className="mt-1 flex h-7 items-center gap-1 overflow-hidden rounded-sm border border-white/10 bg-[#08090a] px-2.5 font-mono text-[10px]"
                      >
                        <span data-mock-ph="email" className="text-[#626973] opacity-0">
                          you@example.com
                        </span>
                        <span data-mock-typed="email" className="text-[#f2f4f6]">
                          {EMAIL}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <label className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#626973]">
                        Password
                      </label>
                      <div
                        data-mock-field="password"
                        className="mt-1 flex h-7 items-center gap-1 overflow-hidden rounded-sm border border-white/10 bg-[#08090a] px-2.5 font-mono text-[10px]"
                      >
                        <span data-mock-ph="password" className="text-[#626973] opacity-0">
                          ••••••••
                        </span>
                        <span data-mock-typed="password" className="text-[#f2f4f6]">
                          {PASSWORD_DOTS}
                        </span>
                      </div>
                    </div>
                    <div
                      data-mock-signin
                      className="relative mt-3 grid h-8 w-full place-items-center overflow-hidden rounded-sm bg-[#ff6a00] font-mono text-[10px] font-semibold text-[#08090a]"
                    >
                      <span data-mock-idle className="inline-flex items-center gap-1.5">
                        Sign in
                      </span>
                      <span
                        data-mock-running
                        className="absolute inset-0 grid place-items-center opacity-0"
                      >
                        Signing in…
                      </span>
                      <span
                        data-mock-ripple
                        className="absolute left-1/2 top-1/2 -ml-3 -mt-3 size-6 rounded-full bg-white/50 opacity-0"
                      />
                    </div>
                    <div
                      data-mock-error
                      className="mt-2.5 flex items-center gap-1.5 rounded-sm border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-2.5 py-1.5 text-[9px] text-[#ff4d4f]"
                    >
                      <TriangleAlert className="size-3 shrink-0" />
                      Something went wrong. Please try again.
                    </div>
                  </div>
                </div>

                <span
                  data-mock-captured
                  className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 rounded-sm border border-white/10 bg-[#0d0e10]/90 px-2.5 py-1 font-mono text-[9px] text-[#30d158] backdrop-blur"
                >
                  <span className="size-1.5 rounded-full bg-[#30d158]" />
                  Trail captured
                </span>

                <svg
                  data-mock-cursor
                  className="absolute left-0 top-0 z-30 hidden will-change-transform opacity-0 sm:block"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  aria-hidden="true"
                >
                  <path
                    d="M2 1l9 4.6-4.1 1.2L4.2 12 2 1z"
                    fill="#f2f4f6"
                    stroke="#08090a"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="flex items-center gap-3 border-t border-white/10 bg-[#0d0e10] px-3 py-2.5">
                <button
                  type="button"
                  aria-label={playing ? "Pause replay" : "Play replay"}
                  aria-pressed={playing}
                  onClick={togglePlay}
                  className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-sm text-[#f2f4f6] transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#1a1c1f]"
                >
                  {playing ? <Pause className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}
                </button>
                <span
                  data-mock-timecode
                  className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#f2f4f6]"
                >
                  00:42
                </span>
                <div className="relative h-3 flex-1">
                  <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#2e3338]" />
                  <div
                    data-mock-scrub
                    className="absolute left-0 top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-[#ff6a00]"
                  >
                    <span className="absolute right-0 top-1/2 size-3.5 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0d0e10] bg-[#ff6a00] shadow-[0_0_0_2px_rgba(255,106,0,0.18)]" />
                  </div>
                </div>
                <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-[#626973]">
                  00:42
                </span>
              </div>
            </div>
            </div>

            <div className="min-w-0 py-4">
            <div className="flex items-center justify-between">
              <span className="font-heading text-xs font-semibold text-[#f2f4f6]">
                Evidence timeline
              </span>
              <span className="font-mono text-[9px] text-[#626973]">
                {shownCount} events
              </span>
            </div>
              <div
                className="mt-2.5 inline-flex h-8 items-center rounded-md bg-[#141618] p-[3px]"
                role="group"
                aria-label="Filter timeline"
              >
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={filter === f.key}
                    onClick={() => setFilter(f.key)}
                    className={`cursor-pointer rounded-sm px-2 py-1 text-[9px] font-medium transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                      filter === f.key
                        ? "bg-[#0d0e10] text-[#f2f4f6] shadow-sm"
                        : "text-[#626973] hover:text-[#8b929c]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {ROWS.map((row, i) => (
                  <li
                    key={`${row.time}-${i}`}
                    data-mock-row
                    className={`grid grid-cols-[3rem_1.1rem_minmax(0,1fr)] items-start gap-1.5 ${
                      filter !== "all" && !matches(row, filter) ? "hidden" : ""
                    }`}
                  >
                    <time className="pt-2.5 font-mono text-[9px] tabular-nums text-[#626973]">
                      {row.time}
                    </time>
                    <span className="relative flex h-full justify-center">
                      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#1e2124]" />
                      <span
                        className="relative mt-2.5 size-2 rounded-full border-2 border-[#0d0e10]"
                        style={{
                          backgroundColor: TONE_DOT[row.tone],
                          boxShadow: TONE_RING[row.tone],
                        }}
                      />
                    </span>
                    <div
                      className={`mock-row-card flex min-h-8 min-w-0 items-center gap-2 rounded-sm px-2 ${
                        TONE_CARD[row.tone]
                      } ${row.tone === "error" ? "py-2.5" : "py-1.5"}`}
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-sm ${TONE_ICON[row.tone]}`}
                      >
                        <row.icon className="size-3" />
                      </span>
                      <span className={`truncate text-[10px] ${TONE_TEXT[row.tone]}`}>
                        {row.label}
                      </span>
                      {row.chip ? (
                        <span className="ml-auto shrink-0 rounded-sm bg-[#1e2124] px-1.5 py-0.5 font-mono text-[8.5px] font-medium text-[#8b929c]">
                          {row.chip}
                        </span>
                      ) : row.status ? (
                        <span className="ml-auto shrink-0 font-mono text-[10px] font-semibold text-[#ff4d4f]">
                          {row.status}
                        </span>
                      ) : (
                        <span className="ml-auto w-2" aria-hidden="true" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-sm border border-white/10 bg-[#0d0e10]/30">
            {EVIDENCE.map((panel, pi) => (
              <div key={panel.key}>
                {pi > 0 ? <div className="border-t border-white/10" /> : null}
                <button
                  type="button"
                  aria-expanded={Boolean(panels[panel.key])}
                  aria-controls={`evidence-${panel.key}`}
                  onClick={() => togglePanel(panel.key)}
                  className="flex min-h-10 w-full cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/5"
                >
                  <panel.icon
                    className={`size-4 shrink-0 ${
                      panel.tone === "error" ? "text-[#ff4d4f]" : "text-[#ffb020]"
                    }`}
                  />
                  <span className="font-heading text-xs font-semibold text-[#f2f4f6]">
                    {panel.label}
                  </span>
                  <span
                    className={`ml-auto rounded-sm px-2 py-0.5 font-mono text-[9px] font-medium tabular-nums ${
                      panel.tone === "error"
                        ? "bg-[#ff4d4f]/10 text-[#ff4d4f]"
                        : "bg-[#ffb020]/10 text-[#ffb020]"
                    }`}
                  >
                    {panel.count}
                  </span>
                  <span data-evidence-chevron={panel.key} className="text-[#626973]">
                    <ChevronRight className="size-4" />
                  </span>
                </button>
                {panels[panel.key] ? (
                  <ul id={`evidence-${panel.key}`} className="space-y-1.5 px-3 pb-3">
                    {panel.rows.map((row) => (
                      <li
                        key={`${panel.key}-${row.line}`}
                        className="flex items-center gap-3 rounded-sm border border-white/10 bg-[#141618] px-2.5 py-2"
                      >
                        <time className="shrink-0 font-mono text-[9px] tabular-nums text-[#626973]">
                          {row.time}
                        </time>
                        <span className="min-w-0 truncate font-mono text-[10px]">
                          {row.method ? (
                            <>
                              <span className="font-semibold text-[#f2f4f6]">
                                {row.method}{" "}
                              </span>
                              <span className="text-[#8b929c]">{row.line}</span>
                            </>
                          ) : (
                            <span className={row.lineCls ?? "text-[#f2f4f6]"}>{row.line}</span>
                          )}
                        </span>
                        {row.trail ? (
                          <span
                            className={`ml-auto shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold ${row.rowCls}`}
                          >
                            {row.trail}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>

          <p className="pb-4 pt-3 text-center font-mono text-[10px] text-[#626973]">
            All data is captured automatically by Trail.
          </p>
          </div>

          <style>{`
            .mock-row-card.mock-active {
              border-color: rgba(255, 106, 0, 0.6);
              box-shadow: 0 0 0 1px rgba(255, 106, 0, 0.35);
            }
          `}</style>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0d0e10] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <BrowserChrome />
          <Image
            src="/trail-report-UI.png"
            alt="Trail session report"
            width={1135}
            height={682}
            priority
            sizes="100vw"
            className="h-auto w-full bg-[#08090a]"
          />
        </div>
      </div>
    </div>
  );
}