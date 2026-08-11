import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { eventWithTime } from "@rrweb/types";
import { AI_ENABLED_KEY, REPLAY_SERVER_URL, REPO_HISTORY_KEY } from "./lib/constants";
import { buildIssueUrl } from "./lib/github";
import { buildReportFacts } from "./lib/facts";
import {
  buildMarkdownFromSections,
  buildSections,
  suggestTitle,
} from "./lib/report";
import { normalizeRepo, pushRepoHistory } from "./lib/repo";
import {
  fetchAllIssueTemplates,
  fetchIssueTemplate,
  shapeSections,
  type IssueTemplate,
} from "./lib/templates";
import { buildTimeline } from "./lib/timeline";
import {
  buildFlagWindows,
  buildReplayMap,
  compressFlagWindows,
  type ReplayTimeMap,
} from "./lib/replay-windows";
import { hashSession, stableShareJson } from "./lib/share-cache";
import {
  buildSessionDigest,
  buildTitleDigest,
  generateEnhancements,
  generateTitle,
  type AIStatus,
} from "./lib/ai";
import { applyAI, type AIResult } from "./lib/ai-merge";
import { aiCacheKey, getCachedAIResult, rememberAIResult } from "./lib/ai-cache";
import { shareSession } from "./lib/share";
import {
  buildConsoleLog,
  buildHar,
  buildMetadataJson,
  copyText,
  downloadText,
} from "./lib/exports";
import { countEvents } from "./lib/summary";
import { getStorageArea } from "./lib/storage";
import type {
  StoredEvent,
  TrailCounts,
  TrailReport,
} from "./lib/types";
import { Button } from "./ui/button";
import { sileo, Toaster } from "sileo";

import { AttachmentsPanel } from "./components/AttachmentsPanel";
import { EvidencePanel } from "./components/EvidencePanel";
import { GitHubIssueDialog } from "./components/GitHubIssueDialog";
import { IncidentHeader } from "./components/IncidentHeader";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { ReplayPanel } from "./components/ReplayPanel";
import { TimelineCard } from "./components/TimelineCard";
import type { ReplayPlayerHandle } from "./replay";

type ShareResult = { link: string; copied: boolean; reused: boolean };

// The platform seams the review needs that differ between the extension and
// the web viewer. Everything else (replay, timeline, report, share, AI,
// downloads) is platform-agnostic.
export interface ReviewPlatform {
  // Open a URL in a new tab (GitHub issue links). Extension: tabs.create;
  // web: window.open.
  openTab: (url: string) => void;
  // Close the current tab/window (share-error screen).
  closeTab: () => void;
  // Persist a title edit. The extension writes IndexedDB; the web viewer has
  // no account, so it keeps edits in memory only.
  persistTitle?: (reportId: number, title: string) => void;
}

export interface ReviewLoadResult {
  report: TrailReport | null;
  events: StoredEvent[];
  // Set when the session is persisted locally (extension history); drives
  // title persistence. The web viewer leaves it unset.
  reportId?: number;
}

// Loads the session being reviewed. The extension loads from IndexedDB
// (live buffer, saved report, or the share-import path); the web viewer
// fetches the shared payload from the replay server.
export interface ReviewLoader {
  load: () => Promise<ReviewLoadResult>;
}

