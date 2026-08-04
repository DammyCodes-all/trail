import { Check, Loader2, TriangleAlert } from "lucide-react";

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
import type { IssueTemplate } from "@/lib/templates";

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
              placeholder="owner/repo"
              value={repo}
              onChange={(event) => onRepoChange(event.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Use the repository name, for example <code className="font-mono">acme/widget</code>.
            </p>
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
          {templateState === "checking" && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Looking for the repository's issue template...
            </p>
          )}
          {templateState === "found" && template && (
            <p className="flex items-center gap-2 rounded-md border border-success/20 bg-success-soft px-3 py-2 text-xs text-success">
              <Check className="size-3.5 shrink-0" aria-hidden="true" />
              Report will follow {template.name} ({template.filename}).
            </p>
          )}
          {templateState === "none" && repo.trim() && (
            <p className="flex items-center gap-2 rounded-md border border-warn/20 bg-warn-soft px-3 py-2 text-xs text-warn">
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
              No bug template found. Trail will use its standard report format.
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
