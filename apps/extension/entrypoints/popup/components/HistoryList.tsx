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
import { deleteReport } from "@/lib/db";
import type { TrailReport } from "@/lib/types";
import { ClipboardList, Trash2 } from "lucide-react";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const fmtTime = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  const clock = `${p(d.getHours())}:${p(d.getMinutes())}`;
  const now = new Date();
  const day = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day - start) / 86400000);
  if (days === 0) return `Today · ${clock}`;
  if (days === 1) return `Yesterday · ${clock}`;
  if (d.getFullYear() === now.getFullYear())
    return `${MONTHS[d.getMonth()]} ${d.getDate()} · ${clock}`;
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${String(d.getFullYear()).slice(2)}`;
};

const STEPS = ["Open the page", "Start", "Reproduce"];

export function HistoryList({
  reports,
  onOpen,
  onDeleted,
}: {
  reports: TrailReport[];
  onOpen: (seq: number) => void;
  onDeleted: () => void;
}) {
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
    <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
      {reports.map((r) => (
        <li key={r.seq} className="flex min-w-0 shrink-0 items-stretch gap-1.5">
          <Button
            variant="ghost"
            className="report h-auto min-w-0 flex-1 flex-col items-start justify-center gap-0.5 rounded-lg py-2.5 pl-3 pr-3 active:scale-[0.99]"
            onClick={() => onOpen(r.seq)}
          >
            <span className="w-full min-w-0 truncate text-left text-[13px] font-medium leading-snug text-foreground">
              {r.title || "Untitled report"}
            </span>
            <span className="w-full min-w-0 truncate text-left font-mono text-[11px] text-muted-foreground">
              {fmtTime(r.endedAt)} · {r.eventCount} events
              {r.repo ? ` · ${r.repo}` : ""}
            </span>
          </Button>
          <DeleteButton
            seq={r.seq}
            title={r.title || "Untitled report"}
            onDeleted={onDeleted}
          />
        </li>
      ))}
    </ul>
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
            className="shrink-0 self-center text-muted-foreground hover:text-destructive"
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
            “{title}” and its saved replay will be permanently removed. This
            can’t be undone.
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
