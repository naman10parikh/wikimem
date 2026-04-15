/**
 * observer-budget.test.ts
 *
 * Tests that the Observer respects the maxBudget cap across all code paths:
 *   1. maxBudget: 0  → zero LLM calls, report.budget.capped === true
 *   2. maxBudget: 0.50 → total estimated cost ≤ 0.50
 *   3. no maxBudget (default $2.00) → observer completes normally, budget object present
 *
 * `createProviderFromUserConfig` is module-mocked so no real LLM calls are made.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runObserver } from '../src/core/observer.js';
import { getVaultConfig, ensureVaultDirs } from '../src/core/vault.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEST_ROOT = join(process.cwd(), '.test-vault-observer-budget');

function cleanup(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

/** Minimal but valid wiki page markdown. Score will be low (triggers improvement eligibility). */
function minimalPage(slug: string, index: number): string {
  return `---
title: "Page ${index}"
type: page
---

# Page ${index}

Short content about ${slug}.
`;
}

/** Build a vault with N minimal pages. */
function buildMockVault(pageCount: number): void {
  const wikiDir = join(TEST_ROOT, 'wiki');
  const rawDir = join(TEST_ROOT, 'raw');
  mkdirSync(wikiDir, { recursive: true });
  mkdirSync(rawDir, { recursive: true });

  writeFileSync(
    join(TEST_ROOT, 'AGENTS.md'),
    '# Wiki Schema\nCategories: sources, entities, concepts, syntheses\n',
    'utf-8',
  );
  writeFileSync(
    join(join(TEST_ROOT, 'wiki'), 'index.md'),
    '---\ntitle: Wiki Index\ntype: index\n---\n\n# Wiki Index\n',
    'utf-8',
  );
  writeFileSync(
    join(TEST_ROOT, 'log.md'),
    '# Ingest Log\n',
    'utf-8',
  );

  for (let i = 0; i < pageCount; i++) {
    const slug = `page-${i}`;
    writeFileSync(join(wikiDir, `${slug}.md`), minimalPage(slug, i), 'utf-8');
  }
}

// ─── Mock setup ───────────────────────────────────────────────────────────────

/** Track how many LLM chat() calls were made across all test runs. */
let llmCallCount = 0;

/**
 * Mock the providers module so that createProviderFromUserConfig returns a
 * counting mock provider. Vitest module mocking is applied before each test.
 */
