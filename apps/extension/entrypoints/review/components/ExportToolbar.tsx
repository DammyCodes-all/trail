import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IssueTemplate } from "@/lib/templates";
import {
  CheckCircle2,
  Clapperboard,
  Copy,
  ExternalLink,
  FileDown,
  Loader2,
  Share2,
} from "lucide-react";

export function ExportToolbar({
  repo,
  onRepoChange,
  labels,
  onLabelsChange,
  issueReady,
  sharing,
  template,
  templateState,
  onOpenIssue,
  onCopyMarkdown,
  onDownloadReport,
  onDownloadReplay,
  onCopyReplayLink,
}: {
  repo: string;
  onRepoChange: (value: string) => void;
  labels: string;
  onLabelsChange: (value: string) => void;
  issueReady: boolean;
  sharing: "idle" | "uploading";
  template: IssueTemplate | null;
  templateState: "idle" | "checking" | "found" | "none";
  onOpenIssue: () => void;
  onCopyMarkdown: () => void;
  onDownloadReport: () => void;
  onDownloadReplay: () => void;
  onCopyReplayLink: () => void;
}) {
  return (
    <section className="flex flex-wrap items-center gap-2">
      <Input
        className="repo h-9 flex-1 min-w-55 font-mono text-sm"
        placeholder="owner/repo — e.g. acme/widget"
        value={repo}
        onChange={(e) => onRepoChange(e.target.value)}
        spellCheck={false}
      />
      <Input
        className="h-9 w-auto min-w-35 flex-[0.4] text-sm"
        placeholder="labels — e.g. bug, ui"
        value={labels}
        onChange={(e) => onLabelsChange(e.target.value)}
        spellCheck={false}
      />
      <Button className="h-9" onClick={onOpenIssue} disabled={!issueReady}>
        <ExternalLink data-icon="inline-start" aria-hidden="true" />
        Open GitHub Issue
      </Button>
      <Button variant="secondary" className="h-9" onClick={onCopyMarkdown}>
        <Copy data-icon="inline-start" aria-hidden="true" />
        Copy Markdown
      </Button>
      <Button variant="outline" className="h-9" onClick={onDownloadReport}>
        <FileDown data-icon="inline-start" aria-hidden="true" />
        Download .md
      </Button>
      <Button variant="outline" className="h-9" onClick={onDownloadReplay}>
        <Clapperboard data-icon="inline-start" aria-hidden="true" />
        Download Replay
      </Button>
      <Button
        variant="outline"
        className="h-9"
        onClick={onCopyReplayLink}
        disabled={sharing === "uploading"}
      >
        {sharing === "uploading" ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Share2 data-icon="inline-start" aria-hidden="true" />
        )}
        {sharing === "uploading" ? "Sharing…" : "Copy Replay Link"}
      </Button>
      {templateState === "found" && template && (
        <p className="flex w-full basis-full items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
          Shaped for {template.filename} — {template.name}
        </p>
      )}
    </section>
  );
}
