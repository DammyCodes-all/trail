import type { StoredEvent } from './types.ts';

// Session-wide folding of repeated console events: identical fingerprints
// (level + page + message) collapse into their first occurrence carrying a
// repeat count. Order is preserved — the representative keeps the timestamp
// of the first fire, so the timeline never rewrites history. The evidence tab
// and the console-log export keep the raw events; folding only tames the
// timeline and the report's Console Errors section. Unknown repetitive noise
// (libraries beyond the capture-time deny list) collapses here instead of
// flooding the report with N identical rows.
export interface FoldedConsole extends Extract<StoredEvent, { k: 'console' }> {
  count: number;
  lastT: number;
}

const fingerprint = (e: Extract<StoredEvent, { k: 'console' }>): string =>
  `${e.lv}\u0000${e.url}\u0000${e.msg}`;

export function foldRepeatedConsoles(events: StoredEvent[]): StoredEvent[] {
  const out: StoredEvent[] = [];
  const seen = new Map<string, FoldedConsole>();

  for (const e of events) {
    if (e.k !== 'console') {
      out.push(e);
      continue;
    }
    const key = fingerprint(e);
    const existing = seen.get(key);
    if (existing) {
      existing.count += 1;
      if (e.t > existing.lastT) existing.lastT = e.t;
      continue;
    }
    const folded: FoldedConsole = { ...e, count: 1, lastT: e.t };
    seen.set(key, folded);
    out.push(folded);
  }

  return out;
}
