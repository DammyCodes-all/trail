import { useEffect, useState } from "react";
import { MSG_START, MSG_STATUS, MSG_STOP, REDACT_KEY } from "@/lib/constants";
import { deleteReport, getAllEvents, getReports } from "@/lib/db";
import type { StoredEvent, TrailCounts, TrailReport } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CirclePlus,
  Keyboard,
  MousePointerClick,
  ShieldCheck,
  Square,
  TriangleAlert,
  Trash2,
  WifiOff,
} from "lucide-react";
import { TrailLogo } from "@trail/logo";

type Status = { recording: boolean; counts: TrailCounts } | null;
type View = "home" | "setup" | "recording";

const fmtTime = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function App() {
  const [status, setStatus] = useState<Status>(null);
  const [view, setView] = useState<View>("home");
  const [busy, setBusy] = useState(false);
  const [autoRedact, setAutoRedact] = useState(true);
  const [reports, setReports] = useState<TrailReport[]>([]);
  const [events, setEvents] = useState<StoredEvent[]>([]);

  const refresh = async () => {
    const s = await browser.runtime.sendMessage({ type: MSG_STATUS });
    setStatus(s);
    setView((v) => {
      if (s.recording) return "recording";
      return v === "recording" ? "home" : v;
    });
  };

  useEffect(() => {
    void refresh();
    const iv = setInterval(() => void refresh(), 500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    void browser.storage.local.get(REDACT_KEY).then((r) => {
      if (typeof r[REDACT_KEY] === "boolean") setAutoRedact(r[REDACT_KEY]);
    });
    void getReports().then(setReports);
  }, []);

  const toggleRedact = async (value: boolean) => {
    setAutoRedact(value);
    await browser.storage.local.set({ [REDACT_KEY]: value });
  };

  const start = async () => {
    setBusy(true);
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const resp = await browser.runtime.sendMessage({
        type: MSG_START,
        tabId: tab?.id,
      });
      if (resp && !resp.ok) alert(resp.error);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await browser.runtime.sendMessage({ type: MSG_STOP });
      const [evs, reps] = await Promise.all([getAllEvents(), getReports()]);
      setEvents(evs);
      setReports(reps);
      await refresh();
      // The demo payoff: stop recording, drop straight into the review tab.
      await browser.tabs.create({
        url: browser.runtime.getURL("/review.html"),
      });
    } finally {
      setBusy(false);
    }
  };

  const openReport = (seq: number) =>
    void browser.tabs.create({
      url: browser.runtime.getURL(`/review.html?report=${seq}`),
    });

  useEffect(() => {
    if (!events.length) return;
    // Test hook: lets an automated driver assert on raw captured data.
    (window as unknown as { __trailEvents: StoredEvent[] }).__trailEvents =
      events;
  }, [events]);

  const counts = status?.counts ?? { click: 0, input: 0, console: 0, net: 0 };
  const recording = status?.recording ?? false;

  return (
    <div className="flex w-95 flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrailLogo
            className="size-8 shrink-0"
            width={32}
            height={32}
            aria-label="TRAIL logo"
          />
          <span className="font-heading text-sm font-semibold tracking-[0.18em] text-foreground">
            TRAIL
          </span>
        </div>
        {recording && (
          <Badge className="pill gap-1.5 border-transparent bg-primary/15 text-primary">
            <span
              className="size-1.5 animate-pulse rounded-none bg-primary"
              aria-hidden="true"
            />
            recording
          </Badge>
        )}
      </header>

      {view === "home" && (
        <>
          <Button
            className="h-9 w-full"
            id="start"
            onClick={() => setView("setup")}
          >
            <CirclePlus data-icon="inline-start" aria-hidden="true" />
            Start Report
          </Button>

          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Past reports
            </h3>
            {reports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
                <h4 className="font-heading text-h4 font-medium">
                  No reports yet
                </h4>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  Start a report, reproduce the bug, and TRAIL writes the issue
                  for you.
                </p>
              </div>
            ) : (
              <ul className="flex max-h-65 flex-col gap-1.5 overflow-y-auto">
                {reports.map((r) => (
                  <li
                    key={r.seq}
                    className="flex min-w-0 items-stretch gap-1.5"
                  >
                    <Button
                      variant="ghost"
                      className="report h-auto min-w-0 flex-1 flex-col items-start justify-center gap-0.5 rounded-lg px-3 py-2"
                      onClick={() => openReport(r.seq)}
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
                      onDeleted={() => void getReports().then(setReports)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {view === "setup" && (
        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-muted-foreground">
            Open the page with the bug, then begin recording. TRAIL captures
            clicks, typed input, console errors, and failed requests.
          </p>
          <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <Label className="text-[13px] font-medium">
                  Auto-redact typed values
                </Label>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Mask anything you type in the report and replay.
                </p>
              </div>
            </div>
            <Switch
              checked={autoRedact}
              onCheckedChange={(v) => void toggleRedact(v)}
              aria-label="Auto-redact typed values"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setView("home")}
              disabled={busy}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              id="begin"
              onClick={() => void start()}
              disabled={busy}
            >
              Begin Recording
            </Button>
          </div>
        </div>
      )}

      {view === "recording" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="gap-1">
              <MousePointerClick aria-hidden="true" />
              clicks {counts.click}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Keyboard aria-hidden="true" />
              inputs {counts.input}
            </Badge>
            <Badge variant="destructive" className="gap-1">
              <TriangleAlert aria-hidden="true" />
              errors {counts.console}
            </Badge>
            <Badge className="gap-1 border-transparent bg-primary/10 text-primary">
              <WifiOff aria-hidden="true" />
              failures {counts.net}
            </Badge>
          </div>
          <p className="text-body-sm text-muted-foreground">
            Reproduce the bug. Every click, error, and failed request is being
            captured.
          </p>
          <Button
            variant="destructive"
            className="h-9"
            id="stop"
            onClick={() => void stop()}
            disabled={busy}
          >
            <Square data-icon="inline-start" aria-hidden="true" />
            Stop &amp; Review
          </Button>
        </div>
      )}
    </div>
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

export default App;
