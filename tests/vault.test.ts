import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  readWikiPage,
  writeWikiPage,
  extractWikilinks,
  getVaultStats,
  slugify,
  toWikilink,
  listWikiPages,
  getVaultConfig,
  ensureVaultDirs,
} from '../src/core/vault.js';

const TEST_ROOT = join(process.cwd(), '.test-vault-unit');

function cleanup(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

describe('vault', () => {
  beforeEach(() => {
    cleanup();
    mkdirSync(join(TEST_ROOT, 'wiki'), { recursive: true });
    mkdirSync(join(TEST_ROOT, 'raw'), { recursive: true });
  });

  afterEach(() => {
    cleanup();
  });

  describe('slugify', () => {
    it('lowercases and replaces spaces with dashes', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(slugify('Hello! @World #2024')).toBe('hello-world-2024');
    });

    it('strips leading and trailing dashes', () => {
      expect(slugify('--hello--')).toBe('hello');
    });

    it('handles empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('collapses multiple separators', () => {
      expect(slugify('a   b   c')).toBe('a-b-c');
    });
  });

  describe('toWikilink', () => {
    it('wraps title in double brackets', () => {
      expect(toWikilink('My Page')).toBe('[[My Page]]');
    });
  });

  describe('extractWikilinks', () => {
    it('extracts single wikilink', () => {
      expect(extractWikilinks('See [[PageA]] for details.')).toEqual(['PageA']);
    });

    it('extracts multiple wikilinks', () => {
      const links = extractWikilinks('See [[PageA]] and [[PageB]] and [[PageC]].');
      expect(links).toEqual(['PageA', 'PageB', 'PageC']);
    });

    it('deduplicates wikilinks', () => {
      const links = extractWikilinks('See [[PageA]] and [[PageA]] again.');
      expect(links).toEqual(['PageA']);
    });

    it('returns empty array for no wikilinks', () => {
      expect(extractWikilinks('No links here.')).toEqual([]);
    });

    it('handles wikilinks with spaces', () => {
      expect(extractWikilinks('[[My Long Page Name]]')).toEqual(['My Long Page Name']);
    });

    it('does not match single brackets', () => {
      expect(extractWikilinks('[not a link]')).toEqual([]);
    });

    it('does not match empty brackets', () => {
      expect(extractWikilinks('[[]]')).toEqual([]);
    });
  });

  describe('writeWikiPage + readWikiPage', () => {
    it('round-trips content and frontmatter', () => {
      const pagePath = join(TEST_ROOT, 'wiki', 'test-page.md');
      const frontmatter = {
        title: 'Test Page',
        type: 'concepts',
        tags: ['ai', 'test'],
        created: '2026-01-01',
        updated: '2026-01-01',
      };
      const content = 'This is a test page about [[AI]] and [[Machine Learning]].';

      writeWikiPage(pagePath, content, frontmatter);
      const page = readWikiPage(pagePath);

      expect(page.title).toBe('Test Page');
      expect(page.frontmatter['type']).toBe('concepts');
      expect(page.frontmatter['tags']).toEqual(['ai', 'test']);
      expect(page.content).toContain('test page about');
      expect(page.wikilinks).toEqual(['AI', 'Machine Learning']);
      expect(page.wordCount).toBeGreaterThan(0);
    });

    it('creates parent directories if missing', () => {
      const pagePath = join(TEST_ROOT, 'wiki', 'deep', 'nested', 'page.md');
      writeWikiPage(pagePath, 'Hello', { title: 'Nested' });
      const page = readWikiPage(pagePath);
      expect(page.title).toBe('Nested');
    });

    it('uses filename as fallback title when frontmatter has no title', () => {
      const pagePath = join(TEST_ROOT, 'wiki', 'fallback-title.md');
      writeFileSync(pagePath, '---\ntype: test\n---\n\nNo title in frontmatter.', 'utf-8');
      const page = readWikiPage(pagePath);
      expect(page.title).toBe('fallback-title');
    });
  });

  describe('listWikiPages', () => {
    it('returns all .md files recursively', () => {
      const wikiDir = join(TEST_ROOT, 'wiki');
      writeFileSync(join(wikiDir, 'page1.md'), '---\ntitle: P1\n---\nHello', 'utf-8');
      mkdirSync(join(wikiDir, 'sub'), { recursive: true });
      writeFileSync(join(wikiDir, 'sub', 'page2.md'), '---\ntitle: P2\n---\nWorld', 'utf-8');

      const pages = listWikiPages(wikiDir);
      expect(pages).toHaveLength(2);
      expect(pages.some((p) => p.endsWith('page1.md'))).toBe(true);
      expect(pages.some((p) => p.endsWith('page2.md'))).toBe(true);
    });

    it('returns empty array for missing directory', () => {
      expect(listWikiPages(join(TEST_ROOT, 'nonexistent'))).toEqual([]);
    });

    it('ignores non-md files', () => {
      const wikiDir = join(TEST_ROOT, 'wiki');
      writeFileSync(join(wikiDir, 'page.md'), '---\ntitle: P\n---\nContent', 'utf-8');
      writeFileSync(join(wikiDir, 'image.png'), 'binary', 'utf-8');
      writeFileSync(join(wikiDir, 'notes.txt'), 'text', 'utf-8');

      const pages = listWikiPages(wikiDir);
      expect(pages).toHaveLength(1);
      expect(pages[0]).toContain('page.md');
    });
  });

  describe('getVaultConfig', () => {
    it('returns correct paths', () => {
      const config = getVaultConfig(TEST_ROOT);
      expect(config.root).toBe(TEST_ROOT);
      expect(config.rawDir).toBe(join(TEST_ROOT, 'raw'));
      expect(config.wikiDir).toBe(join(TEST_ROOT, 'wiki'));
      expect(config.schemaPath).toBe(join(TEST_ROOT, 'AGENTS.md'));
      expect(config.indexPath).toBe(join(TEST_ROOT, 'wiki', 'index.md'));
      expect(config.logPath).toBe(join(TEST_ROOT, 'wiki', 'log.md'));
      expect(config.configPath).toBe(join(TEST_ROOT, 'config.yaml'));
    });
  });

  describe('ensureVaultDirs', () => {
    it('creates raw and wiki dirs', () => {
      const freshRoot = join(TEST_ROOT, 'fresh');
      const config = getVaultConfig(freshRoot);
      ensureVaultDirs(config);
      expect(existsSync(config.rawDir)).toBe(true);
      expect(existsSync(config.wikiDir)).toBe(true);
    });

    it('does not fail if dirs already exist', () => {
      const config = getVaultConfig(TEST_ROOT);
      ensureVaultDirs(config);
      ensureVaultDirs(config); // second call should not throw
      expect(existsSync(config.rawDir)).toBe(true);
    });
  });

  describe('getVaultStats', () => {
    it('counts pages, words, and links', () => {
      const config = getVaultConfig(TEST_ROOT);
      writeWikiPage(join(config.wikiDir, 'alpha.md'), 'This links to [[Beta]] via wikilink.', {
        title: 'Alpha',
        summary: 'Alpha page',
      });
      writeWikiPage(join(config.wikiDir, 'beta.md'), 'Beta page content is here.', {
        title: 'Beta',
        summary: 'Beta page',
      });

      const stats = getVaultStats(config);
      expect(stats.pageCount).toBe(2);
      expect(stats.wordCount).toBeGreaterThan(5);
      expect(stats.wikilinks).toBe(1);
      expect(stats.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('identifies orphan pages', () => {
      const config = getVaultConfig(TEST_ROOT);
      // The orphan check in getVaultStats uses basename(p, '.md') to match against allLinked (which is title-based).
      // So allLinked uses the title from frontmatter, but orphan check uses filename.
      // Alpha links to "beta" (filename match), Charlie is orphaned.
      writeWikiPage(join(config.wikiDir, 'alpha.md'), 'Links to [[beta]].', {
        title: 'Alpha',
        summary: 'A',
      });
      writeWikiPage(join(config.wikiDir, 'beta.md'), 'Linked from Alpha.', {
        title: 'Beta',
        summary: 'B',
      });
      writeWikiPage(join(config.wikiDir, 'charlie.md'), 'No one links here.', {
        title: 'Charlie',
        summary: 'C',
      });

      const stats = getVaultStats(config);
      // alpha and charlie are orphans (basename "beta" is linked, "alpha" and "charlie" are not)
      expect(stats.orphanPages).toBe(2);
    });

    it('returns zeros for empty vault', () => {
      const emptyRoot = join(TEST_ROOT, 'empty-vault');
      mkdirSync(join(emptyRoot, 'wiki'), { recursive: true });
      mkdirSync(join(emptyRoot, 'raw'), { recursive: true });
      const config = getVaultConfig(emptyRoot);
      const stats = getVaultStats(config);
      expect(stats.pageCount).toBe(0);
      expect(stats.wordCount).toBe(0);
      expect(stats.wikilinks).toBe(0);
      expect(stats.orphanPages).toBe(0);
    });
  });
});
