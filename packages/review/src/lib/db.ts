import { openDB, type IDBPDatabase } from "idb";
import {
  EVENTS_STORE,
  REPORTS_STORE,
  SESSIONS_STORE,
} from "./constants";
import { countSummary, ZERO_COUNTS } from "./summary";
import type {
  SessionEvents,
  SharedReportPayload,
  StoredEvent,
  TrailReport,
} from "./types";

// The review's local session store: live events, saved reports, and the
// per-report session snapshots that make a report reopenable after the next
// recording clears the live buffer. The extension binds it to its own DB
// (chrome/firefox profile history); the web viewer binds it to a separate
// DB so its imports never leak into the extension's popup history. Schema
// version 3: events → reports → sessions.
export interface TrailDb {
  getDb(): Promise<IDBPDatabase>;
  addEvents(events: unknown[]): Promise<void>;
  getAllEvents(): Promise<StoredEvent[]>;
  clearEvents(): Promise<void>;
  saveReport(report: Omit<TrailReport, "seq">): Promise<number>;
  getReports(): Promise<TrailReport[]>;
  getReport(seq: number): Promise<TrailReport | undefined>;
  deleteReport(seq: number): Promise<void>;
  updateReportTitle(seq: number, title: string): Promise<void>;
  updateReportSummary(
    seq: number,
    errorCount: number,
    failedRequestCount: number,
  ): Promise<void>;
  saveSessionEvents(reportId: number, events: StoredEvent[]): Promise<void>;
  getSessionEvents(reportId: number): Promise<StoredEvent[]>;
  importSharedReport(
    payload: SharedReportPayload,
    source: string,
  ): Promise<number>;
}

export function createDb(dbName: string): TrailDb {
  let dbPromise: Promise<IDBPDatabase> | null = null;

  function getDb(): Promise<IDBPDatabase> {
    dbPromise ??= openDB(dbName, 3, {
      upgrade(d, oldVersion) {
        if (oldVersion < 1) {
          d.createObjectStore(EVENTS_STORE, {
            keyPath: "seq",
            autoIncrement: true,
          });
        }
        if (oldVersion < 2) {
          d.createObjectStore(REPORTS_STORE, {
            keyPath: "seq",
            autoIncrement: true,
          });
        }
        if (oldVersion < 3) {
          d.createObjectStore(SESSIONS_STORE, { keyPath: "reportId" });
        }
      },
    });
    return dbPromise;
  }

  const saveReport = async (
    report: Omit<TrailReport, "seq">,
  ): Promise<number> => {
    const db = await getDb();
    return db.add(REPORTS_STORE, report) as Promise<number>;
  };

  const getReports = async (): Promise<TrailReport[]> => {
    const db = await getDb();
    const all = await db.getAll(REPORTS_STORE);
    return all.sort((a, b) => b.endedAt - a.endedAt);
  };

  const saveSessionEvents = async (
    reportId: number,
    events: StoredEvent[],
  ): Promise<void> => {
    const db = await getDb();
    await db.put(SESSIONS_STORE, { reportId, events } satisfies SessionEvents);
  };

  return {
    getDb,
    saveReport,
    getReports,
    saveSessionEvents,

    async addEvents(events: unknown[]): Promise<void> {
      if (!events.length) return;
      const db = await getDb();
      const tx = db.transaction(EVENTS_STORE, "readwrite");
      for (const e of events) void tx.store.add(e);
      await tx.done;
    },

    async getAllEvents(): Promise<StoredEvent[]> {
      const db = await getDb();
      return db.getAll(EVENTS_STORE);
    },

    async clearEvents(): Promise<void> {
      const db = await getDb();
      await db.clear(EVENTS_STORE);
    },

    async getReport(seq: number): Promise<TrailReport | undefined> {
      const db = await getDb();
      return db.get(REPORTS_STORE, seq);
    },

    // Remove a report and its session snapshot. The live events store is
    // untouched — it holds the current recording, not history.
    async deleteReport(seq: number): Promise<void> {
      const db = await getDb();
      await Promise.all([
        db.delete(REPORTS_STORE, seq),
        db.delete(SESSIONS_STORE, seq),
      ]);
    },

    async updateReportTitle(seq: number, title: string): Promise<void> {
      const db = await getDb();
      const report = await db.get(REPORTS_STORE, seq);
      if (!report) return;
      await db.put(REPORTS_STORE, { ...report, title });
    },

    // Backfill the derived summary fields on reports saved before they existed
    // (see TrailReport.errorCount). Idempotent: once written, the popup's
    // backfill skips the report and the fields ride along with it forever.
    async updateReportSummary(
      seq: number,
      errorCount: number,
      failedRequestCount: number,
    ): Promise<void> {
      const db = await getDb();
      const report = await db.get(REPORTS_STORE, seq);
      if (!report) return;
      await db.put(REPORTS_STORE, { ...report, errorCount, failedRequestCount });
    },

    async getSessionEvents(reportId: number): Promise<StoredEvent[]> {
      const db = await getDb();
      const s = await db.get(SESSIONS_STORE, reportId);
      return (s as SessionEvents | undefined)?.events ?? [];
    },

    // Import a session fetched from a shared link into local history so it
    // shows up like any other report. Returns the local report seq. A report
    // already imported from the same share URL is returned untouched — the
    // import is idempotent, so opening the same link twice never duplicates.
    async importSharedReport(
      payload: SharedReportPayload,
      source: string,
    ): Promise<number> {
      const existing = await getReports();
      const dup = existing.find((r) => r.source === source);
      if (dup) return dup.seq;

      const fallback = payload.report ?? {};
      const summary = countSummary(payload.events);
      const report: Omit<TrailReport, "seq"> = {
        title: fallback.title || payload.title || "Shared report",
        repo: fallback.repo ?? "",
        startedAt: fallback.startedAt ?? payload.exportedAt ?? Date.now(),
        endedAt: fallback.endedAt ?? Date.now(),
        eventCount: fallback.eventCount ?? payload.events.length,
        counts: fallback.counts ?? { ...ZERO_COUNTS },
        url: fallback.url ?? payload.events[0]?.url ?? "",
        errorCount: fallback.errorCount ?? summary.errorCount,
        failedRequestCount:
          fallback.failedRequestCount ?? summary.failedRequestCount,
        source,
      };
      const seq = await saveReport(report);
      await saveSessionEvents(seq, payload.events);
      return seq;
    },
  };
}
