import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { eventWithTime } from "@rrweb/types";
import { AI_ENABLED_KEY, REPLAY_SERVER_URL, REPO_KEY } from "@/lib/constants";
import {
  getAllEvents,
  getReport,
  getSessionEvents,
  importSharedReport,
  updateReportTitle,
} from "@/lib/db";
import { buildIssueUrl } from "@/lib/github";
import { buildReportFacts } from "@/lib/facts";
import {
  buildMarkdownFromSections,
  buildSections,
  suggestTitle,
} from "@/lib/report";
import { suggestRepo, normalizeRepo } from "@/lib/repo";
import {
  fetchAllIssueTemplates,
  fetchIssueTemplate,
  shapeSections,
  type IssueTemplate,
} from "@/lib/templates";
import { buildTimeline } from "@/lib/timeline";
import { hashSession, stableShareJson } from "@/lib/share-cache";
import { buildSessionDigest, generateEnhancements, type AIStatus } from "@/lib/ai";
import { applyAI, type AIResult } from "@/lib/ai-merge";
import { aiCacheKey, getCachedAIResult, rememberAIResult } from "@/lib/ai-cache";
import { isShareLink, rememberIncomingShare, shareSession } from "@/lib/share";
import {
  buildConsoleLog,
  buildHar,
  buildMetadataJson,
  copyText,
  downloadText,
} from "@/lib/exports";
import { countEvents } from "@/lib/summary";
import type {
  SharedReportPayload,
  StoredEvent,
  TrailCounts,
  TrailReport,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { sileo, Toaster } from "sileo";

import { AttachmentsPanel } from "./components/AttachmentsPanel";
import { EvidencePanel } from "./components/EvidencePanel";
import { GitHubIssueDialog } from "./components/GitHubIssueDialog";
import { IncidentHeader } from "./components/IncidentHeader";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { ReplayPanel } from "./components/ReplayPanel";
import { TimelineCard } from "./components/TimelineCard";
import type { ReplayPlayerHandle } from "./ReplayPlayer";

type ShareResult = { link: string; copied: boolean; reused: boolean };

function App() {
  const reportId =
    Number(new URLSearchParams(location.search).get("report")) || undefined;
  const shareUrl = new URLSearchParams(location.search).get("share");

  const [report, setReport] = useState<TrailReport | null>(null);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareError, setShareError] = useState("");
  // Typed values are always redacted from the timeline and report — capture-time
  // masking is the primary line of defense; this is the permanent backstop.
  const redact = true;
  const [repo, setRepo] = useState("");
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
  const titleEditedRef = useRef(false);
  const [sharing, setSharing] = useState<"idle" | "uploading">("idle");
  const [replayLink, setReplayLink] = useState("");
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [currentReplayTime, setCurrentReplayTime] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const replayRef = useRef<ReplayPlayerHandle>(null);

  useEffect(() => {
    void (async () => {
      const { [REPO_KEY]: savedRepo } =
        await browser.storage.local.get(REPO_KEY);
      setRepo(typeof savedRepo === "string" ? savedRepo : "");

      // Shared link mode: fetch the session from the replay server, import it
      // into local history, then hand off to the plain ?report= reopen path —
      // the reviewer gets the exact same review UI, persisted automatically.
      if (shareUrl) {
        if (!isShareLink(shareUrl)) {
          setShareError("That doesn't look like a TRAIL share link.");
          setLoading(false);
          return;
        }
        try {
          const res = await fetch(shareUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const payload = (await res.json()) as SharedReportPayload;
          if (
            payload?.v !== 2 ||
            !Array.isArray(payload.events) ||
            !payload.report
          ) {
            throw new Error("not a TRAIL session");
          }
          const seq = await importSharedReport(payload, shareUrl);
          // Sync the share cache: the recipient now holds the same session, so
          // re-sharing it should reuse the incoming link instead of uploading
          // the payload to blob storage a second time.
          void rememberIncomingShare(payload, shareUrl).catch(() => {});
          location.replace(
            `${location.origin}${location.pathname}?report=${seq}`,
          );
          return; // the reload re-runs the effect through the ?report= path
        } catch {
          setShareError(
            "Couldn't load the shared replay. The link may be invalid or the replay server may be unreachable.",
          );
        }
        setLoading(false);
        return;
      }

      if (reportId) {
        const rep = await getReport(reportId);
        const evs = await getSessionEvents(reportId);
        setReport(rep ?? null);
        setEvents(evs);
      } else {
        const evs = await getAllEvents();
        const timestamps = evs.map((event) => event.t).filter(Number.isFinite);
        setReport({
          seq: 0,
          title: suggestTitle(evs),
          repo: "",
          startedAt: timestamps.length ? Math.min(...timestamps) : Date.now(),
          endedAt: timestamps.length ? Math.max(...timestamps) : Date.now(),
          eventCount: evs.length,
          counts: countEvents(evs),
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

  // Persisted AI opt-out preference (default on).
  useEffect(() => {
    void browser.storage.local
      .get(AI_ENABLED_KEY)
      .then(({ [AI_ENABLED_KEY]: value }) => {
        if (typeof value === "boolean") setAiEnabled(value);
      });
  }, []);

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

  const counts: TrailCounts = useMemo(() => countEvents(events), [events]);
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
  useEffect(() => {
    if (aiResult?.title && !titleEditedRef.current) setTitle(aiResult.title);
  }, [aiResult]);

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
    aiState,
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
  // replay server's Featherless proxy for title/summary/steps/template mapping
  // and labels. Runs when the report loads (title/summary/steps need no repo)
  // and re-runs when the repo changes (template mapping + labels). Any failure
  // degrades to the deterministic pipeline; the token guard drops stale runs.
  // Declared after stableShareInput: the cache key hashes the same stable
  // session serialization the share flow uses.
  useEffect(() => {
    if (loading || !events.length) return;
    if (!aiEnabled) {
      ++aiGenToken.current;
      setAiResult(null);
      setAiState("disabled");
      return;
    }
    const token = ++aiGenToken.current;
    const run = async () => {
      setAiState("generating");
      const repoNorm = normalizeRepo(repo);
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
        allTemplates,
        repoNorm,
      );
      const outcome = await generateEnhancements(digest, allTemplates, repoNorm);
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
    stableShareInput,
    timeline,
    facts,
  ]);

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

  if (shareError) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-heading text-xl font-semibold text-foreground">
            Shared replay unavailable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{shareError}</p>
          <Button
            className="mt-6 min-h-10 rounded-sm bg-white px-4 py-2.5 text-black hover:bg-white/90"
            onClick={() => void browser.tabs.getCurrent().then((t) => t && browser.tabs.remove(t.id!))}
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
        facts={facts}
        counts={counts}
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
              events={rrwebEvents}
              facts={facts}
              currentTime={currentReplayTime}
              onCurrentTimeChange={handleReplayTimeChange}
              onPlayingChange={setReplayPlaying}
            />
          </div>
          <div className="min-w-0">
            <TimelineCard
              steps={timeline}
              t0={t0}
              replayT0={replayT0}
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
        onRepoChange={setRepoAndSave}
        labels={labels}
        onLabelsChange={setLabels}
        issueReady={!!issue}
        reportTooLong={issue ? issue.dropped.length > 0 : false}
        template={template}
        templateState={templateState}
        aiEnabled={aiEnabled}
        onAiEnabledChange={(value) => {
          setAiEnabled(value);
          void browser.storage.local.set({ [AI_ENABLED_KEY]: value });
        }}
        aiState={aiState}
        onOpenIssue={openIssue}
      />

      <Toaster position="top-right" theme="dark" />
    </div>
  );
}

export default App;