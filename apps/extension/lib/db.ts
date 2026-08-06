import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, EVENTS_STORE, REPORTS_STORE, SESSIONS_STORE } from './constants.ts';
import type { SessionEvents, SharedReportPayload, StoredEvent, TrailReport } from './types.ts';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, 3, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore(EVENTS_STORE, { keyPath: 'seq', autoIncrement: true });
      }
      if (oldVersion < 2) {
        d.createObjectStore(REPORTS_STORE, { keyPath: 'seq', autoIncrement: true });
      }
      if (oldVersion < 3) {
        d.createObjectStore(SESSIONS_STORE, { keyPath: 'reportId' });
      }
    },
  });
  return dbPromise;
}

export async function addEvents(events: unknown[]): Promise<void> {
  if (!events.length) return;
  const db = await getDb();
  const tx = db.transaction(EVENTS_STORE, 'readwrite');
  for (const e of events) void tx.store.add(e);
  await tx.done;
}

export async function getAllEvents(): Promise<StoredEvent[]> {
  const db = await getDb();
  return db.getAll(EVENTS_STORE);
}

export async function clearEvents(): Promise<void> {
  const db = await getDb();
  await db.clear(EVENTS_STORE);
}

export async function saveReport(report: Omit<TrailReport, 'seq'>): Promise<number> {
  const db = await getDb();
  return db.add(REPORTS_STORE, report) as Promise<number>;
}

export async function getReports(): Promise<TrailReport[]> {
  const db = await getDb();
  const all = await db.getAll(REPORTS_STORE);
  return all.sort((a, b) => b.endedAt - a.endedAt);
}

export async function getReport(seq: number): Promise<TrailReport | undefined> {
  const db = await getDb();
  return db.get(REPORTS_STORE, seq);
}

// Remove a report and its session snapshot. The live events store is untouched —
// it holds the current recording, not history.
export async function deleteReport(seq: number): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.delete(REPORTS_STORE, seq),
    db.delete(SESSIONS_STORE, seq),
  ]);
}

export async function updateReportTitle(seq: number, title: string): Promise<void> {
  const db = await getDb();
  const report = await db.get(REPORTS_STORE, seq);
  if (!report) return;
  await db.put(REPORTS_STORE, { ...report, title });
}

// Backfill the derived summary fields on reports saved before they existed
// (see TrailReport.errorCount). Idempotent: once written, the popup's backfill
// skips the report and the fields ride along with it forever.
export async function updateReportSummary(
  seq: number,
  errorCount: number,
  failedRequestCount: number,
): Promise<void> {
  const db = await getDb();
  const report = await db.get(REPORTS_STORE, seq);
  if (!report) return;
  await db.put(REPORTS_STORE, { ...report, errorCount, failedRequestCount });
}

// Snapshot a finished session's events so a report can be reopened after the live
// events store is cleared by the next recording.
export async function saveSessionEvents(reportId: number, events: StoredEvent[]): Promise<void> {
  const db = await getDb();
  await db.put(SESSIONS_STORE, { reportId, events } satisfies SessionEvents);
}

export async function getSessionEvents(reportId: number): Promise<StoredEvent[]> {
  const db = await getDb();
  const s = await db.get(SESSIONS_STORE, reportId);
  return (s as SessionEvents | undefined)?.events ?? [];
}

// Import a session fetched from a shared link into local history so it shows
// up in the popup like any other report. Returns the local report seq. A
// report already imported from the same share URL is returned untouched — the
// import is idempotent, so pasting the same link twice never duplicates.
export async function importSharedReport(
  payload: SharedReportPayload,
  source: string,
): Promise<number> {
  const existing = await getReports();
  const dup = existing.find((r) => r.source === source);
  if (dup) return dup.seq;

  const fallback = payload.report ?? {};
  const report: Omit<TrailReport, 'seq'> = {
    title: fallback.title || payload.title || 'Shared report',
    repo: fallback.repo ?? '',
    startedAt: fallback.startedAt ?? payload.exportedAt ?? Date.now(),
    endedAt: fallback.endedAt ?? Date.now(),
    eventCount: fallback.eventCount ?? payload.events.length,
    counts: fallback.counts ?? { click: 0, input: 0, console: 0, net: 0 },
    url: fallback.url ?? payload.events[0]?.url ?? '',
    errorCount:
      fallback.errorCount ??
      payload.events.filter((e) => e.k === 'console' && e.lv === 'error')
        .length,
    failedRequestCount:
      fallback.failedRequestCount ??
      payload.events.filter(
        (e) => e.k === 'net' && (e.status === 0 || e.status >= 400),
      ).length,
    source,
  };
  const seq = await saveReport(report);
  await saveSessionEvents(seq, payload.events);
  return seq;
}
