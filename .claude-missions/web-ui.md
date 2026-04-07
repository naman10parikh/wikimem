You are WEB-UI for llmwiki at /Users/naman/llmwiki. Build a local web UI.

Requirements: mission control with drag-drop upload, knowledge graph viz, query interface, status dashboard.
Design: warm black (#141312) bg, Poppins font, purple (#6b21a8) accent, dark mode.

Implementation:
1. Create src/web/server.ts — Express server
2. Create src/web/public/index.html — single page app with embedded JS/CSS
3. Graph viz: d3-force for knowledge graph from wikilinks
4. API: GET /api/status, GET /api/pages, GET /api/graph, POST /api/query
5. Wire into CLI: update src/cli/commands/serve.ts to use the server
6. Install express: cd /Users/naman/llmwiki && pnpm add express && pnpm add -D @types/express
7. Keep it SIMPLE — no React build step, pure HTML+JS+CSS
8. Must compile: pnpm build

Read /Users/naman/energy/.claude/rules/design.md for styling.
Signal: echo "WEBUI COMPLETE $(date)" > /Users/naman/llmwiki/.claude-signals/webui.done
