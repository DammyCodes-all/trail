import { buildIssueUrl, sectionsFromEvents } from '../lib/github.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

const chunks = (n, k) =>
  Array.from({ length: n }, (_, i) => ({
    k,
    t: Date.now(),
    url: `http://localhost:8899/page${(i % 3) + 1}.html`,
    seq: i,
    ...(k === 'console'
      ? { lv: 'error', msg: `boom #${i}`, stack: `TypeError: boom #${i}\n    at a (file.js:${i}:1)\n    at b (file.js:${i}:2)` }
      : k === 'net'
        ? { target: `/api/thing-${i}`, method: 'POST', status: 500, via: 'fetch' }
        : {}),
  }));

const makeSections = () => [
  {
    name: 'Steps to Reproduce',
    priority: 1,
    text: Array.from({ length: 12 }, (_, i) => `${i + 1}. Type a@b.com into Email, then click **Submit**.`).join('\n'),
  },
  ...sectionsFromEvents([
    ...chunks(8, 'console'),
    ...chunks(40, 'net'),
  ]),
  {
    name: 'Additional Logs',
    priority: 5,
    text: 'x'.repeat(6000),
  },
];

const sections = makeSections();
const result = buildIssueUrl('acme/widget', 'Checkout crashes after typing email', sections);

const total = Buffer.byteLength(result.url);
console.log('url length (bytes):', total);
console.log('dropped sections:', result.dropped);
assert(total < 8192, `url must stay under GitHub's 414 threshold (got ${total})`);
assert(total <= 7600, `url must fit our own budget of 7600 (got ${total})`);
assert(!result.dropped.includes('Steps to Reproduce'), 'steps to reproduce must never drop');
assert(!result.dropped.includes('Console Errors'), 'first console error must never drop');
assert(result.dropped.includes('Additional Logs'), 'low-priority logs should drop first when oversize');

const tiny = buildIssueUrl('acme/widget', 't', sections.slice(0, 2));
assert(!tiny.dropped.length, 'a small report should drop nothing');
assert(tiny.url.length < 8192, 'small url stays short');

console.log('SPIKE 4 PASS');
