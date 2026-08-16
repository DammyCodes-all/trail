import { TrailLogo } from "@/components/trail-logo";

const TRAIL_WORDMARK_PATH =
  "M362 113 L362 738 L278 738 L278 113 L45 113 L45 40 L595 40 L595 113 L362 113 Z M994 738 L910 738 L910 40 L1164 40 Q1261 40 1312 93 L1363 241 Q1363 326 1319 377 L1191 436 L1369 738 L1275 738 L1105 440 L994 440 L994 738 Z M1162 369 Q1215 369 1244.5 342.5 L1274 267 L1274 215 Q1274 166 1244.5 139.5 L1162 113 L994 113 L994 369 L1162 369 Z M2101 738 L2042 539 L1797 539 L1738 738 L1651 738 L1865 40 L1976 40 L2190 738 L2101 738 Z M1924 129 L1915 129 L1817 466 L2022 466 L1924 129 Z M2504 738 L2504 671 L2678 671 L2678 107 L2504 107 L2504 40 L2936 40 L2936 107 L2762 107 L2762 671 L2936 671 L2936 738 L2504 738 Z M3340 738 L3340 40 L3424 40 L3424 665 L3755 665 L3755 738 L3340 738 Z";

export function IntroOverlay() {
  return (
    <div
      data-intro-overlay
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#08090a]"
    >
      <div
        data-intro-logo
        className="relative flex items-center gap-4 sm:gap-5"
      >
        <div data-intro-mark className="relative size-16 sm:size-20">
          <TrailLogo
            className="size-full"
            pathProps={{ "data-intro-path": true, pathLength: 1 }}
          />
        </div>
        <svg
          data-intro-wordmark
          viewBox="0 0 4040 778"
          className="h-9 w-auto text-[#f2f4f6] sm:h-14"
          aria-hidden="true"
          focusable="false"
        >
          <path
            data-intro-text
            d={TRAIL_WORDMARK_PATH}
            pathLength={1}
            fill="currentColor"
            fillRule="evenodd"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}