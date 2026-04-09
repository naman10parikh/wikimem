import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ingestSource } from '../src/core/ingest.js';
import { getVaultConfig, listWikiPages, readWikiPage } from '../src/core/vault.js';
import type { LLMProvider, LLMMessage, LLMOptions } from '../src/providers/types.js';

const TEST_ROOT = join(process.cwd(), '.test-vault-ingest');

function cleanup(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

/**
 * Mock LLM provider that returns structured page blocks.
 * Simulates the expected LLM response format from the ingest prompt.
 */
function createMockProvider(responseOverride?: string): LLMProvider {
  const defaultResponse = `Here are the processed wiki pages:

\`\`\`page
TITLE: TypeScript Overview
CATEGORY: concepts
TAGS: typescript, programming, javascript
SUMMARY: Overview of the TypeScript programming language
---
TypeScript is a typed superset of JavaScript. It was created by [[Microsoft]] and is used
in many modern [[Web Development]] frameworks. See also [[JavaScript]].
\`\`\`

\`\`\`page
TITLE: Microsoft
CATEGORY: entities
TAGS: company, technology
SUMMARY: Major technology company that created TypeScript
---
Microsoft is a technology company known for creating [[TypeScript]], Windows, and Azure.
\`\`\``;

  return {
    name: 'mock',
    async chat(_messages: LLMMessage[], _options?: LLMOptions) {
      return {
        content: responseOverride ?? defaultResponse,
        model: 'mock-model',
        tokensUsed: { input: 100, output: 200 },
      };
    },
    async isAvailable() {
      return true;
    },
  };
}

describe('ingest', () => {
  beforeEach(() => {
    cleanup();
    mkdirSync(join(TEST_ROOT, 'wiki', 'sources'), { recursive: true });
    mkdirSync(join(TEST_ROOT, 'wiki', 'entities'), { recursive: true });
    mkdirSync(join(TEST_ROOT, 'wiki', 'concepts'), { recursive: true });
    mkdirSync(join(TEST_ROOT, 'wiki', 'syntheses'), { recursive: true });
    mkdirSync(join(TEST_ROOT, 'raw'), { recursive: true });

    // Write AGENTS.md schema
    writeFileSync(
      join(TEST_ROOT, 'AGENTS.md'),
      '# Wiki Schema\n\nCategories: sources, entities, concepts, syntheses\n',
      'utf-8',
    );

    // Write index.md
    writeFileSync(
      join(TEST_ROOT, 'wiki', 'index.md'),
      '---\ntitle: Wiki Index\ntype: index\n---\n\n# Wiki Index\n\n## Sources\n\n## Entities\n\n## Concepts\n\n## Syntheses\n',
      'utf-8',
    );

    // Write log.md
    writeFileSync(
      join(TEST_ROOT, 'wiki', 'log.md'),
      '---\ntitle: Wiki Log\ntype: log\n---\n\n# Wiki Log\n',
      'utf-8',
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('ingests a local text file and creates wiki pages', { timeout: 15000 }, async () => {
    const config = getVaultConfig(TEST_ROOT);
    const provider = createMockProvider();

    // Create a source file
    const sourcePath = join(TEST_ROOT, 'raw', 'typescript-article.md');
    writeFileSync(
      sourcePath,
      '# TypeScript\n\nTypeScript is a typed superset of JavaScript developed by Microsoft.',
      'utf-8',
    );

    const result = await ingestSource(sourcePath, config, provider, { verbose: false });

    expect(result.title).toBe('typescript-article');
    expect(result.pagesUpdated).toBe(2);
    expect(result.linksAdded).toBeGreaterThan(0);
    expect(result.rejected).toBeFalsy();
  });

  it('creates pages in correct category directories', async () => {
    const config = getVaultConfig(TEST_ROOT);
    const provider = createMockProvider();

    const sourcePath = join(TEST_ROOT, 'raw', 'test-source.md');
    writeFileSync(sourcePath, '# Test\n\nSome test content about a topic.', 'utf-8');

    await ingestSource(sourcePath, config, provider, { verbose: false });

    // Should have created concept and entity pages
    const conceptPages = listWikiPages(join(config.wikiDir, 'concepts'));
    const entityPages = listWikiPages(join(config.wikiDir, 'entities'));
    expect(conceptPages.length).toBeGreaterThanOrEqual(1);
    expect(entityPages.length).toBeGreaterThanOrEqual(1);
  });

  it('written pages have correct frontmatter', async () => {
    const config = getVaultConfig(TEST_ROOT);
    const provider = createMockProvider();

    const sourcePath = join(TEST_ROOT, 'raw', 'frontmatter-test.md');
    writeFileSync(sourcePath, '# Test\n\nContent for frontmatter validation.', 'utf-8');

    await ingestSource(sourcePath, config, provider, { verbose: false });

    const conceptPages = listWikiPages(join(config.wikiDir, 'concepts'));
    expect(conceptPages.length).toBeGreaterThanOrEqual(1);

    const page = readWikiPage(conceptPages[0]!);
    expect(page.frontmatter['title']).toBe('TypeScript Overview');
    expect(page.frontmatter['type']).toBe('concepts');
    expect(page.frontmatter['tags']).toEqual(['typescript', 'programming', 'javascript']);
    expect(page.frontmatter['summary']).toBeTruthy();
    expect(page.frontmatter['created']).toBeTruthy();
    expect(page.frontmatter['updated']).toBeTruthy();
    expect(page.frontmatter['sources']).toBeTruthy();
  });

  it('updates index.md after ingestion', async () => {
    const config = getVaultConfig(TEST_ROOT);
    const provider = createMockProvider();

    const sourcePath = join(TEST_ROOT, 'raw', 'index-test.md');
    writeFileSync(sourcePath, '# Test\n\nContent for index update.', 'utf-8');

    await ingestSource(sourcePath, config, provider, { verbose: false });

    const indexContent = readFileSync(config.indexPath, 'utf-8');
    expect(indexContent).toContain('TypeScript Overview');
    expect(indexContent).toContain('Microsoft');
  });

  it('appends to log.md after ingestion', async () => {
    const config = getVaultConfig(TEST_ROOT);
    const provider = createMockProvider();

    const sourcePath = join(TEST_ROOT, 'raw', 'log-test.md');
    writeFileSync(sourcePath, '# Test\n\nContent for log test.', 'utf-8');

    await ingestSource(sourcePath, config, provider, { verbose: false });

    const logContent = readFileSync(config.logPath, 'utf-8');
    expect(logContent).toContain('ingest');
    expect(logContent).toContain('Created/updated');
  });

  it('rejects duplicate content', async () => {
    const config = getVaultConfig(TEST_ROOT);
    const provider = createMockProvider();

    // Create an existing wiki page with similar content
    writeFileSync(
      join(config.wikiDir, 'concepts', 'existing.md'),
      '---\ntitle: Existing\nsummary: An existing page\n---\n\nTypeScript is a typed superset of JavaScript developed by Microsoft for building large applications.',
      'utf-8',
    );

    // Ingest a very similar source (high word overlap)
    const sourcePath = join(TEST_ROOT, 'raw', 'similar.md');
    writeFileSync(
      sourcePath,
      'TypeScript is a typed superset of JavaScript developed by Microsoft for building large applications.',
      'utf-8',
    );

    const result = await ingestSource(sourcePath, config, provider, { verbose: false });
    expect(result.rejected).toBe(true);
    expect(result.rejectionReason).toBeTruthy();
    expect(result.pagesUpdated).toBe(0);
  });

  it('force flag bypasses duplicate check', async () => {
    const config = getVaultConfig(TEST_ROOT);
    const provider = createMockProvider();

    // Create an existing page with overlapping content
    writeFileSync(
      join(config.wikiDir, 'concepts', 'existing.md'),
      '---\ntitle: Existing\nsummary: An existing page\n---\n\nTypeScript is a typed superset of JavaScript developed by Microsoft for building large applications.',
      'utf-8',
    );

    const sourcePath = join(TEST_ROOT, 'raw', 'similar-forced.md');
    writeFileSync(
      sourcePath,
      'TypeScript is a typed superset of JavaScript developed by Microsoft for building large applications.',
      'utf-8',
    );

    const result = await ingestSource(sourcePath, config, provider, { verbose: false, force: true });
    expect(result.rejected).toBeFalsy();
    expect(result.pagesUpdated).toBeGreaterThan(0);
  });

  it('handles LLM returning unstructured response', async () => {
    const config = getVaultConfig(TEST_ROOT);
    // Provider that returns plain text without page blocks
    const provider = createMockProvider(
      'This is just a plain text response without any structured page blocks.',
    );

    const sourcePath = join(TEST_ROOT, 'raw', 'unstructured.md');
    writeFileSync(sourcePath, '# Test\n\nContent for unstructured response.', 'utf-8');

    const result = await ingestSource(sourcePath, config, provider, { verbose: false });
    // Should create a fallback "Untitled Source" page
    expect(result.pagesUpdated).toBe(1);
  });

  it('throws for nonexistent file', async () => {
    const config = getVaultConfig(TEST_ROOT);
    const provider = createMockProvider();

    await expect(
      ingestSource('/nonexistent/path.md', config, provider, { verbose: false }),
    ).rejects.toThrow('File not found');
  });

  it('copies source file to raw/ if not already there', async () => {
    const config = getVaultConfig(TEST_ROOT);
    const provider = createMockProvider();

    // Create source outside raw/
    const externalPath = join(TEST_ROOT, 'external-source.md');
    writeFileSync(externalPath, '# External\n\nThis is content from an external file source.', 'utf-8');

    const result = await ingestSource(externalPath, config, provider, { verbose: false });
    // rawPath should be inside raw/ directory
    expect(result.rawPath.startsWith(config.rawDir)).toBe(true);
  });
});
