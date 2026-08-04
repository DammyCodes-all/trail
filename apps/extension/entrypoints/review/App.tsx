import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { eventWithTime } from "@rrweb/types";
import { REPLAY_SERVER_URL, REPO_KEY } from "@/lib/constants";
import {
  getAllEvents,
  getReport,
  getSessionEvents,
  updateReportTitle,
} from "@/lib/db";
import { buildIssueUrl } from "@/lib/github";
import { buildReportFacts } from "@/lib/facts";
import {
  buildMarkdownFromSections,
  buildSections,
  suggestTitle,
} from "@/lib/report";
import { suggestRepo } from "@/lib/repo";
import {
  fetchIssueTemplate,
  shapeSections,
  type IssueTemplate,
} from "@/lib/templates";
import { buildTimeline } from "@/lib/timeline";
import type { StoredEvent, TrailCounts, TrailReport } from "@/lib/types";
import { Toaster, toast } from "@/components/ui/toast";
import { ActionBar } from "./components/ActionBar";
import { EvidencePanel } from "./components/EvidencePanel";
import { GitHubIssueDialog } from "./components/GitHubIssueDialog";
import { IncidentHeader } from "./components/IncidentHeader";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { ReplayPanel } from "./components/ReplayPanel";
import { TimelineCard } from "./components/TimelineCard";
import type { ReplayPlayerHandle } from "./ReplayPlayer";

