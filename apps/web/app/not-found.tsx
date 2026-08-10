import { TrailLogo } from "@trail/review/ui/trail-logo";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-5 flex justify-center">
          <TrailLogo size={48} aria-label="TRAIL logo" />
        </div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          That link doesn&apos;t look right
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          TRAIL share links point at <span className="font-mono">/r/{"<id>"}</span>.
          Double-check the URL, or ask the person who shared it to re-share the
          session.
        </p>
      </div>
    </div>
  );
}
