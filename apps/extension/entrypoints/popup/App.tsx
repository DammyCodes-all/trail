import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { MSG_START, MSG_STATUS, MSG_STOP, REDACT_KEY } from "@/lib/constants";
import { getAllEvents, getReports, getSessionEvents, updateReportSummary } from "@/lib/db";
import type { StoredEvent, TrailCounts, TrailReport } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CirclePlus, Link2 } from "lucide-react";
import { TrailLogo } from "@/components/ui/trail-logo";
import { HistoryList } from "./components/HistoryList";
import { RecordingScreen } from "./components/RecordingScreen";
import { SetupScreen } from "./components/SetupScreen";

type Status = { recording: boolean; counts: TrailCounts } | null;
type View = "home" | "setup" | "recording";

const SHARE_LINK_RE = /^https?:\/\/.+\/api\/replays\/[A-Za-z0-9.-]{1,64}$/;

function App() {
  const [status, setStatus] = useState<Status>(null);
  const [view, setView] = useState<View>("home");
  const [busy, setBusy] = useState(false);
  const [autoRedact, setAutoRedact] = useState(true);
  const [reports, setReports] = useState<TrailReport[]>([]);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [shareLink, setShareLink] = useState("");
  const [shareError, setShareError] = useState("");

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
    void getReports().then((reps) => {
      setReports(reps);
      void backfillSummaries(reps);
    });
  }, []);

  // Reports saved before errorCount/failedRequestCount existed lack the
  // summary the list shows. Derive it from each session snapshot once and
  // persist; capped per popup open so a large history never chokes a single
  // load — remaining reports backfill on the next open.
  const backfillSummaries = async (reps: TrailReport[]) => {
    const missing = reps
      .filter(
        (r) =>
          r.errorCount === undefined || r.failedRequestCount === undefined,
      )
      .slice(0, 8);
    for (const r of missing) {
      try {
        const events = await getSessionEvents(r.seq);
        if (!events.length) continue;
        const errorCount = events.filter(
          (e) => e.k === "console" && e.lv === "error",
        ).length;
        const failedRequestCount = events.filter(
          (e) => e.k === "net" && (e.status === 0 || e.status >= 400),
        ).length;
        await updateReportSummary(r.seq, errorCount, failedRequestCount);
      } catch {
        // best-effort backfill
      }
    }
    void getReports().then(setReports);
  };

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

  // A shared TRAIL link pasted here opens the review tab, which fetches the
  // session and saves it to this profile's history automatically.
  const openSharedLink = (value: string) => {
    const link = value.trim();
    if (!SHARE_LINK_RE.test(link)) {
      setShareError("Paste a TRAIL share link (https://…/api/replays/…).");
      return;
    }
    setShareError("");
    setShareLink("");
    void browser.tabs.create({
      url: browser.runtime.getURL(`/review.html?share=${encodeURIComponent(link)}`),
    });
  };

  useEffect(() => {
    if (!events.length) return;
    // Test hook: lets an automated driver assert on raw captured data.
    (window as unknown as { __trailEvents: StoredEvent[] }).__trailEvents =
      events;
  }, [events]);

  const counts = status?.counts ?? { click: 0, input: 0, console: 0, net: 0 };
  const recording = status?.recording ?? false;

  return (
    <div className="flex h-120 w-95 flex-col gap-3 overflow-hidden p-4">
      <header className="flex shrink-0 items-center justify-between">
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
              className="size-1.5 animate-pulse rounded-full bg-primary"
              aria-hidden="true"
            />
            recording
          </Badge>
        )}
      </header>

      {view === "home" && (
        <motion.div
          key="home"
          className="flex min-h-0 flex-1 flex-col gap-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
        >
          <div className="flex shrink-0 flex-col gap-2">
            <p className="text-[11px] tracking-tight text-muted-foreground">
              Stop explaining bugs. Start showing them.
            </p>
            <Button
              className="h-11 w-full"
              id="start"
              onClick={() => setView("setup")}
            >
              <CirclePlus data-icon="inline-start" aria-hidden="true" />
              Start Report
            </Button>
            <div className="flex items-center gap-1.5">
              <Input
                id="share-link"
                className="h-9 flex-1 rounded-md border-border-strong bg-muted/40 font-mono text-[11px]"
                placeholder="Paste a TRAIL share link"
                value={shareLink}
                onChange={(e) => setShareLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") openSharedLink(shareLink);
                }}
              />
              <Button
                id="open-shared"
                className="h-9 shrink-0 rounded-md px-3"
                variant="outline"
                disabled={!shareLink.trim()}
                onClick={() => openSharedLink(shareLink)}
              >
                <Link2 data-icon="inline-start" aria-hidden="true" />
                Open report
              </Button>
            </div>
            {shareError && (
              <p
                id="share-error"
                className="text-[11px] leading-snug text-destructive"
              >
                {shareError}
              </p>
            )}
          </div>

          <Separator className="my-1 shrink-0" />

          <section className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex shrink-0 items-baseline justify-between">
              <h3 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Past reports
              </h3>
              {reports.length > 0 && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {reports.length}
                </span>
              )}
            </div>
            <HistoryList
              reports={reports}
              onOpen={openReport}
              onDeleted={() => void getReports().then(setReports)}
            />
          </section>
        </motion.div>
      )}

        {view === "setup" && (
          <motion.div
            key="setup"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          >
            <SetupScreen
              autoRedact={autoRedact}
              onToggleRedact={(v) => void toggleRedact(v)}
              busy={busy}
              onBack={() => setView("home")}
              onBegin={() => void start()}
            />
          </motion.div>
        )}

        {view === "recording" && (
          <motion.div
            key="recording"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          >
            <RecordingScreen
              counts={counts}
              busy={busy}
              onStop={() => void stop()}
            />
          </motion.div>
        )}
    </div>
  );
}

export default App;
