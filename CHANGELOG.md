# Changelog

All notable changes to llmwiki will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-07

### Added

- **CLI commands:** `init`, `ingest`, `query`, `lint`, `watch`, `scrape`, `improve`, `status`
- **Three-layer architecture:** `raw/` (immutable sources), `wiki/` (LLM-generated), `AGENTS.md` (schema)
- **Three automations:** ingest pipeline (A1), external scraping (A2), self-improvement (A3)
- **Multi-model support:** Claude (Anthropic), OpenAI (GPT), Ollama (local)
- **Multi-format processing:**
  - Text: `.md`, `.txt`, `.csv`, `.json`, `.html`
  - PDF: built-in text extraction from PDF binary format
  - Audio: `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.aac` via Whisper or Deepgram
  - Video: `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm` via ffmpeg + Whisper
  - Image: `.jpg`, `.png`, `.gif`, `.webp` via Claude Vision
  - URL: web pages via Firecrawl API or native fetch fallback
  - Office: `.docx`, `.pptx`, `.xlsx` basic reference extraction
- **BM25 search engine:** zero-dependency full-text search with title boosting
- **Semantic dedup:** Jaccard similarity check prevents near-duplicate ingestion
- **Watch mode:** `chokidar`-based file watcher auto-ingests new files in `raw/`
- **External scraping:** RSS feeds, GitHub trending repos, plain URL scraping
- **Self-improvement cycle:** 5-dimension scoring (coverage, consistency, cross-linking, freshness, organization) with configurable threshold and dry-run mode
- **Wiki health checks:** orphan detection, broken wikilink detection, missing summary detection, empty page detection
- **Auto-maintained files:** `wiki/index.md` (content catalog) and `wiki/log.md` (operation log)
- **Obsidian compatibility:** YAML frontmatter, `[[wikilinks]]`, section-based organization
- **Domain templates:** personal, research, business, codebase
- **File-back queries:** optionally save query answers as synthesis pages
- **AGENTS.md schema:** co-evolving wiki structure document
- **YAML configuration:** `config.yaml` for provider, sources, schedules, processing options

[0.1.0]: https://github.com/naman10parikh/llmwiki/releases/tag/v0.1.0
