import type { StoredEvent } from './types.ts';

export type StepKind = 'nav' | 'click' | 'input' | 'console' | 'net';

export interface TimelineStep {
  t: number;
  kind: StepKind;
  text: string;
  level?: 'error' | 'warn';
  // true when the typed value is hidden (masked at capture, or by the redaction backstop)
  masked?: boolean;
}

// Reduce captured events to a chronological, human-readable play-by-play. The same
// list feeds the on-screen timeline and the report's "Steps to Reproduce".
export function buildTimeline(events: StoredEvent[], redact = true): TimelineStep[] {
  const nonRrweb = events
    .filter((e) => e.k !== 'rrweb')
    .sort((a, b) => a.t - b.t);

  const steps: TimelineStep[] = [];
  let lastUrl = '';

  for (const e of nonRrweb) {
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
        steps.push({
          t: e.t,
          kind: 'input',
          masked: hidden,
          text: hidden
            ? `Type into ${e.label}`
            : `Type "${e.value}" into ${e.label}`,
        });
        break;
      }
      case 'console':
        steps.push({ t: e.t, kind: 'console', level: e.lv, text: `Console ${e.lv}: ${e.msg}` });
        break;
      case 'net':
        steps.push({
          t: e.t,
          kind: 'net',
          text: `${e.method} ${e.target} — ${e.status}${e.err ? ` (${e.err})` : ''}`,
        });
        break;
    }
  }

  return steps;
}
