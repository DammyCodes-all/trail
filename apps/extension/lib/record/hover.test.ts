import { describe, expect, it } from "vitest";
import { makeRearmGate } from "./hover";

describe("makeRearmGate", () => {
  it("allows the first hover of a key", () => {
    const gate = makeRearmGate(3000);
    expect(gate.allow("a#button#aria-haspopup", 1000)).toBe(true);
  });

  it("blocks a re-hover inside the rearm window", () => {
    const gate = makeRearmGate(3000);
    const key = "a#button#aria-haspopup";
    expect(gate.allow(key, 1000)).toBe(true);
    expect(gate.allow(key, 2500)).toBe(false);
    expect(gate.allow(key, 3999)).toBe(false);
  });

  it("re-arms after the window, regardless of which element shares the key", () => {
    const gate = makeRearmGate(3000);
    const key = "a#button#aria-haspopup";
    gate.allow(key, 1000);
    expect(gate.allow(key, 4000)).toBe(true);
    expect(gate.allow(key, 7000)).toBe(true);
  });

  it("tracks keys independently", () => {
    const gate = makeRearmGate(3000);
    gate.allow("menu#button#aria-haspopup", 1000);
    expect(gate.allow("nav#button#aria-haspopup", 1000)).toBe(true);
  });

  it("clear resets every key (the page-change signal)", () => {
    const gate = makeRearmGate(3000);
    const key = "a#button#aria-haspopup";
    gate.allow(key, 1000);
    gate.clear();
    expect(gate.allow(key, 1001)).toBe(true);
  });
});