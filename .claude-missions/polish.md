You are POLISH for llmwiki at /Users/naman/llmwiki. Make it production-ready.

Tasks:
1. Read ALL src/ files. Find TODOs. Implement them.
2. Improve error messages: every error should say what to do next
3. Handle missing API keys: "Set ANTHROPIC_API_KEY via: export ANTHROPIC_API_KEY=sk-..."
4. Handle network errors gracefully
5. Add --json flag to status for machine output
6. Ensure chmod +x on dist/index.js after build
7. Add .github/workflows/ci.yml — build + test on push
8. Verify pnpm build && pnpm test both pass after your changes

Signal: echo "POLISH COMPLETE $(date)" > /Users/naman/llmwiki/.claude-signals/polish.done
