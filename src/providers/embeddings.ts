/**
 * Embedding providers for llmwiki — enables semantic search via vector similarity.
 *
 * Supports:
 * - Google Gemini (text-embedding-004, multimodal via gemini-2.0)
 * - OpenAI (text-embedding-3-small / text-embedding-3-large)
 * - Local (simple TF-IDF based, zero dependencies)
 */

import { readFileSync } from 'node:fs';

// --- Interfaces ---

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

export interface EmbeddingSidecar {
  pageTitle: string;
  pagePath: string;
  model: string;
  dimensions: number;
  embedding: number[];
  contentHash: string;
  createdAt: string;
}

// --- Google Gemini Embedding Provider ---

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  name = 'gemini';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    this.apiKey = options?.apiKey ?? process.env['GOOGLE_API_KEY'] ?? '';
    this.model = options?.model ?? 'text-embedding-004';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const results = await this.embedBatch([text]);
    const first = results[0];
    if (!first) throw new Error('Gemini embedding returned no results');
    return first;
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY is required for Gemini embeddings');
    }

    const url = `${this.baseUrl}/models/${this.model}:batchEmbedContents?key=${this.apiKey}`;

    const requests = texts.map((text) => ({
      model: `models/${this.model}`,
      content: { parts: [{ text: truncateText(text, 8000) }] },
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini embedding API error: ${response.status} — ${err}`);
    }

    const data = (await response.json()) as {
      embeddings: Array<{ values: number[] }>;
    };

    return data.embeddings.map((e) => ({
      values: e.values,
      model: this.model,
      dimensions: e.values.length,
    }));
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.apiKey || process.env['GOOGLE_API_KEY']);
  }
}

// --- OpenAI Embedding Provider ---

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    this.apiKey = options?.apiKey ?? process.env['OPENAI_API_KEY'] ?? '';
    this.model = options?.model ?? 'text-embedding-3-small';
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const results = await this.embedBatch([text]);
    const first = results[0];
    if (!first) throw new Error('OpenAI embedding returned no results');
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
        input: texts.map((t) => truncateText(t, 8000)),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI embedding API error: ${response.status} — ${err}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };

    return data.data
      .sort((a, b) => a.index - b.index)
      .map((d) => ({
        values: d.embedding,
        model: this.model,
        dimensions: d.embedding.length,
      }));
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.apiKey || process.env['OPENAI_API_KEY']);
  }
}

// --- Local TF-IDF Embedding Provider (no external API needed) ---

export class LocalEmbeddingProvider implements EmbeddingProvider {
  name = 'local';
  private dimensions: number;

  constructor(options?: { dimensions?: number }) {
    this.dimensions = options?.dimensions ?? 256;
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const vector = tfidfVector(text, this.dimensions);
    return {
      values: vector,
      model: 'local-tfidf',
      dimensions: this.dimensions,
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    return texts.map((text) => ({
      values: tfidfVector(text, this.dimensions),
      model: 'local-tfidf',
      dimensions: this.dimensions,
    }));
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available — no external API needed
  }
}

// --- Factory ---

export function createEmbeddingProvider(
  name: string,
  options?: { apiKey?: string; model?: string },
): EmbeddingProvider {
  switch (name.toLowerCase()) {
    case 'gemini':
    case 'google':
      return new GeminiEmbeddingProvider(options);
    case 'openai':
      return new OpenAIEmbeddingProvider(options);
    case 'local':
    case 'tfidf':
      return new LocalEmbeddingProvider();
    default:
      throw new Error(`Unknown embedding provider: ${name}. Supported: gemini, openai, local`);
  }
}

// --- Utility: cosine similarity ---

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

// --- Utility: content hash for cache invalidation ---

export function contentHash(text: string): string {
  // Simple djb2 hash — no crypto dependency
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + (text.charCodeAt(i) ?? 0)) | 0;
  }
  return (hash >>> 0).toString(36);
}

// --- Internal helpers ---

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars);
}

/**
 * Deterministic TF-IDF-style vector via hash projection.
 * Maps terms to fixed-dimension buckets using a hash function,
 * then normalizes. Not as good as neural embeddings but works
 * offline with zero dependencies.
 */
function tfidfVector(text: string, dimensions: number): number[] {
  const terms = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const vec = new Float64Array(dimensions);
  const termCounts = new Map<string, number>();

  for (const term of terms) {
    termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
  }

  for (const [term, count] of termCounts) {
    const bucket = simpleHash(term) % dimensions;
    // TF component: log(1 + count)
    const tf = Math.log(1 + count);
    // Use hash sign to allow positive and negative contributions
    const sign = simpleHash(term + '_sign') % 2 === 0 ? 1 : -1;
    vec[bucket] = (vec[bucket] ?? 0) + sign * tf;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    const v = vec[i] ?? 0;
    norm += v * v;
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] = (vec[i] ?? 0) / norm;
    }
  }

  return Array.from(vec);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + (str.charCodeAt(i) ?? 0)) | 0;
  }
  return Math.abs(hash);
}
