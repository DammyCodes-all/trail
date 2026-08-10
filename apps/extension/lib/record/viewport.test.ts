import { describe, expect, it } from "vitest";
import { isMaterialResize } from "./viewport";

describe("isMaterialResize", () => {
  it("skips jitter: under the delta on both axes", () => {
    expect(isMaterialResize(1280, 720, 1278, 715)).toBe(false);
    expect(isMaterialResize(1280, 720, 1280, 720)).toBe(false);
    expect(isMaterialResize(1280, 720, 1290, 750)).toBe(false);
  });

  it("fires on a width change of 50px or more", () => {
    expect(isMaterialResize(1280, 720, 1230, 720)).toBe(true);
    expect(isMaterialResize(1280, 720, 1330, 720)).toBe(true);
  });

  it("fires on a height change of 50px or more", () => {
    expect(isMaterialResize(1280, 720, 1280, 670)).toBe(true);
    expect(isMaterialResize(1280, 720, 1280, 820)).toBe(true);
  });

  it("fires when only one axis moved (devtools side-dock)", () => {
    expect(isMaterialResize(1280, 720, 960, 720)).toBe(true);
  });

  it("fires when both axes move materially", () => {
    expect(isMaterialResize(1920, 1080, 375, 812)).toBe(true);
  });
});