// Shadow-DOM styles for the recording overlay. Kept as a string: the overlay is
// injected into the page inside a closed shadow root, so a real stylesheet
// would leak page-wide. Design family: 18px panel, 12px chips, 999px pills,
// orange hairline + inset glow + blur (matches the popup/review tokens).
export const overlayStyles = `
  :host {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    pointer-events: none;
    color-scheme: dark;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  .trail-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 232px;
    pointer-events: auto;
    touch-action: none;
    user-select: none;
    cursor: grab;
    isolation: isolate;
    border: 1px solid rgba(255, 138, 31, 0.36);
    border-radius: 18px;
    background:
      radial-gradient(circle at 18% 0%, rgba(255, 138, 31, 0.12), transparent 34%),
      linear-gradient(180deg, rgba(24, 24, 24, 0.94), rgba(8, 8, 8, 0.98)),
      #050505;
    box-shadow:
      0 18px 48px rgba(0, 0, 0, 0.34),
      0 0 0 1px rgba(255, 106, 0, 0.06) inset;
    backdrop-filter: blur(20px) saturate(155%);
    color: #fff7ed;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: 11px 12px 12px;
    will-change: transform;
  }

  .trail-overlay::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 26%),
      linear-gradient(90deg, rgba(255, 138, 31, 0.08), transparent 26% 74%, rgba(255, 106, 0, 0.06));
    mix-blend-mode: screen;
    opacity: 0.72;
  }

  .trail-overlay:active {
    cursor: grabbing;
  }

  .trail-overlay__top {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
    font-size: 10px;
    line-height: 1;
    letter-spacing: 0.1em;
    color: #ff8a1f;
  }

  .trail-overlay__rec {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    border-radius: 999px;
    background: transparent;
    padding: 0;
    text-transform: uppercase;
    font-weight: 700;
  }

  .trail-overlay__live {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #ff6a00;
    box-shadow:
      0 0 0 3px rgba(255, 106, 0, 0.16),
      0 0 14px rgba(255, 106, 0, 0.72);
  }

  .trail-overlay__time {
    color: rgba(255, 247, 237, 0.68);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    letter-spacing: 0;
    white-space: nowrap;
  }

  .trail-overlay__stop {
    appearance: none;
    border: 1px solid rgba(255, 77, 77, 0.58);
    background: rgba(18, 10, 10, 0.82);
    color: #ffb7b7;
    border-radius: 12px;
    padding: 5px 10px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 0 0 1px rgba(255, 77, 77, 0.08) inset;
    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      transform 140ms ease,
      color 140ms ease;
  }

  .trail-overlay__stop:hover {
    background: rgba(255, 77, 77, 0.14);
    border-color: rgba(255, 77, 77, 0.92);
    color: #ffd5d5;
  }

  .trail-overlay__stop:active {
    transform: translateY(1px);
  }

  .trail-overlay__stop:focus-visible {
    outline: 2px solid #ff4d4d;
    outline-offset: 2px;
  }

  .trail-overlay__total {
    display: flex;
    align-items: baseline;
    gap: 7px;
    margin-top: 10px;
  }

  .trail-overlay__total [data-slot="sliding-number"] {
    font-size: 38px;
    font-weight: 800;
    line-height: 0.92;
    letter-spacing: -0.04em;
    color: #fff7ed;
  }

  .trail-overlay__total > span:last-child {
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 138, 31, 0.88);
  }

  .trail-overlay__metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-top: 11px;
  }

  .trail-overlay__metric {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 5px;
    border: 1px solid rgba(255, 106, 0, 0.18);
    border-radius: 12px;
    background: rgba(5, 5, 5, 0.78);
    padding: 7px 7px 7px 8px;
    font-size: 10px;
    line-height: 1;
    color: rgba(255, 247, 237, 0.68);
  }

  .trail-overlay__metric [data-slot="sliding-number"] {
    color: #ff8a1f;
    font-size: 14px;
    font-weight: 760;
    letter-spacing: 0;
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: no-preference) {
    .trail-overlay__live {
      animation: trail-live-pulse 1.2s ease-in-out infinite;
    }
  }

  @keyframes trail-live-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }

  @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
    .trail-overlay {
      background: #050505;
      backdrop-filter: none;
      border-color: #ff8a1f;
    }
  }
`;