function App() {
  const reportId =
    Number(new URLSearchParams(location.search).get("report")) || undefined;

  const [report, setReport] = useState<TrailReport | null>(null);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  // Typed values are always redacted from the timeline and report — capture-time
  // masking is the primary line of defense; this is the permanent backstop.
  const redact = true;
  const [repo, setRepo] = useState("");
  const [template, setTemplate] = useState<IssueTemplate | null>(null);
  const [templateState, setTemplateState] = useState<
    "idle" | "checking" | "found" | "none"
  >("idle");
  const [title, setTitle] = useState("");
  const [labels, setLabels] = useState("");
  const [sharing, setSharing] = useState<"idle" | "uploading">("idle");
  const [replayLink, setReplayLink] = useState("");
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [currentReplayTime, setCurrentReplayTime] = useState(0);
  const replayRef = useRef<ReplayPlayerHandle>(null);

  useEffect(() => {
    void (async () => {
      const { [REPO_KEY]: savedRepo } =
        await browser.storage.local.get(REPO_KEY);
      setRepo(typeof savedRepo === "string" ? savedRepo : "");

      if (reportId) {
        const rep = await getReport(reportId);
        const evs = await getSessionEvents(reportId);
        setReport(rep ?? null);
        setEvents(evs);
      } else {
        const evs = await getAllEvents();
        const timestamps = evs.map((event) => event.t).filter(Number.isFinite);
        const counts: TrailCounts = { click: 0, input: 0, console: 0, net: 0 };
        for (const event of evs) {
          if (event.k === "click") counts.click++;
          else if (event.k === "input") counts.input++;
          else if (event.k === "console") counts.console++;
          else if (event.k === "net") counts.net++;
        }
        setReport({
          seq: 0,
          title: suggestTitle(evs),
          repo: "",
          startedAt: timestamps.length ? Math.min(...timestamps) : Date.now(),
          endedAt: timestamps.length ? Math.max(...timestamps) : Date.now(),
          eventCount: evs.length,
          counts,
          url: evs[0]?.url ?? "",
        });
        setEvents(evs);
      }
      setLoading(false);
    })();
  }, [reportId]);

  // Editable title, seeded from the loaded report.
  useEffect(() => {
    setTitle(report?.title ?? "");
  }, [report]);

  // Phase 5: suggest a repo from the recorded pages when the field is empty.
  // Prefill only — not persisted — so the user can dismiss it by typing.
  const repoSuggestedOnce = useRef(false);
  useEffect(() => {
    if (repo || repoSuggestedOnce.current || !events.length) return;
    const s = suggestRepo(events.map((e) => e.url));
    if (s) {
      repoSuggestedOnce.current = true;
      setRepo(s);
    }
  }, [events, repo]);

  const timeline = useMemo(
    () => buildTimeline(events),
    [events],
  );
  // Elapsed-time baseline: anchor the timeline to its first step so it always
  // starts at 00:00, instead of showing wall-clock times.
  const t0 = timeline[0]?.t ?? 0;
  const rrwebEvents = useMemo(
    () =>
      events
        .filter((e) => e.k === "rrweb")
        .map((e) => e.ev as eventWithTime)
        .sort((a, b) => a.timestamp - b.timestamp),
    [events],
  );
  const replayT0 = rrwebEvents[0]?.timestamp ?? t0;

  const counts: TrailCounts = useMemo(() => {
    const c: TrailCounts = { click: 0, input: 0, console: 0, net: 0 };
    for (const e of events) {
      if (e.k === "click") c.click++;
      else if (e.k === "input") c.input++;
      else if (e.k === "console") c.console++;
      else if (e.k === "net") c.net++;
    }
    return c;
  }, [events]);
  const facts = useMemo(
    () => buildReportFacts(events, report),
    [events, report],
  );

  // Phase 4: when a repo is typed, detect its issue template (debounced). Any
  // failure (no template, private repo, offline) resolves to null → generic body.
  useEffect(() => {
    const r = repo.trim();
    if (!r) {
      setTemplate(null);
      setTemplateState("idle");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setTemplateState("checking");
      void fetchIssueTemplate(r).then((t) => {
        if (cancelled) return;
        setTemplate(t);
        setTemplateState(t ? "found" : "none");
      });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [repo]);

  // Template frontmatter labels prefill the labels field — but only while the
  // user hasn't typed their own.
  useEffect(() => {
    if (template?.labels?.length && !labels.trim()) {
      setLabels(template.labels.join(", "));
    }
  }, [template, labels]);

  const base = report ?? { title: "Bug report" };
  const displayTitle = title || base.title;
  const labelsList = labels
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
  const sections = useMemo(() => {
    const baseSections = buildSections(base, events, { repo, redact });
    return template
      ? shapeSections(template, baseSections).sections
      : baseSections;
  }, [base, events, repo, template]);
  const markdown = useMemo(
    () => buildMarkdownFromSections(displayTitle, sections),
    [displayTitle, sections],
  );
  const issue = useMemo(
    () =>
      repo ? buildIssueUrl(repo, displayTitle, sections, labelsList) : null,
    [repo, displayTitle, sections, labelsList],
  );

  // Test hooks for spike/verify.mjs.
  useEffect(() => {
    if (loading) return;
    const w = window as unknown as Record<string, unknown>;
    w.__trailTimeline = timeline;
    w.__trailReplayCount = rrwebEvents.length;
    w.__trailMarkdown = markdown;
    w.__trailIssueUrl = issue?.url ?? "";
    w.__trailDropped = issue?.dropped ?? [];
    w.__trailTemplate = template?.name ?? null;
    w.__trailTemplateState = templateState;
    w.__trailTitle = displayTitle;
    w.__trailReplayLink = replayLink;
    w.__trailReplayTime = currentReplayTime;
    w.__trailSuggestedRepo = repoSuggestedOnce.current ? repo : null;
  }, [
    timeline,
    rrwebEvents,
    markdown,
    issue,
    template,
    templateState,
    displayTitle,
    replayLink,
    currentReplayTime,
    repo,
    loading,
  ]);

  const setRepoAndSave = (value: string) => {
    setRepo(value);
    void browser.storage.local.set({ [REPO_KEY]: value });
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = markdown;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast.add({ type: "success", title: "Markdown copied to clipboard" });
  };

  const download = async (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    try {
      await browser.downloads.download({ url, filename });
      toast.add({ type: "success", title: `Downloaded ${filename}` });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  const downloadReport = () =>
    download(
      "trail-report.md",
      new Blob([markdown], { type: "text/markdown" }),
    );

  const downloadReplay = () =>
    download(
      "trail-replay.json",
      new Blob(
        [
          JSON.stringify(
            { title: base.title, repo, exportedAt: Date.now(), events },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );

  const openIssue = () => {
    if (!issue) return;
    setIssueDialogOpen(false);
    void browser.tabs.create({ url: issue.url });
  };

  const handleCreateIssue = () => setIssueDialogOpen(true);

  const seekReplay = useCallback(
    (timestamp: number) => {
      const offset = Math.max(0, timestamp - replayT0);
      setCurrentReplayTime(offset);
      replayRef.current?.seek(offset, false);
    },
    [replayT0],
  );

  const handleReplayTimeChange = useCallback((timeOffset: number) => {
    setCurrentReplayTime(timeOffset);
  }, []);

  const persistTitle = () => {
    if (reportId && title && title !== report?.title) {
      void updateReportTitle(reportId, title);
    }
  };

  // Upload the session to the replay server and hand back the share link.
  // Clipboard failures never block the link from being generated.
  const copyReplayLink = async () => {
    if (sharing === "uploading") return;
    setSharing("uploading");
    try {
      const res = await fetch(`${REPLAY_SERVER_URL}/api/replays`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: displayTitle,
          exportedAt: Date.now(),
          // rrweb events only: the share page feeds this straight to
          // rrweb-player, which expects eventWithTime[] — not the storage
          // wrapper format.
          events: rrwebEvents,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { id?: string };
      if (!data.id) throw new Error("no id");
      const link = `${REPLAY_SERVER_URL}/r/${data.id}`;
      setReplayLink(link);
      try {
        await navigator.clipboard.writeText(link);
        toast.add({
          type: "success",
          title: "Replay link copied to clipboard",
        });
      } catch {
        toast.add({ type: "info", title: `Replay link ready: ${link}` });
      }
    } catch {
      toast.add({
        type: "error",
        title: `Replay server unreachable at ${REPLAY_SERVER_URL}`,
      });
    } finally {
      setSharing("idle");
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-300 flex-col gap-4 p-5">
      <IncidentHeader
        title={title}
        onTitleChange={setTitle}
        onTitleBlur={persistTitle}
        facts={facts}
        counts={counts}
      />

      <ActionBar
        sharing={sharing}
        template={template}
        templateState={templateState}
        onCreateIssue={handleCreateIssue}
        onCopyMarkdown={() => void copyMarkdown()}
        onDownloadReport={downloadReport}
        onDownloadReplay={downloadReplay}
        onCopyReplayLink={() => void copyReplayLink()}
      />

      <main className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,28rem)] lg:items-start">
        <div className="min-w-0">
          <TimelineCard
            steps={timeline}
            t0={t0}
            replayT0={replayT0}
            currentTime={currentReplayTime}
            onSeek={seekReplay}
          />
          <EvidencePanel events={events} t0={t0} onSeek={seekReplay} />
        </div>
        <ReplayPanel
          ref={replayRef}
          events={rrwebEvents}
          facts={facts}
          onCurrentTimeChange={handleReplayTimeChange}
        />
      </main>

      <GitHubIssueDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        repo={repo}
        onRepoChange={setRepoAndSave}
        labels={labels}
        onLabelsChange={setLabels}
        issueReady={!!issue}
        template={template}
        templateState={templateState}
        onOpenIssue={openIssue}
      />

      <Toaster />
    </div>
  );
}

export default App;
