import { describe, expect, it } from "vitest";
import {
  detectParsed,
  parseMarkdownTemplate,
  parseYamlTemplate,
  type IssueTemplate,
} from "./templates";

// Rocket.Chat-style markdown template: `### Label:` H3 headings, an H1 title
// (excluded — it is the issue title, not a field) and a commented-out section
// that must not surface as a phantom field.
const RC_BUG_REPORT = `---
name: Bug report
about: Create a report to help us improve
---

### Description:

A clear and concise description of what the bug is.

### Steps to reproduce:

1. Go to '...'
2. Click on '....'

### Expected behavior:

What you expect to happen

### Actual behavior:

What actually happens

<!--
### Logged-out users
Sometimes commented-out sections are kept around for later.
-->

### Additional context

Add any other context about the problem here.
`;

describe("parseMarkdownTemplate", () => {
  it("parses H3 headings (Rocket.Chat style)", () => {
    const t = parseMarkdownTemplate(RC_BUG_REPORT, "bug_report.md");
    expect(t).not.toBeNull();
    expect(t?.fields.map((f) => f.label)).toEqual([
      "Description:",
      "Steps to reproduce:",
      "Expected behavior:",
      "Actual behavior:",
      "Additional context",
    ]);
    expect(t?.fields[1]?.id).toBe("steps-to-reproduce");
  });

  it("excludes an H1 title from the fields", () => {
    const t = parseMarkdownTemplate(
      `# Release {version}\n\n## Final Release - On the 27th\n- [ ] Do a thing\n\n## After Release - Conclusion\n- [ ] Close issues\n`,
      "release.md",
    );
    expect(t?.fields.map((f) => f.label)).toEqual([
      "Final Release - On the 27th",
      "After Release - Conclusion",
    ]);
  });

  it("does not turn commented-out headings into fields", () => {
    const t = parseMarkdownTemplate(
      `<!-- ## Release Candidate {release-candidate-version} - On the {day} -->\n\n## Final Release - On the 27th\n- [ ] Do a thing\n`,
      "release.md",
    );
    expect(t?.fields.map((f) => f.label)).toEqual(["Final Release - On the 27th"]);
  });

  it("still parses standalone bold labels", () => {
    const t = parseMarkdownTemplate(
      `**Describe the bug**\n\nA clear description.\n\n**To Reproduce**\n\nSteps.\n`,
      "bug_report.md",
    );
    expect(t?.fields.map((f) => f.label)).toEqual([
      "Describe the bug",
      "To Reproduce",
    ]);
  });

  it("returns null when no field headings are present", () => {
    expect(parseMarkdownTemplate(`Just a paragraph.\n`, "notes.md")).toBeNull();
  });
});

describe("detectParsed", () => {
  const release: IssueTemplate = {
    kind: "markdown",
    filename: "release.md",
    name: "Release",
    about: "Internal release checklist template",
    fields: [{ id: "before-release", label: "Before Release - Preparation" }],
  };

  it("picks the bug report when both parse (Rocket.Chat case)", () => {
    const bug = parseMarkdownTemplate(RC_BUG_REPORT, "bug_report.md");
    expect(bug).not.toBeNull();
    const out = detectParsed([release, bug!]);
    expect(out?.filename).toBe("bug_report.md");
  });

  it("picks the first file when nothing is bug-ish", () => {
    const other: IssueTemplate = {
      kind: "markdown",
      filename: "feature_request.md",
      name: "Feature request",
      fields: [{ id: "summary", label: "Summary" }],
    };
    expect(detectParsed([other, release])?.filename).toBe("feature_request.md");
  });

  it("returns null for an empty list", () => {
    expect(detectParsed([])).toBeNull();
  });
});

describe("parseYamlTemplate", () => {
  it("still parses a YAML issue form", () => {
    const t = parseYamlTemplate(
      `name: Bug Report
body:
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
`,
      "bug_report.yaml",
    );
    expect(t?.fields.map((f) => f.label)).toEqual([
      "What happened?",
      "Steps to reproduce",
    ]);
  });
});
