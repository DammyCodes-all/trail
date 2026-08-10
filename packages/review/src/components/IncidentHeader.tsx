import {
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  Flag,
  Link2,
  ListChecks,
  Loader2,
  Monitor,
  MousePointer2,
  Share2,
  Terminal,
  WifiOff,
} from "lucide-react";

import { Button } from "@trail/review/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@trail/review/ui/dropdown-menu";
import { Skeleton } from "@trail/review/ui/skeleton";
import { TrailLogo } from "@trail/review/ui/trail-logo";
import type { ReportFacts } from "@trail/review/lib/facts";
import { formatDuration } from "@trail/review/lib/facts";
import type { TrailCounts } from "@trail/review/lib/types";
import { cn } from "@trail/review/lib/utils";

function Fact({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Clock3;
  label: string;
  value: string | number;
  tone?: "neutral" | "error" | "warn";
}) {
  return (
    <div className="min-w-0 py-4 sm:py-5">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            tone === "error" && "text-destructive",
            tone === "warn" && "text-warn",
            tone === "neutral" && "text-muted-foreground",
          )}
          aria-hidden="true"
        />
        <span>{label}</span>
      </div>
      <strong
        className={cn(
          "mt-1.5 block truncate pl-5 font-heading text-sm font-semibold tabular-nums text-foreground",
          tone === "error" && "text-destructive",
          tone === "warn" && "text-warn",
        )}
        title={String(value)}
      >
        {value}
      </strong>
    </div>
  );
}

export function IncidentHeader({
  title,
  onTitleChange,
  onTitleBlur,
  titleLoading = false,
  facts,
  counts,
  flags,
  sharing,
  onCreateIssue,
  onCopyMarkdown,
  onCopyReplayLink,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
  // AI title generation in flight: the editable title is briefly replaced by
  // a skeleton placeholder (the deterministic title fills the slot on any
  // failure, so the page never looks empty).
  titleLoading?: boolean;
  facts: ReportFacts;
  counts: TrailCounts;
  flags: number;
  sharing: "idle" | "uploading";
  onCreateIssue: () => void;
  onCopyMarkdown: () => void;
  onCopyReplayLink: () => void;
}) {
  return (
    <header>
      <div className="flex flex-col gap-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <TrailLogo
            className="size-10 shrink-0 text-primary"
            width={40}
            height={40}
            aria-label="TRAIL logo"
          />
          <span className="font-heading text-base font-semibold tracking-[0.08em] text-foreground">
            TRAIL
          </span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="min-h-10 gap-2 rounded-sm border-border-strong px-4 py-2.5"
                >
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
          <Button
            className="min-h-10 rounded-sm bg-white px-4 py-2.5 text-black hover:bg-white/90"
            onClick={onCreateIssue}
          >
            <ExternalLink data-icon="inline-start" aria-hidden="true" />
            Create GitHub Issue
          </Button>
        </div>
      </div>

      <div className="pb-6 pt-8 sm:pb-8 sm:pt-12">
        {titleLoading ? (
          <Skeleton
            className="-ml-1 h-11 w-3/4 min-w-60 max-w-5xl rounded-sm sm:h-13"
            aria-hidden="true"
          />
        ) : (
          <textarea
            rows={1}
            className="-ml-1 min-h-11 w-full max-w-5xl resize-none overflow-hidden rounded-sm border border-transparent bg-transparent px-1 py-0.5 font-heading text-[1.75rem] font-semibold leading-[1.1] tracking-normal text-foreground outline-none transition-[background-color,border-color] duration-150 [field-sizing:content] placeholder:text-muted-foreground/60 hover:border-border focus:border-border focus:bg-card sm:text-[2.35rem]"
            value={title}
            onChange={(event) => onTitleChange(event.target.value.replace(/\n/g, " "))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            onBlur={onTitleBlur}
            placeholder="What happened?"
            spellCheck={false}
            aria-label="Report title"
          />
        )}
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          Trail captured the sequence, page context, and runtime failures needed to investigate this incident.
        </p>
      </div>

      <div className="grid grid-cols-2 border-y border-border sm:grid-cols-3 lg:grid-cols-7 lg:divide-x lg:divide-border">
        <div className="lg:pr-5">
          <Fact icon={Clock3} label="Duration" value={formatDuration(facts.durationMs)} />
        </div>
        <div className="lg:px-5">
          <Fact
            icon={Flag}
            label="Reporter flags"
            value={flags}
            tone={flags ? "warn" : "neutral"}
          />
        </div>
        <div className="lg:px-5">
          <Fact
            icon={MousePointer2}
            label="Interactions"
            value={counts.click + counts.input + counts.key + counts.submit}
          />
        </div>
        <div className="lg:px-5">
          <Fact icon={ListChecks} label="Evidence events" value={facts.eventCount} />
        </div>
        <div className="lg:px-5">
          <Fact
            icon={WifiOff}
            label="Failed requests"
            value={facts.failedRequests}
            tone={facts.failedRequests ? "error" : "neutral"}
          />
        </div>
        <div className="lg:px-5">
        <Fact
          icon={Terminal}
          label="Console errors"
          value={facts.consoleErrors}
          tone={facts.consoleErrors ? "error" : "neutral"}
        />
        </div>
        <div className="lg:pl-5">
          <Fact icon={Monitor} label="Environment" value={facts.os} />
        </div>
      </div>
    </header>
  );
}
