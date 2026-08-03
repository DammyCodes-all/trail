// Suggest the most likely GitHub repo for a report from the pages it visited.
// Pure URL heuristics — github.com/owner/repo pages (paths beyond the repo
// stripped) and GitHub Pages hosts (owner.github.io/repo). A suggestion, never
// a guarantee: returns null when nothing plausible is found.

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

// Sub-paths of a repo page that still identify the repo itself.
const REPO_PATHS = new Set([
  'tree', 'blob', 'issues', 'pull', 'pulls', 'releases', 'wiki', 'actions',
  'settings', 'labels', 'discussions', 'security', 'projects', 'milestones',
  'pulse', 'network', 'graphs', 'commits', 'branches', 'tags', 'compare',
  'code', 'watchers', 'forks', 'stars', 'issues2', 'copy', 'activity',
]);

const parseUrl = (u: string): { host: string; path: string } | null => {
  try {
    const parsed = new URL(u);
    return {
      host: parsed.host.toLowerCase(),
      path: parsed.pathname.replace(/^\/+/, '').replace(/\/+$/, ''),
    };
  } catch {
    return null;
  }
};

export function suggestRepo(urls: string[]): string | null {
  for (const u of urls) {
    const parsed = parseUrl(u);
    if (!parsed) continue;

    if (parsed.host === 'github.com' || parsed.host.endsWith('.github.com')) {
      const [owner, repo, ...rest] = parsed.path.split('/');
      if (!owner || !repo) continue;
      if (rest.length && !REPO_PATHS.has(rest[0]!)) continue;
      const candidate = `${owner}/${repo}`;
      if (REPO_RE.test(candidate)) return candidate;
      continue;
    }

    if (parsed.host.endsWith('.github.io')) {
      const owner = parsed.host.replace(/\.github\.io$/, '');
      const [repo] = parsed.path.split('/');
      if (!owner || !repo) continue;
      const candidate = `${owner}/${repo}`;
      if (REPO_RE.test(candidate)) return candidate;
    }
  }
  return null;
}
