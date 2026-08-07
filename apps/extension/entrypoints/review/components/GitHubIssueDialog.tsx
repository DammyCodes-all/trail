import { Check, Info, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { IssueTemplate } from "@/lib/templates";
import type { AIStatus } from "@/lib/ai";

// Static explanation of what the AI pass sends and never sees. Shown on
// hover of the info icon; the digest is built from console messages, failed
// requests, and the click/typing timeline, capture-time redacted.
const AI_INFO =
  "Trail sends a redacted digest (console errors, failed requests, click and typing timeline) to its server to draft the report. Typed values never leave the browser.";

// Live status, shown inline (not in the tooltip) so failures are visible
// without hovering.
const AI_INLINE: Partial<Record<AIStatus, string>> = {
  generating: "Writing the report with AI...",
  disabled: "AI is off. Trail uses its deterministic report format.",
  "server-off":
    "AI is disabled on the Trail server. Using the deterministic report.",
  unavailable:
    "AI is unavailable right now (offline or rate limited). Using the deterministic report.",
};

export function GitHubIssueDialog({
  open,
  onOpenChange,
  repo,
  onRepoChange,
  labels,
  onLabelsChange,
  issueReady,
  template,
  templateState,
  aiEnabled,
  onAiEnabledChange,
  aiState,
  reportTooLong,
  onOpenIssue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repo: string;
  onRepoChange: (value: string) => void;
  labels: string;
  onLabelsChange: (value: string) => void;
  issueReady: boolean;
  template: IssueTemplate | null;
  templateState: "idle" | "checking" | "found" | "none";
  aiEnabled: boolean;
  onAiEnabledChange: (value: boolean) => void;
  aiState: AIStatus;
  reportTooLong: boolean;
  onOpenIssue: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a GitHub issue</DialogTitle>
          <DialogDescription>
            Trail will open GitHub with the evidence report prefilled. You stay in control of the final submission.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="trail-repo">Repository</Label>
            <Input
              id="trail-repo"
              className="repo font-mono"
              placeholder="https://github.com/acme/widget"
              value={repo}
              onChange={(event) => onRepoChange(event.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="trail-labels">Labels <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input
              id="trail-labels"
              placeholder="bug, ui"
              value={labels}
              onChange={(event) => onLabelsChange(event.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="trail-ai" className="text-sm font-medium">
                AI-written report
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    aria-label="About AI-written report"
                    className="text-muted-foreground outline-none hover:text-foreground"
                  >
                    <Info className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start">
                    {AI_INFO}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="trail-ai"
              aria-label="AI-written report"
              checked={aiEnabled}
              onCheckedChange={onAiEnabledChange}
            />
          </div>
          {aiState === "generating" && (
            <p className="-mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              {AI_INLINE[aiState]}
            </p>
          )}
          {aiEnabled &&
            (aiState === "disabled" ||
              aiState === "server-off" ||
              aiState === "unavailable") && (
              <p className="-mt-2 flex items-center gap-2 text-xs text-warn">
                <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                {AI_INLINE[aiState]}
              </p>
            )}
          {templateState === "checking" && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Looking for the repository's issue template...
            </p>
          )}
          {templateState === "found" && template && (
            <p className="flex items-center gap-2 text-xs text-success">
              <Check className="size-3.5 shrink-0" aria-hidden="true" />
              Report will follow {template.name} ({template.filename}).
            </p>
          )}
          {templateState === "none" && repo.trim() && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              No bug template found. Trail will use its standard report format.
            </p>
          )}
          {reportTooLong && (
            <p className="flex items-start gap-2 rounded-md border border-warn/20 bg-warn-soft px-3 py-2 text-xs text-warn">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                Your report is longer than what GitHub’s issue link can hold.
                Don’t worry. Trail copies the full report to your clipboard, so
                you can paste it into the issue body after GitHub opens.
              </span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onOpenIssue} disabled={!issueReady}>
            Open GitHub
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
