import { useEffect, useMemo, useState } from 'react';
import type { eventWithTime } from '@rrweb/types';
import { REPO_KEY } from '@/lib/constants';
import { getAllEvents, getReport, getSessionEvents } from '@/lib/db';
import { buildIssueUrl } from '@/lib/github';
import { buildMarkdownFromSections, buildSections, suggestTitle } from '@/lib/report';
import { fetchIssueTemplate, shapeSections, type IssueTemplate } from '@/lib/templates';
import { buildTimeline, type TimelineStep } from '@/lib/timeline';
import type { StoredEvent, TrailCounts, TrailReport } from '@/lib/types';
import { ReplayPlayer } from './ReplayPlayer';

const fmtTime = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

function App() {
  const reportId = Number(new URLSearchParams(location.search).get('report')) || undefined;

  const [report, setReport] = useState<Pick<TrailReport, 'title'> | null>(null);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [redact, setRedact] = useState(true);
  const [repo, setRepo] = useState('');
  const [template, setTemplate] = useState<IssueTemplate | null>(null);
  const [templateState, setTemplateState] = useState<'idle' | 'checking' | 'found' | 'none'>('idle');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { [REPO_KEY]: savedRepo } = await browser.storage.local.get(REPO_KEY);
      setRepo(typeof savedRepo === 'string' ? savedRepo : '');

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

  const timeline = useMemo(() => buildTimeline(events, redact), [events, redact]);
  const rrwebEvents = useMemo(
    () =>
      events
        .filter((e) => e.k === 'rrweb')
        .map((e) => e.ev as eventWithTime)
        .sort((a, b) => a.timestamp - b.timestamp),
    [events],
  );

  const counts: TrailCounts = useMemo(() => {
    const c: TrailCounts = { click: 0, console: 0, net: 0 };
    for (const e of events) {
      if (e.k === 'click') c.click++;
      else if (e.k === 'console') c.console++;
      else if (e.k === 'net') c.net++;
    }
    return c;
  }, [events]);

  // Phase 4: when a repo is typed, detect its issue template (debounced). Any
  // failure (no template, private repo, offline) resolves to null → generic body.
  useEffect(() => {
    const r = repo.trim();
    if (!r) {
      setTemplate(null);
      setTemplateState('idle');
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setTemplateState('checking');
      void fetchIssueTemplate(r).then((t) => {
        if (cancelled) return;
        setTemplate(t);
        setTemplateState(t ? 'found' : 'none');
      });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [repo]);

  const base = report ?? { title: 'Bug report' };
  const sections = useMemo(() => {
    const baseSections = buildSections(base, events, { repo, redact });
    return template ? shapeSections(template, baseSections).sections : baseSections;
  }, [base, events, repo, redact, template]);
  const markdown = useMemo(
    () => buildMarkdownFromSections(base.title, sections),
    [base.title, sections],
  );
  const issue = useMemo(
    () => (repo ? buildIssueUrl(repo, base.title, sections) : null),
    [repo, base.title, sections],
  );

  // Test hooks for spike/verify.mjs.
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__trailTimeline = timeline;
    w.__trailReplayCount = rrwebEvents.length;
    w.__trailMarkdown = markdown;
    w.__trailIssueUrl = issue?.url ?? '';
    w.__trailDropped = issue?.dropped ?? [];
    w.__trailTemplate = template?.name ?? null;
    w.__trailTemplateState = templateState;
  }, [timeline, rrwebEvents, markdown, issue, template, templateState]);

  const setRepoAndSave = (value: string) => {
    setRepo(value);
    void browser.storage.local.set({ [REPO_KEY]: value });
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = markdown;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setToast('Markdown copied to clipboard');
  };

  const download = async (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    try {
      await browser.downloads.download({ url, filename });
      setToast(`Downloaded ${filename}`);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  const downloadReport = () =>
    download('trail-report.md', new Blob([markdown], { type: 'text/markdown' }));

  const downloadReplay = () =>
    download(
      'trail-replay.json',
      new Blob(
        [JSON.stringify({ title: base.title, repo, exportedAt: Date.now(), events }, null, 2)],
        { type: 'application/json' },
      ),
    );

  const openIssue = () => {
    if (!issue) return;
    void browser.tabs.create({ url: issue.url });
  };

  if (loading) return <div className="page"><p className="muted">Loading…</p></div>;

  return (
    <div className="page">
      <header className="head">
        <div>
          <span className="brand">TRAIL</span>
          <h1>{base.title}</h1>
        </div>
        <div className="counts">
          <span>clicks {counts.click}</span>
          <span>errors {counts.console}</span>
          <span>failures {counts.net}</span>
        </div>
      </header>

      <section className="exportbar">
        <input
          className="repo"
          placeholder="owner/repo — e.g. acme/widget"
          value={repo}
          onChange={(e) => setRepoAndSave(e.target.value)}
          spellCheck={false}
        />
        <button className="btn primary" onClick={openIssue} disabled={!issue}>
          Open GitHub Issue
        </button>
        <button className="btn" onClick={() => void copyMarkdown()}>
          Copy Markdown
        </button>
        <button className="btn" onClick={() => void downloadReport()}>
          Download .md
        </button>
        <button className="btn" onClick={() => void downloadReplay()}>
          Download Replay
        </button>
        <label className="toggle">
          <input type="checkbox" checked={redact} onChange={(e) => setRedact(e.target.checked)} />
          <span>Redact values</span>
        </label>
        {templateState === 'found' && template && (
          <p className="template-note">
            Shaped for {template.filename} — {template.name}
          </p>
        )}
      </section>

      {toast && <div className="toast">{toast}</div>}

      <main className="layout">
        <section className="panel replay-panel">
          {rrwebEvents.length ? (
            <ReplayPlayer events={rrwebEvents} />
          ) : (
            <p className="muted">No replay frames captured.</p>
          )}
        </section>

        <section className="panel timeline-panel">
          <h2>Timeline</h2>
          <ol className="timeline">
            {timeline.map((s, i) => (
              <TimelineRow key={i} step={s} />
            ))}
          </ol>
          {timeline.length === 0 && <p className="muted">No events captured.</p>}
        </section>
      </main>
    </div>
  );
}

function TimelineRow({ step }: { step: TimelineStep }) {
  return (
    <li className={`step ${step.kind}`}>
      <span className="t">{fmtTime(step.t)}</span>
      <span className="text">{step.text}</span>
    </li>
  );
}

export default App;
