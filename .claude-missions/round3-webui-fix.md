CRITICAL: Fix the web UI at /Users/naman/llmwiki/src/web/public/index.html and /Users/naman/llmwiki/src/web/server.ts

The web UI currently shows raw markdown. It needs to:

1. **Render markdown as HTML** — use marked.js (CDN) to convert markdown to rendered HTML. When clicking a graph node or page in the list, show the RENDERED page content in a side panel.

2. **Clickable wikilinks** — [[Page Name]] in rendered content should be clickable links that navigate to that page within the web UI.

3. **Frontmatter display** — show tags, date, sources, summary as nice badges/chips above the content.

4. **Side panel layout** — left: graph + page list, right: page content viewer. Click a page → right panel shows it.

5. **Search bar** — filter pages by typing, instant results.

6. **Add API endpoint** — GET /api/pages/:id — returns a single page's content + frontmatter.

7. **Markdown CSS** — style headings, lists, code blocks, blockquotes, links nicely. Dark theme: #141312 background, #e4e4e4 text, purple (#6b21a8) links/accents.

8. **Upload button** — "Add Source" button that lets you paste a URL or upload a file via POST /api/ingest.

Use CDN for marked.js and highlight.js (no npm deps needed for the frontend). The HTML is a single file — keep it that way.

Build: cd /Users/naman/llmwiki && pnpm build && pnpm test
Test: node dist/index.js serve --vault /tmp/test-wiki --port 3145

Signal: echo "WEBUI-FIX DONE" > /Users/naman/llmwiki/.claude-signals/webui-fix.done
