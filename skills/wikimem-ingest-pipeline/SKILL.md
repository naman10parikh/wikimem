---
name: wikimem-ingest-pipeline
description: Turn raw sources (files, folders, URLs, 13 formats) into linted, wikilinked WikiMem pages, and keep a changing folder in sync incrementally. Use WHEN the user says "add/save/import this to my wiki", drops a PDF/DOCX/MD/audio/video, points at a folder that changes daily, or asks to re-ingest only what's new. This is the ingestion + pipeline job (Automations 1+2): detect raw → extract → dedup → lint → save as page. Do NOT use for one-off scratch notes or for querying existing knowledge (use the wikimem skill's ask flow for that).
---

# WikiMem Ingest Pipeline — Raw In, Wiki Page Out

## What this skill does

WikiMem's ingestion turns any source into a linted, categorized, wikilinked markdown page in a vault. The pipeline is: **detect raw → extract text → dedup against existing pages → lint → write page + update index + append log**. For folders that change over time, `add-source` re-runs the pipeline on ONLY the new/changed files using an mtime+sha256 manifest, so repeat ingests stay cheap.

13 supported input formats: `md, txt, html, pdf, docx, xlsx, csv, pptx, mp3, mp4, png, jpg, webp`.

## Trigger — invoke this skill when

- "Add / save / import / remember this `<file | folder | URL>`"
- The user drops a PDF, DOCX, XLSX, audio, or video to keep
- "Re-ingest my Downloads folder" / "only ingest what changed" / "keep this folder in sync"
- "Organize these documents into a wiki" / "build a knowledge base from this folder"

Do **not** invoke for: ephemeral chat memory, scratch work, or answering a question from already-saved knowledge.

## Steps

1. **Confirm a vault exists.** Resolve it:
   ```bash
   VAULT=$(find . -name "AGENTS.md" -maxdepth 3 | head -1 | xargs dirname 2>/dev/null || echo ".")
   ```
   If there is no vault yet, create one (from the source folder when onboarding):
   ```bash
   wikimem init "$VAULT"                          # fresh empty vault
   wikimem init --from-folder ~/Documents/research # seed from an existing folder
   wikimem init --from-repo https://github.com/user/repo  # seed from a git repo
   ```

2. **Pick the right command for the source shape:**

   | Source | Command |
   |--------|---------|
   | One file or folder, first time | `wikimem ingest <path> --vault "$VAULT" --verbose` |
   | A URL (untrusted remote HTML) | `wikimem scrape <url> --vault "$VAULT"`, then `wikimem ingest` |
   | A folder that changes over time | `wikimem add-source <path> --vault "$VAULT"` (incremental) |
   | Untrusted URL you want isolated | `wikimem sandbox-run --vault "$VAULT" --url <url>` (fetch+clean in an E2B microVM), then `wikimem ingest` |

3. **Let the pipeline run.** It extracts text (format-aware), dedups against existing pages, lints, and writes one or more wiki pages into the correct category directory, then updates `index.md` and appends `log.md`. Editable pipeline prompts live in `config.yaml` / `Settings → Automations → Pipeline`.

4. **Verify the vault grew, then lint:**
   ```bash
   wikimem status --vault "$VAULT"   # pages, words, sources, wikilinks, orphans
   wikimem lint --vault "$VAULT"     # catch orphan pages the ingest may have created
   ```

5. **Suggest the next move:** `wikimem query "..."` to ask about the new content, or `/wikimem-improve` to let the Observer raise its quality.

## Incremental sync (the cheap repeat path)

After the first full `ingest`, use `add-source` for daily folders. It reads `.wikimem-manifest.json` (mtime + sha256 per file) and processes ONLY new or changed files:
```bash
wikimem add-source ~/Downloads/ --vault "$VAULT"
# → "3 new, 1 changed, 240 unchanged (skipped)"
```
This is what to schedule on a cron — full re-ingest of a stable folder is wasteful.

## Expected output

A short report the user can act on:
```
Ingested: report.pdf → 3 pages (research/, decisions/)
Dedup:    1 near-duplicate merged into existing "Observer Budget" page
Vault:    47 → 50 pages · 12,931 words · 2 new orphans
Next:     `wikimem lint --fix` to wire the orphans, or `/wikimem-improve`
```
Always end by stating: pages added, any dedup/merge, new orphan count, and the single best next command.

## Anti-patterns

- Ingesting a remote URL's raw HTML on the host when it's untrusted — prefer `wikimem scrape` (markup-stripped) or `wikimem sandbox-run` (isolated microVM).
- Re-running full `ingest` on a folder that only changed by one file — use `add-source`.
- Declaring success without running `wikimem status` to confirm the vault actually grew.

## Related

| Resource | Path |
|----------|------|
| Ingest command | `src/cli/commands/ingest.ts` → `src/core/ingest.ts` |
| Incremental | `src/cli/commands/add-source.ts` → `src/core/source-manifest.ts` |
| Sandboxed scrape | `src/cli/commands/sandbox-run.ts` → `src/core/sandbox-scrape.ts` |
| Lint | `src/cli/commands/lint.ts` → `src/core/lint.ts` |
| Slash command | `templates/claude-commands/wikimem-ingest.md` |
