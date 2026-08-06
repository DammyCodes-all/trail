import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { eventWithTime } from "@rrweb/types";
import { REPLAY_SERVER_URL, REPO_KEY } from "@/lib/constants";
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
import { suggestRepo } from "@/lib/repo";
import {
  fetchIssueTemplate,
  shapeSections,
  type IssueTemplate,
} from "@/lib/templates";
import { buildTimeline } from "@/lib/timeline";
import {
  getCachedShare,
  hashSession,
  rememberShare,
  stableShareJson,
} from "@/lib/share-cache";
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
  const [templateState, setTemplateState] = useState<
    "idle" | "checking" | "found" | "none"
  >("idle");
  const [title, setTitle] = useState("");
  const [labels, setLabels] = useState("");
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
        let parsed: URL;
        try {
          parsed = new URL(shareUrl);
        } catch {
          setShareError("That doesn't look like a TRAIL share link.");
          setLoading(false);
          return;
        }
        if (!["http:", "https:"].includes(parsed.protocol)) {
          setShareError("Only http(s) TRAIL share links can be opened.");
          setLoading(false);
          return;
        }
        if (!/^\/api\/replays\/[A-Za-z0-9.-]{1,64}$/.test(parsed.pathname)) {
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
          void hashSession(stableShareJson(payload))
            .then((hash) => rememberShare(hash, shareUrl))
            .catch(() => {});
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
    await copyText(markdown);
    sileo.success({ title: "Markdown copied to clipboard" });
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    }
  };

  const download = async (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    try {
      await browser.downloads.download({ url, filename });
      sileo.success({ title: `Downloaded ${filename}` });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  const downloadReport = () =>
    download(
      "trail-report.md",
      new Blob([markdown], { type: "text/markdown" }),
    );

  const networkEvents = events.filter((event) => event.k === "net");
  const consoleEvents = events.filter((event) => event.k === "console");

  const downloadNetworkHar = () => {
    const har = {
      log: {
        version: "1.2",
        creator: { name: "TRAIL", version: facts.extensionVersion },
        entries: networkEvents.map((event) => ({
          startedDateTime: new Date(event.t).toISOString(),
          time: 0,
          request: {
            method: event.method,
            url: event.target,
            httpVersion: "",
            headers: Object.entries(event.requestHeaders ?? {}).map(
              ([name, value]) => ({ name, value }),
            ),
            ...(event.requestBody
              ? {
                  postData: {
                    mimeType: "application/octet-stream",
                    text: event.requestBody,
                  },
                }
              : {}),
            queryString: [],
            cookies: [],
            headersSize: -1,
            bodySize: -1,
          },
          response: {
            status: event.status,
            statusText: event.err ?? "",
            httpVersion: "",
            headers: Object.entries(event.responseHeaders ?? {}).map(
              ([name, value]) => ({ name, value }),
            ),
            cookies: [],
            content: {
              size: event.body?.length ?? 0,
              mimeType: "text/plain",
              text: event.body ?? "",
            },
            redirectURL: "",
            headersSize: -1,
            bodySize: event.body?.length ?? -1,
          },
          cache: {},
          timings: { send: 0, wait: 0, receive: 0 },
        })),
      },
    };
    return download(
      "network.har",
      new Blob([JSON.stringify(har, null, 2)], { type: "application/json" }),
    );
  };

  const downloadConsoleLog = () => {
    const log = consoleEvents
      .map((event) => {
        const timestamp = new Date(event.t).toISOString();
        return `[${timestamp}] ${event.lv.toUpperCase()} ${event.msg}${event.stack ? `\n${event.stack}` : ""}`;
      })
      .join("\n\n");
    return download(
      "console.log",
      new Blob([log || "No console errors captured."], { type: "text/plain" }),
    );
  };

  const downloadMetadata = () =>
    download(
      "metadata.json",
      new Blob(
        [
          JSON.stringify(
            {
              title: displayTitle,
              capturedAt: report?.startedAt ?? events[0]?.t ?? Date.now(),
              durationMs: facts.durationMs,
              url: facts.url,
              browser: facts.browser,
              os: facts.os,
              extensionVersion: facts.extensionVersion,
              counts,
            },
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
  // Uploads go through a presigned PUT URL: Vercel caps function bodies at
  // ~4.5MB and full sessions blow past that, so the payload goes straight to
  // storage. The payload carries the full report so a reviewer's extension can
  // rebuild the exact same review UI (timeline, evidence, replay) from the
  // link. Clipboard failures never block the link from being generated.
  //
  // A content hash of the session is remembered alongside each generated link
  // (chrome.storage.local, see lib/share-cache.ts). Re-sharing an unchanged
  // session reuses the existing link and never uploads to blob storage again;
  // only new events (or any other payload change) hash differently and upload
  // fresh. Title edits don't count — the title is excluded from the hash.
  const copyReplayLink = () => {
    if (sharing === "uploading") return;
    setSharing("uploading");
    const payload = {
      v: 2,
      title: displayTitle,
      exportedAt: Date.now(),
      report: {
        title: displayTitle,
        startedAt: report?.startedAt ?? events[0]?.t ?? Date.now(),
        endedAt: report?.endedAt ?? events.at(-1)?.t ?? Date.now(),
        eventCount: events.length,
        counts,
        url: events[0]?.url ?? "",
      },
      events,
    };
    const upload = async (): Promise<{
      link: string;
      copied: boolean;
      reused: boolean;
    }> => {
      // exportedAt is excluded from the hash input: it changes every call and
      // would defeat reuse of the same session's link.
      const hash = await hashSession(stableShareJson(payload));
      const cached = await getCachedShare(hash);
      if (cached?.startsWith(REPLAY_SERVER_URL)) {
        setReplayLink(cached);
        return { link: cached, copied: await copyText(cached), reused: true };
      }
      let res: Response;
      try {
        res = await fetch(`${REPLAY_SERVER_URL}/api/replays/presign`, {
          method: "POST",
        });
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "network error");
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { id, uploadUrl } = (await res.json()) as {
        id?: string;
        uploadUrl?: string;
      };
      if (!id || !uploadUrl) throw new Error("no presign");
      let putRes: Response;
      try {
        putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "network error");
      }
      if (!putRes.ok) throw new Error(`HTTP ${putRes.status}`);
      const link = `${REPLAY_SERVER_URL}/api/replays/${id}`;
      setReplayLink(link);
      void rememberShare(hash, link);
      return { link, copied: await copyText(link), reused: false };
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
        onTitleChange={setTitle}
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
        template={template}
        templateState={templateState}
        onOpenIssue={openIssue}
      />

      <Toaster position="top-right" theme="dark" />
    </div>
  );
}

export default App;
