# WikiMem — Hacker News Launch

## Title Options (pick one)

1. **Show HN: WikiMem – Self-improving wiki IDE that compiles any file into structured knowledge**
2. **Show HN: WikiMem – Turn PDFs, audio, video into an interlinked wiki with LLMs**
3. **Show HN: WikiMem – Karpathy's LLM wiki concept as a full IDE**

## Recommended: Option 1

Reason: Emphasizes the novel part (self-improving + any file), avoids name-dropping which HN sometimes reacts negatively to.

## Body Text

Hi HN,

I built WikiMem after seeing the LLM wiki concept floating around — the idea that LLMs should compile knowledge into structured, interlinked wikis rather than just retrieving chunks from vector stores.

WikiMem takes any file (PDF, audio, video, slides, spreadsheets, URLs — 13+ formats) and compiles it into structured wiki pages with cross-references, citations, and entity tracking. Three automations keep the knowledge base growing and self-improving:

1. **Ingest** watches a folder — drop a file, get wiki pages
2. **Scrape** pulls from RSS feeds and GitHub trending
3. **Improve** runs an LLM quality council that scores and enhances pages

It ships as a CLI + web IDE:

```
npx wikimem@latest init my-wiki
cd my-wiki
npx wikimem serve
```

The web UI has a D3 knowledge graph, time-lapse viewer (watch your wiki grow commit-by-commit), WYSIWYG editing, Cmd+K search, and pipeline visualization.

Works with Claude, GPT-4o, or Ollama (fully local). Obsidian compatible — just open the vault folder. Ships with an MCP server for Claude Code/Cursor integration.

Everything is git-checkpointed. Every change committed automatically. Your wiki is a git repo from day one.

MIT licensed, 17K lines of TypeScript, 17 CLI commands.

GitHub: https://github.com/naman10parikh/wikimem
npm: https://www.npmjs.com/package/wikimem

Happy to answer questions about the architecture or the self-improvement cycle.

## Posting Notes

- Submit URL: https://github.com/naman10parikh/wikimem (GitHub gets more upvotes than npm links)
- Best time: Tuesday-Thursday, 8-10am ET
- First comment: add the body text above as a comment immediately after posting
- Monitor and reply to every comment within the first 2 hours
- Don't ask for upvotes or share the HN link on other platforms (HN penalizes this)
- If someone asks about RAG comparison: wiki compiles knowledge (structured, interlinked, auditable) vs RAG retrieves chunks (unstructured, isolated, opaque)
- If someone asks about privacy: everything local except LLM API calls, and Ollama mode = fully offline
