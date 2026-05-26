# wikimem — The Complete Bible

> Everything about this project in one document. Research, architecture, system design, competitive landscape, feature roadmap, TODOs, and handoff. Written April 7, 2026.

**npm:** https://www.npmjs.com/package/wikimem (v0.3.0)
**GitHub:** https://github.com/naman10parikh/wikimem
**Product code:** $HOME/llmwiki
**Control center:** $PROJECT_ROOT/wikimem/

---

## Part 1: What Karpathy Built and How It Works

### The Core Idea (from his Gist, April 4, 2026)

Most people use LLMs like RAG: upload files, retrieve chunks, generate answers. The LLM rediscovery knowledge from scratch every time. Nothing accumulates.

Karpathy's idea is different: the LLM **incrementally builds and maintains a persistent wiki** — structured, interlinked markdown files. When you add a source, the LLM reads it, extracts key info, integrates it into existing pages, updates cross-references, flags contradictions. The knowledge is **compiled once and kept current**, not re-derived every query.

### His Three Layers

1. **Raw Sources (`raw/`)** — Immutable source documents. Articles, papers, images, data. The LLM reads from them but NEVER modifies them. This is your source of truth.

2. **The Wiki (`wiki/`)** — LLM-generated markdown files. Summaries, entity pages, concept pages, comparisons, an overview. The LLM owns this entirely. It creates pages, updates them, maintains cross-references. You read it; the LLM writes it.

3. **The Schema (`AGENTS.md` / `CLAUDE.md`)** — A document telling the LLM how the wiki is structured, conventions, workflows. This is the key config file. You and the LLM co-evolve it over time.

### His Three Operations

1. **Ingest** — Drop a source into raw/. LLM reads it, writes summary page, updates index, updates entity/concept pages. A single source might touch 10-15 wiki pages.

2. **Query** — Ask questions. LLM searches index.md, reads relevant pages, synthesizes answer with citations. Good answers get filed back into the wiki as new pages.

3. **Lint** — Periodically health-check: contradictions, stale claims, orphan pages, missing cross-references, data gaps.

### His Two Special Files

- **index.md** — Content catalog. Every page listed with link + one-line summary. Organized by category. The LLM reads this first to find relevant pages. Works surprisingly well at ~100 sources, ~hundreds of pages.

- **log.md** — Chronological append-only record. Each entry: `## [2026-04-02] ingest | Article Title`. Timeline of the wiki's evolution.

### How He Uses It Day-to-Day

Karpathy has Claude Code open on one side and Obsidian on the other. The LLM makes edits based on conversation, he browses results in Obsidian — following links, checking graph view, reading updated pages. **"Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase."**

### Tools He Recommends

- **Obsidian** — IDE/viewer. Graph view for seeing connections. Dataview plugin for frontmatter queries. Bases plugin for structured data.
- **Obsidian Web Clipper** — Browser extension converting web articles to markdown.
- **qmd** (tobi/qmd, 19,408 stars) — Local search engine for markdown. BM25 + vector + LLM re-ranking. Has MCP server + CLI.
- **Marp** — Markdown-based slide deck format. Generate presentations from wiki content.
- **LLM Council** (karpathy/llm-council, 16,749 stars) — Multi-model deliberation with anonymous peer review.

### Why It Works (His Argument)

The tedious part isn't reading or thinking — it's bookkeeping. Updating cross-references, keeping summaries current, noting contradictions. Humans abandon wikis because maintenance grows faster than value. LLMs don't get bored, don't forget to update a cross-reference, and can touch 15 files in one pass. The wiki stays maintained because **the cost of maintenance is near zero**.

Related in spirit to Vannevar Bush's Memex (1945) — private, curated, with connections as valuable as the documents themselves. The part Bush couldn't solve was who does the maintenance. The LLM handles that.

---

## Part 2: What The Community Built (40+ Projects in 3 Days)

### Scale

7,882+ X posts trending. "Karpathy's LLM Wiki Idea Sparks Instant Developer Tools." Hermes Agent (NousResearch) shipped it as a built-in feature within 14 hours.

### Top Competing Projects

| #   | Project                         | Stars | Language   | Key Differentiator                                                                                                                                                    | What They Don't Have                               |
| --- | ------------------------------- | ----- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | sdyckjq-lab/llm-wiki-skill      | 272   | Shell      | Multi-platform (Claude/Codex/OpenClaw), Chinese-first, source registry with WeChat/YouTube/Zhihu extractors                                                           | No self-improvement, no web UI                     |
| 2   | coleam00/claude-memory-compiler | 206   | Python     | Auto-captures Claude Code sessions via hooks, 7 lint health checks, no manual ingestion needed                                                                        | Not a wiki compiler, session memory only           |
| 3   | xoai/sage-wiki                  | 186   | Go         | Single binary, 12+ source formats (PDF/DOCX/XLSX/EPUB/images via vision), hybrid BM25+semantic search, web UI + TUI, MCP server, --watch mode                         | No self-improvement, no scraping                   |
| 4   | atomicmemory/llm-wiki-compiler  | 176   | TypeScript | npm CLI, two-phase pipeline (extract concepts then generate pages), hash-based incremental compilation, --save queries compound back                                  | No multi-modal, no web UI                          |
| 5   | Ar9av/obsidian-wiki             | 173   | Python     | Multi-agent compatible (Claude/Cursor/Windsurf/Codex/Copilot), setup.sh auto-configures all, symlinked skills, global CLI                                             | Not standalone, skill-based                        |
| 6   | nvk/llm-wiki                    | 129   | Plugin     | Claude native plugin (claude plugin install), parallel multi-agent research, thesis-driven investigation, source retraction, hub resolution (~/wiki, iCloud, Dropbox) | Plugin-only, not standalone                        |
| 7   | obsidian_vault_pipeline         | 109   | Python     | 6-layer pipeline (Ingest>Interpret>Absorb>Refine>Canonical>Derived), AutoPilot mode, evergreen note lifecycle, knowledge.db index                                     | Chinese docs, complex, tightly coupled to Obsidian |

### Pre-Existing Memory Infrastructure

