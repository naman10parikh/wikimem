# AGENTS.md — WikiMem

The one set of instructions for every coding agent and every person working with WikiMem. `CLAUDE.md` and
`GEMINI.md` import this file. (`AGENTS.md.example` is different: it is the schema file that `wikimem init` copies
into a user's vault.)

## What it does

WikiMem is memory for agents. It turns files, links and connected apps into a linked Markdown wiki, then lets agents
and people search it, ask it questions and improve it. It runs on your machine; the wiki is a folder of Markdown files
and a git repository, and every vault opens in Obsidian.

Its agent employee is **Codex** ([`identity/SOUL.md`](identity/SOUL.md)): it ingests, links, observes and improves.

## Its tools, and how to call them

### Command line (`wikimem`)

Run from a clone with `node dist/index.js <command>` after `pnpm build`, or straight from GitHub with
`npx -y -p github:naman10parikh/wikimem wikimem <command>`. Every command takes `--help`; most take `--vault <path>`
(default: the current folder).

| Command | What it does | Needs an LLM key |
| --- | --- | --- |
| `init [dir]` | Create a vault (`--template personal\|research\|business\|codebase`, `--from-folder`, `--from-repo`) | no (yes with `--from-*`) |
| `ingest <source>` / `add-source <path>` | Turn a file, folder or URL into wiki pages; `add-source` skips unchanged files | yes |
| `search <query>` | BM25 keyword search over the wiki | no |
| `ask <question>` / `query <question>` | Answer from the wiki with cited pages | yes |
| `lint` | Find orphan pages, broken wikilinks and missing summaries | no |
| `status [--json]` | Count pages, words, sources, links and orphans | no |
| `observe [--json]` | Score every page and list weak pages, orphans and gaps; `--improve` spends budget | no (yes with `--improve`) |
| `improve` | Rewrite weak pages through an LLM review | yes |
| `watch`, `scrape`, `sandbox-run` | Auto-ingest `raw/`; pull RSS, GitHub and URLs; fetch untrusted pages inside an E2B sandbox | `sandbox-run` needs `E2B_API_KEY` |
| `serve` | The web app on port 3141, plus the MCP endpoint `/mcp` with OAuth 2.1 | no |
| `mcp` | The MCP server over stdio (same as the `wikimem-mcp` bin) | no |
| `export`, `publish`, `history`, `open`, `duplicates` | Graph export, static site and feeds, change history, open a page, list rejected duplicates | no |

### MCP server (`wikimem-mcp`)

`wikimem-mcp --vault <path>` speaks MCP over stdio; with no `--vault` it serves the current folder. `wikimem serve`
exposes the same tools over HTTP at `/mcp`, behind OAuth 2.1 (dynamic client registration, PKCE S256, resource
indicators), so a Claude custom connector can use it. 19 tools, defined in [`src/mcp-server.ts`](src/mcp-server.ts):

| Group | Tools |
| --- | --- |
| Read | `wikimem_search`, `wikimem_read`, `wikimem_list`, `wikimem_status`, `wikimem_ask` |
| Write | `wikimem_ingest`, `wikimem_ingest_url`, `wikimem_pipeline`, `wikimem_scrape` |
| Improve | `wikimem_observe`, `wikimem_run_observer`, `wikimem_get_report`, `wikimem_improve`, `wikimem_lint` |
| Connectors | `wikimem_connectors`, `wikimem_list_connectors`, `wikimem_connect`, `wikimem_sync`, `wikimem_preview` |

### Skills

| Skill | Use it when |
| --- | --- |
| [`wikimem`](skills/wikimem/SKILL.md) | You need to ingest, search, ask, sync a connector or expose a vault over MCP |
| [`wikimem-ingest-pipeline`](skills/wikimem-ingest-pipeline/SKILL.md) | You turn files, folders or URLs into linted, linked pages, or keep a changing folder in sync |
| [`wikimem-observer`](skills/wikimem-observer/SKILL.md) | You score a vault, find weak or missing pages, or run the improvement loop |

### Sub-agents (`.claude/agents/`)

`vault-curator` reviews a vault's quality and proposes fixes. `mcp-auth-auditor` checks the MCP OAuth 2.1 server and
client against the specification. The others (`architect`, `code-reviewer`, `agent-auditor`, `performance-analyzer`,
`research-agent`, `security-reviewer`, `test-writer`) are general reviewers. All of them research and report; the
parent agent makes the change.

## What not to do

- Never write to a vault's `raw/` folder. It is the record of the original sources.
- Never overwrite a page a person edited without showing the diff first.
- Never pass a token a client gave WikiMem on to a third-party API; use WikiMem's own provider token.
- Never put a key in a file, a log or a URL. Keys come from environment variables (`ANTHROPIC_API_KEY`,
  `OPENAI_API_KEY`, `E2B_API_KEY` and the rest in the README).
- Never run `observe --improve` or `improve` without a budget; the default cap is $2.00.
- Never merge a change that lowers an eval score or fails a test.

## Working on this repository

| Folder | What it holds |
| --- | --- |
| `src/` | Product code: `cli/`, `core/`, `mcp/`, `processors/`, `providers/`, `search/`, `web/` |
| `tests/` | Vitest suites (unit and integration) |
| `eval/` | Golden-task evals (`pnpm eval`) and the weekly self-review |
| `skills/` | The skills above, shipped with the package and the plugin |
| `identity/` | Codex's SOUL, BRAND, HEARTBEAT and memory bootstrap |
| `memory/` | Long-term memory: `MEMORY.md` index and `LEARNINGS.md` |
| `brain/` | An Obsidian vault of this repository's own docs |
| `docs/` | Architecture, configuration, connectors, OAuth app registration |
| `templates/` | Vault templates and slash commands copied by `wikimem init` |

**The gate before any change:** `pnpm build && pnpm test && pnpm eval`. CI runs the same on Node 18, 20 and 22.

**Commits:** conventional (`feat:`, `fix:`, `docs:`, `refactor:`); harness changes may use `feat(skill):`,
`feat(employee):` or `feat(company):` so a change can be rolled back at that size.
