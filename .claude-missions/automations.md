You are AUTOMATIONS for llmwiki at /Users/naman/llmwiki. Test and fix scrape + improve E2E.

Setup: export ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY /Users/naman/energy/.env | cut -d= -f2)
Create vault: cd /Users/naman/llmwiki && node dist/index.js init /tmp/auto-test --template research

Ingest some content first:
- node dist/index.js ingest /Users/naman/energy/resources/unread/karpathy_llm_knowledge_bases.md --vault /tmp/auto-test
- node dist/index.js ingest /Users/naman/energy/resources/unread/farzapedia.md --vault /tmp/auto-test

Test:
1. Scrape: edit /tmp/auto-test/config.yaml to add an RSS source (e.g. https://hnrss.org/frontpage), then: node dist/index.js scrape --vault /tmp/auto-test
2. Improve: node dist/index.js improve --vault /tmp/auto-test --threshold 50
3. Improve dry-run: node dist/index.js improve --vault /tmp/auto-test --dry-run
4. Verify scoring output
5. Verify log.md records

Fix bugs. Make automations production-ready.
Signal: echo "AUTO COMPLETE $(date)" > /Users/naman/llmwiki/.claude-signals/automations.done
