"use client";

import { StarIcon } from "lucide-react";
import {
  GithubStars,
  GithubStarsIcon,
  GithubStarsLogo,
  GithubStarsParticles,
} from "@/components/animate-ui/primitives/animate/github-stars";

export function NavGithubLink() {
  return (
    <GithubStars asChild username="DammyCodes-all" repo="trail">
      <a
        href="https://github.com/DammyCodes-all/trail"
        target="_blank"
        rel="noreferrer"
        aria-label="Star TRAIL on GitHub"
        className="group inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-[#8b929c] outline-none transition-colors hover:border-white/25 hover:bg-white/[0.05] hover:text-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
      >
        <GithubStarsLogo className="size-4" />
        <span className="text-sm font-medium leading-none">Star on GitHub</span>
        <GithubStarsParticles className="text-amber-400">
          <GithubStarsIcon
            icon={StarIcon}
            className="size-3.5 fill-[#8b929c] stroke-[#8b929c] transition-colors group-hover:fill-[#f2f4f6] group-hover:stroke-[#f2f4f6]"
            activeClassName="text-amber-400"
          />
        </GithubStarsParticles>
      </a>
    </GithubStars>
  );
}