# WikiMem vs. The Alternatives

> One-line verdict first. Details below.

---

## Comparison Matrix

| Feature | **WikiMem** | Obsidian | Notion AI | Perplexity Spaces | Dex | Mem0 |
|---|---|---|---|---|---|---|
| **Ingest any file format** | 13+ formats | Manual notes only | Upload to Notion first | Web URLs only | Contacts/emails | Structured facts only |
| **OAuth connectors** | 38 (GitHub, Slack, Gmail, Notion, Discord, Drive, Linear, Jira…) | Via plugins, no compilation | Notion-native only | None | Gmail, LinkedIn | API push only |
| **Compiles into structured pages** | Yes — entity pages, concept pages, syntheses, wikilinks | You write them manually | No — answers questions, doesn't restructure | No — returns search results | No — CRM cards | No — key-value memory |
| **Self-improvement loop** | Observer: 24-point nightly scoring + auto-repair | None | None | None | None | None |
| **LLM-agnostic** | Claude, GPT-4o, Ollama (local) | Via plugins | OpenAI only | Perplexity only | Claude | OpenAI |
| **Fully local / private** | Yes (Ollama mode) | Yes | No (cloud) | No (cloud) | No (cloud) | No (cloud) |
| **Obsidian-compatible output** | Yes — open vault folder, it just works | Native | No | No | No | No |
| **Claude Code / MCP native** | Yes — 7 MCP tools + slash commands | No | No | No | No | No |
| **Knowledge graph** | Interactive D3 graph in web IDE | Yes (core feature) | No | No | No | No |
| **Git-checkpointed** | Every change committed | Via plugins | No | No | No | No |
| **Open source / MIT** | Yes | Core is open source | No | No | No | No |
| **Pricing** | Free (self-hosted) | Free + paid Sync | Free + paid AI | Free + paid Pro | Free + paid | Paid API |

---

## Head-to-Head Details

### WikiMem vs. Obsidian

**One-liner:** Obsidian stores what you write. WikiMem compiles what you feed it.

Obsidian is the best tool for manual note-taking at scale. You create notes, organize them, link them. For knowledge workers who write a lot, it is excellent.

WikiMem solves a different problem: you have sources you want to compile but don't want to manually summarize. PDFs, audio recordings, Slack exports, GitHub repos, URLs — WikiMem reads them, extracts entities and concepts, creates the pages, and links them. You never type a single note.

The output is Obsidian-compatible. Open the vault folder in Obsidian — it works.

**Choose Obsidian** if you write most of your knowledge manually and want a powerful editor for it.
**Choose WikiMem** if you want to compile sources automatically without writing anything.

---

### WikiMem vs. Notion AI

**One-liner:** Notion AI answers questions about what you've organized. WikiMem compiles anything you feed it and then answers questions.

Notion AI is a Q&A layer on top of your existing Notion workspace. It's good at retrieving and summarizing what you've already written in Notion. But it requires the information to already be in Notion — structured, organized, formatted.

WikiMem ingests raw sources in any format: PDFs you've never opened in Notion, audio from calls, GitHub issue exports, Slack history. It does the structuring for you. And the Observer automation scores quality nightly and applies fixes — Notion AI has no equivalent.

**Choose Notion AI** if your knowledge is already in Notion and you want a Q&A interface.
**Choose WikiMem** if you want to compile raw, heterogeneous sources into structured knowledge.

---

### WikiMem vs. Perplexity Spaces

**One-liner:** Perplexity searches and summarizes the public web. WikiMem compiles your private sources.

Perplexity Spaces is excellent for research tasks that require current, public information. It fetches from the web, synthesizes across sources, stays up to date.

WikiMem is for your private knowledge: PDFs you own, audio you recorded, internal docs, curated URLs you've saved. The knowledge stays on your machine. Nothing is sent anywhere except LLM API calls (optional if you use Ollama).

These tools are complementary: use Perplexity for external research, WikiMem for compiling your own material.

**Choose Perplexity Spaces** for current public-web research and synthesis.
**Choose WikiMem** for compiling private, heterogeneous sources that live on your machine.

---

### WikiMem vs. Dex

**One-liner:** Dex is a personal CRM. WikiMem is a general-purpose knowledge compiler.

Dex tracks your relationships: who you've talked to, what you discussed, follow-up reminders. It's optimized for people and interactions.

WikiMem ingests any domain: research papers, codebases, audio recordings, Slack exports, market analysis PDFs. If you want to compile knowledge about people, WikiMem can do that — but it also handles everything else.

**Choose Dex** if relationship management is your primary use case.
**Choose WikiMem** for compiling knowledge across any domain.

---

### WikiMem vs. Mem0

**One-liner:** Mem0 is a memory API. WikiMem is a structured knowledge compiler with a web IDE.

Mem0 is designed for developers building AI apps that need persistent memory. You push facts via API, query them back out. The interface is code, not a browsable knowledge base.

WikiMem produces wiki pages you can browse, search, and edit. It has a D3 knowledge graph, a time-lapse viewer, a WYSIWYG editor, and a self-improvement loop. You can open it in Obsidian. You can read it yourself.

The self-improvement layer is the other key difference: WikiMem's Observer scores your knowledge base nightly and repairs gaps, orphan pages, and contradictions automatically. Mem0 has no equivalent.

**Choose Mem0** if you're building a developer-facing AI app that needs a memory API.
**Choose WikiMem** if you want a browsable, self-improving knowledge base you can read yourself.

---

## When WikiMem Is Not the Right Tool

- You need a CRM: use Dex or HubSpot.
- You need current web research: use Perplexity.
- You need a team wiki with real-time collaboration: use Notion or Confluence.
- You need a developer memory API for an AI app: use Mem0.
- Your primary workflow is manual note-taking in a rich editor: use Obsidian.

WikiMem is for: compiling sources you've accumulated (not notes you've written), running automations that keep your knowledge base fresh, and giving an LLM structured access to your private knowledge base via MCP.
