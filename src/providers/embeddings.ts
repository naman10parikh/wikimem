/**
 * Embedding providers for llmwiki.
 * Supports Google Gemini (text-embedding-004), OpenAI (text-embedding-3-small), and local fallback.
 */

export interface EmbeddingVector {
  values: number[];
  model: string;
  dimensions: number;
}

export interface EmbeddingProvider {
  name: string;
  embed(text: string): Promise<EmbeddingVector>;
  embedBatch(texts: string[]): Promise<EmbeddingVector[]>;
  isAvailable(): Promise<boolean>;
}

export interface EmbeddingResult {
  vector: number[];
  model: string;
  dimensions: number;
  text: string;
  timestamp: string;
}

// --- Google Gemini Embeddings ---

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  name = 'gemini';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? process.env['GOOGLE_API_KEY'] ?? '';
    this.model = model ?? 'text-embedding-004';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const results = await this.embedBatch([text]);
    const first = results[0];
    if (!first) {
      throw new Error('Gemini embedding returned empty result');
    }
    return first;
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY is required for Gemini embeddings');
    }

    const url = `${this.baseUrl}/models/${this.model}:batchEmbedContents?key=${this.apiKey}`;

    const requests = texts.map((text) => ({
      model: `models/${this.model}`,
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini embedding API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      embeddings: Array<{ values: number[] }>;
    };

    return data.embeddings.map((emb) => ({
      values: emb.values,
      model: this.model,
      dimensions: emb.values.length,
    }));
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.apiKey || process.env['GOOGLE_API_KEY']);
  }
}

// --- OpenAI Embeddings ---

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? process.env['OPENAI_API_KEY'] ?? '';
    this.model = model ?? 'text-embedding-3-small';
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const results = await this.embedBatch([text]);
    const first = results[0];
    if (!first) {
      throw new Error('OpenAI embedding returned empty result');
    }
    return first;
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI embeddings');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI embedding API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
      model: string;
    };

    // Sort by index to maintain input order
    const sorted = data.data.sort((a, b) => a.index - b.index);

    return sorted.map((item) => ({
      values: item.embedding,
      model: data.model,
      dimensions: item.embedding.length,
    }));
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.apiKey || process.env['OPENAI_API_KEY']);
  }
}

// --- Local Embeddings (TF-IDF-based, no API needed) ---

export class LocalEmbeddingProvider implements EmbeddingProvider {
  name = 'local';
  private dimensions: number;

  constructor(dimensions?: number) {
    this.dimensions = dimensions ?? 384;
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const values = this.computeLocalEmbedding(text);
    return { values, model: 'local-tfidf', dimensions: this.dimensions };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    return texts.map((text) => ({
      values: this.computeLocalEmbedding(text),
      model: 'local-tfidf',
      dimensions: this.dimensions,
    }));
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available — no external dependencies
  }

  /**
   * Deterministic hash-based embedding. Uses a bag-of-words approach
   * with feature hashing to produce a fixed-dimension vector.
   * Not as good as neural embeddings, but works offline with zero deps.
   */
  private computeLocalEmbedding(text: string): number[] {
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const vector = new Float64Array(this.dimensions);

    for (const token of tokens) {
      // Feature hashing (hash trick)
      const hash = this.hashToken(token);
      const idx = Math.abs(hash) % this.dimensions;
      const sign = hash > 0 ? 1 : -1;
      vector[idx] = (vector[idx] ?? 0) + sign;
    }

    // L2 normalize
    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      const v = vector[i] ?? 0;
      norm += v * v;
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] = (vector[i] ?? 0) / norm;
      }
    }

    return Array.from(vector);
  }

  private hashToken(token: string): number {
    // FNV-1a hash
    let hash = 0x811c9dc5;
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash;
  }
}

// --- Factory ---

export function createEmbeddingProvider(
  name?: string,
  options?: { apiKey?: string; model?: string },
): EmbeddingProvider {
  const providerName = name ?? detectBestProvider();

  switch (providerName.toLowerCase()) {
    case 'gemini':
    case 'google':
      return new GeminiEmbeddingProvider(options?.apiKey, options?.model);
    case 'openai':
      return new OpenAIEmbeddingProvider(options?.apiKey, options?.model);
    case 'local':
      return new LocalEmbeddingProvider();
    default:
      throw new Error(
        `Unknown embedding provider: ${providerName}. Supported: gemini, openai, local`,
      );
  }
}

function detectBestProvider(): string {
  if (process.env['GOOGLE_API_KEY']) return 'gemini';
  if (process.env['OPENAI_API_KEY']) return 'openai';
  return 'local';
}

// --- Cosine Similarity ---

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dotProduct += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}
