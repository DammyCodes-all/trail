import { buildIssueUrl } from '../lib/github.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

// Mirrors the test-page interactions so the payload is realistic.
const sections = [
  {
    name: 'Steps to Reproduce',
    priority: 1,
    text: [
      '1. Navigate to http://localhost:8899/page1.html',
      '2. Click Submit',
      '3. Click Do XHR',
      '4. Type into email',
      '5. Navigate to http://localhost:8899/page2.html',
      '6. Click Pay now',
    ].join('\n'),
  },
  {
    name: 'Console Errors',
    priority: 2,
    text: [
      '- `error` at /page1.html: boom: price calc failed',
      '  Error: boom\n  at a (x.js:1:1)\n  at b (x.js:2:2)',
      '- `error` at /page2.html: simulated payment failure',
    ].join('\n'),
  },
  {
    name: 'Environment',
    priority: 3,
    text: '- User agent: Mozilla/5.0 (test)',
  },
  {
    name: 'Failed Requests',
    priority: 4,
    text: [
      '- GET /missing-xhr — 404',
      '- POST /fail — 500',
    ].join('\n'),
  },
];

const result = buildIssueUrl('acme/widget', 'Checkout crashes after typing email', sections);

const total = Buffer.byteLength(result.url);
console.log('url length (bytes):', total);
console.log('dropped sections:', result.dropped);
assert(total < 8192, `url must stay under GitHub's 414 threshold (got ${total})`);
assert(total <= 7600, `url must fit our own budget of 7600 (got ${total})`);
assert(!result.dropped.includes('Steps to Reproduce'), 'steps to reproduce must never drop');
assert(!result.dropped.includes('Console Errors'), 'first console error must never drop');
assert(result.url.includes('Checkout%20crashes'), 'title is prefilled');

// Oversized payload: low-priority sections must drop before anything important.
const bigSections = [
  ...sections,
  { name: 'Additional Logs', priority: 5, text: 'x'.repeat(12000) },
];
const big = buildIssueUrl('acme/widget', 't', bigSections);
assert(big.dropped.includes('Additional Logs'), 'low-priority logs should drop first when oversize');
assert(!big.dropped.includes('Steps to Reproduce'), 'steps survive even in the oversized case');

// Small report: nothing drops.
const tiny = buildIssueUrl('acme/widget', 't', sections.slice(0, 1));
assert(!tiny.dropped.length, 'a small report should drop nothing');

// Labels ride along in the URL and stay inside the budget.
const withLabels = buildIssueUrl('acme/widget', 't', sections, ['bug', 'ui']);
assert(withLabels.url.includes('labels='), 'labels param present');
assert(withLabels.url.includes('bug%2Cui'), 'labels are comma-joined and encoded');
assert(Buffer.byteLength(withLabels.url) <= 7600, `labels fit within the budget (got ${Buffer.byteLength(withLabels.url)})`);
const emptyLabels = buildIssueUrl('acme/widget', 't', sections, ['', '  ', null, 'bug']);
assert(emptyLabels.url.includes('labels=bug'), 'empty label entries are filtered');

console.log('SPIKE 4 PASS');
