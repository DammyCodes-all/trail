import {
  Check,
  ChevronDown,
  Clapperboard,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { IssueTemplate } from "@/lib/templates";

export function ActionBar({
  sharing,
  template,
  templateState,
  onCreateIssue,
  onCopyMarkdown,
  onDownloadReport,
  onDownloadReplay,
  onCopyReplayLink,
}: {
  sharing: "idle" | "uploading";
  template: IssueTemplate | null;
  templateState: "idle" | "checking" | "found" | "none";
  onCreateIssue: () => void;
  onCopyMarkdown: () => void;
  onDownloadReport: () => void;
  onDownloadReplay: () => void;
  onCopyReplayLink: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-1">
      <div className="flex min-w-0 items-center gap-2">
        <Button className="h-9" onClick={onCreateIssue}>
          <ExternalLink data-icon="inline-start" aria-hidden="true" />
          Create GitHub Issue
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="h-9 gap-1.5">
                <Share2 data-icon="inline-start" aria-hidden="true" />
                Share
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </Button>
            }
          />
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onCopyMarkdown}>
              <Copy aria-hidden="true" />
              Copy Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownloadReport}>
              <FileText aria-hidden="true" />
              Download Report
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDownloadReplay}>
              <Clapperboard aria-hidden="true" />
              Download Replay
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyReplayLink} disabled={sharing === "uploading"}>
              {sharing === "uploading" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Link2 aria-hidden="true" />
              )}
              {sharing === "uploading" ? "Preparing link..." : "Copy Replay Link"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {templateState === "found" && template ? (
          <>
            <Check className="size-3.5 text-success" aria-hidden="true" />
            Shaped for {template.filename}
          </>
        ) : templateState === "checking" ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Checking issue template
          </>
        ) : null}
      </div>
    </div>
  );
}