| Project     | Stars  | What It Is                           | Key Metric                |
| ----------- | ------ | ------------------------------------ | ------------------------- |
| Mem0        | 52,193 | Universal memory layer for AI agents | 80% token reduction       |
| claude-mem  | 46,060 | Auto-captures Claude Code sessions   | Session persistence       |
| SuperMemory | 21,418 | Memory API, #1 on all 3 benchmarks   | 85.4% LongMemEval         |
| qmd         | 19,408 | Markdown search engine with MCP      | BM25+vector+LLM reranking |
| LLM Council | 16,749 | Multi-model deliberation             | Anonymous peer review     |
| OpenMemory  | 3,885  | Local persistent memory              | One-line install          |

### Interesting Gist Comments (from 120+ comments)

- **samflipppy (.brain pattern):** ".brain folder at root of project. index.md, architecture.md, decisions.md, changelog.md. Agent reads .brain before making changes. Updates after."
- **Hosuke (llmbase):** "Model fallback chains. When primary LLM times out mid-compilation, falling back to secondary keeps wiki growing without manual intervention."
- **dkushnikov (Mnemon):** "Seven source-type-specific templates (article, video, podcast, book, paper, idea, conversation) — because a paper needs methodology rigor while a podcast needs speaker attribution."
- **peas (Paulo):** "Voice-first capture. Record voice memos into Telegram while walking. Whisper transcribes, LLM classifies and routes. 70+ voice memos compiled into 100 KB nodes."
- **laphilosophia:** "The robust version is not 'autonomous wiki' but 'source-grounded, citation-first, review-gated wiki.' Separate facts, inferences, and open questions explicitly."
- **YokoPunk:** "Adding a TLDR at top of wiki articles helps both humans and LLMs. LLMs do index scan → read TLDR → decide to dig deeper. Saves tokens."
- **buremba (owletto):** "Entity-based with Postgresql instead of filesystem. Strongly typed where agent has SQL access."

### Superset of ALL Features (across all projects + Karpathy)

**Karpathy base:** ingest, query, lint, index.md, log.md, Obsidian compatible, wikilinks, frontmatter

**Community additions:**

- Multi-model support (Claude/GPT/Ollama) — browzy, llmbase
- Model fallback chains — llmbase
- FTS5/BM25 search — browzy, qmd
- Vector/semantic search — sage-wiki, qmd
- Hybrid search with RRF — qmd
- React web UI with graph viz — llmbase
- 7 source-type templates (article/video/podcast/book/paper/idea/conversation) — Mnemon
- AutoPilot mode (automated full pipeline) — obsidian_vault_pipeline
- Contradiction flagging — engram
- Multi-model verification with signed receipts — Veritas Acta
- Personalization via reader-context.md — Mnemon
- Voice-first capture (Telegram + Whisper) — Paulo
- PostgreSQL backend — owletto
- Multi-agent coordination via S3 — tracecraft
- Interactive visualization with search — Claudeopedia
- Scheduled cron jobs — Claudeopedia
- Domain-specific templates — multiple projects
- Hash-based incremental compilation — atomicmemory
- Source retraction — nvk/llm-wiki
- Hub resolution (~/wiki, iCloud, Dropbox) — nvk/llm-wiki
- Parallel multi-agent research — nvk/llm-wiki
- Session auto-capture via hooks — claude-memory-compiler
- 6-layer pipeline with lifecycle — obsidian_vault_pipeline
- Thesis-driven investigation — nvk/llm-wiki
- MCP server mode — sage-wiki, qmd

---

## Part 3: What wikimem Is (Our Product)

### Our Three Unique Additions Beyond Karpathy

