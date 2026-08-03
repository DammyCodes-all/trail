import { useEffect, useState } from 'react';
import { MSG_START, MSG_STATUS, MSG_STOP, REDACT_KEY } from '@/lib/constants';
import { getAllEvents, getReports } from '@/lib/db';
import type { StoredEvent, TrailCounts, TrailReport } from '@/lib/types';

type Status = { recording: boolean; counts: TrailCounts } | null;
type View = 'home' | 'setup' | 'recording';

const fmtTime = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function App() {
  const [status, setStatus] = useState<Status>(null);
  const [view, setView] = useState<View>('home');
  const [busy, setBusy] = useState(false);
  const [autoRedact, setAutoRedact] = useState(true);
  const [reports, setReports] = useState<TrailReport[]>([]);
  const [events, setEvents] = useState<StoredEvent[]>([]);

  const refresh = async () => {
    const s = await browser.runtime.sendMessage({ type: MSG_STATUS });
    setStatus(s);
    setView((v) => {
      if (s.recording) return 'recording';
      return v === 'recording' ? 'home' : v;
    });
  };

  useEffect(() => {
    void refresh();
    const iv = setInterval(() => void refresh(), 500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    void browser.storage.local.get(REDACT_KEY).then((r) => {
      if (typeof r[REDACT_KEY] === 'boolean') setAutoRedact(r[REDACT_KEY]);
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
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      const resp = await browser.runtime.sendMessage({ type: MSG_START, tabId: tab?.id });
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
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!events.length) return;
    // Test hook: lets an automated driver assert on raw captured data.
    (window as unknown as { __trailEvents: StoredEvent[] }).__trailEvents = events;
  }, [events]);

  const counts = status?.counts ?? { click: 0, console: 0, net: 0 };
  const recording = status?.recording ?? false;

  return (
    <div className="popup">
      <header className="head">
        <span className="brand">TRAIL</span>
        {recording && <span className="pill">recording</span>}
      </header>

      {view === 'home' && (
        <>
          <button
            className="btn primary"
            id="start"
            onClick={() => setView('setup')}
          >
            Start Report
          </button>

          <section className="history">
            <h3>Past reports</h3>
            {reports.length === 0 ? (
              <p className="empty">
                No reports yet. Start a report, reproduce the bug, and TRAIL writes
                the issue for you.
              </p>
            ) : (
              <ul>
                {reports.map((r) => (
                  <li key={r.seq} className="report">
                    <span className="r-title">{r.title || 'Untitled report'}</span>
                    <span className="r-meta">
                      {fmtTime(r.endedAt)} · {r.eventCount} events
                      {r.repo ? ` · ${r.repo}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {view === 'setup' && (
        <div className="setup">
          <p className="hint">
            Open the page with the bug, then begin recording. TRAIL captures clicks,
            typed input, console errors, and failed requests.
          </p>
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoRedact}
              onChange={(e) => void toggleRedact(e.target.checked)}
            />
            <span>
              Auto-redact typed values
              <small>Mask anything you type in the report and replay.</small>
            </span>
          </label>
          <div className="actions">
            <button className="btn" onClick={() => setView('home')} disabled={busy}>
              Back
            </button>
            <button className="btn primary" id="begin" onClick={() => void start()} disabled={busy}>
              Begin Recording
            </button>
          </div>
        </div>
      )}

      {view === 'recording' && (
        <div className="recording">
          <div className="counts">
            <span>clicks {counts.click}</span>
            <span>errors {counts.console}</span>
            <span>failures {counts.net}</span>
          </div>
          <p className="hint">
            Reproduce the bug. Every click, error, and failed request is being captured.
          </p>
          <button className="btn stop" onClick={() => void stop()} disabled={busy}>
            Stop & Review
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
