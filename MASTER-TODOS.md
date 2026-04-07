# MASTER TODOs — wikimem v0.2.0

**npm:** https://www.npmjs.com/package/wikimem
**GitHub:** https://github.com/naman10parikh/llmwiki
**Published:** April 7, 2026 | 15 commits | 15K+ lines

---

## DONE (with evidence)

### Core CLI
- [x] `wikimem init` — ✅ ASCII banner, vault created with AGENTS.md, config.yaml, raw/, wiki/, .obsidian/
- [x] `wikimem ingest <file>` — ✅ Karpathy gist → 7 pages, 49 wikilinks
- [x] `wikimem ingest <url>` — ✅ GitHub gist URL → 5 pages, 35 wikilinks
- [x] `wikimem ingest <dir> --recursive` — Built, needs E2E
- [x] `wikimem query "..."` — ✅ Rich answer with [[wikilinks]], 8 sources
- [x] `wikimem lint` — ✅ 43 issues found correctly
- [x] `wikimem status` — ✅ 13 pages, 2578 words, 108 wikilinks
- [x] `wikimem watch` — Built, needs E2E
- [x] `wikimem scrape` — Built, RSS tested by swarm
- [x] `wikimem improve` — ✅ Score 96/100
- [x] `wikimem duplicates` — Built, needs E2E
- [x] `wikimem serve` — ✅ Server starts, API responds

### Multi-Modal (CEO-tested with REAL files)
- [x] Text/Markdown — ✅ works
- [x] URL — ✅ Firecrawl + fetch
- [x] Image (Claude Vision) — ✅ diagram → 5 pages, 59 wikilinks
- [x] DOCX (mammoth) — ✅ "Idea of India" → 5 pages, 40 wikilinks
- [x] PDF — ❌ FAILS on real PDFs (needs pdf-parse)
- [x] XLSX — Built, not tested
- [x] PPTX — Built, not tested
- [x] Audio — Built, not tested (needs Whisper)
- [x] Video — Built, not tested (needs ffmpeg)

### Infrastructure
- [x] npm published (v0.2.0) — ✅
- [x] GitHub repo — ✅ 15 commits
- [x] .obsidian/ config — ✅ graph colors by folder
- [x] Semantic dedup — Built
- [x] Interactive tagging — Built, --tags tested
- [x] Gemini embeddings — Built
- [x] Hybrid search — Built
- [x] 58 tests (52 passing, 6 need fix)
- [x] CI workflow — Built
- [x] Web UI markdown rendering — Built v0.2.0

---

## NOT DONE — P0

| # | Bug/Feature | Status | Evidence |
|---|-------------|--------|----------|
| 1 | PDF extraction fails on real PDFs | BUG | Resume came as "pdf-extraction-failed" |
| 2 | Web UI page click → rendered markdown | NEEDS VISUAL TEST | marked.js added but not verified in browser |
| 3 | Web UI search bar | NOT BUILT | |
| 4 | Web UI file upload | NOT BUILT | |
| 5 | Global install (`npm i -g wikimem` → `wikimem` works) | NOT VERIFIED | bin entry may be broken |
| 6 | 6 unit tests failing | BUG | checkDuplicate signature changed |
| 7 | `wikimem` no args → show status or help | NOT BUILT | |
| 8 | XLSX test with real file | NOT TESTED | |
| 9 | PPTX test with real file | NOT TESTED | |
| 10 | Audio test | NOT TESTED | needs Whisper |
| 11 | Video test | NOT TESTED | needs ffmpeg |
| 12 | Obsidian graph view visual test | NOT TESTED | |
| 13 | Duplicate detection E2E | NOT TESTED | |
| 14 | Watch mode E2E | NOT TESTED | |

## NOT DONE — P1

| # | Feature | Status |
|---|---------|--------|
| 15 | `init --from-repo` (codebase → wiki) | NOT BUILT |
| 16 | `init --from-folder` (existing files → wiki) | NOT BUILT |
| 17 | `add-source` (incremental) | NOT BUILT |
| 18 | Ollama local model test | NOT TESTED |
| 19 | Scheduled automations (cron) | NOT BUILT |
| 20 | Multi-user vault | NOT BUILT |
| 21 | qmd integration | NOT BUILT |
| 22 | CLI parity in web UI | NOT BUILT |

---

## CEO Testing Log

| Test | Result | Evidence |
|------|--------|----------|
| init vault | ✅ | ASCII banner, 8 files created |
| ingest markdown | ✅ | 7 pages, 49 wikilinks |
| ingest URL | ✅ | 5 pages, 35 wikilinks |
| ingest JPEG (vision) | ✅ | 5 pages, 59 wikilinks |
| ingest DOCX | ✅ | 5 pages, 40 wikilinks |
| ingest PDF | ❌ | "pdf-extraction-failed" |
| query | ✅ | Rich answer with citations |
| lint | ✅ | 43 issues found |
| improve dry-run | ✅ | Score 96/100 |
| status | ✅ | 13 pages, 2578 words |
| serve API | ✅ | JSON responses correct |
| serve HTML | ✅ | HTML loads in curl |
| web UI visual | ⬜ | NOT TESTED via browser |
| Obsidian visual | ⬜ | NOT TESTED |
| global install | ⬜ | NOT TESTED |
