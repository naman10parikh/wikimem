## [0.10.0] - 2026-04-17

### Features

- **MCP OAuth 2.1 server** — wikimem is now a Claude-Connector-compatible MCP server. Paste `https://<your-host>/mcp` into Claude.ai Custom Connectors → DCR auto-registers, OAuth 2.1 + PKCE + Resource Indicators, user clicks Allow once, tools appear. New modules: `src/mcp/http-server.ts`, `src/mcp/oauth-server.ts`, `src/mcp/jwt.ts`, `src/mcp/oauth-store.ts` (~1,200 lines). Endpoints: `/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`, `/oauth/register` (RFC 7591), `/oauth/authorize`, `/oauth/token`, `POST /mcp` (JSON-RPC 2.0 with Bearer auth + WWW-Authenticate 401).
- **Discord sync module** — `src/core/sync/discord.ts` (380 L) using discord.js v14. Lists guilds → channels → recent messages → ingests as wiki pages with user mention resolution and attachment URLs. Closes the 38/44 hollow-shell gap so Discord is now a real connector, not just a token endpoint.
- **`wikimem init --from-folder <path>`** — walks a directory, detects file types (13 formats), ingests each through the pipeline. #1 requested onboarding feature. Supports `--max-file-size`, skips non-processable binaries with warn, prints scanned/ingested/skipped/errors summary.
- **`wikimem init --from-repo <url-or-path>`** — accept git URL (shallow clone) or local `.git` directory. Ingests README, `docs/**`, and root markdown. Generates a "Repository Overview" wiki page with file tree + languages. Supports `--include` / `--exclude` glob filters and `--keep-clone`.
- **`wikimem add-source <path>` (new command)** — incremental ingest: mtime + SHA-256 manifest at `.wikimem-manifest.json`. Only ingests NEW or CHANGED files. Prints deltas before acting.
- **KARP-003 auto-categorize** — Observer classifies pages without category frontmatter. BM25-first (cheap), LLM fallback only if confidence < 0.65. Target categories: source/entity/concept/synthesis/daily/meeting/project. Adds 0-2 pts `categoryCoverage` dimension to 24-pt score. ≤3 LLM calls/run.
- **KARP-007 wiki-wide summary** — Observer generates/refreshes `<wikiRoot>/wiki/INDEX.md` with page count, top-10 wikilinked topics, 3-sentence state-of-the-wiki summary. Skips LLM call if wiki-hash unchanged (caching). New API `GET /api/wiki-summary`.
- **KARP-010 citation scoring** — Every page's outbound URLs scored (domain quality, URL specificity, recency). Stored as `citationScore` frontmatter. Aggregate `avgCitationScore` wiki-wide. Surfaces worst-5 cites per Observer run.
- **KARP-012 semantic similarity graph edges** — BM25-based content overlap computes inter-page similarity. Edges with sim > 0.35 that have NO wikilink surface as "missing wikilink suggestions". Optional render as faint dashed edges in the D3 graph.
- **Observer Experiment History panel** — New sidebar section with SVG timeline chart, per-run hypothesis/action/result, score delta, duration, LLM calls. "Run Observer Now" button streams SSE logs in real time. THE moat: no competitor shows self-improvement transparently.
- **Typography + color token system** — Replaced 36 hardcoded font-size values + 109 random hex colors with `--font-{xs..3xl}` + `--bg-primary`, `--text-primary`, `--accent`, etc. Removed Inter-Light (weight 300) per maintainer. Home hero no longer renders in thin Instrument Serif.
- **Top-right duplicate status counter removed** — statusbar now only in bottom-left.
- **Home hero wiki name** — now shows `<wikiConfig.name>'s Wiki` or `Welcome to My Wiki` fallback (not hardcoded "WikiMem").
- **Font-size appearance setting** — Now actually controls body font-size via `--font-base` binding. The slider works.

### Security

- **`/mcp` endpoint protected** — Bearer token validated (audience claim = canonical URI, scope check). 401 + WWW-Authenticate pointer to resource_metadata URL on missing/invalid token (RFC 9728).
- **OAuth code-verifier hash check** — PKCE S256 enforced at token endpoint.
- **Refresh token rotation** — old refresh token invalidated on new issuance (OAuth 2.1 §4.3.1 compliance).
- **Token audience binding** — access tokens carry `aud` claim; server rejects tokens issued for other audiences (prevents token passthrough / confused deputy).

### Bug Fixes

- **Build unblocker** — `karp-003-categorize.ts` had `await import` in non-async function. Fixed to use synchronous `writeFileSync` import at top of file.
- **Dead code removed** — `src/web/public/js/app.js` had stale CONNECTOR_CATALOG diverging from `index.html`. Deleted (was not served — only the monolith in `index.html` is used).

### Tests

- `tests/mcp-oauth.test.ts` (452 L) — GET well-known metadata, POST /register, 401 flow, full E2E register → authorize → token → tools/list, scope enforcement.
- `tests/discord-sync.test.ts` — previewDiscord empty-guild, syncDiscord message ingest shape, mention resolution.
- `tests/init-from-folder.test.ts` — ingest detects 5 file types, correct scaffold, summary counts.
- `tests/add-source.test.ts` — incremental behavior: 2nd run with no changes → 0 ingests.
- `tests/observer-karp.test.ts` — 4 pattern tests with mini vault and mocked LLM.
- `tests/observer-experiments-api.test.ts` — timeline API filter + summary endpoint.

### Documentation

- `README.md` — added "Use as a Claude Connector" section with ngrok setup walkthrough.
- `launch-drafts/` (new directory, 10 files) — X thread (9 tweets), Show HN, DEV.to article (1180 words with 4 code snippets), Product Hunt tagline + first comment + 7 gallery captions, 4 Reddit variants (r/LocalLLaMA, r/ObsidianMD, r/selfhosted, r/DataHoarder), Hacker Newsletter + IndieHackers combined, `INDEX.md` with full post schedule and quality-check notes.

### Chore

- `discord.js` ^14, `jose` ^5 dependencies added.
- `pnpm-lock.yaml` updated.
