import { describe, it, expect } from 'vitest';
import { bm25Search, tokenize } from '../src/search/bm25.js';

describe('bm25', () => {
  describe('tokenize', () => {
    it('lowercases and splits on whitespace', () => {
      expect(tokenize('Hello World')).toEqual(['hello', 'world']);
    });

    it('removes short tokens (length <= 2)', () => {
      expect(tokenize('I am a big dog')).toEqual(['big', 'dog']);
    });

    it('strips punctuation', () => {
      expect(tokenize('Hello, world! How are you?')).toEqual(['hello', 'world', 'how', 'are', 'you']);
    });

    it('handles empty string', () => {
      expect(tokenize('')).toEqual([]);
    });

    it('handles numbers', () => {
      expect(tokenize('version 3.14 released 2024')).toEqual(['version', 'released', '2024']);
    });

    it('collapses multiple spaces', () => {
      expect(tokenize('hello    world')).toEqual(['hello', 'world']);
    });
  });

  describe('bm25Search', () => {
    const docs = [
      { path: '/a.md', content: 'machine learning algorithms for natural language processing', title: 'ML Intro' },
      { path: '/b.md', content: 'cooking recipes for pasta and pizza with cheese', title: 'Cooking' },
      { path: '/c.md', content: 'deep learning neural networks for language tasks', title: 'Deep Learning' },
      { path: '/d.md', content: 'gardening tips for growing tomatoes in summer', title: 'Gardening' },
    ];

    it('returns results ranked by relevance', () => {
      const results = bm25Search('machine learning language', docs);
      expect(results.length).toBeGreaterThan(0);
      // ML and deep learning docs should rank above cooking/gardening
      expect(results[0]!.path).toBe('/a.md');
    });

    it('returns empty array when no matches', () => {
      const results = bm25Search('quantum physics', docs);
      expect(results).toEqual([]);
    });

    it('boosts title matches', () => {
      const results = bm25Search('deep learning', docs);
      // The doc with "Deep Learning" in title should rank first due to title boost
      expect(results[0]!.path).toBe('/c.md');
    });

    it('handles single document', () => {
      const single = [{ path: '/x.md', content: 'hello world', title: 'Greetings' }];
      const results = bm25Search('hello', single);
      expect(results).toHaveLength(1);
      expect(results[0]!.path).toBe('/x.md');
      expect(results[0]!.score).toBeGreaterThan(0);
    });

    it('handles empty document set', () => {
      const results = bm25Search('hello', []);
      expect(results).toEqual([]);
    });

    it('scores are positive for matching documents', () => {
      const results = bm25Search('cooking pasta', docs);
      for (const result of results) {
        expect(result.score).toBeGreaterThan(0);
      }
    });

    it('results are sorted descending by score', () => {
      const results = bm25Search('learning language', docs);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
      }
    });

    it('multi-term query scores higher with more matching terms', () => {
      const results = bm25Search('machine learning algorithms natural language', docs);
      // Doc A should score highest since it contains all query terms
      expect(results[0]!.path).toBe('/a.md');
    });
  });
});
