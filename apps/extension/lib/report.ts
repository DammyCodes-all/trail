import type { StoredEvent } from '@/lib/types';

// Deterministic title for a report: first console error, else first failed request,
// else "Bug on <host>". Phase 3 replaces the empty `repo` with the user's input.
export function suggestTitle(events: StoredEvent[]): string {
  const consoleErr = events.find((e) => e.k === 'console');
  if (consoleErr && consoleErr.k === 'console') {
    return (consoleErr.msg || 'Console error').slice(0, 70);
  }
  const netErr = events.find((e) => e.k === 'net' && e.status >= 400);
  if (netErr && netErr.k === 'net') {
    return `${netErr.method} ${netErr.target} failed (${netErr.status})`.slice(0, 70);
  }
  const url = events[0]?.url;
  if (url) {
    try {
      return `Bug on ${new URL(url).host}`;
    } catch {
      return `Bug on ${url}`;
    }
  }
  return 'Bug report';
}
