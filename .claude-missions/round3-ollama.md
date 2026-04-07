Test wikimem with Ollama (local LLM, no API key) at /Users/naman/llmwiki.

1. Check if Ollama is installed: ollama --version
2. If not: brew install ollama (or skip and document the requirement)
3. If available: ollama pull llama3.2
4. Create vault: cd /Users/naman/llmwiki && pnpm build && node dist/index.js init /tmp/ollama-test --template personal --force
5. Test ingest with Ollama:
   node dist/index.js ingest /Users/naman/energy/resources/unread/karpathy_llm_knowledge_bases.md --vault /tmp/ollama-test --provider ollama --model llama3.2
6. Test query: node dist/index.js query "What is this about?" --vault /tmp/ollama-test --provider ollama
7. Test with NO provider configured — verify error message is helpful: "No LLM configured. Install Ollama (ollama.com) or set ANTHROPIC_API_KEY"

Fix error messages to be clear and actionable.
Signal: echo "OLLAMA-TEST DONE" > /Users/naman/llmwiki/.claude-signals/ollama-test.done
