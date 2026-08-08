import {
  filterRepoHistory,
  normalizeRepo,
  pushRepoHistory,
  REPO_HISTORY_LIMIT,
} from '../lib/repo.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

// normalizeRepo: full links, shorthand, garbage.
assert(normalizeRepo('https://github.com/acme/widget/issues/3') === 'acme/widget', 'full issue link');
assert(normalizeRepo('https://github.com/acme/widget') === 'acme/widget', 'full repo link');
assert(normalizeRepo('https://www.github.com/acme/widget') === 'acme/widget', 'www host');
assert(normalizeRepo('acme/widget') === 'acme/widget', 'bare owner/repo');
assert(normalizeRepo('github.com/acme/widget') === 'acme/widget', 'github.com shorthand');
assert(normalizeRepo('acme/widget.git') === 'acme/widget', 'trailing .git');
assert(normalizeRepo('https://example.com/acme/widget') === 'https://example.com/acme/widget', 'non-github link untouched');
assert(normalizeRepo('') === '', 'empty untouched');
assert(normalizeRepo('not a repo') === 'not a repo', 'garbage untouched');

// pushRepoHistory: dedupe, order, cap, validation.
assert(
  JSON.stringify(pushRepoHistory([], 'Acme/Widget')) === JSON.stringify(['acme/widget']),
  'normalized on push',
);
assert(
  JSON.stringify(pushRepoHistory(['acme/widget', 'other/app'], 'acme/widget')) ===
    JSON.stringify(['acme/widget', 'other/app']),
  're-pushing a known repo does not duplicate',
);
assert(
  JSON.stringify(pushRepoHistory(['acme/widget'], 'ACME/Widget')) ===
    JSON.stringify(['acme/widget']),
  'case-insensitive dedupe',
);
assert(
  JSON.stringify(pushRepoHistory(['other/app'], 'acme/widget')) ===
    JSON.stringify(['acme/widget', 'other/app']),
  'most recent first',
);
assert(
  pushRepoHistory([], 'not a repo').length === 0,
  'unrecognized repo rejected',
);
const big = Array.from({ length: REPO_HISTORY_LIMIT }, (_, i) => `r${i}/app`);
assert(pushRepoHistory(big, 'new/app').length === REPO_HISTORY_LIMIT, 'capped at limit');
assert(
  JSON.stringify(pushRepoHistory(big, 'new/app')) ===
    JSON.stringify(['new/app', 'r0/app', 'r1/app', 'r2/app', 'r3/app', 'r4/app', 'r5/app', 'r6/app', 'r7/app', 'r8/app']),
  'newest pushed in, oldest dropped',
);

// filterRepoHistory: substring, case-insensitive, empty query = everything.
const hist = ['acme/widget', 'acme/other', 'other/app'];
assert(
  JSON.stringify(filterRepoHistory(hist, 'acme')) === JSON.stringify(['acme/widget', 'acme/other']),
  'substring match keeps history order',
);
assert(
  JSON.stringify(filterRepoHistory(hist, 'WIDGET')) === JSON.stringify(['acme/widget']),
  'case-insensitive query',
);
assert(
  JSON.stringify(filterRepoHistory(hist, 'zzz')) === JSON.stringify([]),
  'no matches',
);
assert(
  JSON.stringify(filterRepoHistory(hist, '')) === JSON.stringify(hist),
  'empty query returns all',
);

console.log('REPO SPIKE PASS');
