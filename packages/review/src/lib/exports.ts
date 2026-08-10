import type { ConsoleEvent, NetEvent, TrailCounts } from "./types";

// Clipboard write with a legacy-textarea fallback for contexts where the
// async clipboard API is unavailable. Resolves true once the text is on the
// clipboard; never rejects (the fallback is best-effort).
export async function copyText(text: string): Promise<boolean> {
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
}

export async function downloadText(
  filename: string,
  text: string,
  mime = "text/plain",
): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  try {
    const b = (globalThis as Record<string, unknown>).browser as
      | { downloads?: { download: (opts: { url: string; filename: string }) => Promise<number> } }
      | undefined;
    if (b?.downloads) {
      await b.downloads.download({ url, filename });
    } else {
      // Web fallback: a plain anchor download.
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
    }
  } finally {
    // Keep the object URL alive long enough for the download to start.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

// HAR 1.2 export of the captured failed requests — the standard interchange
// format for network evidence. One entry per NetEvent, body included when
// the recorder captured it.
export function buildHar(
  events: NetEvent[],
  extensionVersion: string,
): string {
  const har = {
    log: {
      version: "1.2",
      creator: { name: "TRAIL", version: extensionVersion },
      entries: events.map((event) => ({
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
  return JSON.stringify(har, null, 2);
}

// Plain-text console log: ISO timestamps, level, message, and stack when one
// was captured.
export function buildConsoleLog(events: ConsoleEvent[]): string {
  const log = events
    .map((event) => {
      const timestamp = new Date(event.t).toISOString();
      return `[${timestamp}] ${event.lv.toUpperCase()} ${event.msg}${event.stack ? `\n${event.stack}` : ""}`;
    })
    .join("\n\n");
  return log || "No console errors captured.";
}

export interface ExportMetadata {
  title: string;
  capturedAt: number;
  durationMs: number;
  url: string;
  browser: string;
  os: string;
  extensionVersion: string;
  counts: TrailCounts;
}

export function buildMetadataJson(input: ExportMetadata): string {
  return JSON.stringify(input, null, 2);
}
