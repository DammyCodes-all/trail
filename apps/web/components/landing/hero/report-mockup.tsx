"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  Braces,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Flag,
  Globe2,
  Keyboard,
  ListChecks,
  Lock,
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

type Row = {
  time: string;
  dot: string;
  icon: LucideIcon;
  label: string;
  iconCls: string;
  cat: RowCat;
  error?: boolean;
  chip?: string;
  chipCls?: string;
};

const ROWS: Row[] = [
  {
    time: "00:00",
    dot: "#30d158",
    icon: Globe2,
    label: "Navigate to acme.com",
    iconCls: "bg-[#30d158]/10 text-[#30d158]",
    cat: "user",
  },
  {
    time: "00:05",
    dot: "#2e3338",
    icon: Keyboard,
    label: "Type demo@acme.com into Email",
    iconCls: "bg-white/5 text-[#8b929c]",
    cat: "user",
  },
  {
    time: "00:08",
    dot: "#ff6a00",
    icon: MousePointer2,
    label: "Click Sign in",
    iconCls: "bg-[#ff6a00]/10 text-[#ff6a00]",
    cat: "user",
  },
  {
    time: "00:09",
    dot: "#ff4d4f",
    icon: WifiOff,
    label: "POST /api/login failed",
    iconCls: "bg-[#ff4d4f]/10 text-[#ff4d4f]",
    cat: "network",
    error: true,
    chip: "500",
    chipCls: "bg-[#ff4d4f]/10 text-[#ff4d4f]",
  },
  {
    time: "00:09",
    dot: "#ff4d4f",
    icon: Terminal,
    label: "Console error: 401 Unauthorized",
    iconCls: "bg-[#ff4d4f]/10 text-[#ff4d4f]",
    cat: "console",
    error: true,
    chip: "×3",
    chipCls: "bg-[#ff4d4f]/10 text-[#ff4d4f]",
  },
  {
    time: "00:12",
    dot: "#4a9eff",
    icon: Flag,
    label: 'Flag: "Login button did nothing"',
    iconCls: "bg-[#4a9eff]/10 text-[#4a9eff]",
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
  f === "all" || (f === "errors" ? row.error === true : row.cat === f);

const ATTACHMENTS = [
  { icon: FileText, name: "report.md", detail: "Markdown report" },
  { icon: Network, name: "network.har", detail: "1 request" },
  { icon: Terminal, name: "console.log", detail: "3 entries" },
  { icon: Braces, name: "metadata.json", detail: "Session metadata" },
] as const;

type EvidencePanel = {
  key: "network" | "console";
  icon: LucideIcon;
  label: string;
  count: number;
  tone: FactTone;
  rows: { time: string; line: string; trail: string; rowCls: string }[];
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
        line: "POST /api/login",
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
        trail: "×3",
        rowCls: "bg-[#ff4d4f]/10 text-[#ff4d4f]",
      },
    ],
  },
];

const FACT_TONE = { warn: "text-[#ffb020]", error: "text-[#ff4d4f]" } as const satisfies Record<
  FactTone,
  string
>;

