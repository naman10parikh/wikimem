# eval/ — WikiMem's Eval Harness

> The eval is the immune system. The harness is the product. A harness only improves
> if you can measure whether a change made it better or worse. This directory is the
> single entry point for that measurement.

WikiMem already ships a real, runnable eval surface. This directory documents it and
gives the agent (and any contributor) one place to learn how to prove a change is safe.

## The three eval layers

| Layer | What it checks | Command | Cost | When |
| ----- | -------------- | ------- | ---- | ---- |
| 1. Unit + integration | Core logic: ingest, OAuth/MCP client, connectors, observer budget, source manifest | `pnpm test` | $0 | After every change (regression gate) |
| 2. Build | TypeScript compiles, CLI bin is executable, web assets copy | `pnpm build` | $0 | Before any commit |
| 3. Live UI vibe-audit | The running server renders every page-shell route with no console errors | `node scripts/vibe-audit.mjs <round-tag>` | ~browser | Before a release or after UI work |

## The gate (run in order)

```bash
pnpm build          # 0 TypeScript errors
pnpm test           # all tests pass — this is THE regression gate
wikimem --help      # CLI still responds (smoke test of the bin entry)
```

Only when all three are green is a change eligible to ship. This mirrors the inherited
`test-before-signal` and `qa-zero-tolerance` rules in `.claude/rules/`.

## Eval-as-immune-system

Every new feature must either (a) be covered by an existing test in `tests/`, or
(b) add a new test before it lands. A bug fix adds a regression test that would have
caught the bug. The test suite is the accumulated memory of every mistake the harness
has already made — re-running it on every change is how the harness refuses to repeat
itself.

## Where the actual evals live

- `tests/` — the Vitest suites (the layer-1 gate).
- `scripts/vibe-audit.mjs` — the canonical live UI audit (layer 3). Captures screenshots
  for every route and records console errors to a JSON report.
- `vitest.config.ts` — test runner config.

This directory intentionally holds no duplicate logic — one source of truth per concern.
It is the map to the eval surface, not a second copy of it.
