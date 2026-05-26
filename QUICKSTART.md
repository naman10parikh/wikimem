# wikimem — Quickstart

WikiMem is a self-improving local-first wiki IDE. Two ways in: use it as a tool, or
develop the repo.

## Use it (npm)

```bash
npx wikimem init my-wiki     # create a vault
cd my-wiki
npx wikimem serve            # start the IDE → http://localhost:3141
```

Ingest from the CLI:

```bash
wikimem ingest paper.pdf
wikimem ingest https://en.wikipedia.org/wiki/Large_language_model
wikimem query "What are the key themes across my sources?"
```

## Develop the repo

```bash
pnpm install                 # install deps
pnpm build                   # tsc → dist/ (also copies web/public + known-servers.json)
pnpm test                    # vitest — 123 tests must pass
wikimem --help               # smoke-check the CLI
```

The full eval gate (run before shipping any change — zero product regression):

```bash
pnpm build && pnpm test && wikimem --help
```

## Where everything lives

- Product code: `src/` (CLI, core engine, web server, MCP server) — see `docs/architecture.md`
- Harness layer (agent-native): `CLAUDE.md` → "Harness components"
- Knowledge graph / navigation: `brain/MOC - wikimem.md`
- Deeper history & roadmap: `docs/planning/` (CONTEXT, MASTER-TODOS, WIKIMEM-BIBLE)
