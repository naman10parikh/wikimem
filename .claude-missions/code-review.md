You are CODE-REVIEW for llmwiki at /Users/naman/llmwiki. Read EVERY file. Find bugs. Be a skeptic.

Checklist:
1. Read ALL files in src/ — every one
2. TypeScript strictness: any `any`? Missing error handling?
3. Security: injection in URL processing? Path traversal in file ops?
4. Can ingest handle malformed files?
5. Do LLM providers handle API errors, rate limits?
6. BM25 edge cases: empty query, 1 word, very long query?
7. Wikilink extraction edge cases?
8. Compare vs sage-wiki (186 stars) and claude-memory-compiler (206 stars)
9. Write review report at /Users/naman/llmwiki/.claude-signals/code-review-report.md
10. Fix critical bugs directly

Signal: echo "REVIEW COMPLETE $(date)" > /Users/naman/llmwiki/.claude-signals/review.done