export function ReportMockup() {
  const root = useRef<HTMLDivElement>(null);
  const loopRef = useRef<gsap.core.Timeline | null>(null);
  const chevrons = useRef<Map<string, HTMLElement>>(new Map());
  const [filter, setFilter] = useState<FilterKey>("all");
  const [playing, setPlaying] = useState(true);
  const [panels, setPanels] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const el = root.current;
    if (!el) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let context: gsap.Context | undefined;

    const start = () => {
      if (context) {
        return;
      }
      context = gsap.context(() => {
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

        const box = player.getBoundingClientRect();
        const rel = (node: HTMLElement) => {
          if (box.width === 0 || box.height === 0) {
            return { x: 40, y: 40 };
          }
          const r = node.getBoundingClientRect();
          return {
            x: r.left + r.width / 2 - box.left - 3,
            y: r.top + r.height / 2 - box.top - 3,
          };
        };
        const rest = { x: Math.max(14, box.width * 0.05), y: Math.max(14, box.height - 14) };
        const emailPos = rel(emailField);
        const pwdPos = rel(pwdField);
        const btnPos = rel(btn);

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
          gsap.set(cursor, { x: rest.x, y: rest.y });
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
          .to(cursor, { x: emailPos.x, y: emailPos.y, duration: 0.55, ease: "power2.inOut" }, 0.15)
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
          .to(cursor, { x: pwdPos.x, y: pwdPos.y, duration: 0.4, ease: "power2.inOut" }, 2.1)
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
          .to(cursor, { x: btnPos.x, y: btnPos.y, duration: 0.35, ease: "power2.inOut" }, 3.35)
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
            0.4,
          )
          .fromTo(captured, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 9.2);

        loop.play();
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
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0d0e10] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex h-10 items-center gap-3 px-4">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto flex h-6 min-w-0 max-w-[240px] items-center gap-1.5 rounded-md border border-white/5 bg-white/5 px-3 font-mono text-[10px] text-[#8b929c]">
            <Lock className="size-2.5 shrink-0 text-[#626973]" />
            <span className="truncate">trail.app/r/Jq9xZv</span>
          </div>
          <span className="hidden w-14 sm:block" aria-hidden="true" />
        </div>

        <div className="bg-[#08090a]">
          <div className="flex h-12 items-center justify-between px-4 sm:px-5">
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

          <div className="px-4 pb-4 pt-4 sm:px-5">
            <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-[#f2f4f6] sm:text-xl">
              POST /api/login failed (500)
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-[#8b929c] sm:text-xs">
              Trail captured the sequence, page context, and runtime failures needed to
              investigate this incident.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-white/10 px-4 py-3 sm:grid-cols-4 sm:px-5 lg:grid-cols-7">
            {FACTS.map((fact) => (
              <div key={fact.key} className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[#626973]">
                  <fact.icon className="size-3" />
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.18em]">
                    {fact.label}
                  </span>
                </span>
                <span
                  data-mock-fact={fact.key}
                  className={`font-heading text-sm font-semibold tabular-nums ${
                    fact.tone ? FACT_TONE[fact.tone] : "text-[#f2f4f6]"
                  }`}
                >
                  {fact.value}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:gap-6 sm:p-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:gap-x-8">
            <div className="overflow-hidden rounded-sm border border-[#2e3338] bg-[#08090a]">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <span className="font-heading text-xs font-semibold text-[#f2f4f6]">
                  Session replay
                </span>
                <span className="flex items-center gap-2 font-mono text-[10px] text-[#626973]">
                  <span>00:42</span>
                  <span className="rounded-sm border border-white/10 bg-[#141618] px-1.5 py-0.5 text-[#f2f4f6]">
                    1×
                  </span>
                </span>
              </div>

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
                        <span data-mock-ph="email" className="text-[#626973]">
                          you@example.com
                        </span>
                        <span data-mock-typed="email" className="text-[#f2f4f6]" />
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
                        <span data-mock-ph="password" className="text-[#626973]">
                          ••••••••
                        </span>
                        <span data-mock-typed="password" className="text-[#f2f4f6]" />
                      </div>
                    </div>
                    <div
                      data-mock-signin
                      className="relative mt-3 grid h-8 w-full place-items-center overflow-hidden rounded-sm bg-[#ff6a00] font-mono text-[10px] font-semibold text-[#08090a]"
                    >
                      <span data-mock-idle className="inline-flex items-center gap-1.5">
                        Sign in
                      </span>
                      <span data-mock-running className="absolute inset-0 grid place-items-center">
                        Signing in…
                      </span>
                      <span
                        data-mock-ripple
                        className="absolute left-1/2 top-1/2 -ml-3 -mt-3 size-6 rounded-full bg-white/50"
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
                  className="absolute left-0 top-0 z-30 will-change-transform"
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
                  className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-sm border border-white/10 bg-[#141618] text-[#f2f4f6] transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#1a1c1f]"
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
                    <span className="absolute right-0 top-1/2 size-3.5 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0d0e10] bg-[#ff6a00]" />
                  </div>
                </div>
                <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-[#626973]">
                  00:42
                </span>
              </div>
            </div>

            <div className="flex flex-col rounded-sm border border-white/10 bg-[#0d0e10] p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-heading text-xs font-semibold text-[#f2f4f6]">
                  Evidence timeline
                </span>
                <span className="font-mono text-[9px] text-[#626973]">
                  {shownCount} events
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1" role="group" aria-label="Filter timeline">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={filter === f.key}
                    onClick={() => setFilter(f.key)}
                    className={`cursor-pointer rounded-sm border px-2 py-0.5 font-mono text-[8.5px] transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                      filter === f.key
                        ? "border-white/15 bg-white/10 text-[#f2f4f6]"
                        : "border-white/10 text-[#626973] hover:text-[#8b929c]"
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
                    className={`grid grid-cols-[2.5rem_1.1rem_minmax(0,1fr)] items-start gap-1.5 ${
                      filter !== "all" && !matches(row, filter) ? "hidden" : ""
                    }`}
                  >
                    <time className="pt-2.5 text-right font-mono text-[9px] tabular-nums text-[#626973]">
                      {row.time}
                    </time>
                    <span className="relative flex h-full justify-center">
                      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#1e2124]" />
                      <span
                        className="relative mt-2.5 size-2 rounded-full border-2 border-[#0d0e10]"
                        style={{ backgroundColor: row.dot }}
                      />
                    </span>
                    <div className="mock-row-card flex min-h-8 min-w-0 items-center gap-2 rounded-sm border border-white/10 bg-[#141618] px-2 py-1.5">
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-sm ${row.iconCls}`}
                      >
                        <row.icon className="size-3" />
                      </span>
                      <span className="truncate text-[10px] text-[#f2f4f6]">{row.label}</span>
                      {row.chip ? (
                        <span
                          className={`ml-auto shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[8px] font-semibold ${row.chipCls}`}
                        >
                          {row.chip}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mx-4 overflow-hidden rounded-sm border border-white/10 bg-[#0d0e10]/30 sm:mx-5">
            {EVIDENCE.map((panel, pi) => (
              <div key={panel.key}>
                {pi > 0 ? <div className="border-t border-white/10" /> : null}
                <button
                  type="button"
                  aria-expanded={Boolean(panels[panel.key])}
                  aria-controls={`evidence-${panel.key}`}
                  onClick={() => togglePanel(panel.key)}
                  className="flex w-full cursor-pointer items-center justify-between px-3 py-2.5 transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/5"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`grid size-6 place-items-center rounded-sm ${
                        panel.tone === "error"
                          ? "bg-[#ff4d4f]/10 text-[#ff4d4f]"
                          : "bg-[#ffb020]/10 text-[#ffb020]"
                      }`}
                    >
                      <panel.icon className="size-3.5" />
                    </span>
                    <span className="text-xs font-medium text-[#f2f4f6]">{panel.label}</span>
                    <span
                      className={`rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold ${
                        panel.tone === "error"
                          ? "bg-[#ff4d4f]/10 text-[#ff4d4f]"
                          : "bg-[#ffb020]/10 text-[#ffb020]"
                      }`}
                    >
                      {panel.count}
                    </span>
                  </span>
                  <span data-evidence-chevron={panel.key} className="text-[#626973]">
                    <ChevronRight className="size-3.5" />
                  </span>
                </button>
                {panels[panel.key] ? (
                  <ul id={`evidence-${panel.key}`} className="space-y-1.5 px-3 pb-3">
                    {panel.rows.map((row) => (
                      <li
                        key={`${panel.key}-${row.line}`}
                        className="flex items-center justify-between gap-3 rounded-sm border border-white/10 bg-[#141618] px-2.5 py-2"
                      >
                        <time className="shrink-0 font-mono text-[9px] tabular-nums text-[#626973]">
                          {row.time}
                        </time>
                        <span className="truncate font-mono text-[10px] text-[#f2f4f6]">
                          {row.line}
                        </span>
                        <span
                          className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold ${row.rowCls}`}
                        >
                          {row.trail}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mx-4 mt-4 rounded-sm border border-white/10 bg-[#0d0e10]/30 p-4 sm:mx-5">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#626973]">
              Attachments
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ATTACHMENTS.map((a) => (
                <div
                  key={a.name}
                  className="flex min-h-12 items-center gap-2 rounded-sm border border-white/10 bg-[#08090a] px-2.5 py-2"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-sm border border-white/10 bg-[#0d0e10] text-[#8b929c]">
                    <a.icon className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[9.5px] font-semibold text-[#f2f4f6]">
                      {a.name}
                    </span>
                    <span className="block truncate font-mono text-[8.5px] text-[#626973]">
                      {a.detail}
                    </span>
                  </span>
                  <Download className="ml-auto size-3 shrink-0 text-[#626973]" />
                </div>
              ))}
            </div>
          </div>

          <p className="px-4 pb-4 pt-3 text-center font-mono text-[10px] text-[#626973]">
            All data is captured automatically by Trail.
          </p>

          <style>{`
            .mock-row-card.mock-active {
              border-color: rgba(255, 106, 0, 0.6);
              box-shadow: 0 0 0 1px rgba(255, 106, 0, 0.35);
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}