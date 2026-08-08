import { describe, expect, it } from "vitest";
import { isNoisyConsole, NOISY_CONSOLE } from "./noise";

const KATEX_WARN =
  "LaTeX-incompatible input and strict mode is set to 'warn': In LaTeX, \\ or \\newline does nothing in display mode [newLineInDisplayMode]";

describe("isNoisyConsole", () => {
  it("drops the KaTeX strict-mode warning the reporter hit", () => {
    expect(isNoisyConsole(KATEX_WARN)).toBe(true);
  });

  it("drops MathJax warnings", () => {
    expect(isNoisyConsole("MathJax doesn't support environment 'foo'")).toBe(
      true,
    );
  });

  it("drops devtools source-map load failures", () => {
    expect(
      isNoisyConsole(
        "DevTools failed to load source map: https://cdn.acme.com/app.js.map",
      ),
    ).toBe(true);
  });

  it("keeps ordinary warnings and errors", () => {
    expect(isNoisyConsole("boom: price calc failed")).toBe(false);
    expect(isNoisyConsole("Each child in a list needs a unique key")).toBe(
      false,
    );
    expect(isNoisyConsole("Unhandled rejection: TypeError: x is undefined")).toBe(
      false,
    );
  });

  it("keeps messages that merely share a word with a pattern", () => {
    expect(isNoisyConsole("parser error in math mode")).toBe(false);
    expect(isNoisyConsole("source map parser crashed")).toBe(false);
  });

  it("keeps a curated list that is all real patterns", () => {
    expect(NOISY_CONSOLE.length).toBeGreaterThan(0);
    for (const p of NOISY_CONSOLE) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.test.flags).toContain("i");
    }
  });
});
