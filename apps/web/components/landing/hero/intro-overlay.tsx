import { TrailLogo } from "@/components/trail-logo";

const LETTER_SVG = {
  T: "M362 113 L362 738 L278 738 L278 113 L45 113 L45 40 L595 40 L595 113 L362 113 Z",
  R: "M794 738 L710 738 L710 40 L964 40 Q1061 40 1112 93 L1163 241 Q1163 326 1119 377 L991 436 L1169 738 L1075 738 L905 440 L794 440 L794 738 Z M962 369 Q1015 369 1044.5 342.5 L1074 267 L1074 215 Q1074 166 1044.5 139.5 L962 113 L794 113 L794 369 L962 369 Z",
  A: "M1701 738 L1642 539 L1397 539 L1338 738 L1251 738 L1465 40 L1576 40 L1790 738 L1701 738 Z M1524 129 L1515 129 L1417 466 L1622 466 L1524 129 Z",
  I: "M1904 738 L1904 671 L2078 671 L2078 107 L1904 107 L1904 40 L2336 40 L2336 107 L2162 107 L2162 671 L2336 671 L2336 738 L1904 738 Z",
  L: "M2540 738 L2540 40 L2624 40 L2624 665 L2955 665 L2955 738 L2540 738 Z",
} as const;

const WORDMARK = ["T", "R", "A", "I", "L"] as const;

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
        <div data-intro-mark className="relative size-24 sm:size-28">
          <TrailLogo
            className="size-full"
            pathProps={{ "data-intro-path": true, pathLength: 1 }}
          />
        </div>
        <svg
          data-intro-wordmark
          viewBox="0 0 3040 778"
          className="h-8 w-auto text-[#f2f4f6] sm:h-10"
          aria-hidden="true"
          focusable="false"
        >
          {WORDMARK.map((letter) => (
            <path
              key={letter}
              data-intro-letter
              d={LETTER_SVG[letter]}
              pathLength={1}
              fill="currentColor"
              fillRule="evenodd"
              stroke="currentColor"
              strokeWidth="0.25"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}