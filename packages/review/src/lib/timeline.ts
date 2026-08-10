import { foldRepeatedConsoles, type FoldedConsole } from './fold.ts';
import type { StoredEvent } from './types.ts';

export type StepKind =
  | 'nav'
  | 'click'
  | 'input'
  | 'key'
  | 'submit'
  | 'hover'
  | 'viewport'
  | 'console'
  | 'net'
  | 'flag';

export interface TimelineStep {
  t: number;
  kind: StepKind;
  text: string;
  level?: string;
  status?: number;
  target?: string;
  masked?: boolean;
  // how many times a repeated console message fired (set when folding kicked in)
  count?: number;
  // Element identity on click steps — matched against a submit step's
  // `submitter` so a submit-button click folds into its submit causally.
  label?: string;
  tag?: string;
  submitter?: { label: string; tag: string };
}

// The action kinds that read as reproduction steps — every user-visible
// interaction kind: navigation, clicks, typing, Enter presses, form
// submits, hovers on menu-revealing controls, and viewport resizes (a
// "resize then it breaks" bug needs the resize). Console and net steps stay
// out: they have their own sections and would drown the repro. Single
// source of truth — the report's Steps section and both AI digests'
// step lists filter through this so they cannot drift apart.
export const STEP_KINDS = new Set<StepKind>([
  'nav',
  'click',
  'input',
  'key',
  'submit',
  'hover',
  'viewport',
]);

export const isReproStep = (kind: StepKind): boolean => STEP_KINDS.has(kind);

// A submit folds the click on its own submit button into itself — the click
// has no independent meaning once the submit exists. Causality comes from
// SubmitEvent.submitter (capture-time identity), so the window exists only
// as a safety bound for clock skew between the two events.
const SUBMIT_CLICK_WINDOW = 1500;

// Form-action display in the submit text: the full URL is usually megabytes
// of query noise; show the path+query trimmed, like the report does.
const shortAction = (action: string): string =>
  action.length <= 160 ? action : `${action.slice(0, 160)}…`;

// Reduce captured events to a chronological, human-readable play-by-play. The same
// list feeds the on-screen timeline and the report's "Steps to Reproduce".
// meta events are not steps: they carry environment facts, consumed by
// facts.ts, and never appear here.
export function buildTimeline(events: StoredEvent[], redact = true): TimelineStep[] {
  const nonRrweb = foldRepeatedConsoles(
    events
      .filter((e) => e.k !== 'rrweb' && e.k !== 'meta')
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
        steps.push({
          t: e.t,
          kind: 'click',
          text: `Click ${e.label || e.tag}`,
          label: e.label,
          tag: e.tag,
        });
        break;
      case 'key':
        steps.push({
          t: e.t,
          kind: 'key',
          text: `Pressed Enter in ${e.label || e.tag}`,
        });
        break;
      case 'submit': {
        const method = e.method;
        const action = e.action ? ` ${shortAction(e.action)}` : '';
        const base = method && action ? ` (${method}${action})` : method ? ` (${method})` : '';
        steps.push({
          t: e.t,
          kind: 'submit',
          text: `Submitted form ${e.label}${base}`,
          submitter: e.submitter,
        });
        break;
      }
      case 'hover':
        steps.push({
          t: e.t,
          kind: 'hover',
          text: `Hovered ${e.label || e.tag} (${e.reason})`,
        });
        break;
      case 'viewport':
        steps.push({
          t: e.t,
          kind: 'viewport',
          text: `Resized viewport to ${e.w}×${e.h}`,
        });
        break;
      case 'input': {
        const hidden = e.masked || redact;
        // Fall back for legacy events recorded before the label chain was fixed.
        const field = e.label || '<input>';
        const files = e.files;
        steps.push({
          t: e.t,
          kind: 'input',
          masked: hidden,
          text: files?.length
            ? `Uploaded ${files.length} file${files.length === 1 ? '' : 's'} to ${field}`
            : hidden
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

  // Submit dedupe: a form submit triggered by clicking its own submit button
  // is one action — the click step is folded into the submit step. The match
  // is on the submitter identity captured at submission time (label+tag),
  // bounded by a skew window. Keyboard Enters are never folded: pressing
  // Enter and submitting are two real moments in a keyboard repro.
  const deduped: TimelineStep[] = [];
  for (const step of steps) {
    if (step.kind === 'submit' && step.submitter) {
      const prev = deduped.at(-1);
      if (
        prev?.kind === 'click' &&
        prev.label === step.submitter.label &&
        prev.tag === step.submitter.tag &&
        step.t - prev.t <= SUBMIT_CLICK_WINDOW
      ) {
        deduped.pop();
      }
    }
    deduped.push(step);
  }

  return deduped;
}
