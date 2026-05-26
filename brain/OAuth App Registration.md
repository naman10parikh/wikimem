---
type: operations
status: active
created: 2026-05-25
updated: 2026-05-25
tags: [wikimem, oauth, connectors]
source: docs/OAUTH-APP-REGISTRATION.md
related: ["[[MOC - wikimem]]", "[[Connector Architecture Reference]]"]
---

# OAuth App Registration

Navigation note → `docs/OAUTH-APP-REGISTRATION.md`.

Maintainer-facing guide: register each platform's OAuth app **once**. After that, every
WikiMem user just clicks Connect → consent screen → Allow, and their tokens are saved
locally in `.wikimem/tokens.json` on their own machine (no server, no DB, no user
management). Navigate to the source for per-platform steps.

## Related

- [[MOC - wikimem]]
- [[Connector Architecture Reference]]
