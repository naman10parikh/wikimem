# wikimem — Long-Term Memory (index)

> Inherited memory-harness structure from Energy. One line per durable fact.
> Layers: this index → topics/ deep-dives → daily/ logs → archive/ (compressed >30d, never deleted).

## Architecture Decisions

- Two-layer data model: `raw/` (immutable provenance) + `wiki/` (LLM-generated). The LLM never writes to raw/. (→ `docs/architecture.md`)
- Three automations operate on the layers: **ingest · scrape · improve**. (→ `docs/architecture.md`)
- MCP-first connectors: WikiMem is a Claude-Connector MCP OAuth 2.1 server (DCR / PKCE S256 / Resource Indicators / refresh rotation / audience binding), not N bespoke OAuth flows. (→ `CHANGELOG.md` v0.10.0, `docs/connector-architecture-reference.md`)

## Key Patterns

- Eval gate before shipping: `pnpm build && pnpm test && wikimem --help` — 123 tests, zero product regression. (→ `CONTEXT.md`)
- Observer self-improvement loop (KARP): auto-categorize (BM25-first, LLM fallback), wiki-wide summary, citation scoring, semantic-similarity edges; Experiment History panel makes it visible. (→ `CHANGELOG.md` v0.10.0)
- Incremental ingest via `wikimem add-source`: mtime + SHA-256 manifest, only NEW/CHANGED files. (→ `CHANGELOG.md` v0.10.0)

## Technology Choices

- npm `wikimem` v0.10.0; bins `wikimem` (CLI) + `wikimem-mcp` (MCP entry). TypeScript, vitest, tsc build.
- LLM providers: Claude, GPT-4o, Ollama (local). 13+ ingestion formats.
- MCP modules: `src/mcp/{http-server,oauth-server,jwt,oauth-store}.ts` (~1,200 lines). discord.js v14, jose v5.

## People & Resources

- Origin: Karpathy's "LLM wiki" gist (2026). See `docs/planning/WIKIMEM-BIBLE.md`.
- Public repo: https://github.com/naman10parikh/wikimem · npm: https://www.npmjs.com/package/wikimem

## What NOT to Do

- Never write to or mutate `raw/` — it's the immutable provenance layer.
- Never pass a Claude-issued Bearer through to a third-party API (confused-deputy); use WikiMem's own provider token.
- Never ship without the eval gate green.

## Operating Model

- Agent-native harness layer added 2026-05-25 additively (Energy formula), no product code modified. See `CLAUDE.md` → "Harness components".
- Commit convention: `feat(skill):` · `feat(employee):` · `feat(company):` for git snap-back at 3 granularities.

## Topic Files Index

- (none yet — promote single lines above into `memory/topics/<topic>.md` as they grow)
