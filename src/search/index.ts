import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { bm25Search } from './bm25.js';
import { semanticSearch } from './semantic.js';
import type { EmbeddingProvider } from '../providers/embeddings.js';

export interface SearchOptions {
  mode?: 'bm25' | 'semantic' | 'hybrid';
  embeddingProvider?: EmbeddingProvider;
  wikiDir?: string;
  limit?: number;
}

/**
 * Search wiki pages. Supports BM25 (keyword), semantic (embedding), and hybrid modes.
 */
export async function searchPages(
  query: string,
  pagePaths: string[],
  options?: SearchOptions,
): Promise<string[]> {
  const mode = options?.mode ?? 'bm25';
  const limit = options?.limit ?? 20;

  // BM25 keyword search (always available)
  const bm25Results = runBm25Search(query, pagePaths);

  if (mode === 'bm25' || !options?.embeddingProvider || !options?.wikiDir) {
    return bm25Results.slice(0, limit);
  }

  // Semantic search
  if (mode === 'semantic') {
    const semResults = await semanticSearch(
      query,
      options.wikiDir,
      options.embeddingProvider,
      limit,
    );
    return semResults.map((r) => r.path);
  }

  // Hybrid: merge BM25 + semantic with reciprocal rank fusion
  const semResults = await semanticSearch(
    query,
    options.wikiDir,
    options.embeddingProvider,
    limit,
  );

  const merged = reciprocalRankFusion(
    bm25Results,
    semResults.map((r) => r.path),
  );

  return merged.slice(0, limit);
}

function runBm25Search(query: string, pagePaths: string[]): string[] {
  const documents = pagePaths.map((path) => {
    try {
      const content = readFileSync(path, 'utf-8');
      const title = basename(path, extname(path));
      return { path, content, title };
    } catch {
      return { path, content: '', title: basename(path) };
    }
  });

  const results = bm25Search(query, documents);
  return results.map((r) => r.path);
}

/**
 * Reciprocal Rank Fusion: merge two ranked lists into one.
 * RRF score = sum(1 / (k + rank)) for each list, with k=60.
 */
function reciprocalRankFusion(listA: string[], listB: string[], k = 60): string[] {
  const scores = new Map<string, number>();

  for (let i = 0; i < listA.length; i++) {
    const item = listA[i];
    if (!item) continue;
    const prev = scores.get(item) ?? 0;
    scores.set(item, prev + 1 / (k + i + 1));
  }

  for (let i = 0; i < listB.length; i++) {
    const item = listB[i];
    if (!item) continue;
    const prev = scores.get(item) ?? 0;
    scores.set(item, prev + 1 / (k + i + 1));
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([path]) => path);
}
