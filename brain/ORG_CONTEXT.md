---
type: company-brain
status: active
created: 2026-05-25
updated: 2026-05-25
tags: [wikimem, company-brain]
related: ["[[MOC - wikimem]]", "[[ORG_MEMORY]]"]
---

# wikimem — ORG_CONTEXT (the company brain's context)

Every agent reads this before acting. "If it is recorded, it happened to the AI."

WikiMem is a self-improving, local-first wiki IDE shipped as the `wikimem` npm CLI
(v0.10.0) and an MCP server. It takes Karpathy's "LLM wiki" idea and turns it into a
full IDE: drop any file across 13+ formats (PDF, audio, video, slides, spreadsheets,
URLs) and it compiles into structured, interlinked wiki pages via Claude, GPT-4o, or
Ollama. The data model is two layers — immutable `raw/` source provenance and
LLM-generated `wiki/` pages (sources/entities/concepts/syntheses) — and three
automations operate on them: **ingest** (new sources in), **scrape** (refresh from the
web), and **improve** (a nightly Observer that re-scores and self-heals the wiki).

As of v0.10.0, WikiMem is also a Claude-Connector-compatible **MCP OAuth 2.1 server**:
paste `https://<host>/mcp` into Claude.ai Custom Connectors and DCR + PKCE + Resource
Indicators handle registration and consent. The repo additionally carries an
agent-native harness layer (added 2026-05-25, additively, via the Energy harness
formula) so the repo itself is self-improving — `.claude/` rules+skills+hooks+agents,
this `brain/` vault, `identity/`, `eval/`, and `memory/`. No product code was modified
to add the harness.

Operating model: act, don't ask; self-improve every session; test as a user. The eval
gate (`pnpm build && pnpm test && wikimem --help`, 123 tests) must stay green before any
change ships.

## Related

- [[MOC - wikimem]] — knowledge-graph hub
- [[ORG_MEMORY]] — what the observer/fleet has learned
