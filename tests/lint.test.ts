import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { lintWiki, type LintResult } from '../src/core/lint.js';
import { writeWikiPage, getVaultConfig } from '../src/core/vault.js';
import type { LLMProvider } from '../src/providers/types.js';

const TEST_ROOT = join(process.cwd(), '.test-vault-lint');

function cleanup(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

// Stub provider — lint doesn't use the LLM for basic checks
const stubProvider: LLMProvider = {
  name: 'stub',
  async chat() {
    return { content: '', model: 'stub', tokensUsed: { input: 0, output: 0 } };
  },
  async isAvailable() {
    return true;
  },
};

describe('lint', () => {
  beforeEach(() => {
    cleanup();
    mkdirSync(join(TEST_ROOT, 'wiki'), { recursive: true });
    mkdirSync(join(TEST_ROOT, 'raw'), { recursive: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('returns score 0 with empty message for empty wiki', async () => {
    const config = getVaultConfig(TEST_ROOT);
    const result = await lintWiki(config, stubProvider, { fix: false });
    expect(result.score).toBe(0);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]!.category).toBe('empty');
    expect(result.issues[0]!.message).toContain('no pages');
  });

  it('detects orphan pages', async () => {
    const config = getVaultConfig(TEST_ROOT);
    // Page with no inbound links
    writeWikiPage(join(config.wikiDir, 'orphan.md'), 'Content here.', {
      title: 'Orphan',
      summary: 'An orphan page',
    });

    const result = await lintWiki(config, stubProvider, { fix: false });
    const orphanIssues = result.issues.filter((i) => i.category === 'orphan');
    expect(orphanIssues).toHaveLength(1);
    expect(orphanIssues[0]!.message).toContain('Orphan');
  });

  it('does not flag index or log as orphans', async () => {
    const config = getVaultConfig(TEST_ROOT);
    writeWikiPage(join(config.wikiDir, 'index.md'), 'The index page.', {
      title: 'index',
      summary: 'Index',
    });
    writeWikiPage(join(config.wikiDir, 'log.md'), 'The log page.', {
      title: 'log',
      summary: 'Log',
    });

    const result = await lintWiki(config, stubProvider, { fix: false });
    const orphanIssues = result.issues.filter((i) => i.category === 'orphan');
    expect(orphanIssues).toHaveLength(0);
  });

  it('detects broken wikilinks', async () => {
    const config = getVaultConfig(TEST_ROOT);
    writeWikiPage(join(config.wikiDir, 'page-a.md'), 'Links to [[NonExistent]] page.', {
      title: 'PageA',
      summary: 'A page',
    });

    const result = await lintWiki(config, stubProvider, { fix: false });
    const brokenLinks = result.issues.filter((i) => i.category === 'missing-link');
    expect(brokenLinks).toHaveLength(1);
    expect(brokenLinks[0]!.message).toContain('NonExistent');
  });

  it('does not flag valid wikilinks as broken', async () => {
    const config = getVaultConfig(TEST_ROOT);
    writeWikiPage(join(config.wikiDir, 'page-a.md'), 'Links to [[PageB]].', {
      title: 'PageA',
      summary: 'A page',
    });
    writeWikiPage(join(config.wikiDir, 'page-b.md'), 'Target page content here.', {
      title: 'PageB',
      summary: 'B page',
    });

    const result = await lintWiki(config, stubProvider, { fix: false });
    const brokenLinks = result.issues.filter((i) => i.category === 'missing-link');
    expect(brokenLinks).toHaveLength(0);
  });

  it('detects empty pages (< 10 words)', async () => {
    const config = getVaultConfig(TEST_ROOT);
    writeWikiPage(join(config.wikiDir, 'tiny.md'), 'Short.', {
      title: 'Tiny',
      summary: 'A tiny page',
    });

    const result = await lintWiki(config, stubProvider, { fix: false });
    const emptyIssues = result.issues.filter(
      (i) => i.category === 'empty' && i.message.includes('nearly empty'),
    );
    expect(emptyIssues).toHaveLength(1);
    expect(emptyIssues[0]!.message).toContain('Tiny');
  });

  it('detects missing frontmatter summary', async () => {
    const config = getVaultConfig(TEST_ROOT);
    // Write a page without the 'summary' field
    writeWikiPage(
      join(config.wikiDir, 'no-summary.md'),
      'This page has plenty of words to avoid the empty check for content validation.',
      { title: 'NoSummary', type: 'concepts' },
    );

    const result = await lintWiki(config, stubProvider, { fix: false });
    const noSummary = result.issues.filter((i) => i.category === 'no-summary');
    expect(noSummary).toHaveLength(1);
    expect(noSummary[0]!.message).toContain('NoSummary');
  });

  it('returns high score for well-linked vault', async () => {
    const config = getVaultConfig(TEST_ROOT);
    // Two pages that link to each other with summaries
    writeWikiPage(join(config.wikiDir, 'alpha.md'), 'Alpha links to [[Beta]] for more details about the topic.', {
      title: 'Alpha',
      summary: 'Alpha page',
    });
    writeWikiPage(join(config.wikiDir, 'beta.md'), 'Beta links to [[Alpha]] for background information about it.', {
      title: 'Beta',
      summary: 'Beta page',
    });

    const result = await lintWiki(config, stubProvider, { fix: false });
    // Both pages link to each other, both have summaries, both have >10 words
    // Issues should be minimal
    expect(result.score).toBeGreaterThanOrEqual(50);
    const orphanIssues = result.issues.filter((i) => i.category === 'orphan');
    expect(orphanIssues).toHaveLength(0);
    const brokenIssues = result.issues.filter((i) => i.category === 'missing-link');
    expect(brokenIssues).toHaveLength(0);
  });

  it('score is between 0 and 100', async () => {
    const config = getVaultConfig(TEST_ROOT);
    writeWikiPage(join(config.wikiDir, 'page.md'), 'Some content for the page to have words.', {
      title: 'Page',
      summary: 'A page',
    });

    const result = await lintWiki(config, stubProvider, { fix: false });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
