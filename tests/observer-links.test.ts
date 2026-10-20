/**
 * observer-links.test.ts
 *
 * The observer reads a wikilink the way lint does (Obsidian's rules): a link may carry an |alias or a #heading, and
 * [[#heading]] points inside the same page. Such links count as inbound links to their page and are never reported
 * as knowledge gaps.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildIncomingLinksMap, runObserver } from '../src/core/observer.js';
import { getVaultConfig, ensureVaultDirs } from '../src/core/vault.js';

const TEST_ROOT = join(process.cwd(), '.test-vault-observer-links');
const WIKI = join(TEST_ROOT, 'wiki');

vi.mock('../src/providers/index.js', () => {
  const provider = {
    name: 'mock',
    async chat() {
      return { content: 'NO_CONTRADICTION', model: 'mock', tokensUsed: { input: 1, output: 1 } };
    },
    async isAvailable() {
      return true;
    },
  };
  return {
    createProviderFromUserConfig: () => provider,
    createProvider: () => provider,
    createProviderChain: () => provider,
  };
});

function page(title: string, body: string): string {
  return `---\ntitle: "${title}"\ntype: page\n---\n\n# ${title}\n\n${body}\n`;
}

beforeEach(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
  mkdirSync(WIKI, { recursive: true });
  mkdirSync(join(TEST_ROOT, 'raw'), { recursive: true });
  writeFileSync(join(TEST_ROOT, 'AGENTS.md'), '# Wiki Schema\n', 'utf-8');
  writeFileSync(join(WIKI, 'alpha.md'), page('Alpha', 'The first page.\n\n## Intro\n\nWhere it starts.'), 'utf-8');
  writeFileSync(join(WIKI, 'Gamma.md'), page('The Third Page', 'Named by its file.'), 'utf-8');
  writeFileSync(
    join(WIKI, 'beta.md'),
    page(
      'Beta',
      'See [[Alpha|the first page]], its [[alpha#Intro]], [[gamma]], [[#Notes]] below, and [[Missing Topic|a gap]].\n\n## Notes\n\nMore.',
    ),
    'utf-8',
  );
});

afterEach(() => {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true, force: true });
});

describe('Observer: wikilinks with an alias or a heading', () => {
  it('counts [[Alpha|alias]] and [[alpha#Intro]] as inbound links to alpha, and [[gamma]] to Gamma.md', () => {
    const incoming = buildIncomingLinksMap(['alpha.md', 'beta.md', 'Gamma.md'].map((f) => join(WIKI, f)));
    expect(incoming.get('alpha')).toBe(2);
    expect(incoming.get('Gamma')).toBe(1);
  });

  it('reports only the page that does not exist as a gap, by its name without the alias', async () => {
    const config = getVaultConfig(TEST_ROOT);
    ensureVaultDirs(config);
    const report = await runObserver(config, { maxBudget: 0, autoImprove: false });
    expect(report.gaps.map((g) => g.mentionedTopic)).toEqual(['Missing Topic']);
  });
});
