# wikimem

**A knowledge compiler. Drop anything — PDF, audio, video, URL — and get a structured, self-improving wiki.**

[![npm version](https://img.shields.io/npm/v/wikimem.svg)](https://www.npmjs.com/package/wikimem)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

```bash
npx wikimem@latest
```

---

## The idea

Most personal knowledge tools store what you write. WikiMem compiles what you feed it.

Drop a research PDF, an audio recording, a video call, a Slack export, a spreadsheet, or a URL. WikiMem detects the format, extracts the content, and produces structured wiki pages: a source summary, entity pages for people and organizations mentioned, concept pages for ideas and frameworks, and cross-references between them. Everything linked with `[[wikilinks]]`, committed to git, and scored for quality on a nightly cycle.

It is not a note-taking app. You do not have to write anything.

---

## Three-part demo

### 1. Install

```bash
# Create a new vault and open the IDE
npx wikimem@latest init my-wiki
cd my-wiki
npx wikimem serve
# Open http://localhost:3141
```

### 2. Ingest

```bash
# Single file
wikimem ingest paper.pdf

# URL
wikimem ingest https://example.com/article

# Batch — an entire folder
wikimem ingest ./research-papers/

# Watch mode — auto-ingest anything dropped in raw/
wikimem watch
```

Output for each source:
- `wiki/sources/paper.md` — structured summary with citations
- `wiki/entities/openai.md` — entity page, auto-created if new
- `wiki/concepts/transformer-architecture.md` — concept page
- All pages linked with `[[wikilinks]]`, frontmatter, git committed

### 3. Query

```bash
# Ask a question
wikimem ask "What are the tradeoffs between transformers and state space models?"

# Full-text search
wikimem search "attention mechanism"

# Health check — orphans, broken links, missing summaries
wikimem lint

# Run self-improvement cycle
wikimem improve
```

---

## Who this is for

**Claude Code users** — WikiMem ships an MCP server. Add 5 lines to `.mcp.json` and every Claude Code conversation can search and read your compiled knowledge base. Your research is ambient, not manual.

**Knowledge hoarders** — You have PDFs you meant to read, audio from calls you never transcribed, URLs bookmarked and forgotten. WikiMem processes all of them and makes the knowledge navigable.

**AI power users** — You understand the difference between retrieval and compilation. You want structured, auditable, browsable knowledge — not a vector index. You want a system that improves itself.

**Documentation-heavy teams** — One person's research becomes everyone's searchable knowledge. Feed it your Notion exports, Slack history, GitHub issues, internal PDFs. Share the vault folder.

---

## What makes it different

### vs Obsidian

Obsidian stores what you write. WikiMem compiles what you feed it.

In Obsidian, you create notes manually, link them manually, and organize them manually. That works for 50 notes. It does not scale to 500 sources. WikiMem handles the compilation — you get the structured output without doing the manual work.

Output is Obsidian-compatible: wikilinks, YAML frontmatter, standard markdown. Open the vault folder in Obsidian and it works.

### vs Notion AI

Notion AI answers questions about your existing Notion content. WikiMem ingests any format — not just what you've already organized in Notion — and produces a structured knowledge graph you can browse, search, and give to an LLM.

The other difference: Notion AI doesn't improve your knowledge base. WikiMem's Observer automation scores quality and applies fixes nightly.

### vs RAG

RAG retrieves paragraphs at query time. The answer depends on what the embedding model thought was similar.

WikiMem compiles knowledge upfront into structured pages with explicit cross-references. The output is human-readable, auditable, and consistent. You can see exactly what the system knows and why.

For personal knowledge at hundreds-of-sources scale, compilation beats retrieval.

### vs Perplexity Spaces

Perplexity Spaces searches and summarizes public web content. WikiMem compiles your private sources: files you own, internal documents, audio you recorded, URLs you've curated.

The knowledge stays on your machine. Nothing is sent anywhere except LLM API calls (optional if you use Ollama).

### vs Rowboat

Rowboat is a multi-agent API orchestration framework. WikiMem is a knowledge compiler with a native Claude Code integration.

They solve different problems. WikiMem does not orchestrate agents. It builds the knowledge base that agents can read.

---

## Web IDE

`wikimem serve` opens a full-featured web IDE at `localhost:3141`:

- **File tree** — browse wiki pages by category (sources, entities, concepts, syntheses)
- **Tabbed editor** — open multiple pages, WYSIWYG markdown editing with Cmd+S
- **Knowledge graph** — interactive D3 force-directed graph; click to highlight neighborhood, double-click to open
- **Time-lapse** — scrub through git history to watch your wiki grow commit-by-commit
- **Pipeline view** — see exactly how documents flow: detection → extraction → dedup → LLM → pages → git
- **Search** — Cmd+K fuzzy search across all wiki pages
- **Command palette** — Cmd+P for quick actions
- **Settings** — configure API keys, models, and automations from the browser

---

## Claude Code / MCP integration

WikiMem ships a built-in MCP server. Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "wikimem": {
      "command": "npx",
      "args": ["-y", "wikimem", "mcp"],
      "env": {
        "WIKIMEM_VAULT": "/path/to/your/vault"
      }
    }
  }
}
```

Claude Code gains four tools:

| Tool | What it does |
|------|-------------|
| `wikimem_search` | BM25 full-text search across all wiki pages |
| `wikimem_read` | Read any wiki page by title or slug |
| `wikimem_list` | List pages by category (sources, entities, concepts, syntheses) |
| `wikimem_ingest` | Add new content from any conversation |

Your compiled knowledge becomes ambient context — searchable in any session without copy-paste.

---

## Formats supported

| Format | Extensions | Method |
|--------|-----------|--------|
| Text | `.md`, `.txt` | Direct read |
| Structured | `.json`, `.csv`, `.yaml` | Schema-aware extraction |
| PDF | `.pdf` | Text extraction with layout preservation |
| Office | `.docx`, `.pptx`, `.xlsx` | Full document parsing |
| HTML | `.html`, `.htm` | Tag stripping + content extraction |
| Image | `.png`, `.jpg`, `.gif`, `.webp` | Vision model description |
| Audio | `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac` | Whisper / Deepgram transcription |
| Video | `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm` | ffmpeg → Whisper transcription |
| URL | `https://...` | Firecrawl (with key) or fetch fallback |

