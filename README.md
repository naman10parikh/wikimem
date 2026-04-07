# llmwiki

[![npm version](https://img.shields.io/npm/v/llmwiki.svg)](https://www.npmjs.com/package/llmwiki)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](#tests)

**Build self-improving knowledge bases with LLMs.**

Drop files in. Get a structured, interlinked wiki out. It improves itself while you sleep.

```bash
npx llmwiki init my-wiki
```

```
raw/                        wiki/
  2026-04-07/                 index.md ........... content catalog
    paper.pdf     ──LLM──>   sources/paper.md ... summary + citations
    podcast.mp3               entities/openai.md . people, orgs, tools
    screenshot.png            concepts/rag.md .... ideas + frameworks
    blog-url                  syntheses/ ......... cross-cutting analysis
```

llmwiki processes any source (text, PDF, audio, video, images, URLs), compiles it into an interlinked markdown wiki with frontmatter and `[[wikilinks]]`, and opens directly in Obsidian.

Works with **Claude, OpenAI, or Ollama** (local). Your data stays on your machine.

Inspired by [Andrej Karpathy's LLM Wiki pattern](https://x.com/karpathy/status/1908625766490001799).

## Install

```bash
npm install -g llmwiki
```

**Requirements:** Node.js >= 18 &middot; An LLM API key (or Ollama running locally)

## Quick Start

```bash
# 1. Create a vault
llmwiki init my-wiki
cd my-wiki

# 2. Ingest something
llmwiki ingest https://en.wikipedia.org/wiki/Large_language_model
llmwiki ingest ~/Documents/research-paper.pdf

# 3. Ask questions
llmwiki query "What are the key differences between RAG and compiled knowledge?"
```

That's it. Your wiki is now a folder of markdown files you can open in Obsidian, VS Code, or any text editor.

## Why llmwiki?

**The problem:** You have dozens of sources &mdash; papers, podcasts, articles, screenshots, meeting recordings. They sit in folders. You forget what's in them. When you need something, you search and re-read.

**RAG approach:** Chunk documents, embed them, retrieve at query time. Lossy, opaque, and the "knowledge" lives in a vector database you can't read.

**llmwiki approach:** Compile sources into structured markdown pages with summaries, cross-references, and citations. The knowledge is readable, editable, version-controlled, and improves itself over time.

| | RAG | llmwiki |
|---|---|---|
| **Storage** | Vector embeddings | Plain markdown files |
| **Readable?** | No (opaque vectors) | Yes (open in any editor) |
| **Editable?** | Rebuild index | Edit any page |
| **Version control** | Difficult | `git diff` |
| **Self-improving** | No | Yes (LLM Council) |
| **Works offline** | Depends | Yes (with Ollama) |
| **Obsidian** | Plugin required | Native (`[[wikilinks]]`) |

## Features

- [x] **Multi-format ingestion** &mdash; text, PDF, audio, video, images, URLs, Office docs
- [x] **Multi-model support** &mdash; Claude, OpenAI, Ollama (local)
- [x] **Obsidian-native** &mdash; `[[wikilinks]]`, YAML frontmatter, opens directly as vault
- [x] **Semantic dedup** &mdash; rejects near-duplicate sources automatically
- [x] **BM25 search** &mdash; zero-dependency full-text search, no external services
- [x] **Auto-indexing** &mdash; `index.md` + `log.md` maintained automatically
- [x] **Watch mode** &mdash; drop files into `raw/`, auto-ingested
- [x] **Self-improvement** &mdash; LLM Council scores your wiki and fixes issues
- [x] **External scraping** &mdash; pull from RSS, GitHub, URLs on a schedule
- [x] **Health checks** &mdash; find orphan pages, broken links, missing summaries
- [x] **File-back answers** &mdash; query results saved as synthesis pages
- [x] **Schema co-evolution** &mdash; AGENTS.md evolves with your wiki
- [x] **Domain templates** &mdash; personal, research, business, codebase
- [x] **Local-first** &mdash; everything is files. No database. No cloud dependency.

## Architecture

```
┌────────────────────────────────────────────────────┐
│                    llmwiki CLI                      │
│                                                    │
│  llmwiki init         Create a new vault           │
│  llmwiki ingest       Process source → wiki pages  │
│  llmwiki query        Ask questions with citations  │
│  llmwiki lint         Health-check the wiki        │
│  llmwiki watch        Auto-ingest on file drop     │
│  llmwiki scrape       Fetch from external sources  │
│  llmwiki improve      Self-improvement cycle       │
│  llmwiki status       Vault statistics             │
├──────────────────────┬─────────────────────────────┤
│   Three Layers       │   Three Automations         │
│                      │                             │
│   raw/               │   A1: Ingest & Process      │
│   (immutable)   <────│   file/URL → markdown       │
│                      │   → place in wiki/          │
│   wiki/              │                             │
│   (LLM-owned)   <────│   A2: External Scrape       │
│                      │   RSS, GitHub, web → raw/   │
│   AGENTS.md          │                             │
│   (schema)      <────│   A3: Self-Improve          │
│                      │   LLM Council → score → fix │
├──────────────────────┴─────────────────────────────┤
│                  LLM Providers                     │
│   Claude (Anthropic) · OpenAI (GPT) · Ollama      │
├────────────────────────────────────────────────────┤
│                  Processors                        │
│   Text · PDF · Audio · Video · Image · URL · HTML  │
└────────────────────────────────────────────────────┘
```

### Three Layers

1. **`raw/`** &mdash; Immutable source documents. Date-stamped subdirectories. Never modified by the LLM.
2. **`wiki/`** &mdash; LLM-generated markdown. Source summaries, entity pages, concept pages, synthesis pages. The LLM owns this entirely.
3. **`AGENTS.md`** &mdash; Schema file. Tells the LLM how the wiki is structured, what conventions to follow, how to process sources. Co-evolved by you and the LLM.

### Three Automations

- **A1: Ingest & Process** &mdash; Detects file type, runs the appropriate processor (Whisper for audio, ffmpeg+Whisper for video, Claude Vision for images, text extraction for PDF), asks the LLM to produce wiki pages with cross-references.
- **A2: External Scrape** &mdash; Fetches from RSS feeds, GitHub trending, web URLs. Deposits results in `raw/` and triggers A1 automatically.
- **A3: Self-Improve** &mdash; LLM Council evaluates wiki quality across 5 dimensions (coverage, consistency, cross-linking, freshness, organization), proposes improvements, and applies them if below a configurable threshold.

## All Commands

### `llmwiki init [directory]`

Create a new vault with the standard directory structure.

```bash
llmwiki init my-wiki                    # Create in my-wiki/
llmwiki init .                          # Initialize current directory
llmwiki init my-wiki --template research   # Use research template
llmwiki init my-wiki --force            # Overwrite existing
```

Templates: `personal` (default), `research`, `business`, `codebase`

### `llmwiki ingest <source>`

Process a file or URL into wiki pages.

```bash
llmwiki ingest paper.pdf                # PDF → extract text → wiki pages
llmwiki ingest podcast.mp3              # Audio → Whisper transcription → wiki
llmwiki ingest screenshot.png           # Image → Claude Vision description → wiki
llmwiki ingest lecture.mp4              # Video → ffmpeg → Whisper → wiki
llmwiki ingest article.md               # Markdown → wiki pages
llmwiki ingest data.json                # JSON → code block in wiki
llmwiki ingest page.html                # HTML → strip tags → wiki
llmwiki ingest report.docx              # Office → basic extraction → wiki
llmwiki ingest https://example.com/post # URL → Firecrawl/fetch → wiki
llmwiki ingest raw/2026-04-07/file.md   # Re-ingest from raw/
```

Each source is auto-detected by file type, copied to `raw/{date}/`, checked for duplicates, compiled into wiki pages by the LLM, and indexed. Use `-p` to pick a provider, `-m` for a specific model, `--verbose` for detailed output.

### `llmwiki query <question>`

Ask a question and get an answer synthesized from your wiki.

```bash
llmwiki query "What are the main themes across my sources?"
llmwiki query "Compare approaches to knowledge management" --file
llmwiki query "Who is mentioned most frequently?" -p openai
```

Use `--file` to save the answer as a synthesis page in `wiki/syntheses/`. The query engine uses BM25 search to find relevant pages, reads the top 10, and synthesizes an answer with `[[wikilink]]` citations.

### `llmwiki lint`

Health-check the wiki for structural issues.

```bash
llmwiki lint                  # Check for issues
llmwiki lint --fix            # Auto-fix where possible
```

Checks for:
- Orphan pages (no inbound `[[wikilinks]]`)
- Broken wikilinks (links to non-existent pages)
- Pages missing frontmatter summaries
- Near-empty pages (< 10 words)

Reports a quality score out of 100.

### `llmwiki watch`

Watch the `raw/` directory and auto-ingest new files.

```bash
llmwiki watch                 # Watch current vault
llmwiki watch -v ./my-wiki    # Watch a specific vault
```

Uses `chokidar` for reliable cross-platform file watching. Waits for writes to stabilize before ingesting (2-second debounce). Press `Ctrl+C` to stop.

### `llmwiki scrape`

Fetch content from configured external sources and deposit in `raw/`.

```bash
llmwiki scrape                # Run all configured sources
llmwiki scrape -s "HN Top"   # Run a specific source
```

Sources are configured in `config.yaml`:

```yaml
sources:
  - name: "HN Top Stories"
    type: rss
    url: "https://hnrss.org/frontpage"

  - name: "GitHub Trending TS"
    type: github
    query: "stars:>100 created:>7d language:typescript"

  - name: "Company Blog"
    type: url
    url: "https://example.com/blog"
```

Supported source types: `rss`, `github`, `url`

### `llmwiki improve`

Run the self-improvement cycle (Automation 3).

```bash
llmwiki improve                   # Evaluate and improve
llmwiki improve --dry-run         # Show what would change
llmwiki improve --threshold 90    # Stricter quality bar
```

The improvement cycle:

1. **Score** &mdash; Evaluates 5 quality dimensions (coverage, consistency, cross-linking, freshness, organization)
2. **Decide** &mdash; If score < threshold (default 80), improvements are needed
3. **Improve** &mdash; Proposes actions: add cross-links, create missing pages, expand stubs, flag contradictions
4. **Log** &mdash; Records what changed and why in `log.md`

### `llmwiki status`

Show vault statistics at a glance.

```bash
llmwiki status
```

```
llmwiki vault status
────────────────────────────────────
  Pages:        42
  Words:        18,340
  Sources:      15
  Wiki links:   127
  Orphan pages: 2
  Last updated: 2026-04-07
```

## Configuration

After `llmwiki init`, your vault contains a `config.yaml` where you set the LLM provider, external sources, self-improvement schedule, and processing options.

See [docs/configuration.md](docs/configuration.md) for the full reference.

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API access (default provider) |
| `OPENAI_API_KEY` | OpenAI API access |
| `OLLAMA_BASE_URL` | Ollama server URL (default: `http://localhost:11434`) |
| `FIRECRAWL_API_KEY` | Enhanced URL-to-markdown (optional, falls back to fetch) |
| `DEEPGRAM_API_KEY` | Audio transcription API (optional, falls back to Whisper) |

## Multi-Model Support

llmwiki works with any major LLM provider. Choose at init time or per-command.

| Provider | Flag | Default Model | Env Variable |
|----------|------|---------------|-------------|
| **Claude** | `-p claude` | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` |
| **OpenAI** | `-p openai` | `gpt-4o` | `OPENAI_API_KEY` |
| **Ollama** | `-p ollama` | `llama3.2` | `OLLAMA_BASE_URL` |

```bash
# Use Claude (default)
llmwiki ingest paper.pdf

# Use OpenAI
llmwiki ingest paper.pdf -p openai -m gpt-4o-mini

# Use Ollama (fully local, no API keys)
llmwiki ingest paper.pdf -p ollama -m llama3.2
```

## Multi-Format Support

| Format | Extensions | Processor | Requirements |
|--------|-----------|-----------|-------------|
| **Text** | `.md`, `.txt`, `.csv` | Direct read | None |
| **PDF** | `.pdf` | Built-in text extraction | None |
| **Audio** | `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.aac` | Whisper / Deepgram | `whisper` CLI or `DEEPGRAM_API_KEY` |
| **Video** | `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm` | ffmpeg + Whisper | `ffmpeg` + `whisper` |
| **Image** | `.jpg`, `.png`, `.gif`, `.webp` | Claude Vision | `ANTHROPIC_API_KEY` |
| **HTML** | `.html`, `.htm` | Tag stripping | None |
| **JSON** | `.json` | Code block wrapping | None |
| **Office** | `.docx`, `.pptx`, `.xlsx` | Basic extraction | None (enhanced coming) |
| **URL** | `https://...` | Firecrawl / fetch | Optional `FIRECRAWL_API_KEY` |

When a processor's requirements are not met (e.g., Whisper not installed for audio), llmwiki creates a reference page noting the source file and suggests installing the missing tool. The raw file is always preserved.

## Obsidian Integration

llmwiki vaults are Obsidian vaults. Open any llmwiki directory in Obsidian and you get:

- **Graph view** showing all pages and their `[[wikilinks]]`
- **YAML frontmatter** rendered as page metadata
- **Backlinks** panel showing what links to each page
- **Search** across all wiki content
- **Tag view** from frontmatter `tags:` arrays

No plugins required. No configuration. Just `Open folder as vault` in Obsidian.

```
# Every wiki page has frontmatter like this:
---
title: "Attention Is All You Need"
type: source
created: "2026-04-07"
updated: "2026-04-07"
tags: [transformers, attention, nlp]
sources: ["raw/2026-04-07/attention-paper.pdf"]
summary: "Foundational transformer architecture paper introducing self-attention"
---
```

## Vault Structure

```
my-wiki/
├── AGENTS.md             # Schema — wiki structure + conventions
├── config.yaml           # Configuration — provider, sources, schedules
├── .gitignore
├── raw/                  # Immutable source archive
│   ├── 2026-04-07/
│   │   ├── paper.pdf
│   │   ├── podcast.mp3
│   │   └── blog-post.md
│   └── 2026-04-08/
│       └── meeting-notes.md
└── wiki/                 # LLM-generated knowledge base
    ├── index.md          # Auto-maintained content catalog
    ├── log.md            # Chronological operation record
    ├── sources/          # One summary per ingested source
    ├── entities/         # People, organizations, tools
    ├── concepts/         # Ideas, frameworks, patterns
    └── syntheses/        # Cross-cutting analyses, query results
```

## Tests

```bash
cd /path/to/llmwiki && pnpm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## See Also

- **[agentgrid](https://github.com/naman10parikh/agentgrid)** &mdash; Manage grids of AI coding agents in tmux
- **[agentdial](https://github.com/naman10parikh/Energy)** &mdash; Universal agent identity protocol across 8 messaging channels

## Credits

Inspired by [Andrej Karpathy's LLM Wiki pattern](https://x.com/karpathy/status/1908625766490001799) &mdash; the idea that LLMs should compile knowledge into structured, interlinked wikis rather than just answering questions from raw chunks.

## License

MIT &mdash; see [LICENSE](LICENSE).
