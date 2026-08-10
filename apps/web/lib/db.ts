import { createDb } from "@trail/review/lib/db";

// The web viewer's session store: a database of its own, separate from the
// extension's profile history. Imports from shared links land here so the
// inline review can reopen them; they never show up in the extension popup
// (that would be surprising — the recipient's own imports belong to the
// extension, which keeps its own copy when it takes over a handoff).
export const {
  addEvents,
  clearEvents,
  deleteReport,
  getAllEvents,
  getDb,
  getReport,
  getReports,
  getSessionEvents,
  importSharedReport,
  saveReport,
  saveSessionEvents,
  updateReportSummary,
  updateReportTitle,
} = createDb("trail-web");