---

## LLM providers

| Provider | Flag | Default model | Local? |
|----------|------|---------------|--------|
| Claude | `-p claude` | claude-sonnet-4-20250514 | No |
| OpenAI | `-p openai` | gpt-4o | No |
| Ollama | `-p ollama` | llama3.2 | Yes — fully offline |

Ollama mode: no API keys, no network calls, nothing leaves your machine.

---

## CLI reference

| Command | Description |
|---------|-------------|
| `wikimem init [dir]` | Create a new vault (`--template research\|business\|codebase`, `--from-folder`, `--from-repo`) |
| `wikimem serve` | Start the web IDE on port 3141 |
| `wikimem ingest <source>` | Ingest a file, URL, or directory into wiki pages |
| `wikimem ask <question>` | Ask a question — LLM synthesizes an answer from your wiki |
| `wikimem query <question>` | Ask and optionally save the answer as a synthesis page (`--file`) |
| `wikimem search <term>` | BM25 full-text search across all wiki pages |
| `wikimem watch` | File watcher — auto-ingest anything dropped in raw/ |
| `wikimem scrape` | Fetch from configured RSS/GitHub/URL sources |
| `wikimem improve` | Run self-improvement cycle (`--dry-run`, `--threshold 90`) |
| `wikimem lint` | Health check: orphan pages, broken links, missing summaries (`--fix`) |
| `wikimem status` | Vault stats: pages, words, sources, links, orphans |
| `wikimem history` | Browse audit trail and restore snapshots |
| `wikimem mcp` | Start MCP server for Claude Code / Cursor |
| `wikimem publish` | Export as static site, RSS, JSON feed, or digest |
| `wikimem open` | Open vault in Obsidian |
| `wikimem export` | Export wiki pages to other formats |
| `wikimem duplicates` | Detect and manage near-duplicate sources |

---

## Configuration

`wikimem init` creates `config.yaml` in your vault:

