import { TrailLogo } from "@/components/trail-logo";

export type IntroFragment = {
  id: string;
  clipPath: string;
  spreadX: number;
  spreadY: number;
  tiltX: number;
  tiltY: number;
};

export const introFragments: IntroFragment[] = [
  {
    id: "top",
    clipPath: "polygon(34% 0, 66% 0, 71% 36%, 32% 36%)",
    spreadX: 0,
    spreadY: -0.45,
    tiltX: -8,
    tiltY: 0,
  },
  {
    id: "upper-left",
    clipPath: "polygon(0 21%, 39% 21%, 40% 64%, 0 64%)",
    spreadX: -0.5,
    spreadY: -0.28,
    tiltX: -6,
    tiltY: 6,
  },
  {
    id: "upper-right",
    clipPath: "polygon(61% 21%, 100% 21%, 100% 64%, 60% 64%)",
    spreadX: 0.5,
    spreadY: -0.28,
    tiltX: 6,
    tiltY: -6,
  },
  {
    id: "bottom-left",
    clipPath: "polygon(0 57%, 49% 57%, 49% 100%, 0 100%)",
    spreadX: -0.38,
    spreadY: 0.42,
    tiltX: -4,
    tiltY: 8,
  },
  {
    id: "bottom-right",
    clipPath: "polygon(51% 57%, 100% 57%, 100% 100%, 51% 100%)",
    spreadX: 0.38,
    spreadY: 0.42,
    tiltX: 4,
    tiltY: -8,
  },
];

export function IntroOverlay() {
  return (
    <div
      data-intro-overlay
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#08090a] motion-reduce:hidden"
    >
      <div
        data-intro-logo
        className="relative size-64 sm:size-72"
        style={{ perspective: 1000 }}
      >
        <div
          data-intro-glow
          className="absolute -inset-12 rounded-full bg-[#ff6a00]/15 blur-3xl motion-safe:opacity-0"
        />
        {introFragments.map((fragment) => (
          <div
            key={fragment.id}
            data-intro-piece
            className="absolute inset-0 motion-safe:opacity-0"
            style={{ clipPath: fragment.clipPath }}
          >
            <TrailLogo className="size-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
