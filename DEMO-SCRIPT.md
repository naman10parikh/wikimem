# WikiMem — 1-Minute Demo Script

> For screen recording narration. Assumes a vault with a few pages already seeded.
> Total runtime: ~60 seconds. Sections are timed.

---

## [0:00 – 0:08] Cold start

**Screen:** Terminal, empty directory.

**Narrator:**
This is wikimem. One command to start.

```bash
npx wikimem@latest init my-wiki
cd my-wiki
npx wikimem serve
```

**Screen:** Browser opens to localhost:3141. Clean dark IDE, empty file tree.

---

## [0:08 – 0:20] Ingest a URL

**Screen:** Home page. URL input field.

**Narrator:**
Paste any URL. WikiMem fetches the content, runs it through the ingest pipeline, and compiles structured wiki pages.

**Action:** Paste a URL (e.g. a research paper or blog post). Hit enter.

**Screen:** Pipeline view animates — detection, extraction, LLM compilation, git commit.

**Narrator:**
Three pages created: a source summary, an entity page for the author, a concept page for the main idea. All cross-linked with wikilinks. Committed to git.

---

## [0:20 – 0:35] Observer improves

**Screen:** Terminal tab or pipeline view.

**Narrator:**
The Observer runs nightly — or right now on demand.

```bash
wikimem improve
```

**Screen:** Observer output scrolls — scoring each page on coverage, consistency, cross-linking, freshness, organization. One orphan page gets linked. One sparse page gets expanded.

**Narrator:**
24-point scoring. Every run is logged. Your knowledge base gets better while you're not using it.

---

## [0:35 – 0:48] Ask your knowledge

**Screen:** Switch to the Ask tab in the web IDE.

**Narrator:**
Ask anything across your compiled knowledge.

**Action:** Type: "What are the tradeoffs discussed across all my sources?"

**Screen:** Streamed LLM response with inline citations to specific wiki pages.

**Narrator:**
The answer pulls from your compiled pages — not a vector index. Structured, auditable, traceable.

---

## [0:48 – 0:60] Graph view + close

**Screen:** Click the graph icon. D3 force-directed graph animates into view. Nodes = pages, edges = wikilinks. Click a node to highlight its neighborhood.

**Narrator:**
Every page is a node. Every wikilink is an edge. The graph shows you where your knowledge is dense — and where the gaps are.

**Screen:** Pull back to show the full graph. Hold for 3 seconds.

**Narrator:**
WikiMem. Your knowledge compiles itself.

`npx wikimem@latest` — MIT licensed, works with Claude, GPT-4o, or Ollama.

---

## Production Notes

- **Record at 1440p** — graph detail needs resolution
- **Use a pre-seeded vault** for the Observer demo (so scores show real changes, not all-100s)
- **Speed up the ingest pipeline** to 2x — it's correct but slow at realtime
- **Pause 1 second** on the graph node highlight — let the dimming animation complete
- **Caption the key numbers**: "3 pages", "24-point score", "0 orphans" as lower-third text
