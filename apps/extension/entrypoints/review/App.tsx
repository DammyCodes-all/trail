import { useEffect, useMemo, useRef, useState } from "react";
import type { eventWithTime } from "@rrweb/types";
import { REPLAY_SERVER_URL, REPO_KEY } from "@/lib/constants";
import {
  getAllEvents,
  getReport,
  getSessionEvents,
  updateReportTitle,
} from "@/lib/db";
import { buildIssueUrl } from "@/lib/github";
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
import { ExportToolbar } from "./components/ExportToolbar";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { ReplayCard } from "./components/ReplayCard";
import { ReviewHeader } from "./components/ReviewHeader";
import { TimelineCard } from "./components/TimelineCard";

function App() {
  const reportId =
    Number(new URLSearchParams(location.search).get("report")) || undefined;

  const [report, setReport] = useState<Pick<TrailReport, "title"> | null>(null);
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
        setReport({ title: suggestTitle(evs) });
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
    repo,
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
    void browser.tabs.create({ url: issue.url });
  };

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
      <ReviewHeader
        title={title}
        onTitleChange={setTitle}
        onTitleBlur={persistTitle}
        counts={counts}
      />

      <ExportToolbar
        repo={repo}
        onRepoChange={setRepoAndSave}
        labels={labels}
        onLabelsChange={setLabels}
        issueReady={!!issue}
        sharing={sharing}
        template={template}
        templateState={templateState}
        onOpenIssue={openIssue}
        onCopyMarkdown={() => void copyMarkdown()}
        onDownloadReport={downloadReport}
        onDownloadReplay={downloadReplay}
        onCopyReplayLink={() => void copyReplayLink()}
      />

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReplayCard events={rrwebEvents} />
        <TimelineCard steps={timeline} t0={t0} />
      </main>

      <Toaster />
    </div>
  );
}

export default App;
