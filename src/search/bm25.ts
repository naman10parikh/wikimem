/**
 * Simple BM25 search implementation for markdown files.
 * No external dependencies — works locally.
 */

interface Document {
  path: string;
  content: string;
  title: string;
}

interface SearchResult {
  path: string;
  score: number;
  title: string;
}

const K1 = 1.5;
const B = 0.75;

export function bm25Search(query: string, documents: Document[]): SearchResult[] {
  const queryTerms = tokenize(query);

  // Tokenization cache — tokenize() is called many times per doc; cache results keyed by path.
  const tokenCache = new Map<string, string[]>();
  const getTokens = (path: string, text: string): string[] => {
    if (!tokenCache.has(path)) tokenCache.set(path, tokenize(text));
    return tokenCache.get(path)!;
  };
  const getTitleTokens = (path: string, title: string): string[] => {
    const key = `__title__${path}`;
    if (!tokenCache.has(key)) tokenCache.set(key, tokenize(title));
    return tokenCache.get(key)!;
  };

  // Pre-tokenize all documents once before the double-loop below
  const docTokens = documents.map((d) => ({
    combined: getTokens(d.path, d.content + ' ' + d.title),
    title: getTitleTokens(d.path, d.title),
  }));

  const avgDocLength =
    docTokens.reduce((sum, t) => sum + t.combined.length, 0) /
    Math.max(documents.length, 1);

  // Calculate IDF for each query term using cached token sets
  const idf = new Map<string, number>();
  for (const term of queryTerms) {
    const docsWithTerm = docTokens.filter(
      (t) => t.combined.includes(term),
    ).length;
    const idfValue = Math.log(
      (documents.length - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1,
    );
    idf.set(term, idfValue);
  }

  // Score each document using pre-tokenized arrays
  const results: SearchResult[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]!;
    const { combined: docTerms, title: titleTerms } = docTokens[i]!;
    const docLength = docTerms.length;
    let score = 0;

    for (const term of queryTerms) {
      const tf = docTerms.filter((t) => t === term).length;
      const termIdf = idf.get(term) ?? 0;
      const numerator = tf * (K1 + 1);
      const denominator = tf + K1 * (1 - B + B * (docLength / avgDocLength));
      score += termIdf * (numerator / denominator);
    }

    // Boost title matches (additive, not multiplicative — avoids exponential blowup)
    let titleBoost = 0;
    for (const term of queryTerms) {
      if (titleTerms.includes(term)) {
        titleBoost += score * 0.5;
      }
    }
    score += titleBoost;

    if (score > 0) {
      results.push({ path: doc.path, score, title: doc.title });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}