export function ReviewApp({
  loader,
  platform,
}: {
  loader: ReviewLoader;
  platform: ReviewPlatform;
}) {
  const [report, setReport] = useState<TrailReport | null>(null);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [reportId, setReportId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // Typed values are always redacted from the timeline and report — capture-time
  // masking is the primary line of defense; this is the permanent backstop.
  const redact = true;
  const [repo, setRepo] = useState("");
  // Previously-used repos, most recent first — suggestions for the repo field
  // while typing. The field itself starts empty: no autofill.
  const [repoHistory, setRepoHistory] = useState<string[]>([]);
  const [template, setTemplate] = useState<IssueTemplate | null>(null);
  const [allTemplates, setAllTemplates] = useState<IssueTemplate[]>([]);
  const [templateState, setTemplateState] = useState<
    "idle" | "checking" | "found" | "none"
  >("idle");
  const [title, setTitle] = useState("");
  const [labels, setLabels] = useState("");
  // AI report enhancements: opt-out toggle (default on) + generation state.
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiState, setAiState] = useState<AIStatus>("idle");
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  // Guards the AI generation run (stale-run token) and title seeding (never
  // clobber a title the user typed themselves).
  const aiGenToken = useRef(0);
  // The in-flight AI fetch, so a superseded run can abort its network call
  // instead of stacking requests against the upstream's concurrency limit.
  const aiAbortRef = useRef<AbortController | null>(null);
  const titleEditedRef = useRef(false);
  // Page-load AI title generation: its own state/refs so the enhance run and
  // the title run never abort each other.
  const [titleAIState, setTitleAIState] = useState<AIStatus>("idle");
  const titleGenToken = useRef(0);
  // Set once the issue-dialog enhance result lands with a title: that title
  // is repo-aware and wins over the page-load title, whichever resolves last.
  const enhanceTitleLandedRef = useRef(false);
  // aiEnabled at seed time: toggling AI off mid-flight stops a late title
  // from landing.
  const aiEnabledRef = useRef(true);
  const [sharing, setSharing] = useState<"idle" | "uploading">("idle");
  const [replayLink, setReplayLink] = useState("");
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [currentReplayTime, setCurrentReplayTime] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const replayRef = useRef<ReplayPlayerHandle>(null);
  // Report-writing windows the reviewer chose to watch at 1x instead of the
  // compressed budget. Lives here (not in ReplayPanel) because the time map —
  // and therefore seeking and the timeline highlight — depends on it.
  const [expandedWindows, setExpandedWindows] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const toggleExpandedWindow = useCallback((index: number) => {
    setExpandedWindows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  useEffect(() => {
    void (async () => {
      const { [REPO_HISTORY_KEY]: savedHistory } =
        await getStorageArea().get(REPO_HISTORY_KEY);
      if (Array.isArray(savedHistory)) {
        setRepoHistory(savedHistory.filter((r): r is string => typeof r === "string"));
      }
      try {
        const result = await loader.load();
        setReport(result.report);
        setEvents(result.events);
        setReportId(result.reportId);
      } catch (err) {
        setLoadError(
          err instanceof Error && err.message
            ? err.message
            : "Couldn't load this session.",
        );
      }
      setLoading(false);
    })();
  }, [loader]);

  // Editable title, seeded from the loaded report.
  useEffect(() => {
    setTitle(report?.title ?? "");
  }, [report]);

  // Persisted AI opt-out preference (default on).
  useEffect(() => {
    void getStorageArea()
      .get(AI_ENABLED_KEY)
      .then(({ [AI_ENABLED_KEY]: value }) => {
        if (typeof value === "boolean") setAiEnabled(value);
      });
  }, []);

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

  // Report-writing windows (flag open → submit/cancel): the replay compresses
  // each into a short budget so idle note-typing doesn't inflate the perceived
  // reproduction time. The map links wall clock ↔ replay time; both it and the
  // compressed event list rebuild when a window is expanded at 1x.
  const flagWindows = useMemo(() => buildFlagWindows(events), [events]);
  const replayMap = useMemo<ReplayTimeMap | null>(() => {
    if (!rrwebEvents.length || !flagWindows.length) return null;
    return buildReplayMap(replayT0, flagWindows, expandedWindows);
  }, [rrwebEvents, replayT0, flagWindows, expandedWindows]);
  const replayEvents = useMemo(
    () =>
      replayMap ? compressFlagWindows(rrwebEvents, replayMap) : rrwebEvents,
    [rrwebEvents, replayMap],
  );

  const counts: TrailCounts = useMemo(() => countEvents(events), [events]);
  // Submitted flags only — 'open'/'cancel' are report-writing window edges,
  // not flagged moments, and must not inflate the header stat.
  const flags = useMemo(
    () =>
      events.filter((e) => e.k === "flag" && e.phase !== "open" && e.phase !== "cancel").length,
    [events],
  );
  const facts = useMemo(
    () => buildReportFacts(events, report, undefined, timeline),
    [events, report, timeline],
  );

  // Phase 4: when a repo is typed, detect its issue template (debounced). Any
  // failure (no template, private repo, offline) resolves to null → generic body.
  // Templates are fetched once: the deterministic pick derives from the same
  // parsed list the AI path feeds to the model.
  useEffect(() => {
    const r = repo.trim();
    if (!r) {
      setTemplate(null);
      setAllTemplates([]);
      setTemplateState("idle");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setTemplateState("checking");
      void (async () => {
        const all = await fetchAllIssueTemplates(normalizeRepo(r));
        if (cancelled) return;
        setAllTemplates(all);
        const t = await fetchIssueTemplate(normalizeRepo(r), all);
        if (cancelled) return;
        setTemplate(t);
        setTemplateState(t ? "found" : "none");
      })();
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [repo]);

  // AI title seeds the editable field only while the user hasn't typed — the
  // same guard the repo suggestion uses, so AI never clobbers a mid-edit.
  // A landed enhance title also wins over a still-pending page-load title.
  // Persist on landing, not just on blur, so the popup's history entry shows
  // the AI title even if the tab is closed without touching the field.
  useEffect(() => {
    if (aiResult?.title) {
      enhanceTitleLandedRef.current = true;
      if (!titleEditedRef.current) {
        setTitle(aiResult.title);
        if (reportId && aiResult.title !== report?.title) {
          platform.persistTitle?.(reportId, aiResult.title);
        }
      }
    }
  }, [aiResult, reportId, report?.title]);

  // Mirror aiEnabled into a ref: async title/enhance completions read it at
  // seed time, so toggling AI off mid-flight drops a late result.
  useEffect(() => {
    aiEnabledRef.current = aiEnabled;
  }, [aiEnabled]);

  const handleTitleChange = (value: string) => {
    titleEditedRef.current = true;
    setTitle(value);
  };

  // Template frontmatter labels prefill the labels field — but only while the
  // user hasn't typed their own. AI label suggestions merge in alongside.
  useEffect(() => {
    if (!labels.trim()) {
      const merged = [
        ...new Set([...(template?.labels ?? []), ...(aiResult?.labels ?? [])]),
      ];
      if (merged.length) setLabels(merged.join(", "));
    }
  }, [template, aiResult, labels]);

  const base = report ?? {
    title: "Bug report",
    startedAt: events[0]?.t ?? 0,
    endedAt: events.at(-1)?.t ?? 0,
    url: events[0]?.url ?? "",
  };
  const displayTitle = title || base.title;
  const labelsList = labels
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
  const sections = useMemo(() => {
    const baseSections = buildSections(base, events, { redact }, timeline);
    if (aiResult) return applyAI(baseSections, aiResult, template);
    return template
      ? shapeSections(template, baseSections).sections
      : baseSections;
  }, [base, events, redact, template, timeline, aiResult]);
  const markdown = useMemo(
    () => buildMarkdownFromSections(displayTitle, sections),
    [displayTitle, sections],
  );
  const issue = useMemo(
    () =>
      repo
        ? buildIssueUrl(normalizeRepo(repo), displayTitle, sections, labelsList)
        : null,
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
    w.__trailAIState = aiState;
    w.__trailTitleAIState = titleAIState;
    w.__trailReplayLink = replayLink;
    w.__trailReplayTime = currentReplayTime;
  }, [
    timeline,
    rrwebEvents,
    markdown,
    issue,
    template,
    templateState,
    displayTitle,
    aiState,
    titleAIState,
    replayLink,
    currentReplayTime,
    repo,
    loading,
  ]);

  // Typing in the repo field only updates local state. A repo joins the
  // suggestion history when the user actually opens the issue (see openIssue).
  const handleRepoChange = (value: string) => {
    setRepo(value);
  };

  const copyMarkdown = async () => {
    await copyText(markdown);
    sileo.success({ title: "Markdown copied to clipboard" });
  };

  const networkEvents = events.filter((event) => event.k === "net");
  const consoleEvents = events.filter((event) => event.k === "console");

  const download = (filename: string, text: string, mime: string) =>
    void downloadText(filename, text, mime).then(() =>
      sileo.success({ title: `Downloaded ${filename}` }),
    );

  const downloadReport = () =>
    download("trail-report.md", markdown, "text/markdown");

  const downloadNetworkHar = () =>
    download(
      "network.har",
      buildHar(networkEvents, facts.extensionVersion),
      "application/json",
    );

  const downloadConsoleLog = () =>
    download("console.log", buildConsoleLog(consoleEvents), "text/plain");

  const downloadMetadata = () =>
    download(
      "metadata.json",
      buildMetadataJson({
        title: displayTitle,
        capturedAt: report?.startedAt ?? events[0]?.t ?? Date.now(),
        durationMs: facts.durationMs,
        url: facts.url,
        browser: facts.browser,
        os: facts.os,
        extensionVersion: facts.extensionVersion,
        counts,
      }),
      "application/json",
    );

  const openIssue = () => {
    if (!issue) return;
    setIssueDialogOpen(false);
    if (issue.dropped.length > 0) {
      // The report can't fit in the prefilled link: copy the full report so
      // the user can paste it into the issue body after GitHub opens.
      void copyText(markdown).then(() => {
        sileo.success({
          title: "Report copied to clipboard",
          description:
            "It was too long for the link — open GitHub and paste it into the issue body.",
        });
      });
    }
    void platform.openTab(issue.url);
    const used = pushRepoHistory(repoHistory, repo);
    if (used !== repoHistory) {
      setRepoHistory(used);
      void getStorageArea().set({ [REPO_HISTORY_KEY]: used });
    }
  };

  const handleCreateIssue = () => setIssueDialogOpen(true);

  const seekReplay = useCallback(
    (timestamp: number) => {
      const offset = replayMap
        ? replayMap.wallToReplay(timestamp)
        : Math.max(0, timestamp - replayT0);
      setCurrentReplayTime(offset);
      replayRef.current?.seek(offset, false);
    },
    [replayT0, replayMap],
  );

  const handleReplayTimeChange = useCallback((timeOffset: number) => {
    setCurrentReplayTime(timeOffset);
  }, []);

  const persistTitle = () => {
    if (reportId && title && title !== report?.title) {
      platform.persistTitle?.(reportId, title);
    }
  };

  // Everything the share payload embeds about the session except the title:
  // memoized separately so renaming doesn't re-serialize multi-MB events.
  const shareReportBase = useMemo(
    () => ({
      startedAt: report?.startedAt ?? events[0]?.t ?? Date.now(),
      endedAt: report?.endedAt ?? events.at(-1)?.t ?? Date.now(),
      eventCount: events.length,
      counts,
      url: events[0]?.url ?? "",
    }),
    [report, events, counts],
  );
  // The hash input stringifies the whole session, so it's memoized per events
  // reference — a per-click serialization would be wasteful on cache hits too.
  // stableShareJson excludes the title (editable) and the memoized base never
  // contains it, so renaming a session doesn't change its hash.
  const stableShareInput = useMemo(
    () => stableShareJson({ v: 2, report: shareReportBase, events }),
    [shareReportBase, events],
  );

  // AI enhancements: build a redaction-safe digest of the session and ask the
  // replay server's Groq proxy for title/summary/steps/template mapping
  // and labels. Runs only when the user is about to submit — the issue dialog
  // is open, a repo is entered, and the template fetch has settled — so no AI
  // call happens on review load. Any failure degrades to the deterministic
  // pipeline; the token guard drops stale runs. Declared after
  // stableShareInput: the cache key hashes the same stable session
  // serialization the share flow uses.
  useEffect(() => {
    if (loading || !events.length) return;
    if (!issueDialogOpen) return;
    const repoNorm = normalizeRepo(repo);
    if (!repoNorm) return;
    if (templateState === "idle" || templateState === "checking") return;
    // A new run supersedes the previous one: cancel its in-flight fetch so
    // requests never stack against the upstream's concurrency limit. The
    // dialog-close early return above deliberately leaves a run in flight to
    // complete and cache.
    aiAbortRef.current?.abort();
    if (!aiEnabled) {
      ++aiGenToken.current;
      setAiResult(null);
      setAiState("disabled");
      return;
    }
    const token = ++aiGenToken.current;
    const controller = new AbortController();
    aiAbortRef.current = controller;
    const run = async () => {
      setAiState("generating");
      const key = aiCacheKey(await hashSession(stableShareInput), repoNorm);
      const cached = await getCachedAIResult(key);
      if (token !== aiGenToken.current) return;
      if (cached) {
        setAiResult(cached);
        setAiState("ready");
        return;
      }
      const summary = report ?? {
        startedAt: events[0]?.t ?? 0,
        endedAt: events.at(-1)?.t ?? 0,
        url: events[0]?.url ?? "",
      };
      const digest = buildSessionDigest(
        summary,
        events,
        timeline,
        facts,
        repoNorm,
      );
      const outcome = await generateEnhancements(
        digest,
        allTemplates,
        repoNorm,
        template,
        controller.signal,
      );
      if (token !== aiGenToken.current) return;
      if (outcome.ok && outcome.result) {
        setAiResult(outcome.result);
        void rememberAIResult(key, outcome.result);
        setAiState("ready");
      } else {
        setAiResult(null);
        setAiState(outcome.status);
      }
    };
    void run();
  }, [
    loading,
    events,
    aiEnabled,
    report,
    repo,
    allTemplates,
    templateState,
    issueDialogOpen,
    stableShareInput,
    timeline,
    facts,
  ]);

  // Page-load AI title: fire once the session is loaded, ahead of any
  // repo/template context (the title is repo-independent). Cached under the
  // session hash with an empty repo key, so reopens reuse the generated title
  // instead of calling the model again — "only generate if one doesn't exist".
  // The deterministic suggestTitle stays in the field until the call lands;
  // any failure (off, server without a key, network) keeps it.
  useEffect(() => {
    if (loading || !events.length) return;
    if (!aiEnabled) {
      setTitleAIState("disabled");
      return;
    }
    const token = ++titleGenToken.current;
    const controller = new AbortController();
    const run = async () => {
      // Cache check first: a cached title lands without ever showing the
      // generating state, so the skeleton only appears when a call is really
      // in flight.
      const key = aiCacheKey(await hashSession(stableShareInput), "");
      const cached = await getCachedAIResult(key);
      if (token !== titleGenToken.current) return;
      if (cached?.title) {
        if (
          !titleEditedRef.current &&
          !enhanceTitleLandedRef.current &&
          aiEnabledRef.current
        ) {
          setTitle(cached.title);
          if (reportId && cached.title !== report?.title) {
            platform.persistTitle?.(reportId, cached.title);
          }
        }
        setTitleAIState("ready");
        return;
      }
      setTitleAIState("generating");
      const summary = report ?? {
        startedAt: events[0]?.t ?? 0,
        endedAt: events.at(-1)?.t ?? 0,
        url: events[0]?.url ?? "",
      };
      const digest = buildTitleDigest(summary, events, timeline, facts);
      const outcome = await generateTitle(digest, controller.signal);
      if (token !== titleGenToken.current) return;
      if (outcome.ok && outcome.title) {
        if (
          !titleEditedRef.current &&
          !enhanceTitleLandedRef.current &&
          aiEnabledRef.current
        ) {
          setTitle(outcome.title);
          if (reportId && outcome.title !== report?.title) {
            platform.persistTitle?.(reportId, outcome.title);
          }
        }
        void rememberAIResult(key, { title: outcome.title });
        setTitleAIState("ready");
      } else {
        setTitleAIState(outcome.status);
      }
    };
    void run();
    return () => {
      ++titleGenToken.current;
      controller.abort();
    };
  }, [loading, events, aiEnabled, report, stableShareInput, timeline, facts]);

  // Upload the session to the replay server and hand back the share link. The
  // pipeline (presign → PUT → probe → cache → in-flight dedupe) lives in
  // lib/share.ts; this component only wires it to state and toasts.
  const copyReplayLink = () => {
    if (sharing === "uploading") return;
    setSharing("uploading");
    const upload = async (): Promise<ShareResult> => {
      const result = await shareSession({
        stableJson: stableShareInput,
        title: displayTitle,
        base: shareReportBase,
        events,
      });
      setReplayLink(result.link);
      return result;
    };
    sileo
      .promise(upload(), {
        loading: { title: "Uploading replay…" },
        success: ({ link, copied }) => ({
          title: copied
            ? "Replay link copied to clipboard"
            : "Replay link ready",
          description: link,
        }),
        error: (err) => ({
          title: "Replay link failed",
          description: `${REPLAY_SERVER_URL} — ${err instanceof Error ? err.message : String(err)}`,
          duration: 8000,
        }),
      })
      .catch(() => {})
      .finally(() => setSharing("idle"));
  };

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-heading text-xl font-semibold text-foreground">
            Shared replay unavailable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <Button
            className="mt-6 min-h-10 rounded-sm bg-white px-4 py-2.5 text-black hover:bg-white/90"
            onClick={platform.closeTab}
          >
            Close tab
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-300 px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      <IncidentHeader
        title={title}
        onTitleChange={handleTitleChange}
        onTitleBlur={persistTitle}
        titleLoading={titleAIState === "generating"}
        facts={facts}
        counts={counts}
        flags={flags}
        sharing={sharing}
        onCreateIssue={handleCreateIssue}
        onCopyMarkdown={() => void copyMarkdown()}
        onCopyReplayLink={() => void copyReplayLink()}
      />

      <main className="min-w-0">
        <div
          data-evidence-grid="true"
          className="grid min-w-0 grid-cols-1 border-border lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:gap-x-10 lg:border-b"
        >
          <div className="min-w-0">
            <ReplayPanel
              ref={replayRef}
              events={replayEvents}
              facts={facts}
              currentTime={currentReplayTime}
              spans={replayMap?.spans ?? []}
              expandedWindows={expandedWindows}
              onToggleExpandWindow={toggleExpandedWindow}
              onCurrentTimeChange={handleReplayTimeChange}
              onPlayingChange={setReplayPlaying}
            />
          </div>
          <div className="min-w-0">
            <TimelineCard
              steps={timeline}
              t0={t0}
              replayT0={replayT0}
              replayToWall={replayMap?.replayToWall}
              currentTime={currentReplayTime}
              onSeek={seekReplay}
              isPlaying={replayPlaying}
            />
          </div>
        </div>
        <EvidencePanel events={events} t0={t0} onSeek={seekReplay} />
      </main>

      <AttachmentsPanel
        attachments={[
          {
            kind: "report",
            name: "report.md",
            detail: "Markdown report",
            onDownload: downloadReport,
          },
          {
            kind: "network",
            name: "network.har",
            detail: `${networkEvents.length} requests`,
            onDownload: () => void downloadNetworkHar(),
          },
          {
            kind: "console",
            name: "console.log",
            detail: `${consoleEvents.length} entries`,
            onDownload: () => void downloadConsoleLog(),
          },
          {
            kind: "metadata",
            name: "metadata.json",
            detail: "Session metadata",
            onDownload: () => void downloadMetadata(),
          },
        ]}
      />

      <p className="text-center text-[11px] text-muted-foreground">
        All data is captured automatically by Trail.
      </p>

      <GitHubIssueDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        repo={repo}
        onRepoChange={handleRepoChange}
        repoHistory={repoHistory}
        labels={labels}
        onLabelsChange={setLabels}
        issueReady={!!issue}
        // The URL's sections are deterministic until the AI result lands, so
        // judging the fit while AI is still writing (or about to start) reports
        // on a body that is about to be replaced. Wait until the AI pass has
        // settled — ready, or failed down to the deterministic report.
        reportTooLong={
          issue
            ? issue.dropped.length > 0 &&
              (!aiEnabled ||
                (aiState !== "idle" && aiState !== "generating"))
            : false
        }
        template={template}
        templateState={templateState}
        aiEnabled={aiEnabled}
        onAiEnabledChange={(value) => {
          setAiEnabled(value);
          void getStorageArea().set({ [AI_ENABLED_KEY]: value });
        }}
        aiState={aiState}
        onOpenIssue={openIssue}
      />

      <Toaster position="top-right" theme="dark" />
    </div>
  );
}

export default ReviewApp;