# Architecture

llmwiki is built around two core ideas: **three layers** of data and **three automations** that operate on them.

## Three Layers

```
┌───────────────────────────────────────────────┐
│                   Your Vault                   │
│                                               │
│   raw/           Immutable source documents   │
│   ├── 2026-04-07/                             │
│   │   ├── paper.pdf                           │
│   │   ├── podcast.mp3                         │
│   │   └── notes.md                            │
│   │                                           │
│   wiki/          LLM-generated knowledge base │
│   ├── index.md   Content catalog              │
│   ├── log.md     Operation record             │
│   ├── sources/   One page per ingested source │
│   ├── entities/  People, orgs, tools          │
│   ├── concepts/  Ideas, frameworks, patterns  │
│   └── syntheses/ Cross-cutting analyses       │
│                                               │
│   AGENTS.md      Schema & conventions         │
│   config.yaml    Configuration                │
└───────────────────────────────────────────────┘
```

### Layer 1: raw/ (Immutable Sources)

The `raw/` directory stores original source documents exactly as received. Files are organized in date-stamped subdirectories (`raw/YYYY-MM-DD/`). The LLM never modifies anything in `raw/`.

This serves as the provenance layer. Every wiki page traces back to one or more files in `raw/` through the `sources:` field in its frontmatter. If a wiki page's accuracy is questioned, you can always go back to the original source.

When you run `llmwiki ingest file.pdf`, the file is copied to `raw/{today}/file.pdf` before processing. URLs are fetched and saved as markdown files in `raw/`.

### Layer 2: wiki/ (LLM-Generated Knowledge)

The `wiki/` directory contains the compiled knowledge base. The LLM creates and maintains everything here. Pages are organized into four categories:

| Directory | Purpose | Example |
|-----------|---------|---------|
| `sources/` | One summary page per ingested source | `sources/attention-is-all-you-need.md` |
| `entities/` | Pages for people, organizations, tools | `entities/openai.md`, `entities/yann-lecun.md` |
| `concepts/` | Pages for ideas, frameworks, patterns | `concepts/transformer-architecture.md` |
| `syntheses/` | Cross-cutting analyses, comparisons | `syntheses/rag-vs-compiled-knowledge.md` |

Two special files are auto-maintained:

- **`index.md`** &mdash; A catalog of every page with a one-line summary. Updated after every ingest, query, and improvement cycle.
- **`log.md`** &mdash; A chronological record of every operation performed on the wiki. Timestamps, operation types, and details.

Every wiki page uses YAML frontmatter:

```yaml
---
title: "Transformer Architecture"
type: concept
created: "2026-04-07"
updated: "2026-04-07"
tags: [deep-learning, attention, nlp]
sources: ["raw/2026-04-07/attention-paper.pdf"]
related: ["[[Self-Attention]]", "[[BERT]]"]
summary: "Neural network architecture using self-attention instead of recurrence"
---
```

Pages link to each other using `[[wikilinks]]`. The LLM creates these cross-references during ingestion, and the lint and improve commands maintain link health over time.

### Layer 3: AGENTS.md (Schema)

`AGENTS.md` is the schema file that tells the LLM how the wiki is structured. It defines:

- Directory structure and what each folder contains
- Page conventions (frontmatter fields, types)
- Wikilink rules
- Processing instructions for ingest, query, and lint
- Quality standards

This file is meant to be co-evolved. The LLM reads it before every operation. You can edit it to change how the LLM processes sources, what categories to use, what quality standards to enforce.

## Three Automations

### Automation 1: Ingest & Process

Triggered by `llmwiki ingest <source>` or automatically by `llmwiki watch`.

```
Source file/URL
      │
      ▼
┌─────────────┐
│ Type detect  │  Determine: text, PDF, audio, video, image, URL, Office
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Processor   │  Extract content as markdown
│             │  - Text: direct read
│             │  - PDF: binary text extraction
│             │  - Audio: Whisper or Deepgram transcription
│             │  - Video: ffmpeg audio extraction → transcription
│             │  - Image: Claude Vision description
│             │  - URL: Firecrawl or fetch + HTML strip
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Copy to raw/ │  Immutable archive: raw/{date}/{filename}
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Dedup check │  Jaccard similarity against existing pages
│             │  > 70% overlap → reject with metadata
└──────┬──────┘
       │ (not duplicate)
       ▼
┌─────────────┐
│ LLM compile │  Read AGENTS.md schema + current index
│             │  Produce structured wiki pages with:
│             │  - Source summary (sources/)
│             │  - Entity pages (entities/)
│             │  - Concept pages (concepts/)
│             │  - [[wikilinks]] between all pages
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Write pages │  Write to wiki/ with frontmatter
│ Update index│  Update index.md + log.md
└─────────────┘
```

