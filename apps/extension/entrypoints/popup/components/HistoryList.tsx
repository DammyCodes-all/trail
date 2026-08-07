import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteReport } from "@/lib/db";
import type { TrailReport } from "@/lib/types";
import { ClipboardList, Globe, Search, Trash2 } from "lucide-react";

const hostOf = (url: string): string | null => {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

// Compact relative date: the one fact worth keeping on the row is recency —
// "which run was this one?" Duration and clock time don't help scanning.
const fmtDay = (t: number) => {
  const d = new Date(t);
  const now = new Date();
  const day = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day - start) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (d.getFullYear() === now.getFullYear()) {
    const MONTHS = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
};

const STEPS = ["Open the page", "Start", "Reproduce"];

const SEARCH_THRESHOLD = 6;

export function HistoryList({
  reports,
  onOpen,
  onDeleted,
}: {
  reports: TrailReport[];
  onOpen: (seq: number) => void;
  onDeleted: () => void;
}) {
  const [query, setQuery] = useState("");
  const searchable = reports.length >= SEARCH_THRESHOLD;
  const q = query.trim().toLowerCase();
  const visible = q
    ? reports.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          hostOf(r.url)?.toLowerCase().includes(q) ||
          r.repo.toLowerCase().includes(q),
      )
    : reports;

  if (reports.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border px-4 py-6 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h4 className="font-heading text-h4 font-medium">No reports yet</h4>
          <p className="text-body-sm text-muted-foreground">
            Start a report, reproduce the bug, and TRAIL writes the issue for
            you.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {STEPS.map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              <span className="flex size-4 items-center justify-center rounded bg-muted font-mono text-[9px] text-muted-foreground">
                {i + 1}
              </span>
              {s}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      {searchable && (
        <div className="relative shrink-0">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="search-reports"
            className="h-8 rounded-md pl-8 pr-2 text-[11px]"
            placeholder="Search reports"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}
      {visible.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-muted-foreground">
          No reports match “{query.trim()}”.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
          {visible.map((r) => (
            <li
              key={r.seq}
              className="group flex min-w-0 shrink-0 items-stretch gap-1.5"
            >
              <Button
                variant="ghost"
                className="report h-auto min-w-0 flex-1 flex-col items-start justify-center gap-0.5 rounded-lg py-2 pl-3 pr-2 active:scale-[0.99]"
                onClick={() => onOpen(r.seq)}
              >
                <ReportRow r={r} />
              </Button>
              <DeleteButton
                seq={r.seq}
                title={r.title || "Untitled report"}
                onDeleted={onDeleted}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Favicon({ host }: { host: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !host) {
    return (
      <span className="flex size-3.5 shrink-0 items-center justify-center text-muted-foreground">
        <Globe className="size-3.5" aria-hidden="true" />
      </span>
    );
  }
  return (
    <img
      className="size-3.5 shrink-0 rounded-sm"
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function ReportRow({ r }: { r: TrailReport }) {
  const host = hostOf(r.url);
  const hasSummary =
    r.errorCount !== undefined && r.failedRequestCount !== undefined;

  return (
    <>
      {host && (
        <span className="flex w-full min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <Favicon host={host} />
          <span className="min-w-0 truncate">{host}</span>
        </span>
      )}
      <span className="w-full min-w-0 truncate text-left text-[13px] font-medium leading-snug text-foreground">
        {r.title || "Untitled report"}
      </span>
      <span className="flex w-full min-w-0 items-center gap-2.5 font-mono text-[11px] text-muted-foreground">
        <span className="shrink-0">{fmtDay(r.endedAt)}</span>
        {hasSummary ? (
          <>
            <span className="text-muted-foreground/50" aria-hidden="true">
              ·
            </span>
            <span
              title={`${r.errorCount} console error${r.errorCount === 1 ? "" : "s"}`}
            >
              Errors {r.errorCount}
            </span>
            <span className="text-muted-foreground/50" aria-hidden="true">
              ·
            </span>
            <span
              title={`${r.failedRequestCount} failed request${r.failedRequestCount === 1 ? "" : "s"}`}
            >
              Network {r.failedRequestCount}
            </span>
            <span className="text-muted-foreground/50" aria-hidden="true">
              ·
            </span>
            <span
              title={`${r.counts.console} console message${r.counts.console === 1 ? "" : "s"}`}
            >
              Console {r.counts.console}
            </span>
          </>
        ) : (
          <span className="truncate">
            <span className="text-muted-foreground/50" aria-hidden="true">
              ·{" "}
            </span>
            {r.eventCount} events
          </span>
        )}
      </span>
    </>
  );
}

function DeleteButton({
  seq,
  title,
  onDeleted,
}: {
  seq: number;
  title: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 self-center text-muted-foreground opacity-0 transition-opacity duration-150 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`Delete report ${seq}`}
          />
        }
      >
        <Trash2 aria-hidden="true" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this report?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="break-words font-medium text-foreground">
              “{title}”
            </span>{" "}
            and its saved replay will be permanently removed. This can’t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              setOpen(false);
              void deleteReport(seq).then(onDeleted);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