```yaml
provider: claude
model: claude-sonnet-4-20250514

sources:
  - name: "HN Front Page"
    type: rss
    url: "https://hnrss.org/frontpage"

  - name: "GitHub Trending TypeScript"
    type: github
    query: "stars:>100 created:>7d language:typescript"

improvement:
  threshold: 80
  schedule: "0 3 * * *"   # 3am nightly
```

Environment variables:

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API (default provider) |
| `OPENAI_API_KEY` | OpenAI GPT-4o |
| `OLLAMA_BASE_URL` | Ollama server (default: `http://localhost:11434`) |
| `FIRECRAWL_API_KEY` | Enhanced URL processing (optional, falls back to fetch) |
| `DEEPGRAM_API_KEY` | Audio transcription (optional, falls back to Whisper CLI) |

---

## Vault structure

```
vault/
├── wiki/
│   ├── index.md          # Content catalog — auto-maintained
│   ├── log.md            # Operation record — auto-maintained
│   ├── sources/          # One summary page per ingested source
│   ├── entities/         # People, organizations, tools
│   ├── concepts/         # Ideas, frameworks, patterns
│   └── syntheses/        # Cross-cutting analyses
├── raw/
│   └── YYYY-MM-DD/       # Immutable source documents by date
├── AGENTS.md             # Schema — wiki structure + conventions
└── config.yaml           # Configuration — provider, sources, schedules
```

**Three layers:** `raw/` (immutable sources) → LLM processing → `wiki/` (structured knowledge). `AGENTS.md` is the schema the LLM reads before every operation. You can edit it to change conventions; the next ingest will follow the updated rules.

---

## Privacy

Everything runs locally. Your wiki is a folder of markdown files.

LLM API calls are optional — Ollama mode is fully offline. No data is sent anywhere by WikiMem itself.

`raw/` is gitignored by default — your source documents stay private.
`config.yaml` is gitignored by default — API keys are never committed.

| Path | Safe to commit? | Reason |
|------|:-:|---------|
| `wiki/` | Yes | LLM-generated summaries, no raw personal data |
| `AGENTS.md` | Yes | Schema file, no personal data |
| `raw/` | No | Your original source files |
| `config.yaml` | No | May contain API keys |

---

## Contributing

WikiMem is MIT licensed and actively maintained. Contributions welcome.

**Quick setup:**

```bash
git clone https://github.com/naman10parikh/wikimem.git
cd wikimem
pnpm install
pnpm build
pnpm test
```

**Run the CLI locally:**

```bash
node dist/index.js init test-vault
node dist/index.js ingest test-vault/raw/sample.md -v test-vault
```

**Adding a new file format processor:**

1. Create `src/processors/your-format.ts`
2. Export `isYourFormat(path: string): boolean` and `processYourFormat(path: string): Promise<ProcessedContent>`
3. Add detection + dispatch in `src/core/ingest.ts`
4. Write tests in `tests/processors/`
5. Add a row to the formats table in README.md

**Adding a new LLM provider:**

1. Implement the `LLMProvider` interface from `src/providers/types.ts`
2. Register in `src/providers/index.ts`
3. Document the environment variable in README.md

**Commit conventions:**

```
feat: add Deepgram audio transcription provider
fix: handle empty PDF text extraction gracefully
refactor: extract BM25 tokenizer into separate module
docs: update configuration guide
test: add E2E tests for ingest pipeline
```

**Pull requests:** one feature or fix per PR, `pnpm build && pnpm test` must pass, clear description of what and why.

**Issues:** include `wikimem --version`, Node version, OS, and reproduction steps.

Full contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Credits

Inspired by [Andrej Karpathy's LLM wiki pattern](https://x.com/karpathy/status/1908625766490001799) — the observation that LLMs should compile knowledge into structured, interlinked wikis rather than retrieving chunks from vector stores at query time.

Built with [Express](https://expressjs.com/), [D3](https://d3js.org/), [simple-git](https://github.com/steveukx/git-js), [chokidar](https://github.com/paulmillr/chokidar), [pdf-parse](https://github.com/modesty/pdf-parse), [mammoth](https://github.com/mwilliamson/mammoth.js), and the [Anthropic](https://docs.anthropic.com/) / [OpenAI](https://platform.openai.com/) / [Ollama](https://ollama.com/) APIs.

---

## License

MIT — see [LICENSE](LICENSE).
