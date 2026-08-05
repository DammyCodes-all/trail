// String-shaping helpers for captured values. Nothing here touches the DOM;
// these are pure transforms shared by every recorder.
export const cap = (s: unknown, n = 60): string | null => {
  if (s == null) return null;
  const str = String(s).trim();
  return str.length > n ? str.slice(0, n) : str;
};

export const fmt = (a: unknown): string => {
  try {
    return typeof a === "string"
      ? a
      : (JSON.stringify(a)?.slice(0, 300) ?? String(a));
  } catch {
    return String(a);
  }
};

// Response bodies of failed requests, capped high enough to keep real
// payloads whole (JSON documents, base64 blobs). Anything beyond this is
// truncated rather than dropped; the display can scroll the full capture.
export const BODY_LIMIT = 1_000_000;
export const bodyText = (s: unknown): string | undefined => {
  if (s == null) return undefined;
  const str = String(s);
  if (!str.trim()) return undefined;
  return str.length > BODY_LIMIT
    ? `${str.slice(0, BODY_LIMIT)}\n...(truncated)`
    : str;
};

// Request bodies sent by the page, capped the same as responses. Only
// string-like payloads are captured: Blob/FormData/streams are skipped rather
// than consumed or read asynchronously.
export const REQUEST_BODY_LIMIT = 1_000_000;
export const requestBodyText = (s: unknown): string | undefined => {
  if (s == null) return undefined;
  const str =
    typeof s === "string"
      ? s
      : s instanceof URLSearchParams
        ? s.toString()
        : undefined;
  if (str === undefined || !str.trim()) return undefined;
  return str.length > REQUEST_BODY_LIMIT
    ? `${str.slice(0, REQUEST_BODY_LIMIT)}\n...(truncated)`
    : str;
};
