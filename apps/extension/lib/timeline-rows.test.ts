import { describe, expect, it } from "vitest";
import {
  buildRows,
  dotFor,
  rowTime,
  toneFor,
  type GroupRow,
} from "./timeline-rows";
import type { TimelineStep } from "./timeline";

const step = (over: Partial<TimelineStep> & { t: number }): TimelineStep => ({
  kind: "click",
  text: "Click Go",
  ...over,
} as TimelineStep);

describe("toneFor", () => {
  it("treats console errors and critical network failures as errors", () => {
    expect(toneFor(step({ t: 0, kind: "console", level: "error" }))).toBe("error");
    expect(toneFor(step({ t: 0, kind: "net", status: 500 }))).toBe("error");
    expect(toneFor(step({ t: 0, kind: "net", status: 0 }))).toBe("error");
  });

  it("treats console warnings and client errors as warnings", () => {
    expect(toneFor(step({ t: 0, kind: "console", level: "warn" }))).toBe("warn");
    expect(toneFor(step({ t: 0, kind: "net", status: 404 }))).toBe("warn");
  });

  it("treats non-critical network steps as warnings", () => {
    expect(toneFor(step({ t: 0, kind: "net", status: 200 }))).toBe("warn");
    expect(toneFor(step({ t: 0, kind: "net", status: 301 }))).toBe("warn");
  });

  it("treats interactions as neutral", () => {
    expect(toneFor(step({ t: 0, kind: "click" }))).toBe("neutral");
    expect(toneFor(step({ t: 0, kind: "nav" }))).toBe("neutral");
    expect(toneFor(step({ t: 0, kind: "input" }))).toBe("neutral");
  });

  it("gives reporter flags their own distinct tone", () => {
    expect(toneFor(step({ t: 0, kind: "flag" }))).toBe("flag");
  });
});

describe("dotFor", () => {
  it("maps navigation to its own level and everything else to its tone", () => {
    expect(dotFor(step({ t: 0, kind: "nav" }))).toBe("nav");
    expect(dotFor(step({ t: 0, kind: "net", status: 500 }))).toBe("error");
    expect(dotFor(step({ t: 0, kind: "net", status: 404 }))).toBe("warn");
    expect(dotFor(step({ t: 0, kind: "click" }))).toBe("neutral");
    expect(dotFor(step({ t: 0, kind: "flag" }))).toBe("flag");
  });
});

describe("buildRows", () => {
  it("keeps navigation, console and network steps as landmarks", () => {
    const rows = buildRows([
      step({ t: 0, kind: "nav" }),
      step({ t: 1000, kind: "console", level: "warn" }),
      step({ t: 2000, kind: "net", status: 404 }),
    ]);
    expect(rows.every((row) => row.kind !== "group")).toBe(true);
  });

  it("keeps reporter flags as landmarks (never grouped)", () => {
    const rows = buildRows([
      step({ t: 0, kind: "flag", text: "Flag: it broke" }),
      step({ t: 500, kind: "flag", text: "Flag: it broke" }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.kind !== "group")).toBe(true);
  });

  it("groups consecutive identical clicks within GROUP_GAP", () => {
    const rows = buildRows([
      step({ t: 0, kind: "click", text: "Click Go" }),
      step({ t: 500, kind: "click", text: "Click Go" }),
      step({ t: 3000, kind: "click", text: "Click Go" }),
    ]);
    const first = rows[0] as GroupRow;
    expect(first.kind).toBe("group");
    expect(first.steps).toHaveLength(2);
    expect(first.start).toBe(0);
    expect(first.end).toBe(500);
    expect(rows[1] as GroupRow).toMatchObject({ kind: "group", steps: [{ t: 3000 }] });
  });

  it("does not merge different texts or kinds", () => {
    const rows = buildRows([
      step({ t: 0, kind: "click", text: "Click Go" }),
      step({ t: 500, kind: "click", text: "Click Stop" }),
      step({ t: 1000, kind: "input", text: "Type into name" }),
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ steps: [{ t: 0 }] });
  });

  it("keeps a lone interaction as a singleton group", () => {
    const [row] = buildRows([step({ t: 0, kind: "click" })]);
    expect(row).toMatchObject({ kind: "group", start: 0, end: 0, steps: [{ t: 0 }] });
  });
});

describe("rowTime", () => {
  it("uses the end of a group and the time of a plain step", () => {
    expect(rowTime({ t: 10, kind: "nav", text: "x" })).toBe(10);
    expect(rowTime({ kind: "group", steps: [step({ t: 0 })], start: 0, end: 500 })).toBe(500);
  });
});
