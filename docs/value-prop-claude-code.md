# WikiMem + Claude Code: The Value Proposition

## The Question

> "I already use Claude Code and Obsidian. Why would I add WikiMem?"

Short answer: **Obsidian is a note-taking app. WikiMem is a knowledge compiler.** One stores what you write. The other builds a knowledge graph from everything you feed it -- automatically.

## What WikiMem Adds That Obsidian Cannot Do

### 1. Automated Compilation (LLM-Powered Ingestion)

Drop a PDF, URL, audio file, video, spreadsheet, or raw text into WikiMem. It:

- Extracts entities (people, tools, organizations)
- Creates structured wiki pages with YAML frontmatter
- Generates `[[wikilinks]]` to existing pages automatically
- Deduplicates against your existing knowledge (content hash + Jaccard similarity)
- Scores each page for confidence (source quality, content density, model tier)

**Obsidian equivalent:** You manually create a note, manually add tags, manually link to other notes. For 5 documents, fine. For 500, impossible.

**WikiMem command:** `wikimem ingest ./folder/` -- one command, hundreds of documents, fully cross-referenced.

### 2. Three Automation Loops

WikiMem runs three independent automation engines:

**Connector Sync** -- Periodically pulls from external sources (Slack, Google Drive, Notion) and ingests new content. Your wiki grows while you sleep.

**Pipeline Watcher** -- Watches a directory for new files. Drop a file in `raw/`, it gets ingested automatically. Wire it to a Git hook and every committed doc becomes wiki knowledge.

**Observer (Self-Improvement Engine)** -- Runs nightly at 3am. Scores every page for quality (0-14 scale across 7 dimensions). Finds orphan pages with no incoming links. Flags contradictions between pages. Identifies knowledge gaps (wikilinks pointing to pages that don't exist yet). Auto-improves the weakest pages using LLM.

**Obsidian equivalent:** Obsidian has no equivalent. You can install community plugins for some of this, but nothing that scores, flags, and auto-fixes your knowledge base.

### 3. MCP Server (Claude Code Native Integration)

WikiMem ships a Model Context Protocol server. Add 5 lines to `.mcp.json` and Claude Code gains native tools:

- `wikimem_search` -- search your knowledge base from any conversation
- `wikimem_read` -- read any wiki page by title
- `wikimem_list` -- browse all pages by category
- `wikimem_status` -- check vault health
- `wikimem_ingest` -- add new content on the fly

This means Claude Code can **read your wiki during any task** -- not just when you manually open a file. It becomes ambient knowledge.

**Obsidian equivalent:** The Obsidian MCP exists (`@bitbonsai/mcpvault`) but it reads raw notes -- no entity extraction, no quality scoring, no automated compilation.

### 4. Zero API Key Mode

Set `llm_mode: claude-code` in config.yaml. WikiMem spawns `claude -p` subprocesses for all LLM work -- ingestion, querying, improvement. Uses your existing Claude Code Max/Pro subscription. No API key, no per-token billing, no setup friction.

**Obsidian equivalent:** Obsidian AI plugins all require separate API keys.

### 5. Built-in Knowledge Graph

Every `[[wikilink]]` creates an edge in the graph. WikiMem tracks:

- Incoming and outgoing links per page
- Orphan detection (pages with zero incoming links)
- Gap analysis (wikilinks pointing to nonexistent pages)
- Contradiction flagging (related pages with opposing claims)

Export as GraphML for Gephi/yEd, or view in the built-in web UI graph visualization.

**Obsidian equivalent:** Obsidian's graph view shows connections but doesn't score them, doesn't find contradictions, and doesn't identify knowledge gaps.

### 6. Multi-Format Ingestion Pipeline

WikiMem processes 20+ file formats through specialized processors:

| Format | What Happens |
|--------|-------------|
| Markdown, Text | Direct extraction |
| PDF | Text extraction with layout preservation |
| DOCX, PPTX, XLSX | Full Office format extraction |
| CSV, TSV | Structured data extraction |
| HTML | Tag stripping, content extraction |
| Images (PNG, JPG, WebP) | Vision model description |
| Audio (MP3, WAV, M4A) | Transcription + summarization |
| Video (MP4, MOV) | Frame extraction + transcription |
| JSON, YAML | Structured data formatting |
| URLs | Fetch, extract, process |

**Obsidian equivalent:** Obsidian can display some of these but doesn't extract or compile knowledge from them.

## The Mental Model

```
Obsidian = Your notebook (you write, you organize, you link)
WikiMem  = Your research assistant (it reads, organizes, links, and improves)
```

They are complementary. WikiMem can even manage an Obsidian vault -- the wiki pages it generates are standard markdown with YAML frontmatter, fully compatible with Obsidian's format.

## The Adoption Path

1. **Install:** `npm install -g wikimem`
2. **Initialize:** `wikimem init` in your project or docs folder
3. **Ingest:** `wikimem ingest ./existing-docs/` to bootstrap
4. **Connect:** Add MCP config to `.mcp.json` for Claude Code integration
5. **Configure:** Set `llm_mode: claude-code` to use your subscription
6. **Automate:** `wikimem serve` starts all three automation loops
7. **Query:** Use `wikimem_search` in Claude Code conversations

From zero to self-improving knowledge base in 5 minutes.

## Who This Is For

- **Claude Code power users** who accumulate knowledge across sessions and want it compiled, not scattered
- **Documentation-heavy projects** where knowledge lives in many formats across many locations
- **Teams** where one person's research should become everyone's searchable knowledge
- **Anyone who has tried Obsidian** but found manual linking and organization doesn't scale past 100 notes
