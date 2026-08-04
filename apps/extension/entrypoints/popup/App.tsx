import { useEffect, useState } from "react";
import { MSG_START, MSG_STATUS, MSG_STOP, REDACT_KEY } from "@/lib/constants";
import { getAllEvents, getReports } from "@/lib/db";
import type { StoredEvent, TrailCounts, TrailReport } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CirclePlus } from "lucide-react";
import { TrailLogo } from "@/components/ui/trail-logo";
import { HistoryList } from "./components/HistoryList";
import { RecordingScreen } from "./components/RecordingScreen";
import { SetupScreen } from "./components/SetupScreen";

type Status = { recording: boolean; counts: TrailCounts } | null;
type View = "home" | "setup" | "recording";

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
              className="size-1.5 animate-pulse rounded-full bg-primary"
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
            <HistoryList
              reports={reports}
              onOpen={openReport}
              onDeleted={() => void getReports().then(setReports)}
            />
          </section>
        </>
      )}

      {view === "setup" && (
        <SetupScreen
          autoRedact={autoRedact}
          onToggleRedact={(v) => void toggleRedact(v)}
          busy={busy}
          onBack={() => setView("home")}
          onBegin={() => void start()}
        />
      )}

      {view === "recording" && (
        <RecordingScreen
          counts={counts}
          busy={busy}
          onStop={() => void stop()}
        />
      )}
    </div>
  );
}

export default App;
