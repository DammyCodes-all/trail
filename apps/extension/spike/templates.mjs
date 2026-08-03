import {
  detectTemplate,
  parseMarkdownTemplate,
  parseYamlTemplate,
  shapeSections,
} from '../lib/templates.ts';
import { buildIssueUrl } from '../lib/github.ts';
import { buildMarkdownFromSections } from '../lib/report.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

// GitHub's generated markdown template (bold-label style, like the real one).
const MD_TEMPLATE = `---
name: Bug report
about: Create a report to help us improve
title: ''
labels: ['bug']
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Desktop (please complete the following information):**
 - OS: [e.g. iOS]
 - Browser: [e.g. chrome, safari]

**Additional context**
Add any other context about the problem here.
`;

// GitHub's generated YAML issue form.
const YAML_TEMPLATE = `name: Bug Report
description: File a bug report
title: "[Bug]: "
labels: ["bug", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Also tell us, what did you expect to happen?
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      description: How do you trigger this bug?
  - type: dropdown
    id: browsers
    attributes:
      label: What browsers are you seeing the problem on?
      multiple: true
      options:
        - Firefox
        - Chrome
  - type: textarea
    id: logs
    attributes:
      label: Relevant log output
      description: Please copy and paste any relevant log output.
`;

const reportSections = [
  {
    name: 'Steps to Reproduce',
    priority: 1,
    text: ['1. Navigate to http://localhost:8899/page1.html', '2. Click Submit'].join('\n'),
  },
  {
    name: 'Console Errors',
    priority: 2,
    text: ['- `error` at /page1.html: boom: price calc failed', '- `error` at /page2.html: payment failure'].join('\n'),
  },
  {
    name: 'Environment',
    priority: 3,
    text: '- User agent: Mozilla/5.0 (test)',
  },
  {
    name: 'Failed Requests',
    priority: 4,
    text: '- GET /missing-xhr — 404',
  },
];

// ---- markdown parsing ----
const md = parseMarkdownTemplate(MD_TEMPLATE, 'bug_report.md');
assert(md !== null, 'markdown template parses');
assert(md.name === 'Bug report', 'frontmatter name is read');
assert(md.about.includes('improve'), 'frontmatter about is read');
const mdLabels = md.fields.map((f) => f.label);
assert(mdLabels.includes('To Reproduce'), 'bold label fields are parsed');
assert(mdLabels.includes('Desktop (please complete the following information):'), 'bold label with parens parses');
assert(mdLabels.includes('Additional context'), 'additional context field present');
console.log('markdown parse PASS');

// ---- yaml parsing ----
const yaml = parseYamlTemplate(YAML_TEMPLATE, 'bug_report.yaml');
assert(yaml !== null, 'yaml template parses');
assert(yaml.name === 'Bug Report', 'yaml frontmatter name is read');
const yamlLabels = yaml.fields.map((f) => f.label);
assert(yamlLabels.includes('What happened?'), 'textarea label parsed');
assert(yamlLabels.includes('Steps to reproduce'), 'steps label parsed');
assert(yamlLabels.includes('What browsers are you seeing the problem on?'), 'dropdown label parsed');
assert(!yamlLabels.some((l) => /Thanks for taking/.test(l)), 'markdown value blocks are not fields');
assert(yaml.fields.find((f) => f.label === 'What happened?')?.id === 'what-happened', 'field id parsed');
console.log('yaml parse PASS');

// ---- detection ----
const featureFile = { filename: 'feature_request.md', raw: MD_TEMPLATE.replace('Bug report', 'Feature request') };
const bugFile = { filename: 'bug_report.md', raw: MD_TEMPLATE };
const detected = detectTemplate([
  { filename: 'config.yml', raw: 'blank_issues_enabled: false' },
  featureFile,
  bugFile,
]);
assert(detected?.filename === 'bug_report.md', 'bug-report-ish template preferred over feature request');
assert(detectTemplate([featureFile])?.filename === 'feature_request.md', 'falls back to first file when none is bug-ish');
assert(detectTemplate([{ filename: 'config.yml', raw: 'x' }]) === null, 'config.yml alone yields no template');
console.log('detection PASS');

// ---- shaping (markdown) ----
const shaped = shapeSections(md, reportSections);
const byLabel = Object.fromEntries(shaped.sections.map((s) => [s.name, s.text]));
assert(shaped.sections.length === md.fields.length + 0, 'every template field is represented');
assert(byLabel['To Reproduce'].includes('Click Submit'), 'steps mapped into To Reproduce');
assert(byLabel['Desktop (please complete the following information):'].includes('User agent'), 'environment mapped into Desktop');
assert(byLabel['Expected behavior'] === '_No response_', 'unmatched field gets _No response_');
assert(byLabel['Additional context'].includes('Console Errors'), 'unmapped report sections appended under Additional context');
assert(byLabel['Additional context'].includes('GET /missing-xhr'), 'failed requests preserved under Additional context');
assert(byLabel['Additional context'].includes('boom: price calc failed'), 'console detail preserved');
assert(!byLabel['Additional context'].includes('Click Submit'), 'mapped steps not duplicated into Additional context');
const rendered = buildMarkdownFromSections('Checkout crash', shaped.sections);
assert(rendered.includes('**To Reproduce**\n\n'), 'markdown template style uses bold labels');
assert(rendered.includes('**Expected behavior**\n\n_No response_'), 'no-response field renders in template style');
console.log('markdown shaping PASS');

// ---- shaping (yaml) ----
const yShaped = shapeSections(yaml, reportSections);
const yByLabel = Object.fromEntries(yShaped.sections.map((s) => [s.name, s.text]));
assert(yByLabel['Steps to reproduce'].includes('Click Submit'), 'yaml steps field filled');
assert(yByLabel['Relevant log output'].includes('boom: price calc failed'), 'console errors mapped to log output field');
assert(yByLabel['What happened?'] === '_No response_', 'unmatched yaml field gets _No response_');
const yRendered = buildMarkdownFromSections('t', yShaped.sections);
assert(yRendered.includes('### Steps to reproduce\n\n'), 'yaml form style uses ### headings');
assert(yRendered.includes('### What happened?\n\n_No response_'), 'yaml no-response renders');
console.log('yaml shaping PASS');

// ---- shaped output still fits the URL budget ----
const url = buildIssueUrl('acme/widget', 'Checkout crash', shaped.sections);
assert(Buffer.byteLength(url.url) <= 7600, `shaped URL stays within budget (got ${Buffer.byteLength(url.url)})`);
assert(url.url.startsWith('https://github.com/acme/widget/issues/new'), 'shaped URL is still a github.com/issues/new URL');
assert(!url.dropped.includes('To Reproduce'), 'steps field survives the budget');
console.log('shaped URL fit PASS');

console.log('TEMPLATES SPIKE PASS');
