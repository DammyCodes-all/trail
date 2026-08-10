// The repository field is never autofilled: the user types, and TRAIL
// offers previously-used repos as suggestions. This module keeps that
// history pure and small — deduped, most-recent-first, capped — plus the
// canonicalization used everywhere a repo string leaves the field.

export const REPO_HISTORY_LIMIT = 10;

// Push a used repo onto the history: normalized, deduped case-insensitively,
// most-recent-first, capped. Returns a new array — callers persist it.
export function pushRepoHistory(history: string[], repo: string): string[] {
  const norm = normalizeRepo(repo).trim().toLowerCase();
  if (!norm || !/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(norm)) return history;
  const rest = history.filter((r) => r.toLowerCase() !== norm);
  return [norm, ...rest].slice(0, REPO_HISTORY_LIMIT);
}

// Repos from history that contain the query (case-insensitive, anywhere in
// the string). History order is preserved: most recent first.
export function filterRepoHistory(history: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return history;
  return history.filter((r) => r.toLowerCase().includes(q));
}

// Accept any of the ways users express a repo: a full GitHub link
// (https://github.com/acme/widget/issues/3), a bare owner/repo, or a
// github.com/owner/repo shorthand. Returns the canonical `owner/repo`, or the
// input unchanged when it can't be recognized (the user may still be typing).
export function normalizeRepo(value: string): string {
  const raw = value.trim();
  if (!raw) return raw;

  let candidate = '';
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const host = u.hostname.toLowerCase();
      if (host !== 'github.com' && host !== 'www.github.com') return raw;
      const parts = u.pathname
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .split('/')
        .filter(Boolean);
      if (parts.length >= 2) candidate = `${parts[0]}/${parts[1]}`;
      else return raw;
    } catch {
      return raw;
    }
  } else {
    candidate = raw
      .replace(/^(?:www\.)?github\.com\//i, '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .split('/')
      .slice(0, 2)
      .join('/');
  }

  candidate = candidate.replace(/\.git$/i, '');
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(candidate)
    ? candidate
    : raw;
}
