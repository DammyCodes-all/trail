import { DB_NAME } from "@trail/review/lib/constants";
import { createDb } from "@trail/review/lib/db";

// The extension's session store, bound to its own database name. All methods
// live in the shared package (lib/db.ts) — this module only binds the name so
// the extension keeps one import surface.
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
} = createDb(DB_NAME);
