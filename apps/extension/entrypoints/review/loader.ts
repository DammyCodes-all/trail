import {
  getAllEvents,
  getReport,
  getSessionEvents,
  importSharedReport,
} from "@/lib/db";
import {
  isShareLink,
  rememberIncomingShare,
  resolveSharePayloadUrl,
} from "@trail/review/lib/share";
import { countEvents } from "@trail/review/lib/summary";
import { suggestTitle } from "@trail/review/lib/report";
import type { ReviewLoader } from "@trail/review/app";
import type { SharedReportPayload } from "@trail/review/lib/types";

// The extension's session loader: the shared-link import path (fetch the
// payload, save it to history, reload into the plain ?report= view), the
// saved-report path (?report=<seq>), and the live-buffer path (fresh stop).
export const extensionLoader: ReviewLoader = {
  async load() {
    const search = new URLSearchParams(location.search);
    const shareUrl = search.get("share");

    // Shared link mode: fetch the session from the replay server, import it
    // into local history, then hand off to the plain ?report= reopen path —
    // the reviewer gets the exact same review UI, persisted automatically.
    if (shareUrl) {
      if (!isShareLink(shareUrl)) {
        throw new Error("That doesn't look like a TRAIL share link.");
      }
      let res: Response;
      try {
        res = await fetch(resolveSharePayloadUrl(shareUrl));
      } catch {
        throw new Error(
          "Couldn't load the shared replay. The link may be invalid or the replay server may be unreachable.",
        );
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as SharedReportPayload;
      if (payload?.v !== 2 || !Array.isArray(payload.events) || !payload.report) {
        throw new Error("That doesn't look like a TRAIL session.");
      }
      const seq = await importSharedReport(payload, shareUrl);
      // Sync the share cache: the recipient now holds the same session, so
      // re-sharing it should reuse the incoming link instead of uploading
      // the payload to blob storage a second time.
      void rememberIncomingShare(payload, shareUrl).catch(() => {});
      // The reload re-runs the loader through the ?report= path. Never
      // resolve: navigation away from this page is the completion.
      location.replace(`${location.origin}${location.pathname}?report=${seq}`);
      await new Promise<never>(() => {});
    }

    const reportId = Number(search.get("report")) || undefined;
    if (reportId) {
      const report = await getReport(reportId);
      const events = await getSessionEvents(reportId);
      return { report: report ?? null, events, reportId };
    }

    const events = await getAllEvents();
    const timestamps = events.map((event) => event.t).filter(Number.isFinite);
    const pickUrl = (evts: typeof events) => {
      for (const e of evts) if (e.url && /^https?:\/\//i.test(e.url)) return e.url;
      for (const e of evts) if (e.url) return e.url;
      return "";
    };
    return {
      report: {
        seq: 0,
        title: suggestTitle(events),
        repo: "",
        startedAt: timestamps.length ? Math.min(...timestamps) : Date.now(),
        endedAt: timestamps.length ? Math.max(...timestamps) : Date.now(),
        eventCount: events.length,
        counts: countEvents(events),
        url: pickUrl(events),
      },
      events,
    };
  },
};
