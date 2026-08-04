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
import { buildTimeline, type TimelineStep } from "@/lib/timeline";
import type { StoredEvent, TrailCounts, TrailReport } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster, toast } from "@/components/ui/toast";
import {
  CheckCircle2,
  Clapperboard,
  Copy,
  ExternalLink,
  FileDown,
  Loader2,
  MousePointerClick,
  Share2,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { ReplayPlayer } from "./ReplayPlayer";
import { TrailLogo } from "@/components/ui/trail-logo";

const fmtTime = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

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
          events,
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
    return (
      <div className="mx-auto flex w-full max-w-300 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-7 w-72" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-120 rounded-xl" />
          <Skeleton className="h-120 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-300 flex-col gap-4 p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <TrailLogo
            className="mt-0.5 size-10 shrink-0"
            width={40}
            height={40}
            aria-label="TRAIL logo"
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="font-heading text-xs font-semibold tracking-[0.18em] text-muted-foreground">
              TRAIL
            </span>
            <input
              className="w-full max-w-140 rounded-md border border-transparent bg-transparent p-1 font-heading text-xl font-medium text-foreground outline-none transition-colors hover:border-border focus:border-border focus:bg-background"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={persistTitle}
              placeholder="Bug report title"
              spellCheck={false}
              aria-label="Report title"
            />
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Badge variant="outline" className="gap-1">
            <MousePointerClick aria-hidden="true" />
            {counts.click}
          </Badge>
          <Badge variant="destructive" className="gap-1">
            <TriangleAlert aria-hidden="true" />
            {counts.console}
          </Badge>
          <Badge className="gap-1 border-transparent bg-primary/10 text-primary">
            <WifiOff aria-hidden="true" />
            {counts.net}
          </Badge>
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-2">
        <Input
          className="repo h-9 flex-1 min-w-55 font-mono text-sm"
          placeholder="owner/repo — e.g. acme/widget"
          value={repo}
          onChange={(e) => setRepoAndSave(e.target.value)}
          spellCheck={false}
        />
        <Input
          className="h-9 w-auto min-w-35 flex-[0.4] text-sm"
          placeholder="labels — e.g. bug, ui"
          value={labels}
          onChange={(e) => setLabels(e.target.value)}
          spellCheck={false}
        />
        <Button className="h-9" onClick={openIssue} disabled={!issue}>
          <ExternalLink data-icon="inline-start" aria-hidden="true" />
          Open GitHub Issue
        </Button>
        <Button
          variant="secondary"
          className="h-9"
          onClick={() => void copyMarkdown()}
        >
          <Copy data-icon="inline-start" aria-hidden="true" />
          Copy Markdown
        </Button>
        <Button
          variant="outline"
          className="h-9"
          onClick={() => void downloadReport()}
        >
          <FileDown data-icon="inline-start" aria-hidden="true" />
          Download .md
        </Button>
        <Button
          variant="outline"
          className="h-9"
          onClick={() => void downloadReplay()}
        >
          <Clapperboard data-icon="inline-start" aria-hidden="true" />
          Download Replay
        </Button>
        <Button
          variant="outline"
          className="h-9"
          onClick={() => void copyReplayLink()}
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
            <CheckCircle2
              className="size-3.5 text-success"
              aria-hidden="true"
            />
            Shaped for {template.filename} — {template.name}
          </p>
        )}
      </section>

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="min-h-120 overflow-hidden">
          {rrwebEvents.length ? (
            <ReplayPlayer events={rrwebEvents} />
          ) : (
            <div className="flex h-full min-h-120 flex-col items-center justify-center gap-2 p-8 text-center">
              <h4 className="font-heading text-h4 font-medium">
                No replay frames captured
              </h4>
              <p className="max-w-xs text-body-sm text-muted-foreground">
                The session has clicks, console and network events — but no
                rrweb frames made it into this report.
              </p>
            </div>
          )}
        </Card>

        <Card className="flex max-h-160 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Timeline
            </h2>
            <Badge
              variant="ghost"
              className="font-mono text-[11px] text-muted-foreground"
            >
              {timeline.length} events
            </Badge>
          </div>
          <ol className="flex-1 divide-y divide-border overflow-y-auto px-4 py-1">
            {timeline.map((s, i) => (
              <TimelineRow key={i} step={s} />
            ))}
          </ol>
          {timeline.length === 0 && (
            <p className="p-4 text-body-sm text-muted-foreground">
              No events captured.
            </p>
          )}
        </Card>
      </main>

      <Toaster />
    </div>
  );
}

function TimelineRow({ step }: { step: TimelineStep }) {
  const textClass =
    step.kind === "console"
      ? "text-destructive"
      : step.kind === "net"
        ? "text-primary"
        : step.kind === "nav"
          ? "font-medium text-foreground/70"
          : "text-foreground/85";
  const prefix =
    step.kind === "click" ? (
      <span className="text-primary" aria-hidden="true">
        ▸
      </span>
    ) : step.kind === "input" ? (
      <span className="text-muted-foreground" aria-hidden="true">
        ✎
      </span>
    ) : null;
  return (
    <li className="flex items-baseline gap-2 py-2">
      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
        {fmtTime(step.t)}
      </span>
      {prefix}
      <span
        className={`min-w-0 text-[13px] leading-relaxed wrap-break-word ${textClass}`}
      >
        {step.text}
      </span>
    </li>
  );
}

export default App;
