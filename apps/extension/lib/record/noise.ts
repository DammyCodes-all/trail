// Console chatter that never helps a bug report. Filtered at capture time in
// the MAIN world — before events are stored, counted, or shown anywhere — so a
// noisy library can't bloat storage, the timeline, or the report. Each entry
// is a named regex so the list stays self-documenting and testable.
export interface NoisePattern {
  name: string;
  test: RegExp;
}

export const NOISY_CONSOLE: NoisePattern[] = [
  {
    name: 'KaTeX strict-mode warnings',
    // KaTeX emits one warn per math render in strict mode ('LaTeX-incompatible
    // input ... [newLineInDisplayMode]'), so math-heavy pages drown a session.
    test: /LaTeX-incompatible input|newLineInDisplayMode/i,
  },
  {
    name: 'MathJax unsupported constructs',
    // Same family: one warn per rendered expression.
    test: /MathJax doesn't support/i,
  },
  {
    name: 'devtools source-map load failures',
    // Browser-level chatter from bundled apps; the page never sees the error.
    test: /failed to load source map/i,
  },
];

// True when the (already redacted) message matches a known-noise pattern. The
// message is checked verbatim against the list; a match drops the event but
// never the page's own console output.
export const isNoisyConsole = (msg: string): boolean =>
  NOISY_CONSOLE.some((p) => p.test.test(msg));
