# WikiMem — Agent-Harness TODOS

> Human- and agent-readable task list for the WikiMem harness completion effort.
> Last updated: 2026-06-03 (CP117 WAVE-D pass).
> Checked items were completed in the CP117 pass. Unchecked items remain open.
>
> For product-level todos see `docs/planning/MASTER-TODOS.md` (the canonical backlog).
> This file tracks harness-level gaps only.

---

## Gap 1 — Unified Self-Improve Scorers

- [x] **HARNESS-001** (2026-06-03): Export `scorePage` and `MAX_SCORE` from `src/core/observer.ts` so other modules share a single scorer. Also exported `buildIncomingLinksMap`.
- [x] **HARNESS-002** (2026-06-03): Refactor `src/core/improve.ts` to use `scorePage()` (24-point) for per-page dimension aggregation instead of its own 5 heuristic functions. `calculateCrossLinking`, `calculateOrganization`, and `calculateFreshness` removed; `calculateCoverage` kept (wiki-level only). Both `wikimem improve` and `wikimem observe` now report the same quality numbers.
- [ ] **HARNESS-003**: Write a unit test asserting that `improveWiki()` and `runObserver()` return the same average score for the same vault. Currently tested behaviorally through existing test suite but not with an explicit cross-module assertion.

## Gap 2 — `observe` CLI Command

- [x] **HARNESS-010** (2026-06-03): Created `src/cli/commands/observe.ts` — registers `wikimem observe` command. Options: `--vault`, `--model`, `--max-pages`, `--budget`, `--improve`, `--max-improvements`, `--json`. Outputs human-readable summary or raw JSON. Delegates to `runObserver()`.
- [x] **HARNESS-011** (2026-06-03): Registered `registerObserveCommand` in `src/cli/index.ts`.
- [x] **HARNESS-012** (2026-06-03): Added `wikimem observe` to the CLI Reference table in `README.md`.
- [ ] **HARNESS-013**: Add a vitest unit test for `registerObserveCommand` (at minimum: command name registered, `--help` output contains expected flags).
- [ ] **HARNESS-014**: Add `wikimem observe` to the daily `HEARTBEAT.md` cron entry (optional nightly cron via `node-cron`).

## Gap 3 — Fix Stale Connectors Table in Docs

- [x] **HARNESS-020** (2026-06-03): Updated `README.md` connectors table — Slack, Gmail/Google Drive, RSS feeds, Discord, Notion/Linear/Jira changed from "Coming soon" to "Shipped". Added Microsoft 365/LinkedIn row as the remaining "Coming soon". Table now reflects actual connector status per CHANGELOG.md and MASTER-TODOS.md.
- [ ] **HARNESS-021**: Cross-check `docs/configuration.md` connectors section against actual connector list (currently configuration.md only documents `rss`, `github`, `url` as source types — does not document OAuth connectors). Add a short OAuth connectors section.
- [ ] **HARNESS-022**: Update `launch-drafts/INDEX.md` key numbers — "38 connectors" was the v0.9.0 count; v0.10.0 is 44. The one-line pitch in INDEX.md should read "44 connectors".

## Gap 4 — npm Launch Drafts

- [x] **HARNESS-030** (2026-06-03): Wrote `launch-drafts/2026-06-03-v0.10.0-npm.md` — publish checklist, `npm publish` command, post-publish verification steps, changelog excerpt, and platform post talking points for v0.10.0. Does NOT publish — chairman must run `npm login` and `npm publish` (see chairmanBlocked).
- [ ] **HARNESS-031**: Chairman action — run `npm login` (as the wikimem account or naman10parikh), then `npm publish --access public` from `/Users/naman/llmwiki`. See `launch-drafts/2026-06-03-v0.10.0-npm.md` for the full checklist.
- [ ] **HARNESS-032**: After publish: update `launch-drafts/INDEX.md` with v0.10.0 asset and update key numbers (44 connectors, 19 MCP tools, `wikimem observe`).

## Remaining Open Gaps (not closed in this pass)

- [ ] **HARNESS-040**: Improve harness eval coverage — add L2 behavioral tests for `observe` and `improve` commands using a fixture vault. Currently only observer budget tests exist.
- [ ] **HARNESS-041**: `identity/HEARTBEAT.md` — add `wikimem observe` as a nightly heartbeat step (cron 3am, same as the observer cron already wired in `server.ts`).
- [ ] **HARNESS-042**: `brain/` vault — add a note for the unified scorer decision (architecture decision record).
- [ ] **HARNESS-043**: `memory/LEARNINGS.md` — append CP117 learnings: "scorePage and buildIncomingLinksMap are now the canonical cross-module scorer primitives in observer.ts".
