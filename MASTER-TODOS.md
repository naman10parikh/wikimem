# MASTER TODOs — wikimem

## P0: CRITICAL (Must fix before V1)

### Web UI
- [ ] Page clicking shows rendered markdown (not raw), like Obsidian
- [ ] Metadata/frontmatter displayed nicely (tags, dates, sources, summary)
- [ ] Graph nodes clickable → opens page content in side panel
- [ ] Markdown rendering: headings, lists, links, code blocks, wikilinks as clickable
- [ ] Wikilinks in rendered pages navigate to other pages
- [ ] Search bar in web UI (search pages, jump to result)
- [ ] File upload via web UI (drag-drop to raw/ folder)
- [ ] Show processing status when ingesting
- [ ] CLI parity: ingest, query, lint, improve all accessible from web UI
- [ ] Mobile-responsive layout

### Terminal Experience
- [ ] Global install works (`npm install -g wikimem` → `wikimem` command)
- [ ] Nice ASCII art on `wikimem init` (like AgentGrid)
- [ ] Colored, polished output on every command
- [ ] Progress bars for long operations
- [ ] `wikimem` with no args shows quick help + status if in a vault dir

### Ingestion Pipeline (E2E verified)
- [ ] Text/markdown: tested E2E ✅
- [ ] URL: tested E2E ✅
- [ ] Image (Claude vision): test with real image from chairman's machine
- [ ] Audio (Whisper/Deepgram): test with real audio file
- [ ] Video (ffmpeg+Whisper): test with real video file
- [ ] PDF: test with real PDF (resume, paper)
- [ ] DOCX: test with real Word doc
- [ ] XLSX: test with real Excel file
- [ ] PPTX: test with real PowerPoint
- [ ] Verify raw/ folder structure after each ingest (date-stamped)
- [ ] Verify wiki/ pages created with correct frontmatter + wikilinks
- [ ] Verify index.md updated
- [ ] Verify log.md updated
- [ ] Verify .obsidian/ graph shows new nodes

### Local Model Support
- [ ] Test with Ollama (llama3.2) — no API key needed
- [ ] Graceful fallback when no API key and no Ollama
- [ ] Clear instructions: "No LLM configured. Install Ollama or set ANTHROPIC_API_KEY"

### Folder Structure
- [ ] Show evolving folder structure after each operation
- [ ] raw/{date}/ subdirs created correctly
- [ ] wiki/sources/, wiki/entities/, wiki/concepts/, wiki/syntheses/ populated
- [ ] All markdown files have correct YAML frontmatter

## P1: IMPORTANT (Should fix)

### Web UI Enhancements
- [ ] Dark theme matching Energy design system (#141312 bg, purple accent)
- [ ] Graph coloring by page type (sources=blue, entities=green, etc.)
- [ ] Recently ingested sources timeline
- [ ] Vault health score displayed
- [ ] Settings page (configure provider, API key, template)

### Automations
- [ ] Scrape E2E: add RSS source, run scrape, verify files in raw/
- [ ] Improve E2E: run improve, verify it creates missing pages
- [ ] Watch mode: drop file in raw/, verify auto-ingest
- [ ] Scheduled execution (node-cron for scrape + improve)

### Multi-user
- [ ] How to mock multiple users on one machine
- [ ] Shared vault concept (business template)
- [ ] Per-user raw/ subdirectories

## P2: NICE TO HAVE

- [ ] MCP server mode (for Claude Code integration)
- [ ] Obsidian plugin that triggers wikimem from within Obsidian
- [ ] Export wiki as static site (MkDocs/Docusaurus)
- [ ] qmd integration for advanced search
- [ ] LLM Council with multiple models for improve command
- [ ] Google 2.0 embeddings for video/audio (multimodal)
