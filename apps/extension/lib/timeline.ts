import { foldRepeatedConsoles, type FoldedConsole } from './fold.ts';
import type { StoredEvent } from './types.ts';

export type StepKind = 'nav' | 'click' | 'input' | 'console' | 'net' | 'flag';

export interface TimelineStep {
  t: number;
  kind: StepKind;
  text: string;
  level?: 'error' | 'warn';
  status?: number;
  // true when the typed value is hidden (masked at capture, or by the redaction backstop)
  masked?: boolean;
  // how many times a repeated console message fired (set when folding kicked in)
  count?: number;
}

// Reduce captured events to a chronological, human-readable play-by-play. The same
// list feeds the on-screen timeline and the report's "Steps to Reproduce".
export function buildTimeline(events: StoredEvent[], redact = true): TimelineStep[] {
  const nonRrweb = foldRepeatedConsoles(
    events
      .filter((e) => e.k !== 'rrweb')
      .sort((a, b) => a.t - b.t),
  );

  const steps: TimelineStep[] = [];
  let lastUrl = '';

  for (const e of nonRrweb) {
    // Real nav events are recorded at every document boot and always become a
    // step — including same-URL refreshes, which the URL-diff synthesis below
    // can never see. Synthesis remains as a fallback for URL changes that
    // arrive without a boot event (SPA pushes, legacy events).
    if (e.k === 'nav') {
      steps.push({
        t: e.t,
        kind: 'nav',
        text: e.reload ? `Reloaded ${e.url}` : `Navigate to ${e.url}`,
      });
      lastUrl = e.url;
      continue;
    }
    if (e.url && e.url !== lastUrl) {
      steps.push({ t: e.t, kind: 'nav', text: `Navigate to ${e.url}` });
      lastUrl = e.url;
    }

    switch (e.k) {
      case 'click':
        steps.push({ t: e.t, kind: 'click', text: `Click ${e.label || e.tag}` });
        break;
      case 'input': {
        const hidden = e.masked || redact;
        // Fall back for legacy events recorded before the label chain was fixed.
        const field = e.label || '<input>';
        steps.push({
          t: e.t,
          kind: 'input',
          masked: hidden,
          text: hidden
            ? `Type into ${field}`
            : `Type "${e.value}" into ${field}`,
        });
        break;
      }
      case 'console': {
        const step: TimelineStep = {
          t: e.t,
          kind: 'console',
          level: e.lv,
          text: `Console ${e.lv}: ${e.msg}`,
        };
        const count = (e as FoldedConsole).count;
        if (count > 1) step.count = count;
        steps.push(step);
        break;
      }
      case 'net':
        steps.push({
          t: e.t,
          kind: 'net',
          status: e.status,
          text: `${e.method} ${e.target} — ${e.status}${e.err ? ` (${e.err})` : ''}`,
        });
        break;
      case 'flag': {
        const expected = e.expected;
        const actual = e.actual;
        const text =
          expected && actual
            ? `Flag: "${expected}" — "${actual}"`
            : expected
              ? `Flag: "${expected}"`
              : actual
                ? `Flag: "${actual}"`
                : 'Flagged this moment';
        steps.push({ t: e.t, kind: 'flag', text });
        break;
      }
    }
  }

  return steps;
}
