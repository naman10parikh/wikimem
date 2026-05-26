---
type: design-blueprint
status: active
created: 2026-04-23
author: OBSIDIAN-RESEARCH persona (Maintainer the planning sprint)
closes: BUG-079-070..079 (MASTER-TODOS §49.11)
supersedes: none (companion to COMPETITOR-UX-2026-04-17.md and DESIGN-AUDIT-2026-04-17.md)
source: wikimem reading page overhaul, single canonical blueprint
---

# Obsidian-Parity Blueprint for WikiMem Reading Pages — 2026-04-23

## Executive Summary

The maintainer's April 23 screenshot shows WikiMem's entity reading page rendering **five redundant metadata components** stacked before the body heading (Properties form → METADATA card → ENTITY infobox → "Mentioned in" boxed buttons → "FIRST ADDED / LAST MODIFIED / REFERENCED BY" 3-column card → "CONTENTS" TOC card → finally the "1. Key Innovation" h1). This is what "mix and match" means in full detail. The reference product here is **Obsidian 1.7+ Reading View**: one Properties block at the top (inline-editable, collapsible, tied to frontmatter), a full-width prose column, a right-sticky Outline sidebar, and a collapsible Backlinks pane at the bottom. The Karpathy-wave projects that went viral in April 2026 (Farzapedia, lucasastorian/llmwiki, NicholasSpisak/second-brain, charlie947/ai-second-brain, Apify's Second Brain Builder) all inherit that same reading shape because **Obsidian is the IDE, the LLM is the programmer, the wiki is the codebase**. This blueprint names every region, specifies sizes in design tokens, and closes with a 12-point action list that maps each bug to a file-level fix.

## 1. Reading-Page Anatomy — One Canonical Layout

Top-to-bottom, left-to-right, at ≥1200 px viewport:

```
┌─[rail 48px]─┬─[explorer 280px]─┬──────────── main ────────────────┬─[outline 240px]─┐
│             │                  │ Breadcrumb  (10px above title)   │                 │
│  rail icons │  file tree       │ Title (h1, 30-32px semibold)     │ OUTLINE heading │
│             │                  │ Stats line (word/read/links)     │ · H2 link       │
│             │                  │ ─ Properties (collapsible) ──    │   · H3 link     │
│             │                  │                                  │ · H2 link       │
│             │                  │ Lede ¶ (–font-lg, no left-bar)   │                 │
│             │                  │ Body ¶ ¶ ¶ (–font-md)            │ (sticky,        │
│             │                  │ # h1 / ## h2 / ### h3  (no nums) │  top: 88px)     │
│             │                  │ code / tables / figures          │                 │
│             │                  │                                  │                 │
│             │                  │ — Backlinks (collapsible, ul) —  │                 │
└─────────────┴──────────────────┴──────────────────────────────────┴─────────────────┘
                                 ↑ main: max-width 820, margin auto, padding 32 40 60
```

**Sizes** (use `:root` tokens from `DESIGN-AUDIT-2026-04-17.md`):

| Region         | Token                      | Value                |
| -------------- | -------------------------- | -------------------- |
| Title h1       | `--font-3xl` semibold      | 30-32 px             |
| Body paragraph | `--font-md`, `--lh-loose`  | 14-15 px / 1.65      |
| Lede paragraph | `--font-lg`, same lh       | 16 px                |
| H1 body        | 28 px semibold, `–0.015em` | no `counter`         |
| H2 body        | `--font-2xl` semibold      | bottom-border 1 px   |
| H3 body        | `--font-xl` semibold       |                      |
| Outline aside  | sticky, top 88 px          | width 240, pad 16 20 |
| Backlinks ul   | flat list, 28 px row-h     | no boxed buttons     |

Every competitor lands in the same window: **Obsidian default ≈700 px readable line length, Notion ≈708 px, Medium ≈680 px, Substack ≈720 px, Wikipedia prose col ≈780-830 px**. WikiMem targets **820 px** because our body font is 15 px Inter (not 16-18 px like Notion or Wikipedia); at 15 px/820 px we land at **≈70-72 characters per line**, dead-centre of the Baymard-optimal 50-75 CPL band and below the WCAG 1.4.8 80-char accessibility ceiling.

## 2. Properties Panel — Obsidian Pattern, WikiMem-Fitted

Obsidian's Properties block **sits at the very top of the note, immediately below the title, above the first line of body**. In reading mode it is a single collapsible disclosure (a `<details>` element) that lists each frontmatter key as `<key> : <pill>` rows. Supported value types: **text, list, number, checkbox, date, datetime, aliases (chips), tags (chips with autocomplete)**. Every field is inline-editable on click — no modal. A trailing "Add property" row appears only when the block is expanded in edit mode; in reading mode it is hidden.

**WikiMem diff**: we already have `#page-dyn-meta` (a top-right floating Properties panel, UXO-039) AND a "METADATA" card AND an "ENTITY" infobox AND a 3-col "FIRST ADDED" card. The METADATA card, ENTITY infobox, and FIRST-ADDED card all restate fields the Properties panel already owns. **Keep the Properties panel, delete the other three components entirely.** Move the Properties block from float-right to a full-width collapsible block directly under the title — the Obsidian position. Retain the existing field types; keep the "+ Add property" affordance but hide it in reading mode (`role !== "edit"`).

## 3. Backlinks — Flat List at the Bottom, Not Boxed Buttons

Obsidian shows backlinks in a bottom-of-note pane titled **Linked mentions**, collapsed by default, with each source note as a heading and each mention quoted below it. Hover a mention → the core "Page preview" plugin opens a floating card with the source paragraph. Roam renders the same pattern inline at page bottom. Dex/Mem.ai surface related-note sidebars but both use plain rows, never boxed buttons.

**WikiMem diff**: replace `<button class="mentioned-in-item">` elements (blue-outlined, ~40 px tall, full-width) with a flat `<ul class="backlinks">` at the bottom of `#page-body`. Each `<li>` is `28 px` tall, `<a class="wikilink">` using existing wikilink typography. Wrap the whole block in `<details>` collapsed by default when >5 backlinks; show count in summary ("Linked mentions · 3"). Add hover-preview later (P2) using the same `renderMarkdown()` pipeline as wikilinks — not required for parity with the minimal Obsidian shape.

## 4. Outline (TOC) — Right-Sticky, Scroll-Synced

Obsidian's core **Outline** plugin renders the heading hierarchy as a right-sidebar pane, click-to-scroll, with the current section auto-highlighted as you scroll (on-screen headings are visually bolded). The "Another Sticky Headings" and "Dynamic Outline" community plugins polish this further — sticky current-heading at the top of the body while scrolling; floating GitHub-style collapsible TOC on the right.

**WikiMem diff**: the current `#page-toc` is styled as an **inline card in the middle of the metadata stack** (lines 3598-3648 of `src/web/public/index.html`) — wrong position. Move it to a right-sticky aside:

- At viewport ≥ 1200 px: render `<aside id="page-outline" class="outline-sticky">` with `position: sticky; top: 88px; width: 240px; max-height: calc(100vh - 120px); overflow-y: auto` next to `.page-layout`. Use `IntersectionObserver` on each `h2/h3/h4` to toggle `.outline-item.is-active` as the user scrolls.
- At viewport 900-1199 px: collapse to a `<details class="outline-collapsed">` under the title.
- At viewport < 900 px: hide entirely (the Quick Switcher covers navigation).
- Only render if the body has ≥3 headings (Obsidian parity — avoids empty-TOC noise).

## 5. Full-Width Body — Why 820 px, Not 720 or 900

WikiMem today: `.page-layout { max-width: 860px; padding: 32px 40px 60px }` (index.html line 2900). At our 15 px Inter body font that renders ≈73-75 CPL — still within the optimal band but near the top. The maintainer's screenshot shows ~600 px effective width because the floating right Properties panel (`float: right`) pushes body copy into a 600 px column. Once Properties becomes a full-width top block (§2), the body breathes across the full 820-860 px lane naturally. **Lock `max-width: 820px`** — research from Baymard (>80 CPL → 41 % more skipped), WCAG 1.4.8 (80-char ceiling), and Oregon State typography work (27 % faster reading for dyslexic readers at shorter lines) all point the same direction. 720 is too narrow for our 15 px font (≈60 CPL, feels cramped); 900 overshoots WCAG. 820 is our Goldilocks.

## 6. Timestamp Humanisation

`humanDate()` already exists at `index.html:13032` — returns `new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`. But raw ISO strings still leak through in the FIRST-ADDED/LAST-MODIFIED card (the one we're deleting) and in the audit trail. Rule:

- **Relative ("3 days ago")** for anything ≤ 7 days old — shown in Properties' Created/Updated rows and in Recent-Pages widgets.
- **Absolute ("April 13, 2026")** for anything older — Properties, time-lapse entries, audit trail.
- **Never show ISO** to end-users. Keep ISO as the `title="…"` hover attribute for power users who need precision.

Extend `humanDate()` with a sibling `relativeDate(iso)` returning `"3 days ago" | "just now" | "April 13, 2026"` depending on `Date.now() - d`. Wire everywhere ISO currently renders.

## 7. Karpathy-Wave Projects — What to Borrow

Andrej Karpathy's April 3, 2026 tweet ("LLM knowledge bases") went viral and seeded an entire wave of personal-wiki implementations. The relevant ones and what they do differently from WikiMem:

- **Farzapedia** (Farza, Buildspace) — 2,500 diary/Notes/iMessage entries → ~400 auto-generated articles. Visible in Karpathy's follow-up as the canonical personal-Wikipedia. Key borrow: **one canonical article per "entity"** (person, company, anime, idea) with Wikipedia-style `See also` at the bottom — exactly the shape we already have in `wiki-see-also-list` but buried under the entity infobox we're deleting.
- **lucasastorian/llmwiki** — ships the MCP-Claude connection as first-class; upload docs → Claude writes the wiki. Borrow: **MCP OAuth 2.1 as the default connector model** (already on roadmap as BUG-079-090).
- **NicholasSpisak/second-brain** — Obsidian-native, just a CLAUDE.md schema in the vault root. Borrow: **the CLAUDE.md-as-schema pattern** — document how a user can point Claude Code at their WikiMem vault and have it write/link notes with our Properties schema honored.
- **charlie947/ai-second-brain** (Claude Code skill) — builds the wiki from ChatGPT + Claude history. Borrow: **ingest-from-conversation-history** as a connector option.
- **Apify Second Brain Builder** — hosted version of the pattern. Borrow nothing architectural; reinforces that self-hosted + local-first is our differentiator.

"Fursa" was not locatable as a shipped product in April 2026 web searches; "Peer" similarly did not surface as a distinct project. The maintainer may mean Farzapedia (most-cited) and the generic "personal Wikipedia" wave. Treat that wave as the competitive set.

## 8. Concrete Diff Against WikiMem Today

### REMOVE (delete these render blocks entirely)

1. **METADATA card** — the 5-row card with Type/Tags/Source/Updated/Backlinks. Duplicates Properties.
2. **ENTITY infobox** (`.page-infobox.entity-infobox` at `index.html:2641-2880` + call site in `buildEntityProfileHtml`) — pill header + title + dl rows already exist elsewhere. The function is already mostly-no-op as of line 13050 — finish the job: ensure no caller still passes the old infobox shape.
3. **"Mentioned in" boxed buttons** — replace with flat `<ul class="backlinks">` at body bottom.
4. **"FIRST ADDED / LAST MODIFIED / REFERENCED BY" 3-col card** — entirely redundant with Properties.
5. **`counter-increment: wiki-h2` rules** at `index.html:2915-2941` — these are what produce "1. Key Innovation". Delete the three rules (`#page-body.md { counter-reset }`, `#page-body.md h2 { counter-increment }`, `#page-body.md h2::before { content: counter... }` and h3 counterparts). Obsidian does not auto-number body headings; neither should we.

### KEEP

1. **Properties panel** (`#page-dyn-meta`) — move from float-right to full-width top block under the title.
2. **`humanDate()` helper** at line 13032 — extend with `relativeDate()`.
3. **`page-layout`** wrapper with `max-width` — reduce 860 → 820 px.
4. **`#page-body.md > p:first-of-type` lede styling** (`--font-lg`) — but VERIFY no `border-left` leaks in from any other rule. If the maintainer saw a blue left-bar (BUG-079-072), search for `border-left.*accent` in `.md *` selectors and remove.
5. **`wiki-see-also-list`** (line 3018) — already Obsidian-shaped; keep.

### ADD

1. **`<aside id="page-outline">` right-sticky Outline** — replace inline `#page-toc` card.
2. **`relativeDate(iso)`** helper alongside `humanDate()`.
3. **`<details class="backlinks-collapsed">`** wrapper around the flat list when >5 items.
4. **`IntersectionObserver`** wiring that toggles `.outline-item.is-active` on scroll.

## 9. 12-Point Prioritized Action List

| #   | P   | Surface                                                               | Fix Outline                                                                                                                                                            | Closes                                |
| --- | --- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | P0  | `index.html:2641-2880` + `buildEntityProfileHtml`                     | Delete `.page-infobox.entity-infobox` CSS + HTML template. Confirm `buildEntityProfileHtml()` stays no-op.                                                             | BUG-079-070, BUG-079-076, BUG-079-079 |
| 2   | P0  | `index.html:2915-2941`                                                | Delete h2/h3 `counter-increment` + `::before content: counter(...)` rules. Verify "1. " prefix disappears on `transformer-architecture` page.                          | BUG-079-078                           |
| 3   | P0  | `.page-layout` line 2900                                              | Change `max-width: 860px` → `820px`. Keep `padding: 32px 40px 60px`.                                                                                                   | BUG-079-071                           |
| 4   | P0  | Page-render pipeline (METADATA card template)                         | Remove the render call that emits the METADATA card. Properties panel is the single source.                                                                            | BUG-079-070                           |
| 5   | P0  | Page-render pipeline (FIRST-ADDED card template)                      | Remove the 3-col timestamp card. All timestamp data belongs to Properties.                                                                                             | BUG-079-074                           |
| 6   | P0  | `#page-body.md > p:first-of-type` + any `.lede` / `.entity-lede` rule | Audit for `border-left` / `background:` leakage. Keep only `font-size: var(--font-lg)`.                                                                                | BUG-079-072                           |
| 7   | P1  | "Mentioned in" template                                               | Replace `<button>` elements with `<ul class="backlinks"><li><a class="wikilink">...</a></li></ul>`. Collapse to `<details>` when count > 5.                            | BUG-079-073                           |
| 8   | P1  | `#page-toc` CSS + mount point                                         | Refactor into `<aside id="page-outline">` right-sticky at `≥1200px`, collapsible `<details>` at 900-1199 px, hidden <900 px. Add `IntersectionObserver`.               | BUG-079-077                           |
| 9   | P1  | Every timestamp render site                                           | Swap raw ISO → `humanDate(iso)` or `relativeDate(iso)`. Add `title={iso}` for precision-on-hover. Add new `relativeDate()` helper next to `humanDate()` at line 13032. | BUG-079-075                           |
| 10  | P1  | `#page-dyn-meta` (Properties panel)                                   | Remove `float: right`; make full-width block directly under title. Keep collapsible `<details>` wrapper. Ensure fields use `humanDate()`.                              | BUG-079-070 support                   |
| 11  | P2  | Outline hover                                                         | Bold current-section heading while visible; use `MutationObserver` + scroll-debounce. Matches Obsidian "Another Sticky Headings".                                      | BUG-079-077 polish                    |
| 12  | P2  | Page header                                                           | Add `Created / Updated` pills next to stats line ("3 days ago"). Pre-answers the question the deleted FIRST-ADDED card existed to answer.                              | BUG-079-074 follow-up                 |

## 10. Sources

- [Obsidian Properties help](https://help.obsidian.md/properties) — inline-editable top-of-note panel, frontmatter-backed field types
- [Obsidian forum: readable line length](https://forum.obsidian.md/t/how-do-i-change-readable-line-length/70630) — default 700 px via `--file-line-width`
- [zachyoung.dev — Obsidian readable line length](https://zachyoung.dev/posts/obsidian-readable-line-length/) — CSS variable reference
- [Obsidian forum: Outline pane restore](https://forum.obsidian.md/t/howto-restore-show-outline-button-to-right-sidebar/78038) — right-sidebar core plugin
- [Dynamic Outline plugin](https://www.obsidianstats.com/plugins/dynamic-outline) — GitHub-style floating TOC, scroll-highlight
- [Another Sticky Headings plugin](https://www.obsidianstats.com/plugins/another-sticky-headings) — sticky current-heading pattern
- [Obsidian forum: auto-collapse backlinks](https://forum.obsidian.md/t/auto-collapse-backlinks-at-the-bottom-of-page/82520) — bottom-of-note collapsible pane
- [Obsidian forum: backlink hover preview](https://forum.obsidian.md/t/show-hover-preview-on-backlinks-pane/219) — page-preview core plugin
- [Baymard — optimal line length](https://baymard.com/blog/line-length-readability) — >80 CPL → 41 % more skip; 50-75 CPL optimal
- [Adoc Studio Typography 2026 Guide](https://www.adoc-studio.app/blog/typography-guide) — 66 CPL sweet spot; WCAG 1.4.8 ≤80 char
- [Oregon State — Line width accessibility](https://blogs.oregonstate.edu/calverta/line-width-in-digital-typography-for-accessibility-and-comprehension/) — 27 % faster reading for dyslexic readers at shorter lines
- [Karpathy April 3, 2026 LLM Wiki tweet](https://x.com/karpathy/status/2040470801506541998) — viral seed of the personal-wiki wave
- [Karpathy Farzapedia tweet](https://x.com/karpathy/status/2040572272944324650) — canonical personal-wiki reference
- [lucasastorian/llmwiki](https://github.com/lucasastorian/llmwiki) — MCP-Claude native implementation
- [NicholasSpisak/second-brain](https://github.com/NicholasSpisak/second-brain) — Obsidian-native CLAUDE.md-schema pattern
- [charlie947/ai-second-brain](https://github.com/charlie947/ai-second-brain) — Claude Code skill, ChatGPT/Claude history ingest
- [Apify Second Brain Builder](https://apify.com/openclawai/second-brain-builder) — hosted Karpathy pattern
- [Mem.ai review 2026](https://productivitystack.io/guides/mem-ai-guide/) — AI-surfaced related-notes sidebar
- [Logseq right sidebar docs](https://discuss.logseq.com/t/how-to-work-with-logseqs-right-hand-sidebar/8461) — 10-70 % width, min 320 px

---

**End of blueprint.** Every surface named, every px and token grounded, every bug in §49.11 closed by one or more rows in the §9 action list. Hand this to HERALD-1 and the reading page becomes Obsidian-grade.