### Automation 2: External Scrape

Triggered by `llmwiki scrape` or on a cron schedule configured in `config.yaml`.

```
config.yaml sources:
  ├── RSS feed ──────► Fetch XML → parse <item> → markdown files
  ├── GitHub query ──► GitHub Search API → repo descriptions
  └── Plain URL ─────► Fetch HTML → strip tags → markdown
                          │
                          ▼
                    raw/{date}/
                          │
                          ▼ (triggers Automation 1)
                    Wiki pages created
```

Scraping deposits files into `raw/` with today's date. If watch mode is running, Automation 1 triggers automatically. Otherwise, run `llmwiki ingest` to process the new files.

### Automation 3: Self-Improve

Triggered by `llmwiki improve` or on a cron schedule.

```
Phase 1: Score
  ├── Coverage:      Are all raw sources represented in wiki?
  ├── Consistency:   Do pages contradict each other?
  ├── Cross-linking: Are there orphan pages or missing connections?
  ├── Freshness:     Are claims superseded by newer sources?
  └── Organization:  Is the structure logical? Missing summaries?
        │
        ▼
Phase 2: Decide
  Score >= threshold (default 80)?
  ├── Yes → Log "healthy", done
  └── No  → Continue to Phase 3
        │
        ▼
Phase 3: Improve
  ├── Add inbound links to orphan pages
  ├── Create pages for broken wikilinks
  ├── Add summaries to pages missing them
  ├── Expand or flag near-empty pages
  └── Suggest new cross-references
        │
        ▼
Phase 4: Log
  Record score, actions, and rationale in log.md
```

## Component Architecture

```
CLI Commands (src/cli/commands/)
      │
      ▼
Core Logic (src/core/)
  ├── vault.ts         Read/write wiki pages, stats, slugify
  ├── config.ts        Load and parse config.yaml
  ├── ingest.ts        Ingest pipeline (type detect → process → LLM → write)
  ├── query.ts         Search + LLM synthesis
  ├── lint.ts          Structural health checks
  ├── scrape.ts        External source fetching
  ├── improve.ts       Quality scoring + improvement proposals
  ├── watcher.ts       chokidar file watcher
  ├── index-manager.ts Maintain wiki/index.md
  └── log-manager.ts   Maintain wiki/log.md
      │
      ├── Processors (src/processors/)
      │   ├── text.ts    Direct file read
      │   ├── pdf.ts     Binary PDF text extraction
      │   ├── audio.ts   Whisper CLI or Deepgram API
      │   ├── video.ts   ffmpeg → audio → Whisper
      │   ├── image.ts   Claude Vision API
      │   └── url.ts     Firecrawl API or fetch fallback
      │
      ├── Providers (src/providers/)
      │   ├── claude.ts  Anthropic Messages API
      │   ├── openai.ts  OpenAI Chat Completions API
      │   └── ollama.ts  Ollama REST API
      │
      └── Search (src/search/)
          └── bm25.ts    BM25 full-text search with title boosting
```

## Design Decisions

### Why markdown, not a database?

- Readable by humans and LLMs without any tool
- Version-controllable with git
- Portable across editors (Obsidian, VS Code, any text editor)
- No migration path needed &mdash; files are the format
- Composable with unix tools (`grep`, `find`, `wc`)

### Why BM25, not vector search?

- Zero external dependencies (no embedding API, no vector DB)
- Works offline with Ollama
- Competitive accuracy for structured content ([research shows](https://arxiv.org/abs/2305.13245) BM25 matches vectors at 74% vs 68.5% for structured documents)
- Instant indexing (no embedding computation)
- For large vaults (500+ pages), external search can be configured

### Why three layers instead of one?

Separating raw sources from compiled wiki pages gives you:

1. **Provenance** &mdash; every claim traces back to an original source
2. **Idempotency** &mdash; re-ingest from raw/ to regenerate the wiki
3. **Safety** &mdash; the LLM never modifies your original documents
4. **Auditability** &mdash; compare what the LLM produced against the source

### Why AGENTS.md?

The schema file creates a feedback loop. As the wiki grows, you (or the LLM during self-improvement) can refine the conventions. New categories, stricter quality rules, domain-specific instructions. The schema co-evolves with the knowledge base.
