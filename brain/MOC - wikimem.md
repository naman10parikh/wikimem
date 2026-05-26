---
type: moc
status: active
created: 2026-05-25
updated: 2026-05-25
tags: [wikimem, moc]
related: ["[[ORG_CONTEXT]]", "[[ORG_MEMORY]]"]
---

# MOC — wikimem

Master hub for this harness's brain. WikiMem is a self-improving, local-first wiki IDE
(npm `wikimem` v0.10.0) — ingest anything (13+ formats), generate an interlinked wiki
via any LLM, and run three automations (**ingest · scrape · improve**). This map
wikilinks every doc and names every top-level folder so nothing is orphaned.

## Company Brain

- [[ORG_CONTEXT]] — what this repo is and its operating context
- [[ORG_MEMORY]] — what the fleet/observer has learned

## Doc spine (root)

- `CLAUDE.md` — agent operating brief + harness-component map + commit convention
- `CONTEXT.md` — current state + what's next
- `README.md` — human/OSS front door (install + what it does)
- `QUICKSTART.md` — inline build + run commands
- `AGENTS.md` — THIS repo's agent-orchestration conventions
- `AGENTS.md.example` — the schema a WikiMem **user's vault** ships with (distinct from `AGENTS.md`)

## Architecture

- [[Architecture]] — `docs/architecture.md` — three layers (raw/ → wiki/) + three automations
- [[Configuration]] — `docs/configuration.md` — `config.yaml` reference
- [[Connector Architecture Reference]] — `docs/connector-architecture-reference.md` — Claude Connectors / MCP deep dive
- [[OAuth App Registration]] — `docs/OAUTH-APP-REGISTRATION.md` — maintainer one-time OAuth setup per platform
- [[AgentDial Integration]] — `docs/agentdial-integration.md` — give a wiki an agent identity (email/Slack/SMS in)

## Operations & launch

- [[Value Prop — Claude Code]] — `docs/value-prop-claude-code.md` — why add WikiMem if you already use Claude Code + Obsidian
- [[Competitive Landscape]] — `docs/competitive-landscape.md` — the LLM-wiki competitor field
- `COMPARISON.md` — WikiMem vs. the alternatives (one-line verdicts)
- `LAUNCH-CONTENT.md` — anti-slop launch copy
- `README-LAUNCH.md` — launch-variant README
- `DEMO-SCRIPT.md` — 60-second demo narration
- `CONTRIBUTING.md` — contributor guide
- `CHANGELOG.md` — release history (current: v0.10.0)

## Planning archive (`docs/planning/`)

- [[Planning — CONTEXT]] — `docs/planning/CONTEXT.md` — historical session context (v0.8.0 era)
- [[Master TODOs]] — `docs/planning/MASTER-TODOS.md` — single source of truth for outstanding work
- [[WikiMem Bible]] — `docs/planning/WIKIMEM-BIBLE.md` — the complete project document (research → roadmap)
- `docs/planning/CHANGELOG-DRAFT-v0.10.0.md` — draft notes folded into CHANGELOG
- `docs/planning/COMPETITOR-UX-2026-04-17.md` — 10-competitor UX teardown
- `docs/planning/DESIGN-AUDIT-2026-04-17.md` — typography/design consistency audit
- `docs/planning/OBSIDIAN-PARITY-BLUEPRINT-2026-04-23.md` — Obsidian-parity design blueprint
- `docs/planning/PLAN-CP079-2026-04-23.md` — plan for maintainer prompt #79

## Repository folders

- `src/` — product code: `cli/`, `core/`, `mcp/`, `processors/`, `providers/`, `search/`, `templates/`, `web/`
- `eval/` — eval harness front door (`pnpm test` + `vibe-audit.mjs`)
- `tests/` — unit/integration tests; `e2e/` + `processors/` reserved
- `docs/` — product + planning docs (this map covers all of them)
- `brain/` — this Obsidian-style navigation vault
- `memory/` — harness long-term memory (MEMORY.md, LEARNINGS.md, daily/, topics/, archive/, maintainer-prompts/)
- `identity/` — the repo agent's SOUL / BRAND / HEARTBEAT / MEMORY
- `.claude/` — skills, research-only sub-agents, hooks, rules, commands
- `templates/` — seed vault templates copied by `wikimem init`
- `marketing/` — marketing assets and copy
- `launch-drafts/` — per-channel launch posts (X, Show HN, DEV.to, Reddit, …)
- `public/` — static web assets
- `screenshots/` — design-audit / vibe-audit captures
- `scripts/` — tooling (`vibe-audit.mjs`, build helpers)
- `dist/` — build output (gitignored)

## Decisions

- MCP-first connectors (one OAuth 2.1 client-server protocol, not N bespoke flows) — see [[Connector Architecture Reference]] and [[OAuth App Registration]].
- raw/ is immutable provenance; the LLM only ever writes to wiki/ — see [[Architecture]].
- Eval gate is `pnpm build && pnpm test && wikimem --help` (123 tests) — see [[ORG_MEMORY]].
