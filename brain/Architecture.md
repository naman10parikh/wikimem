---
type: architecture
status: active
created: 2026-05-25
updated: 2026-05-25
tags: [wikimem, architecture]
source: docs/architecture.md
related: ["[[MOC - wikimem]]", "[[Configuration]]", "[[Connector Architecture Reference]]"]
---

# Architecture

Navigation note → `docs/architecture.md`.

WikiMem is built on **three layers** of data and **three automations** that operate on
them:

- **raw/** — immutable source documents, date-stamped (`raw/YYYY-MM-DD/`); the LLM never modifies them. Provenance layer.
- **wiki/** — LLM-generated knowledge base: `sources/`, `entities/`, `concepts/`, `syntheses/`, plus `index.md` + `log.md`.
- **AGENTS.md + config.yaml** — per-vault schema and configuration.
- **Automations:** ingest (new sources) · scrape (web refresh) · improve (Observer self-heal).

Read the source for the full ASCII layout and per-layer detail.

## Related

- [[MOC - wikimem]]
- [[Configuration]] · [[Connector Architecture Reference]]
