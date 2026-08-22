import {
  CircleUser,
  Globe,
  MousePointerClick,
  Play,
  TriangleAlert,
  Video,
} from "lucide-react";
import { GithubStarsLogo } from "@/components/animate-ui/primitives/animate/github-stars";

const FEATURES = [
  {
    icon: Video,
    label: "Records your browser session",
  },
  {
    icon: MousePointerClick,
    label: "Follows every click and page navigation",
  },
  {
    icon: TriangleAlert,
    label: "Captures console errors",
  },
  {
    icon: Globe,
    label: "Logs failed network requests",
  },
  {
    icon: CircleUser,
    label: "Flags when the user, not the code, broke it",
  },
  {
    icon: Play,
    label: "Replays the bug start to finish",
  },
] as const;

export function BetaFeatures() {
  return (
    <section
      id="whats-in-the-beta"
      className="relative border-t border-white/10 bg-[#0d0e10] px-5 py-14 sm:px-8 sm:py-16"
    >
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#ff6a00]">
          What you&apos;re testing
        </p>
          <h2 className="mt-3 max-w-2xl font-heading text-2xl font-bold leading-[1.1] text-[#f2f4f6] sm:text-[2rem]">
            While you reproduce the bug, TRAIL captures:
          </h2>
        <ul className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] px-4 py-3.5"
            >
              <Icon
                className="size-4 shrink-0 text-[#ff6a00]"
                aria-hidden="true"
              />
              <span className="text-sm leading-5 text-[#c6cbd2]">{label}</span>
            </li>
          ))}
          <li className="flex items-center gap-3 rounded-md border border-[#ff6a00]/25 bg-[#ff6a00]/[0.06] px-4 py-3.5">
            <GithubStarsLogo className="size-4 shrink-0 text-[#ff6a00]" />
            <span className="text-sm leading-5 text-[#f2f4f6]">
              Writes the GitHub issue for you
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
