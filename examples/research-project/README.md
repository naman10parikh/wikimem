# Example: Research Project Wiki

Use llmwiki to build a structured literature review and research wiki for a specific topic.

## Setup

```bash
llmwiki init llm-agents-research --template research
cd llm-agents-research
```

## Phase 1: Seed with Papers

Gather your core papers and ingest them:

```bash
# PDFs from your downloads
llmwiki ingest ~/Papers/attention-is-all-you-need.pdf
llmwiki ingest ~/Papers/chain-of-thought-prompting.pdf
llmwiki ingest ~/Papers/toolformer.pdf

# ArXiv URLs (fetches and converts to markdown)
llmwiki ingest https://arxiv.org/abs/2201.11903
llmwiki ingest https://arxiv.org/abs/2302.04761
```

For each paper, llmwiki creates:
- A **source summary** in `wiki/sources/` with key findings
- **Entity pages** in `wiki/entities/` for authors, organizations, models
- **Concept pages** in `wiki/concepts/` for techniques and ideas

## Phase 2: Add Context

Layer in blog posts, talks, and related material:

```bash
# Blog posts
llmwiki ingest https://lilianweng.github.io/posts/2023-06-23-agent/

# Conference talks (video transcription)
llmwiki ingest ~/Videos/neurips-keynote.mp4

# Lecture recordings
llmwiki ingest ~/Recordings/lecture-7-transformers.mp3

# Your own notes
llmwiki ingest notes/reading-notes-week-1.md
```

## Phase 3: Automated Monitoring

Configure `config.yaml` to track new papers and repos:

```yaml
provider: claude

sources:
  - name: "ArXiv AI Agents"
    type: rss
    url: "https://rss.arxiv.org/rss/cs.AI"
    schedule: "0 6 * * *"

  - name: "GitHub Agent Repos"
    type: github
    query: "topic:ai-agent stars:>20 pushed:>7d"
    schedule: "0 12 * * MON"

  - name: "Lilian Weng Blog"
    type: rss
    url: "https://lilianweng.github.io/index.xml"

improve:
  enabled: true
  threshold: 85
  auto_apply: false
```

Then run periodically:

```bash
llmwiki scrape              # Fetch new sources
llmwiki ingest raw/today/*  # Process into wiki
llmwiki improve --dry-run   # Review proposed improvements
llmwiki improve             # Apply improvements
```

## Phase 4: Query and Synthesize

Use the wiki as a research assistant:

```bash
# Literature review questions
llmwiki query "What are the main approaches to tool use in LLM agents?"
llmwiki query "How has the chain-of-thought technique evolved since 2022?"
llmwiki query "Compare ReAct, Toolformer, and HuggingGPT approaches"

# Save synthesis as wiki pages
llmwiki query "Write a literature review of LLM agent architectures" --file
llmwiki query "What open problems remain in LLM agents?" --file
```

## Phase 5: Maintain Quality

```bash
# Health check
llmwiki lint
# Output:
#   ! [orphan] Page "Toolformer" has no inbound links
#   ! [missing-link] "ReAct" links to non-existent "[[Reasoning and Acting]]"
#   Score: 72/100

# Fix issues
llmwiki lint --fix

# Run full improvement cycle
llmwiki improve
# Output:
#   Wiki Quality Score: 78/100
#     coverage: 85/100
#     consistency: 90/100
#     crossLinking: 55/100
#     freshness: 85/100
#     organization: 75/100
#   Applying improvements:
#     [applied] cross-link: Add inbound links to orphan page: Toolformer
#     [applied] suggest-page: Create missing page for [[Reasoning and Acting]]
```

## Using with Obsidian

Open the vault in Obsidian to get a visual map of your research:

1. **Graph view** shows clusters of related concepts, highlighting how papers connect
2. **Backlinks** panel lets you see every paper that references a concept
3. **Tag view** groups pages by topic tags from frontmatter
4. **Search** lets you find specific claims across all papers

## Example Vault Structure

```
llm-agents-research/
├── AGENTS.md
├── config.yaml
├── raw/
│   ├── 2026-04-01/
│   │   ├── attention-is-all-you-need.pdf
│   │   ├── chain-of-thought-prompting.pdf
│   │   └── toolformer.pdf
│   └── 2026-04-07/
│       ├── arxiv-new-papers/
│       └── github-trending/
└── wiki/
    ├── index.md
    ├── log.md
    ├── sources/
    │   ├── attention-is-all-you-need.md
    │   ├── chain-of-thought-prompting.md
    │   ├── toolformer.md
    │   └── lilian-weng-llm-agents.md
    ├── entities/
    │   ├── google-brain.md
    │   ├── openai.md
    │   ├── ashish-vaswani.md
    │   └── jason-wei.md
    ├── concepts/
    │   ├── transformer-architecture.md
    │   ├── self-attention.md
    │   ├── chain-of-thought.md
    │   ├── tool-use.md
    │   ├── react-framework.md
    │   └── in-context-learning.md
    └── syntheses/
        ├── literature-review-llm-agents.md
        └── open-problems-llm-agents.md
```

## Tips

- **Ingest early, query often.** The more sources you add, the better the cross-references become.
- **Let the LLM Council work.** Run `llmwiki improve` weekly to keep the wiki healthy.
- **Edit AGENTS.md** to add domain-specific conventions. For example, add a "Methodology" section requirement for paper summaries.
- **Use `--file` on queries** to build a synthesis section that captures your evolving understanding.
- **Check `wiki/log.md`** to see the chronological history of everything that has happened in your research wiki.
