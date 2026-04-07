# WikiMem Bug Bash Report

**Date:** 2026-04-07
**Tester:** Claude (Bug Bash Agent)
**Vault:** /tmp/bugbash (fresh init, personal template)

## Test Results

| # | Command | Status | Notes |
|---|---------|--------|-------|
| 1 | `init /tmp/bugbash --template personal` | PASS (after fix) | Was showing "llmwiki" branding |
| 2 | `status --vault /tmp/bugbash` | PASS | 2 pages, 64 words, 0 orphans |
| 3 | `lint --vault /tmp/bugbash` | PASS | "Wiki is healthy!" — no false orphan for index/log |
| 4 | `ingest claudeopedia.md --vault /tmp/bugbash --tags "wiki,karpathy"` | PASS | 10 pages, 62 wikilinks created |
| 5 | `query "What is Claudeopedia?" --vault /tmp/bugbash` | PASS | Rich synthesized answer with wikilinks and sources |
| 6 | `duplicates --vault /tmp/bugbash` | PASS | "No rejected duplicates found" (before re-ingest) |
| 7 | `ingest claudeopedia.md --vault /tmp/bugbash` (re-ingest) | PASS (after fix) | Correctly detects duplicate now |
| 8 | `improve --vault /tmp/bugbash --dry-run` | PASS | Score 100/100 with 5 dimensions |
| 9 | `serve --vault /tmp/bugbash` | PASS | HTTP 200, API returns correct JSON |

## Bugs Found and Fixed

### BUG 1: Remaining `llmwiki` branding in 12 locations (FIXED)
**Severity:** Medium (user-facing branding inconsistency)
**Files changed:** 8 source files
- `src/cli/commands/init.ts` — 5 occurrences (description, console output, index.md, log.md, .gitignore)
- `src/templates/config-yaml.ts` — 1 occurrence (config header comment)
- `src/cli/commands/duplicates.ts` — 1 occurrence (tip message)
- `src/web/public/index.html` — 2 occurrences (title, header h1)
- `src/providers/embeddings.ts` — 1 occurrence (doc comment)
- `src/core/obsidian.ts` — 1 occurrence (doc comment)
- `src/processors/audio.ts` — 1 occurrence (tmp file prefix)
- `src/processors/video.ts` — 1 occurrence (tmp file prefix)

### BUG 2: Duplicate detection not working for re-ingested files (FIXED)
**Severity:** High (core feature broken)
**Root cause:** Dedup compared incoming content against LLM-processed wiki pages using Jaccard similarity. Since wiki pages are heavily transformed, similarity was always low. Also, the copy-then-check flow overwrote the previous raw copy, making hash comparison impossible.
**Fix:** 
1. Added exact content comparison against raw/ source files (pre-LLM)
2. Restructured flow: read content → dedup check → copy to raw/ (was: copy → check)
3. Skip self-match only when source is already inside raw/ directory

### BUG 3: Tests failing (6/58) due to dedup self-match (FIXED)
**Severity:** Medium (test infrastructure)
**Root cause:** New raw hash dedup found the test file matching itself since tests place sources directly in raw/
**Fix:** Added `skipPath` parameter to exclude the current file being ingested from raw hash scan

## Test Infrastructure
- **Build:** `pnpm build` — 0 TypeScript errors
- **Tests:** 58/58 passing (bm25: 14, vault: 25, lint: 9, ingest: 10)
- **Serve:** HTTP 200, API endpoints working, JSON responses correct

## Summary
3 bugs found, 3 bugs fixed. All 9 commands working correctly. All 58 tests passing.
