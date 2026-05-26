# AGENTS.md — wikimem repo agent conventions

How AI agents (Claude Code, sub-agents, the nightly observer) work **inside this
repository**. This is about developing WikiMem.

> Not to be confused with `AGENTS.md.example` — that file is the schema a WikiMem
> **user's vault** ships with (it documents the `raw/` + `wiki/` page conventions an
> end user's generated wiki follows). This file (`AGENTS.md`) is about the *repo's own*
> agent setup.

## Start here

1. `CLAUDE.md` — operating brief + harness-component map + commit convention.
2. `CONTEXT.md` — current state and what's next.
3. `brain/MOC - wikimem.md` — knowledge-graph hub; navigate to any doc from here.
4. `docs/planning/MASTER-TODOS.md` — the single source of truth for outstanding work.

## Repo directories an agent touches

| Directory        | What it is                                                              |
| ---------------- | ----------------------------------------------------------------------- |
| `src/`           | Product code: `cli/`, `core/`, `mcp/`, `processors/`, `providers/`, `search/`, `templates/`, `web/` |
| `eval/`          | Eval harness front door (maps to `pnpm test` + `vibe-audit.mjs`)        |
| `tests/`         | Unit/integration tests (vitest); `e2e/` + `processors/` reserved        |
| `docs/`          | Product + planning docs (architecture, configuration, connectors, planning/) |
| `brain/`         | Obsidian-style navigation vault (MOC, ORG_CONTEXT, ORG_MEMORY)          |
| `memory/`        | Harness long-term memory (MEMORY.md index, LEARNINGS.md, daily/, topics/, archive/) |
| `identity/`      | The repo agent's SOUL / BRAND / HEARTBEAT / MEMORY                      |
| `.claude/`       | `skills/`, `agents/` (research-only sub-agents), `hooks/`, `rules/`, `commands/` |
| `templates/`     | Seed vault templates copied by `wikimem init`                           |
| `marketing/`, `launch-drafts/`, `public/`, `screenshots/`, `examples/`, `scripts/` | Launch copy, static assets, captures, samples, tooling |

## Working rules (inherited from `.claude/rules/`, glob-loaded every session)

- **Act, don't ask.** High-agency. Escalate only for credentials or business calls.
- **Eval gate before shipping:** `pnpm build && pnpm test && wikimem --help` — 123 tests must stay green. Zero product regression.
- **Sub-agents research/plan only** — the parent implements. See `.claude/agents/`.
- **Test as a user** — for UI work, run `wikimem serve` and verify via `scripts/vibe-audit.mjs`.
- **One source of truth per topic** — update in place, never v2/v3.

## Commit convention

`feat(skill):` · `feat(employee):` · `feat(company):` — so git snap-back works at all
three granularities. Also `feat:`, `fix:`, `docs:`, `refactor:` for product changes.

## Related

- [[MOC - wikimem]] — knowledge-graph hub
- `CLAUDE.md` — full operating brief
