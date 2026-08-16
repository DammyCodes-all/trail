import { TrailLogo } from "@/components/trail-logo";

const TRAIL_WORDMARK_PATH =
  "M272 740 L272 145 L44 145 L44 40 L615 40 L615 145 L387 145 L387 740 L272 740 Z M915 740 L915 40 L1177 40 Q1243 40 1293 66.5 Q1398 184 1398 242 Q1398 303 1370.5 348 L1293 418 Q1251 439 1198 442 L1444 740 L1299 740 L1060 443 L1030 443 L1030 740 L915 740 Z M1030 140 L1030 348 L1171 348 Q1224 348 1253.5 320.5 L1283 244 Q1283 200 1254 170 L1172 140 L1030 140 Z M1691 740 L1979 40 L2059 40 L2345 740 L2221 740 L2168 605 L1867 605 L1813 740 L1691 740 Z M2128 505 L2018 226 L1907 505 L2128 505 Z M2645 740 L2645 40 L2760 40 L2760 740 L2645 740 Z M3112 740 L3112 40 L3227 40 L3227 635 L3557 635 L3557 740 L3112 740 Z";

export function IntroOverlay() {
  return (
    <div
      data-intro-overlay
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        data-intro-bg
        aria-hidden="true"
        className="absolute inset-0 bg-[#08090a]"
      />
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
          viewBox="0 0 3606 780"
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