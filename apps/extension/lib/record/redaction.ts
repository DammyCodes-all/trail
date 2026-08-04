// Redaction policy, shared by the event metadata recorder and the rrweb visual
// recorder. Capture-time only: anything not masked here is visible in replay.

const SENSITIVE =
  /pass|pwd|secret|token|otp|cvv|ssn|card|auth|api[-_]?key/i;

// An input's typed value must not be recorded when the user chose auto-redact,
// when it is a password, or when its identity looks sensitive.
export const shouldMaskInput = (
  el: HTMLInputElement,
  autoRedact: boolean,
): boolean =>
  autoRedact ||
  el.type === "password" ||
  SENSITIVE.test(
    el.name + el.id + (el.getAttribute("autocomplete") ?? ""),
  );

export const MASKED_PLACEHOLDER = "•".repeat(8);

// Free-text inputs mask in the visual replay (rrweb) when redact is on.
// color/range/select are excluded: their values are choices, not typed secrets.
const MASKED_FREE_TEXT = {
  text: true,
  email: true,
  search: true,
  tel: true,
  url: true,
  number: true,
  date: true,
  "datetime-local": true,
  month: true,
  week: true,
  time: true,
  textarea: true,
} as const;

// rrweb's masking options are fixed per recording; `redact` is read at start.
export const maskInputs = (redact: boolean) => ({
  ...(redact ? MASKED_FREE_TEXT : {}),
  password: true, // always, even when redact is off
});