vi.mock('../src/providers/index.js', () => {
  return {
    createProviderFromUserConfig: () => {
      return {
        name: 'mock-budget-provider',
        async chat(_messages: unknown[], _options?: unknown) {
          llmCallCount++;
          return {
            content: 'NO_CONTRADICTION',
            model: 'mock',
            tokensUsed: { input: 10, output: 5 },
          };
        },
        async isAvailable() {
          return true;
        },
      };
    },
    createProvider: () => ({
      name: 'mock',
      async chat() {
        llmCallCount++;
        return { content: 'NO_CONTRADICTION', model: 'mock', tokensUsed: { input: 10, output: 5 } };
      },
      async isAvailable() { return true; },
    }),
    createProviderChain: () => ({
      name: 'mock-chain',
      async chat() {
        llmCallCount++;
        return { content: 'NO_CONTRADICTION', model: 'mock', tokensUsed: { input: 10, output: 5 } };
      },
      async isAvailable() { return true; },
    }),
  };
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Observer — budget cap enforcement', () => {
  beforeEach(() => {
    cleanup();
    buildMockVault(50); // 50 minimal pages → many eligible for improvement
    llmCallCount = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it('maxBudget: 0 — zero auto-improvements attempted, budget.capped === true', async () => {
    const config = getVaultConfig(TEST_ROOT);
    ensureVaultDirs(config);

    const report = await runObserver(config, {
      maxBudget: 0,
      autoImprove: true,
      maxImprovements: 10,
    });

    // The improvement loop must be entirely skipped when budget is 0
    expect(report.improvements).toHaveLength(0);

    // budget.capped is true when eligible pages > pagesAfterCap
    expect(report.budget.capped).toBe(true);

    // pagesAfterCap should be 0 because floor(0 / 0.15) = 0
    expect(report.budget.pagesAfterCap).toBe(0);

    // estimatedCostUsd must be 0 (no pages improved)
    expect(report.budget.estimatedCostUsd).toBe(0);
  }, 30_000);

  it('maxBudget: 0.50 — estimated cost does not exceed the cap', async () => {
    // COST_PER_IMPROVEMENT_ESTIMATE = 0.15 per page.
    // With $0.50 budget, at most floor(0.50 / 0.15) = 3 pages can be improved.
    const MAX_ALLOWED_COST = 0.50;
    const COST_PER_PAGE = 0.15;

    const config = getVaultConfig(TEST_ROOT);
    ensureVaultDirs(config);

    const report = await runObserver(config, {
      maxBudget: MAX_ALLOWED_COST,
      autoImprove: false, // test budget estimation only, not actual LLM improvement calls
      maxImprovements: 10,
    });

    // Total estimated cost must be within the declared budget
    expect(report.budget.estimatedCostUsd).toBeLessThanOrEqual(MAX_ALLOWED_COST);

    // pagesAfterCap must be achievable within budget
    expect(report.budget.pagesAfterCap * COST_PER_PAGE).toBeLessThanOrEqual(MAX_ALLOWED_COST);

    // budgetRemaining must be non-negative
    expect(report.budget.budgetRemaining).toBeGreaterThanOrEqual(0);

    // If there are more eligible pages than pagesAfterCap, capped must be true
    if (report.budget.pagesEligible > report.budget.pagesAfterCap) {
      expect(report.budget.capped).toBe(true);
    }
  }, 30_000);

  it('no maxBudget (default $2.00) — report completes with budget object present', async () => {
    const config = getVaultConfig(TEST_ROOT);
    ensureVaultDirs(config);

    const report = await runObserver(config, {
      autoImprove: false,
      maxImprovements: 3,
      // maxBudget intentionally omitted → defaults to $2.00
    });

    // Report must be structurally complete
    expect(report).toBeDefined();
    expect(report.budget).toBeDefined();
    expect(typeof report.budget.estimatedCostUsd).toBe('number');
    expect(typeof report.budget.pagesEligible).toBe('number');
    expect(typeof report.budget.pagesAfterCap).toBe('number');
    expect(typeof report.budget.budgetRemaining).toBe('number');
    expect(typeof report.budget.capped).toBe('boolean');

    // Default $2.00 budget: at most floor(2.00 / 0.15) = 13 pages
    expect(report.budget.pagesAfterCap).toBeLessThanOrEqual(13);

    // With 50 minimal pages the observer should complete and record totalPages
    expect(report.totalPages).toBeGreaterThan(0);
  }, 30_000);

  it('maxBudget: 0 with autoImprove: false — budget still reports capped when eligible > 0', async () => {
    const config = getVaultConfig(TEST_ROOT);
    ensureVaultDirs(config);

    const report = await runObserver(config, {
      maxBudget: 0,
      autoImprove: false,
    });

    // Even without auto-improve, budget estimation must run and reflect the zero cap
    expect(report.budget.estimatedCostUsd).toBe(0);
    expect(report.budget.pagesAfterCap).toBe(0);
    // If any pages are eligible for improvement, capped must be true
    if (report.budget.pagesEligible > 0) {
      expect(report.budget.capped).toBe(true);
    }
  }, 30_000);

  it('maxBudget: 0.15 (exactly 1 page) — pagesAfterCap is at most 1', async () => {
    const config = getVaultConfig(TEST_ROOT);
    ensureVaultDirs(config);

    const report = await runObserver(config, {
      maxBudget: 0.15,
      autoImprove: false,
      maxImprovements: 10,
    });

    // floor(0.15 / 0.15) = 1 page maximum
    expect(report.budget.pagesAfterCap).toBeLessThanOrEqual(1);
    expect(report.budget.estimatedCostUsd).toBeLessThanOrEqual(0.15);
  }, 30_000);
});
