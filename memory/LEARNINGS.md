# wikimem — LEARNINGS (append-only)

Every error → root cause → rule. Auto-compressed when >500 lines (memory-compress.sh).

## 2026-05-25 — MCP-first beats per-provider OAuth

- **What:** v0.10.0 replaced bespoke per-provider OAuth scaffolding with a single
  Claude-Connector-compatible MCP OAuth 2.1 server.
- **Root cause of the old pain:** O(N) integration work per provider + secrets risk in
  logs/repo; hollow connector shells (38/44) that only had a token endpoint.
- **Rule:** Default to the MCP client-server protocol (DCR / PKCE S256 / Resource
  Indicators / refresh rotation / audience binding). One client, every MCP-compliant
  server works. (→ `CHANGELOG.md` v0.10.0, `docs/connector-architecture-reference.md`)

## 2026-05-25 — Build unblocker: no `await import` in non-async functions

- **What:** `karp-003-categorize.ts` had `await import` inside a non-async function,
  breaking the build.
- **Rule:** Use a top-of-file synchronous import (e.g. `writeFileSync`) instead of a
  lazy `await import` in synchronous code paths. (→ `CHANGELOG.md` v0.10.0 Bug Fixes)

## 2026-05-25 — Harness layer is additive

- **What:** The agent-native harness (`.claude/`, `brain/`, `identity/`, `eval/`,
  `memory/`) was layered on top of WikiMem without touching `src/`, `tests/`, `docs/`.
- **Rule:** Adding the harness must never modify product code; the eval gate
  (`pnpm build && pnpm test && wikimem --help`, 123 tests) proves zero regression.

## 2026-10-19 — Docs that name a setting the code never reads

- **What:** the README told users to set `WIKIMEM_VAULT` for the MCP server, and the `wikimem` skill told them to
  set `WIKIMEM_ANTHROPIC_API_KEY`. The code reads neither: the server uses `--vault` (or the current folder) and the
  providers read `ANTHROPIC_API_KEY`.
- **Rule:** before a doc names an environment variable or a flag, grep `src/` for it. A golden eval now runs the
  real commands (`pnpm eval`), so a doc example can be checked against the binary.

## 2026-10-19 — Lint and the observer resolve wikilinks by title only

- **What:** a page linking `[[rag]]` to `rag.md` (title "RAG") is reported as a broken link and leaves `rag.md` an
  orphan, although Obsidian resolves it by file name. Pages WikiMem writes link by title, so its own output is fine.
- **Rule:** open item for the improvement loop: resolve a wikilink by title or by file name, case-insensitively,
  in `src/core/lint.ts` and `src/core/observer.ts`, and add an eval task with a file-name link first.
