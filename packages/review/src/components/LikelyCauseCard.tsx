import { Sparkles } from "lucide-react";

// The AI-suggested likely cause, shown on the review page as soon as the
// fast Groq pass lands (and refined when the enhance pass lands). Only ever
// rendered with text — an absent cause renders nothing, so the page never
// shows an empty block. Borderless and background-free so it flows as a
// natural part of the page, with the narrow measure keeping long sentences
// readable. The tone is calm, not error: the cause is a hypothesis, hedged
// by the model, never a verdict.
export function LikelyCauseCard({ cause }: { cause: string }) {
  return (
    <div className="mb-6">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
        Likely cause
      </p>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-foreground">
        {cause}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        AI-suggested from the session's evidence.
      </p>
    </div>
  );
}