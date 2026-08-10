import { TrailLogo } from "@trail/review/ui/trail-logo";
import { Button } from "@trail/review/ui/button";

// Server-rendered "unavailable" screen (payload fetch failed, unknown id, or
// the replay server is unreachable) — matches the review app's error look so
// the two states feel like one product.
export function SharedReplayError() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-5 flex justify-center">
          <TrailLogo size={48} aria-label="TRAIL logo" />
        </div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          Shared replay unavailable
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link may be invalid, or the replay server may be unreachable.
          Ask the person who shared it to re-share the session.
        </p>
        <Button
          className="mt-6 min-h-10 rounded-sm bg-white px-4 py-2.5 text-black hover:bg-white/90"
          onClick={() => window.close()}
        >
          Close tab
        </Button>
      </div>
    </div>
  );
}
