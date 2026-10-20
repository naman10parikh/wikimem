/**
 * wikilinks.test.ts
 *
 * Every view that follows wikilinks reads them the way lint does (Obsidian's rules): a link names a page by its title
 * or its file name, in any case, may carry an |alias or a #heading, and [[#heading]] points inside the same page.
 * Covered here: the vault stats, the web graph, the Obsidian graph hint and the graph at a git commit.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getVaultConfig, getVaultStats } from '../src/core/vault.js';
import { buildGraph } from '../src/web/server.js';
import { generateGraphHint } from '../src/core/obsidian.js';
import { getGraphAtCommit } from '../src/core/git.js';

const TEST_ROOT = join(process.cwd(), '.test-vault-wikilinks');
const WIKI = join(TEST_ROOT, 'wiki');

function page(title: string, body: string): string {
  return `---\ntitle: "${title}"\ntype: page\n---\n\n# ${title}\n\n${body}\n`;
}

beforeEach(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
  mkdirSync(WIKI, { recursive: true });
  mkdirSync(join(TEST_ROOT, 'raw'), { recursive: true });
  writeFileSync(join(WIKI, 'alpha.md'), page('Alpha', 'The first page.\n\n## Intro\n\nWhere it starts.'), 'utf-8');
  writeFileSync(join(WIKI, 'Gamma.md'), page('The Third Page', 'Named by its file.'), 'utf-8');
  writeFileSync(
    join(WIKI, 'beta.md'),
    page('Beta', 'See [[Alpha|the first page]], [[gamma#Top]] and [[#Notes]] below.\n\n## Notes\n\nMore. Back to [[beta]].'),
    'utf-8',
  );
  writeFileSync(join(WIKI, 'delta.md'), page('Delta', 'Links to [[Beta]].'), 'utf-8');
});

afterEach(() => {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true, force: true });
});

const targetsFrom = (links: Array<{ source: string; target: string }>, source: string): string[] =>
  links.filter((l) => l.source === source).map((l) => l.target).sort();

describe('wikilinks with an alias, a heading or a file name in another case', () => {
  it('the vault stats count only the page nothing links to (delta) as an orphan', () => {
    expect(getVaultStats(getVaultConfig(TEST_ROOT)).orphanPages).toBe(1);
  });

  it('the web graph draws an edge for each of them', () => {
    expect(targetsFrom(buildGraph(getVaultConfig(TEST_ROOT)).links, 'beta')).toEqual(['Gamma', 'alpha']);
  });

  it('the Obsidian graph hint keeps the page name and drops the alias, the heading and the same-page link', () => {
    const hint = generateGraphHint(getVaultConfig(TEST_ROOT));
    expect(hint.edges.filter((e) => e.source === 'Beta').map((e) => e.target).sort()).toEqual(['Alpha', 'beta', 'gamma']);
  });

  it('the graph at a git commit draws an edge for each of them', async () => {
    const git = (...args: string[]) => execFileSync('git', args, { cwd: TEST_ROOT, stdio: 'pipe' }).toString().trim();
    git('init', '-q');
    git('add', '-A');
    git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '-m', 'pages');
    const graph = await getGraphAtCommit(TEST_ROOT, git('rev-parse', 'HEAD'));
    expect(targetsFrom(graph.links, 'beta')).toEqual(['Gamma', 'alpha']);
  });
});
