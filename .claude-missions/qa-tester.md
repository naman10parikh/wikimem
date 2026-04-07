You are QA-TESTER for llmwiki at /Users/naman/llmwiki. Fresh install test, E2E every command, npm pack. Test as a USER.

Steps:
1. cd /Users/naman/llmwiki && pnpm build && npm pack --dry-run
2. Create vault: node dist/index.js init /tmp/qa-vault --template personal
3. Export key: export ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY /Users/naman/energy/.env | cut -d= -f2)
4. Ingest text: node dist/index.js ingest /Users/naman/energy/resources/unread/karpathy_llm_knowledge_bases.md --vault /tmp/qa-vault
5. Status: node dist/index.js status --vault /tmp/qa-vault
6. Lint: node dist/index.js lint --vault /tmp/qa-vault
7. Query: node dist/index.js query "What is Karpathy's wiki pattern?" --vault /tmp/qa-vault
8. Verify .obsidian/ exists with app.json, graph.json, appearance.json
9. Run pnpm test — all 58 tests must pass
10. Report EVERY bug. Fix what you can.

Signal: echo "QA COMPLETE $(date)" > /Users/naman/llmwiki/.claude-signals/qa.done
