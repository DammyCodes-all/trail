import type { ReviewLoader, ReviewPlatform } from "@trail/review/app";
import { rememberIncomingShare } from "@trail/review/lib/share";
import type { SharedReportPayload } from "@trail/review/lib/types";
import {
  getReport,
  getSessionEvents,
  importSharedReport,
  updateReportTitle,
} from "./db";

// The web viewer's session loader: the server component fetches the shared
// payload, this loader imports it into the web viewer's own store (idempotent
// per source link — the same /r/<id> opened twice reuses the first import)
// and hands the plain ?report-style result to ReviewApp. The source link is
// remembered in the share cache so re-sharing from this viewer reuses it.
export function createWebLoader(
  payload: SharedReportPayload,
  source: string,
): { loader: ReviewLoader; platform: ReviewPlatform } {
  return {
    loader: {
      async load() {
        const seq = await importSharedReport(payload, source);
        void rememberIncomingShare(payload, source).catch(() => {});
        const report = await getReport(seq);
        const events = await getSessionEvents(seq);
        return {
          report: report ?? null,
          events,
          reportId: seq,
        };
      },
    },
    platform: {
      openTab: (url: string) => window.open(url, "_blank", "noopener"),
      closeTab: () => window.close(),
      // The web viewer has a local store of its own, so title edits persist
      // across reloads of the same link.
      persistTitle: (reportId: number, title: string) =>
        void updateReportTitle(reportId, title),
    },
  };
}
