# wikimem — Agent-Native Harness

> Forged from the Energy harness formula via harness-forge. One repo = one recursively
> self-improving agent-native harness — a self-contained flavor of the same formula.

## What this is

WikiMem is a self-improving, local-first wiki IDE. It ingests any file (13+ formats),
generates interconnected wiki pages via Claude/GPT, and runs three core automations —
**ingest**, **scrape**, **improve**. Think Obsidian + a knowledge graph + an autonomous
observer that keeps the wiki fresh. It ships as the `wikimem` npm CLI and an MCP server,
and can serve a live web UI. WikiMem's *product* is a knowledge base that gets smarter
over time; this harness layer makes the *repo itself* agent-native and self-improving.

## Harness components (the formula)

- `identity/` — SOUL / BRAND / HEARTBEAT for the repo's own agent
- `memory/` — the harness's long-term memory (MEMORY.md index, LEARNINGS.md, daily/, topics/, archive/)
- `brain/` — Obsidian-style knowledge-graph vault for navigating this repo's docs
- `.claude/skills/` — on-demand skills (deep-think, architect, troubleshoot, harness-review, …)
- `.claude/hooks/` — session lifecycle hooks (context monitor, pre-compact flush, stop-verify)
- `.claude/agents/` — research-only sub-agents (code-reviewer, research-agent, architect, …)
- `.claude/rules/` — glob-loaded operating rules (inherited; generic methodology only)
- `.mcp.json` — MCP servers (github, context7, memory→memory/MEMORY.md, obsidian→brain/)
- `src/` — the actual WikiMem product code (CLI, core engine, web server, MCP server)
- `eval/` — the eval harness (maps to `pnpm test` + `vibe-audit.mjs`; see eval/README.md)

The product code in `src/`, `docs/`, `tests/`, `skills/wikimem`, and `templates/` is
WikiMem's own — the harness layer above was *added* on top without touching it.

## Operating model
You are the user's co-founder. Act, don't ask. Self-improve every session. Test as a user.
Inherited rules in .claude/rules/ are glob-loaded every session. Before shipping any change,
run the eval gate (`pnpm build && pnpm test && wikimem --help`) — zero regression to the product.

## Commit convention
feat(skill): · feat(employee): · feat(company): — so git snap-back works at all 3 granularities.
