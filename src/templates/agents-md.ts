export function getDefaultAgentsMd(template: string): string {
  const now = new Date().toISOString().split('T')[0];

  return `# AGENTS.md — Wiki Schema & Conventions

> This file is the authoritative schema for your wiki.
> The LLM reads it before every operation. Edit it to evolve your knowledge structure.

## Domain: ${template}

## Created: ${now}

---

## 1. Directory Structure

\`\`\`
raw/              # Immutable source documents (never modified by wikimem)
wiki/             # LLM-maintained knowledge base
  index.md        # Auto-generated catalog — every page listed with summary
  log.md          # Append-only audit trail of all operations
  sources/        # One summary page per ingested source document
  entities/       # Discrete real-world things (people, orgs, places, products, tech)
  concepts/       # Abstract ideas (frameworks, principles, patterns, algorithms)
  syntheses/      # Cross-cutting analyses and structured thinking
AGENTS.md         # This file — schema, conventions, operating rules
config.yaml       # LLM provider, sync sources, schedule settings
\`\`\`

---

## 2. Frontmatter Specification

Every wiki page MUST begin with YAML frontmatter. All fields are required unless marked optional.

\`\`\`yaml
---
title: "Exact Page Title"                   # Matches filename (Title Case)
type: source | entity | concept | synthesis  # Page category (see Section 3)
category: person | organization | place | product | technology  # entity sub-type (entities only)
#        framework | principle | technique | pattern | algorithm  # concept sub-type (concepts only)
#        article | paper | video | podcast | book | dataset       # source sub-type (sources only)
#        comparison | summary | decision-record | retrospective   # synthesis sub-type (syntheses only)
tags: [tag1, tag2, tag3]                    # Lowercase kebab-case, 2–8 tags
summary: "One sentence for index.md"        # Required; ≤ 120 characters
tldr: "One or two sentences capturing the single most important thing."  # Standalone; no prior context needed
sources: []                                 # Paths to raw/ files that inform this page
related: []                                 # [[Wikilinks]] to closely related pages
created: "${now}"
updated: "${now}"
confidence: high | medium | low             # How well-sourced is the content? (optional)
validation_status: verified | unverified | disputed  # (optional; set by lint/improve)
---
\`\`\`

### Field Rules

- **title**: Title Case. Must match the filename (e.g. \`Attention Mechanism.md\` → \`title: "Attention Mechanism"\`).
- **type**: Determines the subdirectory. Always one of the four top-level categories.
- **category**: Required for \`entity\` and \`concept\` pages. Drives entity/concept sub-typing.
- **tags**: Snake-case preferred for multi-word tags (e.g. \`machine-learning\`, \`transformer\`).
- **summary**: Used in index.md catalog rows. Keep it under 120 characters.
- **tldr**: Readable without any context. Serves as hover-preview and search snippet.
- **sources**: Relative paths from the vault root (e.g. \`raw/2024-01-15/paper.pdf\`).
- **related**: Use \`[[Page Name]]\` format. Only list pages with genuine conceptual overlap.
- **confidence**: \`high\` = multiple corroborating sources; \`medium\` = one source; \`low\` = inferred/speculative.
- **validation_status**: Set automatically by \`wikimem lint\` and \`wikimem improve\`.

---

## 3. Page Categories & Sub-Types

### 3.1 Sources  (\`wiki/sources/\`)

One page per ingested document. The source page is the bridge between raw input and the wiki.

| Sub-type  | Description                                      |
| --------- | ------------------------------------------------ |
| article   | Blog post, web article, newsletter               |
| paper     | Academic or research paper                       |
| video     | YouTube, talk, lecture recording                 |
| podcast   | Episode or audio recording                       |
| book      | Full book or significant chapter                 |
| dataset   | Structured data, spreadsheet, database export    |

**Required sections:** Overview, Key Points (bullet list), Entities Mentioned, Concepts Discussed, Notable Quotes (if any).

### 3.2 Entities  (\`wiki/entities/\`)

Discrete, identifiable real-world things. Entity pages accumulate facts over time as more sources mention them.

| Sub-type     | Description                                 |
| ------------ | ------------------------------------------- |
| person       | Individual human beings                     |
| organization | Companies, teams, institutions, projects    |
| place        | Geographic locations, venues, regions       |
| product      | Commercial products, apps, services         |
| technology   | Technical systems, tools, frameworks, APIs  |

**Required sections:** Overview, Key Facts (structured list), Related Entities, Related Concepts, Sources.

### 3.3 Concepts  (\`wiki/concepts/\`)

Abstract ideas that can be explained, taught, and applied. Concept pages are the intellectual core of the wiki.

| Sub-type   | Description                                              |
| ---------- | -------------------------------------------------------- |
| framework  | Structured approach for thinking about a domain          |
| principle  | Fundamental rule or truth                                |
| technique  | Specific method or procedure                             |
| pattern    | Recurring solution to a recurring problem                |
| algorithm  | Step-by-step computational or decision procedure         |

**Required sections:** Definition, How It Works, Why It Matters, Examples, Related Concepts, Sources.

### 3.4 Syntheses  (\`wiki/syntheses/\`)

Cross-cutting analyses that connect multiple entities or concepts. Created explicitly or by the \`query\` command.

| Sub-type        | Description                                              |
| --------------- | -------------------------------------------------------- |
| comparison      | Side-by-side analysis of two or more entities/concepts   |
| summary         | Condensed overview of a topic spanning multiple sources  |
| decision-record | Documented decision: context, options, choice, rationale |
| retrospective   | Post-mortem or lessons-learned analysis                  |

**Required sections:** Scope (what this synthesis covers), Analysis body, Key Takeaways, Open Questions, Sources.

---

## 4. Wikilink Conventions

Use \`[[Page Name]]\` to create links between pages. The LLM maintains link integrity.

\`\`\`markdown
[[Transformer Architecture]]              # Link to a concept
[[OpenAI]]                                # Link to an entity
[[Attention Is All You Need]]             # Link to a source summary
[[Scaling Laws|scaling behavior]]         # Display text: "scaling behavior" links to "Scaling Laws"
\`\`\`

**Rules:**
- Use wikilinks **extensively** — every entity and concept mentioned by name should be linked on first occurrence per page.
- Never create bare prose references to pages that exist. If a page exists, link it.
- Orphan pages (no inbound links from any other page) are flagged by \`wikimem lint\`.
- Broken links (target page does not exist) are also flagged by \`wikimem lint\`.

---

## 5. Special Pages

### \`wiki/index.md\`

Auto-generated by wikimem. Do not hand-edit sections managed by wikimem.
Contains a catalog table for each category: Title | Type | Tags | Summary | Updated.
The LLM appends rows; wikimem de-dupes and sorts on each update.

### \`wiki/log.md\`

Append-only audit trail. **Never delete or modify existing entries.**
Format for each entry:

\`\`\`markdown
## [YYYY-MM-DD HH:MM] <operation> | <short description>

- Pages created: [[Page A]], [[Page B]]
- Pages updated: [[Page C]]
- Source: raw/path/to/file.md
\`\`\`

---

## 6. Style Guide

Write in **Wikipedia style**: neutral point of view (NPOV), encyclopedic tone, third person.

- **Concise.** Prefer one precise sentence over three vague ones.
- **Factual.** Every claim should be attributable to a source (cite with \`[[Source Page]]\` or inline).
- **No opinion.** Present facts and analysis; avoid subjective language.
- **Cite sources.** Use \`[[Source Title]]\` wikilinks, not raw file paths, in prose.
- **Active voice** preferred over passive voice.
- **Present tense** for definitions and explanations; past tense for historical events.

---

## 7. Compile Rules (LLM Constraints)

When generating or updating wiki pages:

1. **Max 5,000 words per page.** If content exceeds this, break it into sub-pages and link them.
2. **Prefer updating over creating.** Before creating a new page, check if a related page already exists.
3. **No duplication.** If two pages would cover the same topic, merge them.
4. **One entity per page.** Do not combine two distinct entities on one page.
5. **Preserve existing content.** When updating a page, retain all accurate prior content. Only remove content that is factually incorrect or superseded.
6. **Flag contradictions** explicitly in a \`> ⚠️ Contradiction:\` blockquote rather than silently overwriting.
7. **Mark inferences.** If a claim is inferred (not directly stated in a source), qualify it: "This suggests…" or add \`confidence: low\` to frontmatter.
8. **No hallucination.** Do not add facts that do not appear in the source documents. If uncertain, leave a \`<!-- TODO: verify -->\` comment.

---

## 8. Operations Reference

### Ingest
When a new source arrives in raw/:
1. Read the source completely before writing anything.
2. Create/update the source summary page in \`wiki/sources/\`.
3. Identify all entities → create/update pages in \`wiki/entities/\`.
4. Identify all key concepts → create/update pages in \`wiki/concepts/\`.
5. Check whether any existing synthesis pages should be updated.
6. Update \`wiki/index.md\` with new/modified pages.
7. Append to \`wiki/log.md\`.

### Query
When answering a question:
1. Read \`wiki/index.md\` to find relevant pages.
2. Read all relevant pages before composing an answer.
3. Synthesize an answer with \`[[wikilink]]\` citations.
4. If the answer has lasting value, create a \`synthesis\` page.

### Improve
When asked to self-improve the wiki:
1. Identify orphan pages and add links from related pages.
2. Identify stale claims and flag with \`validation_status: disputed\`.
3. Identify missing concept/entity pages referenced but not yet created.
4. Propose merges for near-duplicate pages.
5. Identify synthesis opportunities (two concepts often co-mentioned → write a comparison).

### Lint
Check for:
- Pages missing required frontmatter fields
- Orphan pages (no inbound wikilinks)
- Broken wikilinks (target does not exist)
- Contradictions between pages on the same topic
- Pages exceeding 5,000 words
- Stale \`updated\` dates (no edits in > 90 days while sources grew)
`;
}
