// Shadow-DOM styles for the recording overlay. Kept as a string: the overlay is
// injected into the page inside a closed shadow root, so a real stylesheet
// would leak page-wide. Design family: 18px panel, 12px chips, 999px pills,
// orange recording accent + inset glow + blur (matches the popup/review tokens).
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
    color: #f2f4f6;
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
    color: rgba(242, 244, 246, 0.68);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    letter-spacing: 0;
    white-space: nowrap;
  }

  .trail-overlay--flagging {
    width: 300px;
  }

  .trail-overlay--flagging .trail-overlay__total,
  .trail-overlay--flagging .trail-overlay__metrics {
    opacity: 0;
    max-height: 0;
    margin-top: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .trail-overlay__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .trail-overlay__flag {
    position: relative;
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex: none;
    border: 1px solid rgba(255, 138, 31, 0.55);
    border-radius: 12px;
    background: rgba(255, 138, 31, 0.12);
    color: #ffb066;
    cursor: pointer;
    padding: 0;
    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      transform 140ms ease,
      color 140ms ease;
  }

  .trail-overlay__flag:hover {
    background: rgba(255, 138, 31, 0.22);
    border-color: rgba(255, 138, 31, 0.95);
    color: #ffd5ab;
  }

  .trail-overlay__flag:active {
    transform: translateY(1px);
  }

  .trail-overlay__flag:focus-visible {
    outline: 2px solid #ff8a1f;
    outline-offset: 2px;
  }

  .trail-overlay__flag--open {
    background: rgba(255, 138, 31, 0.26);
    border-color: #ff8a1f;
    color: #ffe0c2;
  }

  .trail-overlay__flag-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    min-width: 15px;
    height: 15px;
    padding: 0 4px;
    border-radius: 999px;
    background: #ff8a1f;
    color: #140a00;
    font-size: 9px;
    font-weight: 800;
    line-height: 15px;
    text-align: center;
  }

  .trail-overlay__form {
    margin-top: 12px;
    border-top: 1px solid rgba(255, 138, 31, 0.22);
    padding-top: 11px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .trail-overlay__field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .trail-overlay__field label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: rgba(255, 138, 31, 0.85);
  }

  .trail-overlay__field textarea {
    appearance: none;
    resize: none;
    width: 100%;
    border: 1px solid rgba(255, 138, 31, 0.28);
    border-radius: 12px;
    background: rgba(5, 5, 5, 0.85);
    color: #f2f4f6;
    font: inherit;
    font-size: 12px;
    line-height: 1.45;
    padding: 7px 9px;
    color-scheme: dark;
    transition:
      border-color 140ms ease,
      box-shadow 140ms ease;
  }

  .trail-overlay__field textarea::placeholder {
    color: rgba(242, 244, 246, 0.35);
  }

  .trail-overlay__field textarea:focus {
    outline: none;
    border-color: rgba(255, 138, 31, 0.85);
    box-shadow: 0 0 0 3px rgba(255, 138, 31, 0.14);
  }

  .trail-overlay__form-row {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
  }

  .trail-overlay__hint {
    margin-right: auto;
    font-size: 10px;
    letter-spacing: 0.02em;
    color: rgba(242, 244, 246, 0.4);
    white-space: nowrap;
  }

  .trail-overlay__cancel {
    appearance: none;
    border: 1px solid rgba(242, 244, 246, 0.2);
    background: transparent;
    color: rgba(242, 244, 246, 0.72);
    border-radius: 12px;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 140ms ease,
      border-color 140ms ease;
  }

  .trail-overlay__cancel:hover {
    background: rgba(242, 244, 246, 0.08);
    border-color: rgba(242, 244, 246, 0.4);
  }

  .trail-overlay__cancel:focus-visible,
  .trail-overlay__submit:focus-visible {
    outline: 2px solid #ff8a1f;
    outline-offset: 2px;
  }

  .trail-overlay__submit {
    appearance: none;
    border: 1px solid #ff8a1f;
    background: linear-gradient(180deg, #ffa045, #ff7a0d);
    color: #1c0d00;
    border-radius: 12px;
    padding: 6px 14px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(255, 122, 13, 0.35);
    transition:
      filter 140ms ease,
      transform 140ms ease;
  }

  .trail-overlay__submit:hover {
    filter: brightness(1.08);
  }

  .trail-overlay__submit:active {
    transform: translateY(1px);
  }

  .trail-overlay__toast {
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid rgba(82, 196, 111, 0.35);
    border-radius: 12px;
    background: rgba(26, 62, 34, 0.6);
    color: #7fe09a;
    font-size: 11px;
    font-weight: 700;
    padding: 7px 10px;
    letter-spacing: 0.02em;
  }

  .trail-overlay__stop {
    appearance: none;
    border: 1px solid rgba(255, 77, 79, 0.58);
    background: rgba(42, 20, 22, 0.82);
    color: #ffb8b9;
    border-radius: 12px;
    padding: 5px 10px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 0 0 1px rgba(255, 77, 79, 0.08) inset;
    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      transform 140ms ease,
      color 140ms ease;
  }

  .trail-overlay__stop:hover {
    background: rgba(255, 77, 79, 0.14);
    border-color: rgba(255, 77, 79, 0.92);
    color: #ffd5d5;
  }

  .trail-overlay__stop:active {
    transform: translateY(1px);
  }

  .trail-overlay__stop:focus-visible {
    outline: 2px solid #ff4d4f;
    outline-offset: 2px;
  }

  .trail-overlay__total {
    display: flex;
    align-items: baseline;
    gap: 7px;
    margin-top: 10px;
    max-height: 60px;
    transition:
      opacity 160ms ease,
      max-height 160ms ease,
      margin-top 160ms ease;
  }

  .trail-overlay__total [data-slot="sliding-number"] {
    font-size: 38px;
    font-weight: 800;
    line-height: 0.92;
    letter-spacing: -0.04em;
    color: #f2f4f6;
  }

  .trail-overlay__total > span:last-child {
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.02em;
    color: rgba(255, 138, 31, 0.88);
  }

  .trail-overlay__metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-top: 11px;
    max-height: 60px;
    transition:
      opacity 160ms ease,
      max-height 160ms ease,
      margin-top 160ms ease;
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
    color: rgba(242, 244, 246, 0.68);
  }

  .trail-overlay__metric [data-slot="sliding-number"] {
    color: #ff8a1f;
    font-size: 14px;
    font-weight: 760;
    letter-spacing: 0;
    font-variant-numeric: tabular-nums;
  }

  .trail-overlay__metric--error {
    border-color: rgba(255, 77, 79, 0.2);
  }

  .trail-overlay__metric--error [data-slot="sliding-number"] {
    color: #ff4d4f;
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
