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

// Response bodies of failed requests, capped. Server replies are the payload
// of a bug report; anything longer is truncated rather than dropped.
export const BODY_LIMIT = 4000;
export const bodyText = (s: unknown): string | undefined => {
  if (s == null) return undefined;
  const str = String(s);
  if (!str.trim()) return undefined;
  return str.length > BODY_LIMIT
    ? `${str.slice(0, BODY_LIMIT)}\n...(truncated)`
    : str;
};
