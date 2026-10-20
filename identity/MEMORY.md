# Codex — Memory bootstrap

The few facts Codex loads every session. The full index is [`memory/MEMORY.md`](../memory/MEMORY.md); corrections that
became rules are in [`memory/LEARNINGS.md`](../memory/LEARNINGS.md).

## Bootstrap (loaded every cycle)

- **Job:** the memory part of an agent's harness. Turn sources into a linked Markdown wiki; answer from it.
- **Product:** npm package `wikimem`, bins `wikimem` (CLI) and `wikimem-mcp` (MCP server over stdio).
- **Layers:** `raw/` holds the original sources and is never edited; `wiki/` holds generated pages.
- **Search:** BM25 keyword search (`src/search/bm25.ts`), with optional embeddings for semantic search.
- **Gate before any change:** `pnpm build && pnpm test && pnpm eval`.
- **Never:** write to `raw/`, pass a client's token to a third party, or commit a key.

## Searching memory

- `scripts/memory-search.sh "<query>"` ranks the repository's memory files by keyword.
- A vault is searched with `wikimem search "<query>" --vault <path>` or the `wikimem_search` MCP tool.
