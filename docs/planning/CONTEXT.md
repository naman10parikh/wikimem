# WikiMem — Session Context

> Last updated: **2026-04-10** · v0.8.0 · Ralph Loop v10 (Research Sprint)

---

## What WikiMem Is

A self-improving, local-first wiki IDE that ingests any file (13+ formats), generates interconnected wiki pages via Claude/GPT, and runs three core automations: **ingest**, **scrape**, **improve**. Think Obsidian + Graphify + Rowboat — but self-improving. Evolution of Karpathy's LLM wiki concept.

## The 3-Repo Setup (CRITICAL)

1. **`$PROJECT_ROOT/`** — Control center. Contains `wikimem/` docs (MASTER-TODOS, Bible, CONTEXT, MAINTAINER-HANDOFF), skills, research. Never contains product code.
2. **`$HOME/llmwiki/`** — The OSS product repo. Published as `wikimem` v0.8.0 on npm. All code changes go here.
3. **`$HOME/test-wiki/`** — Standalone test vault (own git repo, NOT inside energy). Fast git ops (172ms).

**Server command:**

```bash
cd $HOME/llmwiki && ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" OPENAI_API_KEY="$OPENAI_API_KEY" node dist/index.js serve --vault $HOME/test-wiki --port 3456
```

**NEVER use `$PROJECT_ROOT/my-wiki`** — inside energy repo = 30s+ git latency.

---

## Current State (2026-04-09 — v0.8.0, Ralph Loop v9)

- **Test Vault:** `$HOME/test-wiki/` — 152 pages, 34,768 words, 32 sources, 1,807 links, 0 orphans
- **Product repo:** `$HOME/llmwiki` — v0.8.0, published on npm, pushed to GitHub
- **Server:** localhost:3456, vault = $HOME/test-wiki
- **API Keys:** ANTHROPIC_API_KEY and OPENAI_API_KEY in your local .env
- **Ralph Loop v9:** Full codebase audit discovered 20+ items already complete but unmarked. Context menu fixed, appearance settings enhanced, browser E2E verified.

### What shipped in v0.8.0

| Feature                                                 | Status                    |
| ------------------------------------------------------- | ------------------------- |
| WYSIWYG editor (markdown shortcuts, floating toolbar)   | Coded                     |
| Editable Properties (tag chips, type dropdown, + Add)   | Coded                     |
| Claude Code backend (settings toggle, CLI spawn)        | Coded + API tested        |
| OAuth connectors (GitHub/Slack/Google/Linear/Jira)      | Infrastructure built      |
| File operations (rename/delete/move wiki+raw, drag)     | Backend + frontend coded  |
| Source Control (Git branch icon, actor badges)          | Verified in browser       |
| CLI commands (search, ask, open, export)                | Built, build passes       |
| MCP server (5 tools)                                    | All 5 tested via JSON-RPC |
| Pipeline UX (SVG icons, voice recording, folder upload) | Coded                     |
| Time-lapse (starts from empty, auto-scroll)             | Verified in browser       |
| Sidebar cleanup (removed dead tabs)                     | Verified in browser       |
| Raw preview (proper type labels)                        | Coded                     |
| Observer (freshness/readability, budget controls)       | Tested via API            |
| Privacy (.gitignore hardened)                           | Verified                  |
| README (complete rewrite)                               | Published                 |

### Still open — Highest Priority

| ID                   | Area                                      | Status                   |
| -------------------- | ----------------------------------------- | ------------------------ |
| OAUTH-E2E-\*         | Test OAuth flows with real credentials    | Needs real API keys      |
| OAUTH-SYNC-\*        | Post-auth data sync from providers        | Not started              |
| CC-BACKEND-002-005   | Claude Code slash commands, CronCreate    | Not started              |
| WYSIWYG-004          | Floating selection toolbar (Notion-style) | Not started              |
| WIKI-LAYOUT-002/003  | Inline-editable Properties, merge infobox | Not started              |
| OBS-001-004          | Observer open-endedness, budget controls  | Not started              |
| Content distribution | X thread + HN post                        | Drafted + research agent |

**v9 audit found 20+ items already complete but unmarked — see MASTER-TODOS §35.**

### v10 Research Sprint (2026-04-10)

| Research Area                  | Key Finding                                              | Action                                   |
| ------------------------------ | -------------------------------------------------------- | ---------------------------------------- |
| "G-Brain" = GStack (Garry Tan) | 50K stars Claude Code skill pack, NOT a wiki             | Not competitive — complementary          |
| MemPalace (Milla Jovovich)     | 21.7K stars, spatial memory, 96.6% LongMemEval           | Different category (agent memory)        |
| Dex                            | 4 different projects — none directly competitive         | Low threat                               |
| Atomic                         | Rust, semantic similarity, spatial canvas, Tauri desktop | **Direct competitor** — watch closely    |
| DocMason                       | Office files, source boundary enforcement                | Moderate — niche                         |
| llmwiki.app                    | Hosted web app, Claude MCP native                        | **Direct competitor** — hosted advantage |
| MarkItDown (Microsoft)         | 92.8K stars, universal format→markdown                   | **Must integrate** as pre-processor      |
| IBM Docling                    | CV-based PDF parsing, 30x faster than OCR                | Add as premium PDF option                |
| Groq Whisper                   | $0.0002/min (30x cheaper than OpenAI)                    | Switch default audio transcription       |
| Prompt caching                 | sage-wiki has it, 50-90% cost savings                    | **P0** — implement immediately           |
| OAuth architecture             | Device flow (like gh auth) is best for CLI               | Use @octokit/auth-oauth-device           |

**80+ new TODO items added to MASTER-TODOS §38-42. See updated priority order.**

---

## Architecture

```
test-wiki/
├── wiki/           ← LLM-generated markdown (152 pages)
├── raw/            ← Immutable sources (chokidar watcher)
│   ├── 2026-04-09/ ← Date-stamped directory
│   └── test-formats/ ← 13 format test files
├── AGENTS.md
├── config.yaml
├── index.md, log.md
└── .wikimem-connectors.json
```

**Stack:** TypeScript · Express 5 · D3 v7 · simple-git · chokidar · marked · gray-matter · Turndown.js

---

## Key File Paths

| Path                                 | Role                             |
| ------------------------------------ | -------------------------------- |
| `energy/wikimem/MASTER-TODOS.md`     | **Source of truth — 250+ items** |
| `energy/wikimem/MAINTAINER-HANDOFF.md` | Next-session prompt + narrative  |
| `energy/wikimem/CONTEXT.md`          | This file                        |
| `llmwiki/src/web/server.ts`          | All HTTP APIs                    |
| `llmwiki/src/web/public/index.html`  | SPA (~7000 lines)                |
| `llmwiki/src/core/git.ts`            | Git ops + branches + PR + diff   |
| `llmwiki/src/core/claude-code.ts`    | Claude Code CLI backend          |
| `llmwiki/src/core/observer.ts`       | Observer automation              |
| `llmwiki/src/core/connectors.ts`     | Connector manager                |
| `llmwiki/src/core/audit-trail.ts`    | Append-only audit log            |
| `llmwiki/src/mcp-server.ts`          | MCP server (5 tools)             |
