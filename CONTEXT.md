# wikimem — Session Context

- **What this is:** WikiMem, a self-improving local-first wiki IDE (npm `wikimem` v0.10.0).
  The product code, tests, docs, and CLI all live here and are mature.
- **Harness layer added:** 2026-05-25 — this repo is now a full agent-native harness.
  The inherited harness layer (`.claude/` rules+skills+hooks+agents, `brain/`, `identity/`,
  `eval/`, `memory/`) was added *additively* on top of the existing product, via the
  Energy harness formula. No product code was modified.
- **Eval gate:** `pnpm build && pnpm test && wikimem --help` — 123 tests passing, CLI green.
- **Deeper history:** see `docs/planning/` (CONTEXT, MASTER-TODOS, WIKIMEM-BIBLE, design audits).
- **Operating model:** see `CLAUDE.md` → "Harness components".
