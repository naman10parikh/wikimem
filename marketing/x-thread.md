# WikiMem Launch — X Thread

## Thread (post each as a reply to the previous)

### 1/7 — Hook

I took @karpathy's LLM wiki concept and turned it into a full IDE.

Drop any file — PDF, audio, video, slides, spreadsheet, URL — and watch it compile into structured, interlinked wiki pages.

Three automations keep it growing while you sleep.

`npx wikimem@latest`

### 2/7 — The Problem

RAG retrieves chunks. Wikis compile knowledge.

The difference:
- RAG: "here's a paragraph that might answer your question"
- Wiki: structured pages with cross-references, citations, entity tracking, concept maps

Your LLM doesn't need another vector store. It needs a knowledge compiler.

### 3/7 — 13+ Formats

WikiMem eats anything:

PDF, DOCX, PPTX, XLSX, CSV, JSON, YAML, HTML, images (Vision), audio (Whisper), video (ffmpeg→Whisper), URLs (Firecrawl), plain text.

Drop a file. Get structured wiki pages with cross-references and citations. Every time.

### 4/7 — Three Automations

1. **Ingest** — file watcher on raw/. New file → process → wiki pages → git commit
2. **Scrape** — RSS feeds, GitHub trending, URLs → fetch → deposit → triggers ingest
3. **Improve** — LLM Council scores quality → proposes and applies improvements

Set it up once. Knowledge base grows and improves itself.

### 5/7 — The IDE

Full web UI at localhost:3141:

- Interactive D3 knowledge graph (click nodes to navigate)
- Time-lapse: watch your wiki grow commit-by-commit
- WYSIWYG inline editing with Cmd+S
- Cmd+K fuzzy search
- Pipeline view: see exactly how documents flow through the system
- Settings: configure everything from the browser

### 6/7 — Works Everywhere

- **3 LLMs**: Claude, GPT-4o, Ollama (fully local, no API keys needed)
- **MCP server**: use as a tool inside Claude Code or Cursor
- **Obsidian compatible**: [[wikilinks]], YAML frontmatter, graph view — just open the folder
- **Publish**: static site + RSS + JSON Feed + digest in one command

### 7/7 — Try It

```
npx wikimem@latest init my-wiki
cd my-wiki
npx wikimem serve
```

Open localhost:3141. Drop a PDF. Watch it become knowledge.

MIT licensed. 17K lines of TypeScript. 17 CLI commands. Zero config.

GitHub: github.com/naman10parikh/wikimem
npm: npmjs.com/package/wikimem

---

## Posting Notes

- Post thread during US morning (9-11am PT) for max engagement
- Quote-tweet @karpathy's original tweet (https://x.com/karpathy/status/1908625766490001799) in reply 1
- Add a GIF/video of the web UI (knowledge graph + time-lapse) as media on tweet 1
- Tag relevant people in thread: @kaboroevich (if applicable), AI tool builders
- Use hashtags sparingly: #BuildInPublic on last tweet only
