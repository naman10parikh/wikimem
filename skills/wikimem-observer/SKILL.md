---
name: wikimem-observer
description: Run WikiMem's self-improvement Observer — score every wiki page on quality, surface the weakest/orphan/most-referenced pages and knowledge gaps, then optionally auto-improve a budget-capped set and commit one reviewable change. Use WHEN the user says "improve / clean up / lint / tidy my wiki", "what's weak in my notes", "score my vault", "fill the gaps", or wants the nightly self-evolution loop (Automation 3). This is the open-endedness moat — the wiki gets better while you sleep. Do NOT use for ingesting new sources (use wikimem-ingest-pipeline) or querying knowledge.
---

# WikiMem Observer — The Wiki That Improves Itself

## What this skill does

The Observer is WikiMem's self-improvement loop (Automation 3 — the moat). It reads the whole vault, **scores each page**, finds the pages worth touching (weakest + newest + most-referenced), surfaces **orphans, contradictions, and knowledge gaps**, and — when allowed — **auto-improves a budget-capped set of pages and writes exactly ONE git commit** so the user can accept or reject the run via time-lapse restore. Budget-capped by design (default $2.00; a typical run is ~11 LLM calls ≈ $0.005–$0.01 on a tight cap).

Scoring dimensions: **recency/freshness, citation quality, wikilink density, category coverage, TLDR/summary quality.**

## Trigger — invoke this skill when

- "Improve / clean up / tidy / polish my wiki" · "make my notes better"
- "What's weak / stale / orphaned in my vault?" · "score my wiki" · "find gaps"
- "Find contradictions" · "which pages need work?"
- "Set up the nightly self-improvement" / "run the Observer"

Do **not** invoke to add new content (that is `wikimem-ingest-pipeline`) or to answer a question from saved knowledge.

## Steps

1. **Resolve the vault:**
   ```bash
   VAULT=$(find . -name "AGENTS.md" -maxdepth 3 | head -1 | xargs dirname 2>/dev/null || echo ".")
   ```

2. **Always observe before improving (read-only, $0):** get the report first so the user sees the diagnosis before any spend or change.
   ```bash
   wikimem observe --vault "$VAULT" --max-pages 100        # scores + orphans + gaps, no writes
   wikimem observe --vault "$VAULT" --json                  # same, machine-readable
   ```

3. **Present the diagnosis** — avg score, weak pages (< 60%), orphans, knowledge gaps, top recurring issues. THEN ask before spending: "Auto-improve the N weakest pages? (uses LLM, budget-capped)".

4. **Improve, budget-first, on approval.** Two equivalent entry points:
   ```bash
   # Observer with auto-improve, hard budget + page caps (preferred — explicit caps)
   wikimem observe --vault "$VAULT" --improve --max-improvements 5 --budget 0.50

   # Council-style improve against a quality threshold
   wikimem improve --vault "$VAULT" --threshold 80          # dry preview first:
   wikimem improve --vault "$VAULT" --threshold 80 --dry-run
   ```
   Each improve run writes **one** commit — keep it that way so it stays reviewable.

5. **Show the delta and offer to accept/reject:**
   ```bash
   wikimem status --vault "$VAULT"     # new avg score, orphans resolved
   wikimem history --vault "$VAULT"    # the Observer's commit; revert if unwanted
   ```

## Scheduling the nightly loop

```bash
# 3am daily — observe + improve up to 5 pages under a tight budget
0 3 * * * cd /path/to/wiki && wikimem observe --improve --max-improvements 5 --budget 0.50
```
Use `--budget` and `--max-improvements` on the cron path; an uncapped nightly run can spend.

## Expected output

```
Observer Report — 2026-06-06
Pages reviewed: 47/47   Avg score: 6.2/10
Weak (<60%): 8    Orphans: 3    Gaps: 5    Contradictions: 1
Top issues: missing TLDR (12), no tags (8), low wikilink density (6)

[after --improve] Improved 3 pages, $0.41 spent (cap $0.50), 1 commit written.
Accept this run, or `wikimem history` → revert?
```
Always report: avg score (before→after), what was changed, dollars spent vs cap, and that one commit was written (so it's reversible).

## Anti-patterns

- Auto-improving without showing the read-only `observe` diagnosis first.
- Running the nightly cron without `--budget` / `--max-improvements` caps.
- Writing more than one commit per run (breaks clean accept/reject).
- Treating Observer output as final truth — it is a reviewable suggestion, revertible via `wikimem history`.

## Related

| Resource | Path |
|----------|------|
| Observer engine | `src/core/observer.ts` · `src/core/observer-patterns/` |
| Improve (Council) | `src/cli/commands/improve.ts` → `src/core/improve.ts` |
| Observe command | `src/cli/commands/observe.ts` |
| History / revert | `src/cli/commands/history.ts` → `src/core/history.ts` |
| Slash command | `templates/claude-commands/wikimem-improve.md` |
