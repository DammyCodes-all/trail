import { describe, expect, it } from "vitest";
import { buildIssueUrl } from "./github";
import type { ReportSection } from "./report";

const links = {
  replayUrl: "https://trail.example/r/replay-123",
  landingUrl: "https://trail.example/",
};

const sections: ReportSection[] = [
  { name: "Steps to Reproduce", text: "1. Click submit", priority: 1 },
  { name: "Environment", text: "Browser: Chromium", priority: 10 },
];

function bodyOf(url: string): string {
  return decodeURIComponent(new URL(url).searchParams.get("body") ?? "");
}

describe("buildIssueUrl", () => {
  it("places the replay callout first and the TRAIL attribution last", () => {
    const body = bodyOf(buildIssueUrl("acme/widget", "Broken submit", sections, [], links).url);

    expect(body.indexOf("> **Replay:**")).toBeLessThan(
      body.indexOf("Steps to Reproduce"),
    );
    expect(body).toContain(links.replayUrl);
    expect(body).toContain(`[TRAIL](${links.landingUrl})`);
    expect(body.endsWith(`(${links.replayUrl})</sub>`)).toBe(true);
  });

  it("keeps the attribution when low-priority sections are dropped", () => {
    const largeSections: ReportSection[] = [
      ...sections,
      ...Array.from({ length: 5 }, (_, index) => ({
        name: `Large section ${index}`,
        text: "x".repeat(2_000),
        priority: 20 + index,
      })),
    ];
    const result = buildIssueUrl("acme/widget", "Broken submit", largeSections, [], links);
    const body = bodyOf(result.url);

    expect(result.dropped.length).toBeGreaterThan(0);
    expect(body).toContain(links.replayUrl);
    expect(body).toContain(`[TRAIL](${links.landingUrl})`);
  });

  it("keeps the TRAIL attribution without a replay link", () => {
    const body = bodyOf(
      buildIssueUrl("acme/widget", "Broken submit", sections, [], {
        landingUrl: links.landingUrl,
      }).url,
    );

    expect(body).toContain(`[TRAIL](${links.landingUrl})`);
    expect(body).not.toContain("> **Replay:**");
    expect(body).not.toContain("View replay");
  });
});
