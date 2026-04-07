/**
 * Semantic search using embeddings.
 * Loads .embedding.json sidecar files and ranks by cosine similarity.
 */

import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { cosineSimilarity } from '../providers/embeddings.js';
import type { EmbeddingProvider, EmbeddingResult } from '../providers/embeddings.js';

export interface SemanticSearchResult {
  path: string;
  title: string;
  score: number;
}

/**
 * Search wiki pages by semantic similarity using embeddings.
 */
export async function semanticSearch(
  query: string,
  wikiDir: string,
  embeddingProvider: EmbeddingProvider,
  limit?: number,
): Promise<SemanticSearchResult[]> {
  const maxResults = limit ?? 10;

  // Embed the query (use RETRIEVAL_QUERY task type for queries)
  const queryEmbedding = await embeddingProvider.embed(query);

  // Find all embedding sidecar files
  const embeddingFiles = findEmbeddingFiles(wikiDir);

  if (embeddingFiles.length === 0) {
    return [];
  }

  // Score each page against the query
  const results: SemanticSearchResult[] = [];

  for (const embFile of embeddingFiles) {
    try {
      const raw = readFileSync(embFile, 'utf-8');
      const embedding = JSON.parse(raw) as EmbeddingResult;

      // Corresponding wiki page path
      const pagePath = embFile.replace(/\.embedding\.json$/, '');
      if (!existsSync(pagePath)) continue;

      const score = cosineSimilarity(queryEmbedding.values, embedding.vector);
      const title = basename(pagePath, extname(pagePath));

      results.push({ path: pagePath, title, score });
    } catch {
      // Skip malformed embedding files
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Generate and store an embedding for a wiki page.
 */
export async function embedPage(
  pagePath: string,
  content: string,
  embeddingProvider: EmbeddingProvider,
): Promise<void> {
  const embedding = await embeddingProvider.embed(content);

  const result: EmbeddingResult = {
    vector: embedding.values,
    model: embedding.model,
    dimensions: embedding.dimensions,
    text: content.substring(0, 500), // Store a snippet for debugging
    timestamp: new Date().toISOString(),
  };

  const sidecarPath = pagePath + '.embedding.json';
  writeFileSync(sidecarPath, JSON.stringify(result), 'utf-8');
}

/**
 * Batch-embed all wiki pages that don't have embedding sidecar files yet.
 */
export async function embedAllPages(
  wikiDir: string,
  embeddingProvider: EmbeddingProvider,
  options?: { force?: boolean; batchSize?: number },
): Promise<{ embedded: number; skipped: number; errors: number }> {
  const pages = findMarkdownFiles(wikiDir);
  const batchSize = options?.batchSize ?? 20;
  let embedded = 0;
  let skipped = 0;
  let errors = 0;

  // Collect pages that need embedding
  const toEmbed: Array<{ path: string; content: string }> = [];

  for (const pagePath of pages) {
    const sidecarPath = pagePath + '.embedding.json';
    if (!options?.force && existsSync(sidecarPath)) {
      skipped++;
      continue;
    }

    try {
      const content = readFileSync(pagePath, 'utf-8');
      if (content.trim().length > 0) {
        toEmbed.push({ path: pagePath, content: content.substring(0, 8000) });
      }
    } catch {
      errors++;
    }
  }

  // Process in batches
  for (let i = 0; i < toEmbed.length; i += batchSize) {
    const batch = toEmbed.slice(i, i + batchSize);
    try {
      const texts = batch.map((p) => p.content);
      const embeddings = await embeddingProvider.embedBatch(texts);

      for (let j = 0; j < batch.length; j++) {
        const page = batch[j];
        const emb = embeddings[j];
        if (!page || !emb) continue;

        const result: EmbeddingResult = {
          vector: emb.values,
          model: emb.model,
          dimensions: emb.dimensions,
          text: page.content.substring(0, 500),
          timestamp: new Date().toISOString(),
        };

        writeFileSync(page.path + '.embedding.json', JSON.stringify(result), 'utf-8');
        embedded++;
      }
    } catch {
      errors += batch.length;
    }
  }

  return { embedded, skipped, errors };
}

function findEmbeddingFiles(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  function walk(d: string): void {
    const entries = readdirSync(d);
    for (const entry of entries) {
      const full = join(d, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else if (entry.endsWith('.embedding.json')) {
          files.push(full);
        }
      } catch {
        // Skip inaccessible files
      }
    }
  }

  walk(dir);
  return files;
}

function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  function walk(d: string): void {
    const entries = readdirSync(d);
    for (const entry of entries) {
      const full = join(d, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else if (entry.endsWith('.md')) {
          files.push(full);
        }
      } catch {
        // Skip inaccessible files
      }
    }
  }

  walk(dir);
  return files;
}
