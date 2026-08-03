import { suggestRepo } from '../lib/repo.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

// github.com repo pages, with and without extra path segments.
assert(suggestRepo(['https://github.com/acme/widget']) === 'acme/widget', 'plain repo page');
assert(suggestRepo(['https://github.com/acme/widget/tree/main']) === 'acme/widget', 'tree path stripped');
assert(suggestRepo(['https://github.com/acme/widget/blob/main/src/x.ts']) === 'acme/widget', 'blob path stripped');
assert(suggestRepo(['https://github.com/acme/widget/issues/12']) === 'acme/widget', 'issues path stripped');
assert(suggestRepo(['https://www.github.com/acme/widget']) === 'acme/widget', 'www subdomain');
assert(suggestRepo(['https://github.com/acme/widget-name_2.x']) === 'acme/widget-name_2.x', 'dotted/underscored repo names');

// Non-repo and invalid inputs.
assert(suggestRepo(['https://github.com/acme']) === null, 'user profile is not a repo');
assert(suggestRepo(['https://github.com/']) === null, 'bare github.com');
assert(suggestRepo(['http://localhost:8899/page1.html', 'https://example.com/']) === null, 'non-github pages');
assert(suggestRepo([]) === null, 'no urls');
assert(suggestRepo(['not a url']) === null, 'unparseable urls');

// GitHub Pages.
assert(suggestRepo(['https://alice.github.io/app']) === 'alice/app', 'github.io with repo');
assert(suggestRepo(['https://alice.github.io/']) === null, 'github.io without repo');
assert(suggestRepo(['https://alice.github.io/docs/guide']) === 'alice/docs', 'first path segment as repo');

// First plausible match wins; a later unrelated page doesn't override it.
assert(
  suggestRepo(['http://localhost:8899/page1.html', 'https://github.com/acme/widget', 'https://example.com/']) === 'acme/widget',
  'first matching page wins',
);

console.log('REPO SPIKE PASS');
