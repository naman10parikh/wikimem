---
type: architecture
status: active
created: 2026-05-25
updated: 2026-05-25
tags: [wikimem, connectors, mcp, oauth]
source: docs/connector-architecture-reference.md
related: ["[[MOC - wikimem]]", "[[OAuth App Registration]]", "[[Architecture]]"]
---

# Connector Architecture Reference

Navigation note → `docs/connector-architecture-reference.md`.

A complete engineering playbook for Claude Connectors: every connector is an MCP server
at the protocol level, with Anthropic layering a curated directory, OAuth brokering, and
credential isolation on top. Reverse-engineers the full path from "Connect" click to
JSON-RPC hitting a third-party MCP server. This is the biblical reference behind
WikiMem's own MCP OAuth 2.1 server (v0.10.0). Navigate there for the deep dive.

## Related

- [[MOC - wikimem]]
- [[OAuth App Registration]] · [[Architecture]]
