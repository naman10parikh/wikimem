---
type: company-brain
status: active
created: 2026-05-25
updated: 2026-05-25
tags: [wikimem, company-brain, learnings]
related: ["[[MOC - wikimem]]", "[[ORG_CONTEXT]]"]
---

# wikimem — ORG_MEMORY (the company brain's memory)

Every agent writes back here after acting. The fleet inherits every workflow's learnings.

## Seeded learnings

- **Eval gate is non-negotiable.** `pnpm build && pnpm test && wikimem --help` — 123
  tests across the suite. A change isn't done until this is green; zero product
  regression. (Source: `CONTEXT.md`, `CHANGELOG.md`.)
- **MCP-first connectors beat bespoke OAuth.** v0.10.0 made WikiMem a Claude-Connector
  MCP OAuth 2.1 server (DCR / PKCE S256 / Resource Indicators / refresh rotation /
  audience binding). One client-server protocol scales O(1) vs. O(N) per-provider OAuth
  flows. (Source: `CHANGELOG.md` v0.10.0, `docs/connector-architecture-reference.md`.)
- **raw/ is immutable; the LLM only writes wiki/.** Provenance never mutates — every
  wiki page traces back to a `raw/` file via its `sources:` frontmatter. (Source:
  `docs/architecture.md`.)
- **Observer is the moat.** The KARP self-improvement loop (auto-categorize, wiki-wide
  summary, citation scoring, semantic-similarity edges) plus the Experiment History
  panel make self-improvement *visible* — no competitor shows it transparently.
  (Source: `CHANGELOG.md` v0.10.0.)
- **Harness layer was added additively (2026-05-25).** The Energy harness formula was
  layered on top without touching product code in `src/`, `tests/`, `docs/`. (Source:
  `CONTEXT.md`.)

## Related

- [[MOC - wikimem]] — knowledge-graph hub
- [[ORG_CONTEXT]] — what this repo is