**Automation 1: Ingest + Process (Karpathy's base, extended)**
User drops ANY file into raw/. System detects format, extracts content, converts to markdown, sends to LLM for wiki compilation. Supports: text, URL, PDF, DOCX, XLSX, PPTX, images (Claude Vision), audio (Whisper/Deepgram), video (ffmpeg+Whisper). Each processed file gets a date-stamped copy in raw/{YYYY-MM-DD}/ and produces wiki pages in sources/, entities/, concepts/, syntheses/.

**Automation 2: Open-Ended Scraping (nobody else has this)**
Scheduled task fetches from configured external sources: RSS feeds, GitHub repos, websites, APIs. Authenticates as the user when needed (like our X GraphQL scraper). Deposits fetched content into raw/ which triggers Automation 1. Not just humans feeding the wiki — agents do too.

**Automation 3: Self-Improvement via LLM Council (nobody else has this)**
Scheduled review cycle. Phase 1: Score wiki quality (0-100) across 5 dimensions (coverage, consistency, cross-linking, freshness, organization). Phase 2: If below threshold, LLM Council reviews and proposes improvements — reorganize, strengthen cross-references, flag contradictions, create missing pages, clean stale content. Phase 3: Apply changes (with user approval option). Phase 4: Log everything.

### Core Components Explained

**Entities** (`wiki/entities/`) — Pages for people, organizations, tools, products. Example: "Andrej Karpathy" page with bio, contributions, linked papers. Created automatically when the LLM identifies a notable entity in a source.

**Concepts** (`wiki/concepts/`) — Pages for ideas, frameworks, patterns, methodologies. Example: "LLM-Powered Wiki Compilation" explaining the pattern. Cross-referenced across all sources that discuss it.

**Sources** (`wiki/sources/`) — One summary page per ingested source. Contains: title, source path, date, key takeaways, entities mentioned, concepts discussed. The bridge between raw/ and the rest of the wiki.

**Syntheses** (`wiki/syntheses/`) — Cross-cutting analyses, comparisons, explorations. Created when a user asks a query and files the answer back. Also created by the self-improvement cycle when it finds connections across multiple sources.

### E2E Data Ingestion Pipeline (What Happens When You Run `wikimem ingest`)

```
User runs: wikimem ingest ~/resume.pdf --tags "career,personal"

Step 1: FORMAT DETECTION
  └─ Detect .pdf extension → route to PDF processor

Step 2: PREPROCESSING
  └─ pdf-parse extracts text (4,317 chars from a real resume)
  └─ Clean up: normalize whitespace, extract structure
  └─ Build markdown representation with source file link

Step 3: RAW PRESERVATION
  └─ Copy original file to raw/2026-04-07/resume.pdf (immutable)
  └─ Date-stamped for chronological tracking

Step 4: SEMANTIC DEDUP CHECK
  └─ Compare content against existing wiki pages (Jaccard similarity)
  └─ If >70% overlap with existing page:
     └─ Keep in raw/ with .meta.json (rejected: true, reason, similarity_score)
     └─ User can override with --force
  └─ If unique: continue to Step 5

Step 5: LLM COMPILATION
  └─ Send to Claude/GPT/Ollama with:
     - The source content
     - The AGENTS.md schema (conventions, structure)
     - The current index.md (what already exists)
  └─ LLM produces structured wiki pages:
     - Source summary page (wiki/sources/resume.md)
     - Entity pages (wiki/entities/jane-doe.md, wiki/entities/duke-university.md)
     - Concept pages (wiki/concepts/computer-science-education.md)

Step 6: WIKILINK GENERATION
  └─ LLM adds [[wikilinks]] connecting pages
  └─ Cross-references to existing pages in the wiki

Step 7: FRONTMATTER
  └─ Each page gets YAML frontmatter:
     title, type, created, updated, tags, sources, summary, related

Step 8: INDEX + LOG UPDATE
  └─ index.md: new entries added under correct category
  └─ log.md: chronological entry with timestamp + operation

Step 9: EMBEDDING (optional)
  └─ If Google Gemini or OpenAI embeddings configured:
     └─ Generate vector embedding for each page
     └─ Save as .embedding.json sidecar file
     └─ Enables semantic search in addition to BM25

Result: User's wiki now has 3-5 new pages, 10-50 new wikilinks,
        updated index, logged operation, Obsidian graph shows new nodes.
```

### How Obsidian Connects

wikimem generates an `.obsidian/` directory inside the vault with:

- `app.json` — editor settings (live preview, show frontmatter, use wikilinks not markdown links)
- `graph.json` — color groups by folder (sources=blue, entities=orange, concepts=green, syntheses=purple), node size by link count
- `appearance.json` — dark mode with purple accent

The user opens the vault folder in Obsidian: `Open folder as vault → select my-wiki/`. Obsidian reads the .obsidian/ config, displays the knowledge graph with colored nodes, and all [[wikilinks]] are clickable for navigation.

**The vault IS the wiki directory.** No sync needed. wikimem writes markdown files, Obsidian reads them in real-time. Changes are bidirectional — if a user edits a page in Obsidian, wikimem sees the change.

### How The Web UI Works

`wikimem serve` starts an Express server at localhost:3141. Single-page app with 5 tabs:

1. **Dashboard** — Stats cards (pages, words, sources, links, orphans), recent pages table, raw sources list
2. **Pages** — Full page list, click any page → modal shows rendered markdown with clickable [[wikilinks]], frontmatter badges (tags, type, date)
3. **Knowledge Graph** — d3-force visualization. Purple nodes = pages. Lines = wikilinks. Zoom/pan. Click node → opens page.
4. **Query** — "Ask your knowledge base" input. Sends to POST /api/query → LLM synthesizes answer → displayed with citations.
5. **Upload** — Drag-drop zone. "Drop files here — Markdown, PDF, DOCX, XLSX, PPTX, text, or URLs." Sends to POST /api/upload → triggers ingest pipeline.

**Web UI is in sync with folders.** The API reads directly from the wiki/ directory. Any change (via CLI or web UI) is immediately visible in both places and in Obsidian.

### Why "wikimem" as The Name

- npm rejected `llmwiki` (too similar to existing `llm-wiki`)
- `agentvault` was taken
- `wikimind` was claimed by a competitor 4 hours before us
- `wikimem` = wiki + memory. Short, available, clear meaning.
- Matches the concept: a wiki that serves as your memory.

---

## Part 4: What We Built vs What's Left

### Built and Working (with evidence)

| Feature                          | Evidence                                        |
| -------------------------------- | ----------------------------------------------- |
| CLI with 10 commands             | `wikimem --help` shows all                      |
| Init with ASCII art + .obsidian/ | Tested: vault created correctly                 |
| Ingest text/markdown             | 7 pages, 49 wikilinks from Karpathy article     |
| Ingest URLs                      | 5 pages, 35 wikilinks from GitHub gist          |
| Ingest images (Claude Vision)    | 5 pages, 59 wikilinks from architecture diagram |
| Ingest DOCX (mammoth)            | 5 pages, 40 wikilinks from Word doc             |
| Ingest PDF (pdf-parse v1)        | 4,317 chars extracted from maintainer's resume    |
| Query with citations             | Rich answer with [[wikilinks]], 8 sources       |
| Lint health check                | Correctly finds orphans, broken links           |
| Improve with scoring             | Score 96/100 with dimension breakdown           |
| Status dashboard                 | 13 pages, 2578 words, 108 links                 |
| Web UI: dashboard                | Verified via Playwright screenshot              |
| Web UI: knowledge graph          | 7 nodes, 20 links, zoom controls                |
| Web UI: rendered markdown        | marked.js → headings, bold, wikilinks           |
| Web UI: query tab                | Input + Ask button                              |
| Web UI: upload tab               | Drag-drop zone                                  |
| 3 LLM providers                  | Claude (tested), OpenAI (built), Ollama (built) |
| Google Gemini embeddings         | Provider built                                  |
| BM25 + semantic hybrid search    | BM25 tested, semantic built                     |
| Semantic dedup                   | Logic built with .meta.json reasoning           |
| Batch ingest (--recursive)       | Built with progress display                     |
| Interactive tagging              | --tags, --category, --interactive flags         |
| 58 unit tests                    | 52 passing (6 need mock update)                 |
| npm published                    | v0.3.0 live                                     |
| GitHub repo                      | 19 commits, renamed to wikimem                  |

### NOT Built / NOT Working

| #   | Item                             | Category | Scope        | Details                                                                                                                               |
| --- | -------------------------------- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Web UI upload not wired          | Bug      | Backend      | POST /api/upload exists but POST /api/ingest needs testing. Upload tab UI exists but may not trigger ingest pipeline.                 |
| 2   | Better markdown renderer         | UX       | Frontend     | Current built-in renderer handles basics but misses tables, nested lists, images. Research markdown-it or remark.                     |
| 3   | Fix 6 failing tests              | Bug      | Testing      | checkDuplicate function signature changed, test mocks need update.                                                                    |
| 4   | XLSX real file test              | Testing  | Verification | Processor built (SheetJS) but never tested with a real Excel file.                                                                    |
| 5   | PPTX real file test              | Testing  | Verification | Processor built (custom XML parsing) but never tested with real PowerPoint.                                                           |
| 6   | Audio real test                  | Testing  | Verification | Whisper + Deepgram code exists. Needs Whisper CLI installed or Deepgram API key.                                                      |
| 7   | Video real test                  | Testing  | Verification | ffmpeg + Whisper pipeline exists. Needs ffmpeg + Whisper both installed.                                                              |
| 8   | Ollama local model test          | Testing  | Verification | Provider built. Needs Ollama installed with a model pulled.                                                                           |
| 9   | Automations visibility tab       | Feature  | Web UI       | No way to see scrape/improve run history, scores over time, what changed.                                                             |
| 10  | Audit trail / version history    | Feature  | Core         | No git-like history of wiki evolution. Can't go back to older state.                                                                  |
| 11  | `init --from-repo`               | Feature  | CLI          | Convert existing codebase to wiki by scanning README, docs, code comments.                                                            |
| 12  | `init --from-folder`             | Feature  | CLI          | Create wiki from existing file collection.                                                                                            |
| 13  | `add-source`                     | Feature  | CLI          | Add more sources incrementally after initial setup.                                                                                   |
| 14  | Scheduled automations            | Feature  | Core         | node-cron for daily scrape + improve. Config exists but not wired.                                                                    |
| 15  | Global install verification      | Bug      | CLI          | `npm install -g wikimem` should make `wikimem` command work. Partially tested.                                                        |
| 16  | Auto-update detection            | Feature  | CLI          | Check npm for newer version on each run. Code exists but not verified.                                                                |
| 17  | Error messages polish            | UX       | CLI          | Missing API key should say exactly what to do. Network errors need graceful handling.                                                 |
| 18  | Source-type templates            | Feature  | Core         | Mnemon has 7 templates (article/video/podcast/book/paper/idea/conversation). We have 4 domain templates but not source-type-specific. |
| 19  | qmd integration                  | Feature  | Search       | Karpathy's recommended search engine. Has MCP server. Would replace our basic BM25 for large vaults.                                  |
| 20  | MCP server mode                  | Feature  | Integration  | Let Claude Code use wikimem as a tool via MCP protocol.                                                                               |
| 21  | LLM Council multi-model          | Feature  | Core         | Current improve uses single model. Karpathy's Council uses 4+ models with anonymous cross-review.                                     |
| 22  | Google 2.0 multimodal embeddings | Feature  | Core         | Embed video/audio/images directly, not just text.                                                                                     |
| 23  | Web UI search bar                | Feature  | Web UI       | Filter pages by typing. MiniSearch (7KB) recommended.                                                                                 |
| 24  | Graph node clicking              | Bug      | Web UI       | Clicking graph nodes should open page detail. May be partially working.                                                               |
| 25  | CI verification                  | Testing  | Infra        | GitHub Actions workflow exists but never verified it passes on GitHub.                                                                |

---

## Part 5: File Locations

### Control Center (energy repo — internal)

```
$PROJECT_ROOT/wikimem/
├── WIKIMEM-BIBLE.md              ← THIS FILE (everything in one place)
├── research/
│   ├── 01-energy-memory-harness.md     ← Our memory system analysis
│   ├── 02-competing-github-repos.md    ← 40+ repos feature matrix
│   ├── 03-tools-qmd-llm-council-supermemory.md ← 7 tools deep-dived
│   ├── 04-oss-patterns-naming.md       ← Project structure, npm, X intel
│   └── competitive-landscape.md
├── resources/                          ← All seed resources from maintainer
│   ├── karpathy_llm_knowledge_bases.md
│   ├── read_this_claude_karpathy_core_idea_llm_knowledge_bases.md (THE GIST)
│   ├── karpathy_github_gist_comments_raw.md (120+ comments)
│   ├── claudeopedia.md, farzapedia.md, self_evolving...
│   └── *.jpeg (5 architecture/memory images)
├── docs/
│   ├── plan.md (23KB original plan)
│   ├── maintainer-prompt-066.md
│   ├── architecture.md, configuration.md, handoff.md
```

### Product Code (separate repo — user-facing)

```
$HOME/llmwiki/ → github.com/naman10parikh/wikimem
├── src/ (44 TypeScript files, 15K+ lines)
├── tests/ (4 test files, 58 tests)
├── docs/, examples/, templates/
├── README.md, CONTRIBUTING.md, CHANGELOG.md
├── package.json (wikimem@0.3.0)
└── .github/workflows/ci.yml
```

### Agent JSONL Logs (raw research data)

```
~/.claude/projects/<project>/.../subagents/
├── agent-a5d5bc25455c21756.jsonl  (Energy memory harness, 119K tokens)
├── agent-a1c5b1b5078bc74b7.jsonl  (OSS patterns + naming, 96K tokens)
├── agent-a5ee4de46e6b1d3cf.jsonl  (GitHub repos, 94K tokens)
└── agent-ae16b7213950dc735.jsonl  (qmd + tools, 86K tokens)
```

---

## Part 6: Handoff Instructions

### For the next agent session:

1. **Read this file first** — it has everything.
2. **Read `$PROJECT_ROOT/.claude/handoff.md`** — session state.
3. **cd $HOME/llmwiki && pnpm build** — verify it compiles.
4. **Focus on the 25 items in Part 4 "NOT Built"** — that's the work.
5. **Use Playwright for visual testing** — `cd /tmp && node pw-test.js` pattern. NEVER ship without screenshotting the web UI.
6. **The agent swarm grid exists** at `memorysystem:2` in tmux — 6 panes, all idle, ready for new missions via `$PROJECT_ROOT/scripts/inject-task.sh`.
7. **The maintainer wants you to test as a user** — install globally, create vault, ingest real files from his machine (Desktop, Documents), open web UI in browser, click every button.
8. **The maintainer specifically wants:** automations visibility, audit trail, version history, better markdown rendering, every file format tested with real files, web UI parity with CLI.

---

## Part 7: UX Overhaul — Obsidian-Like Knowledge Workspace

### Maintainer directive (Prompt #68 addendum)

**Intent:** Replace the current web experience (tabbed dashboard + modal page preview) with a **primary knowledge workspace** that feels like Obsidian or Notion: persistent layout, file tree, multi-document tabs, graph as a first-class view mode, and operational visibility into ingestion — without leaving the surface where reading and navigation happen.

**Transformation summary**

| Dimension                | FROM (current)                                               | TO (target)                                                                         |
| ------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Information architecture | Five top-level tabs (Dashboard, Pages, Graph, Query, Upload) | Single shell: sidebar + main + optional bottom panel; features live in place        |
| Document reading         | Modal over list                                              | Full main pane; scrollable; wikilinks navigate in-tab or new tab (product decision) |
| File discovery           | Flat lists + tab switches                                    | Collapsible hierarchy mirroring vault folders + counts                              |
| Graph                    | Separate tab only                                            | Toggle **document \| graph** in main area; same chrome                              |
| Ingest feedback          | Upload tab / background                                      | Live pipeline stages visible in collapsible bottom panel                            |
| Fast navigation          | Per-tab search/filter                                        | Global **⌘K** fuzzy search, keyboard-first                                          |
| Entity UX                | Generic markdown page                                        | Structured sections for `type: entity` pages                                        |
| Context                  | None                                                         | Breadcrumbs + open tabs                                                             |
| Upload entry point       | Dedicated tab                                                | Sidebar drag-drop (and optional header action)                                      |

This section is a **build spec**: layout, behaviors, data needs, visual system, and reference products another engineer can implement against.

---

### Global layout (shell)

**Viewport:** Full-height flex column. No modal as the default reading surface.

**ASCII — desktop shell (collapsed pipeline)**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [Logo]  Vault name                    [⌘K Search…]              [User / settings] │
├────────────┬───────────────────────────────────────────────────────────────────┤
│            │  Breadcrumb: wiki > sources > ai-overview                            │
│  SIDEBAR   ├───────────────────────────────────────────────────────────────────┤
│  (~260px)  │  [Doc ●] [Graph ○]     │  Tab: ai-overview.md × │ graph-notes.md × │ + │
│            ├───────────────────────────────────────────────────────────────────┤
│  ▼ raw (12)│                                                                   │
│  ▼ sources │   MAIN CONTENT AREA                                                │
│    (34)    │   — Markdown reading view OR interactive graph                     │
│  ▼ entities│   — Full width of column; not a dialog                             │
│    (28)    │                                                                   │
│  ▼ concepts│                                                                   │
│    (19)    │                                                                   │
│  ▼ synth…  │                                                                   │
│    (7)     │                                                                   │
│  ────────  │                                                                   │
│  DROP ZONE │                                                                   │
│  Upload    │                                                                   │
└────────────┴───────────────────────────────────────────────────────────────────┘
```

**ASCII — with pipeline panel expanded**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  … top bar …                                                                  │
├────────────┬───────────────────────────────────────────────────────────────────┤
│  SIDEBAR   │  … main: doc or graph …                                          │
│            │                                                                   │
│            ├───────────────────────────────────────────────────────────────────┤
│            │  ▼ PIPELINE  job #a1b2  resume.pdf  [running]                      │
│            │     detect → extract → dedup → LLM → write → index                │
│            │     ●───────●───────○───────○──────○──────○                        │
└────────────┴───────────────────────────────────────────────────────────────────┘
```

**Responsive note:** Below a breakpoint (e.g. 1024px), sidebar collapses to an overlay drawer; ⌘K and tab bar remain priority. Spec focuses on desktop-first parity with Obsidian.

---

### Requirement 1 — Left sidebar: vault hierarchy tree

**Purpose:** Mirror the on-disk wiki layout so mental model matches Obsidian’s file explorer + folder semantics.

**Structure (top-level nodes, fixed order)**

1. `raw/` — immutable sources (optional: hide dotfiles; show date subfolders as nested nodes).
2. `wiki/sources/`
3. `wiki/entities/`
4. `wiki/concepts/`
5. `wiki/syntheses/`

(If the product root is the vault root, label nodes as **Sources**, **Entities**, **Concepts**, **Syntheses**, **Raw** in UI; paths in tooltips.)

**Per category, display:**

- Folder name + **file count** (immediate children only, or recursive total — pick one and document in UI tooltip; **recommendation:** show `N` = markdown files under subtree for wiki folders; raw = file count).
- Chevron for expand/collapse; remember state in `localStorage` keyed by vault path.
- Selected file highlighted; keyboard ↑↓ to move selection when sidebar focused (accessibility).

**Dimensions**

- **Width:** ~260px fixed when expanded; **collapse** to icon rail (~48px) or fully hidden with toggle in top bar.
- **Scroll:** Independent vertical scroll; tree does not scroll the main pane.

**Data / API**

- `GET` tree endpoint or reuse existing file walk from vault root; return `{ path, name, type: 'file'|'dir', count?: number, children? }`.
- Watch filesystem (chokidar or existing server watcher) to refresh counts and new files without full reload.

**Upload zone (ties to Requirement 8):** Bottom of sidebar — dashed border, “Drop files or click to upload”, same MIME/types as today’s upload tab. On drop → enqueue pipeline job → reflect in pipeline panel.

---

### Requirement 2 — Main content area: full-page markdown (not modal)

**Purpose:** Reading is the default mode; Notion-like clarity with wiki-specific affordances.

**Behavior**

- Clicking a file in the tree **opens a tab** (Requirement 3) and renders markdown in the main pane.
- **No modal** for default read path; modals reserved for confirm dialogs, settings, ⌘K palette (if implemented as dialog), etc.

**Frontmatter (Notion-style “properties” row)**

- Parse YAML frontmatter; strip from body for rendering.
- **Top of document:** horizontal row or grid of **badges / property chips**: `type`, `created`, `updated`, `tags[]`, `sources[]` (links to source pages), `related` preview.
- Clicking a tag filters or starts a search (implementation choice; minimum: copy tag query into ⌘K).

**Body rendering**

- GFM tables, task lists, nested lists, images (resolve relative to vault), code blocks with optional syntax highlight.
- **Wikilinks:** `[[Page Title]]` and `[[Page Title|alias]]` → internal links; click opens target in **active tab** or **new tab** (settings: prefer “same tab” default, modifier-click for new tab).
- Broken wikilinks: muted styling + tooltip “Orphan target”.

**Empty states**

- No file selected: show vault overview or last-opened doc (product choice).
- Loading / error: inline in main pane, not toast-only.

---

### Requirement 3 — Tab bar: multiple open files

**Purpose:** Match browser / Cursor / VS Code mental model for parallel context.

**UI**

- Horizontal strip below breadcrumbs (or integrated with breadcrumb row).
- Each tab: **truncated title** (from frontmatter `title` or filename), **close ×**, optional **dirty dot** if editor added later.
- **+** or duplicate action for “new tab” (optional v2: only if editing exists).

**Behavior**

- Max tabs soft limit (e.g. 20) with LRU eviction or warn — document in UX copy.
- **Click tab:** switch main content without losing scroll position (store scroll per tab id).
- **Middle-click / ⌘W:** close tab; **⌘1…9:** switch (optional).
- Persist open tabs + active tab in `localStorage` for session restore.

**State model (suggested)**

```text
tabs: { id, vaultPath, scrollTop, viewMode: 'doc'|'graph' }[]
activeTabId
```

Graph mode may be per-tab or global; **recommendation:** `viewMode` per tab so one tab can stay on graph while another reads a doc.

---

### Requirement 4 — Graph view mode (main area toggle)

**Purpose:** Obsidian-like graph without banishing it to a separate silo.

**Toggle**

- Segmented control: **Document | Graph** in the main toolbar region (see ASCII).
- When **Graph** is active for the current tab, main pane shows full-width graph (not a small widget).

**Interaction**

- **Click node** → open that page (same tab or new tab per settings); sync selection with sidebar if path resolvable.
- Zoom, pan, fit-to-screen; search/filter nodes (mini search in graph toolbar).
- Optional: color by folder (align with `.obsidian/graph.json` groups: sources / entities / concepts / syntheses / raw).

**Implementation references**

- **Graphify** ([safishamsi/graphify](https://github.com/safishamsi/graphify)): vis.js, interactive graph, search, **community detection / filter by community** — borrow patterns for clustering and filters.
- Current wikimem d3-force graph can be migrated or wrapped; prioritize **click → open** and **performance** on large vaults (LOD, hide labels until zoom).

---

### Requirement 5 — Pipeline panel (collapsible bottom)

**Purpose:** Make “the wiki is compiling” visible and trustworthy — like a CI or Rowboat-style workflow strip.

**Stages (fixed order, visual pipeline)**

1. **detect** — MIME/extension, router chosen
2. **extract** — text/markdown from PDF/DOCX/image/audio…
3. **dedup** — similarity check vs existing pages
4. **LLM** — model call(s), token usage optional
5. **write** — files written under `wiki/` + `raw/`
6. **index** — index.md / log.md / embeddings updated

**UI**

- Collapsed: thin bar showing “Idle” or **one-line status** of active job (`Ingesting resume.pdf…`).
- Expanded: horizontal **stepper** with states `pending | active | done | error`; click row for **log drawer** (stderr, LLM summary, paths written).

**Data**

- Server emits **SSE or WebSocket** events per job id: `{ jobId, stage, status, message, ts }`.
- Client queues multiple jobs; sidebar upload adds to queue.

**ASCII — expanded stepper**

```
Pipeline ─────────────────────────────────────────────────────────────── [collapse]
Job a1b2  resume.pdf
  detect ──●── extract ──●── dedup ──○── LLM ──○── write ──○── index ──○
  Last log: Routed to pdf-parse; 4317 chars extracted
```

---

### Requirement 6 — ⌘K global fuzzy search

**Purpose:** Fast navigation across **all** wiki content (paths + titles + body + frontmatter fields as configured).

**Behavior**

- **⌘K** (Mac) / **Ctrl+K** (Windows/Linux) opens palette overlay.
- Fuzzy match on: file path, `title`, `summary`, headings (optional index), tag names.
- **Arrow keys** to move, **Enter** to open, **Esc** to close.
- Show **type badge** and folder segment in each result row.

**Tech notes**

- Index on server start + file watcher invalidation; use MiniSearch, FlexSearch, or fuse.js — align with existing BM25 if hybrid ranking is desired later.
- Debounce input (~150ms); highlight matched ranges for scanability.

---

### Requirement 7 — Entity pages: structured layout

**Purpose:** When `type: entity` (or path under `wiki/entities/`), render **CRM / Granola-style** sections instead of a single prose blob — while still allowing freeform markdown below or in subsections.

**Suggested sections (headings or card groups)**

| Section      | Content source                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Info**     | Frontmatter: aliases, URLs, location, founded, role — extensible key/value                                             |
| **Summary**  | Frontmatter `summary` + lead paragraph                                                                                 |
| **People**   | Linked entities (`[[Person]]`) or structured list from LLM — count badge, e.g. “People 124” pattern from CRM reference |
| **Projects** | Linked tools/products/repos                                                                                            |
| **Activity** | Recent edits, ingest events touching this entity (from log pipeline), optional timeline                                |

**Fallback:** If frontmatter lacks structured keys, show standard markdown only; do not block rendering.

**Reference:** Granola / CRM-style entity screens with **category counts** (People, Organizations, etc.) — adapt as **related entity type counts** on this page (e.g. link to filtered graph or search).

---

### Requirement 8 — Breadcrumbs

**Purpose:** Orient user in vault path; support upward navigation.

**Format**

- `wiki > sources > ai-overview` or `raw > 2026-04-07 > file.pdf`
- Each segment clickable → opens folder in tree (expand + select) or parent folder view.

**Implementation**

- Derive from `vaultPath`; slugify display names; last segment = current file (not link) or link to self for copy.

---

### Reference products (visual and interaction debt)

| Product               | What to steal                                                               |
| --------------------- | --------------------------------------------------------------------------- |
| **Obsidian**          | Folder tree + graph view density; vault as single workspace                 |
| **Granola / CRM UIs** | Structured entity pages; section headers; **counts** for related categories |
| **Graphify** (vis.js) | Node click, search, **filter by community**                                 |
| **Rowboat**           | AI workflow visibility — map to **pipeline stepper** language               |

---

### Design system — Energy (mandatory for web shell)

**Foundations**

- **Background / surfaces:** warm black `#141312` as primary app background; elevated surfaces +1/+2 steps lighter with OKLCH (derive neutrals in tokens file).
- **Typography:** **Instrument Serif** for display / page titles; **Poppins** for UI chrome, body, and properties. Load with `font-display: swap`.
- **Accent:** purple `#6b21a8` primary; `#8B5CF6` for interactive hover/focus rings and graph highlights — keep consistent with WCAG contrast on dark (use contrast-checker skill before ship).

**Layout & polish**

- **OKLCH** palette for semantic tokens (text.primary, border.subtle, accent.default).
- **Concentric border radius:** outer shells slightly larger radius than inner cards (e.g. 12px shell, 8px cards).
- **Multi-layer shadows:** subtle ambient + tighter contact shadow on elevated panels (sidebar, pipeline, ⌘K palette).
- **4px grid** for spacing; **tabular nums** for counts and dates (`font-variant-numeric: tabular-nums`).
- **Font smoothing:** `-webkit-font-smoothing: antialiased` where appropriate; **text-wrap: balance** on hero titles and empty-state headings.

**Motion**

- **Stagger** list/tree reveal (short delays, `prefers-reduced-motion: reduce` → disable).
- **Interruptible transitions:** respect user input during animations (cancel or snap); no blocking transitions on navigation.

**Components (minimum set)**

- Sidebar tree row (hover, selected, focus ring).
- Tab bar (active underline or surface, close hit target ≥ 24px).
- Badge / chip for frontmatter.
- Segmented Document | Graph control.
- Pipeline stepper + collapse handle.
- ⌘K palette (modal overlay, glass or solid per token).

---

### API / state checklist (for implementers)

- [ ] Tree + counts API or SSR payload
- [ ] File read API returns raw markdown + parsed frontmatter JSON
- [ ] Wikilink graph data for vis/d3 (nodes/edges with paths)
- [ ] SSE/WebSocket for pipeline jobs
- [ ] Search index endpoint or client-built index from manifest
- [ ] WebSocket or polling for wiki file changes (optional, for multi-client)

---

### Acceptance criteria (high level)

1. User can expand/collapse sidebar folders, see counts, and open any markdown file **without a modal**.
2. At least two files open as tabs; switching preserves scroll; close works.
3. User can toggle **Graph** in the main pane and **open a page by clicking a node**.
4. Upload via sidebar shows progress through **detect → … → index** in the bottom panel.
5. **⌘K** finds pages fuzzy-match style and opens via keyboard only.
6. Entity pages show the **structured sections** when data exists; otherwise graceful markdown.
7. Breadcrumbs reflect path and navigate.
8. Visuals match Energy tokens (warm black, Instrument Serif + Poppins, purple accent, OKLCH, motion rules).

**Out of scope for this spec (unless maintainer promotes):** full collaborative editing, mobile-native apps, plugin API for third-party graph layouts.

---

_End Part 7._

---

## Part 8: Work Tracking Protocol

**`MASTER-TODOS.md`** (same directory as this Bible) is the persistent, canonical task tracker for all WikiMem work.

### Rules (Maintainer Directive, April 8, 2026)

1. **Read at session start.** Before doing any work, read `MASTER-TODOS.md` to understand current state.
2. **Update during work.** When you complete a task, mark it `[x]` in the file with a date and one-line evidence.
3. **Add new tasks immediately.** Any new requirement from maintainer, bug found, or follow-up identified gets added to the file right away — not just to the session tracker.
4. **Never delete.** Completed items stay forever as historical record. This is the audit trail of everything built.
5. **Mirror to session tracker.** The TodoWrite tool should reflect the file, but the file is the source of truth that survives across sessions.
6. **61 items as of April 8.** 22 completed, 39 pending, organized into 15 categories with unique IDs (UX-001 through DOC-004).

_End Part 8._

---

## Part 9: Competitive Landscape (Updated April 10, 2026)

### The Karpathy Wiki Explosion

Karpathy's April 4, 2026 gist triggered 7,882+ X posts and 40+ GitHub implementations in 3 days. The space is now crowded but still early — no clear winner has emerged.

### Direct Competitors (Knowledge Wiki Category)

| Project                         | Stars | Language   | Key Strength                                                                             | Threat                             |
| ------------------------------- | ----- | ---------- | ---------------------------------------------------------------------------------------- | ---------------------------------- |
| **SamurAIGPT/llm-wiki-agent**   | 1,500 | Python     | Contradiction detection, auto-entity extraction, multi-agent support, zero API key       | **HIGHEST** — fastest growing      |
| sage-wiki (xoai)                | 186   | Go         | Single binary, hybrid BM25+semantic, prompt caching, batch API, 5-step compiler pipeline | **High** — most technically mature |
| **GBrain (garrytan/gbrain)**    | 438   | TypeScript | Postgres+pgvector, intelligence-assessment pages, Notion/Logseq/Roam import              | **Medium-High** — YC distribution  |
| llmwiki.app (lucasastorian)     | ~100  | TypeScript | Hosted web app, Claude MCP native, zero setup                                            | **Medium** — hosted lowers barrier |
| Atomic (kenforthewin)           | New   | Rust       | Semantic similarity linking, spatial canvas, Tauri desktop, MCP endpoint                 | **Medium** — elegant architecture  |
| obsidian-wiki (Ar9av)           | 260   | Python     | Provenance tracking, delta tracking, tag taxonomy, multi-agent                           | **Medium** — strong Obsidian focus |
| DocMason (JetXu)                | New   | Python     | Office file specialist, source traceability, Codex-native                                | **Low** — narrow focus             |
| sdyckjq-lab/llm-wiki-skill      | 272   | Shell      | Multi-platform, Chinese-first, WeChat extractors                                         | **Low** — regional focus           |
| coleam00/claude-memory-compiler | 206   | Python     | Auto-captures Claude Code sessions via hooks                                             | **Low** — different scope          |
| atomicmemory/llm-wiki-compiler  | 176   | TypeScript | Hash-based incremental compilation                                                       | **Low** — CLI only                 |

### Adjacent Competitors (Memory / Tools Category)

| Project                    | Stars   | What It Is                                       | Relevance                                 |
| -------------------------- | ------- | ------------------------------------------------ | ----------------------------------------- |
| MarkItDown (Microsoft)     | 92.8K   | Universal format → markdown converter            | **Tool** — should integrate               |
| IBM Docling                | 55K     | CV-based PDF/doc parser, knowledge graphs        | **Tool** — should integrate               |
| GStack (Garry Tan)         | 50K+    | Claude Code skill pack (28 commands)             | **Not competitive** — different category  |
| MemPalace (Milla Jovovich) | 37.6K   | Spatial AI memory (ChromaDB + method of loci)    | **Low** — agent memory, not wiki          |
| hippo-memory               | 451     | Biologically-inspired memory decay/strengthening | **Low** — novel concepts worth studying   |
| OfficeCLI (iOfficeAI)      | Growing | Office suite for AI agents (single binary)       | **Tool** — should integrate               |
| Nuggetz                    | SaaS    | AI chat thread → team knowledge base             | **Low** — browser extension, different UX |

### WikiMem's Moat (Why We Win)

1. **Three automations in one tool** — No competitor has ingest + scrape + self-improve (LLM Council). Most have ingest only.
2. **Git-native checkpointing** — Time-lapse visualization of wiki evolution over time. No competitor has this.
3. **Raw-to-wiki provenance** — Bidirectional linking between source files and generated pages. Traceable knowledge chain.
4. **13 format processors** — Most comprehensive multi-modal ingestion pipeline (PDF, DOCX, XLSX, PPTX, images, audio, video, URL, CSV, JSON, YAML, HTML, text).
5. **Full web UI with WYSIWYG** — Obsidian-quality editing in browser. Most competitors are CLI-only or read-only web.
6. **D3 graph with community detection** — God nodes, community colors, search, export. Beyond basic graph views.
7. **MCP server** — Only WikiMem and llmwiki.app have native Claude Code tool integration.
8. **Published npm CLI** — Professional npm package with real CLI, not just skill files or Python scripts.
9. **Connector model** — External data source integration (folder, git, GitHub, webhook) — unique to WikiMem.
10. **BM25 search index** — Most competitors rely on LLM for search, not a proper index.

### Feature Gaps to Close (Updated with Agent Swarm Findings)

| Gap                         | From Competitor   | Priority | Impact                              |
| --------------------------- | ----------------- | -------- | ----------------------------------- |
| **Contradiction detection** | llm-wiki-agent    | **P0**   | Users need conflict alerts          |
| **Prompt caching**          | sage-wiki         | **P0**   | 50-90% cost reduction               |
| **Batch API**               | sage-wiki         | **P0**   | 50% cost reduction on bulk          |
| **Auto-entity extraction**  | llm-wiki-agent    | **P1**   | Automatic knowledge structuring     |
| **Vector search**           | GBrain            | **P1**   | Semantic search beyond BM25         |
| Source boundaries           | DocMason          | P1       | Prevents cross-source hallucination |
| Hosted version              | llmwiki.app       | P1       | Lowers adoption barrier             |
| Notion/Logseq/Roam import   | GBrain            | P2       | Migration traffic capture           |
| Spatial canvas              | Atomic            | P2       | Novel exploration UX                |
| Mermaid diagrams            | llmwiki.app       | P2       | Visual relationship mapping         |
| Provenance tracking         | obsidian-wiki     | P2       | Track which source said what        |
| Codebase-to-wiki            | llm-wiki-compiler | P2       | Developer use case                  |
| .eml email parsing          | DocMason          | P2       | Enterprise data source              |
| Desktop app (Tauri)         | Atomic            | P3       | Native experience                   |
| Browser extension           | Nuggetz           | P3       | Web clipping distribution           |
| Memory decay/strengthening  | hippo-memory      | P3       | Knowledge freshness signals         |

### Data Format Tools Landscape (April 2026)

**Universal converter:** Microsoft MarkItDown (92.8K stars) — handles PDF, DOCX, PPTX, XLSX, images, audio, HTML, ZIP, YouTube. Should be WikiMem's default pre-processor.

**PDF specialist:** IBM Docling (15K+ stars) — computer vision models (not OCR), 30x faster, best table extraction. Use for complex PDFs.

**OCR:** Surya OCR (97.7% accuracy) > PaddleOCR (94.5%) > Tesseract (92.4%). Use Surya as local fallback.

**Audio:** Groq Whisper ($0.0002/min) is 30x cheaper than OpenAI ($0.006/min) with same model. Add as default.

**Office files:** OfficeCLI — single binary, no Office required, 150+ Excel functions, full PowerPoint support including animations and 3D.

### Connector Architecture (for OAuth integrations)

**Recommended pattern:** OAuth Device Flow (like GitHub CLI) — no localhost server needed. User gets code, enters in browser, CLI polls for token.

**Token storage:** Encrypted config file at `~/.wikimem/credentials.enc` (cross-platform). macOS Keychain as optional upgrade.

**Plugin architecture:** Each connector implements `authenticate() → fetch() → transform()` interface. Registry auto-populates Settings UI.

**Key packages:** `@octokit/auth-oauth-device` (GitHub), `googleapis` (Gmail/Calendar), `@slack/web-api` (Slack), `@notionhq/client` (Notion), `simple-oauth2` (generic).

_End Part 9._
