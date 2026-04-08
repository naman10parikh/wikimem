# Contributing to wikimem

Thanks for your interest in contributing. wikimem is an open-source project and we welcome contributions of all kinds.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/wikimem.git
   cd wikimem
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Build:
   ```bash
   pnpm build
   ```
5. Run tests:
   ```bash
   pnpm test
   ```

## Development

```bash
# Watch mode — recompile on changes
pnpm dev

# Run the CLI locally
node dist/index.js init test-vault
node dist/index.js ingest test-vault/raw/sample.md -v test-vault

# Run tests
pnpm test

# Type check without emitting
pnpm lint
```

## Project Structure

```
src/
├── index.ts              # CLI entry point
├── cli/
│   ├── index.ts          # Commander program setup
│   └── commands/         # One file per CLI command
│       ├── init.ts
│       ├── ingest.ts
│       ├── query.ts
│       ├── lint.ts
│       ├── watch.ts
│       ├── scrape.ts
│       ├── improve.ts
│       └── status.ts
├── core/                 # Business logic
│   ├── vault.ts          # Vault read/write operations
│   ├── config.ts         # YAML config loading
│   ├── ingest.ts         # Ingest pipeline (Automation 1)
│   ├── query.ts          # Query engine
│   ├── lint.ts           # Wiki health checker
│   ├── scrape.ts         # External source scraper (Automation 2)
│   ├── improve.ts        # Self-improvement cycle (Automation 3)
│   ├── watcher.ts        # File watcher for raw/
│   ├── index-manager.ts  # Maintains wiki/index.md
│   └── log-manager.ts    # Maintains wiki/log.md
├── processors/           # File type processors
│   ├── text.ts           # .md, .txt, .csv
│   ├── pdf.ts            # .pdf
│   ├── audio.ts          # .mp3, .wav, .m4a, etc.
│   ├── video.ts          # .mp4, .mov, etc.
│   ├── image.ts          # .jpg, .png, etc.
│   └── url.ts            # https:// URLs
├── providers/            # LLM provider adapters
│   ├── types.ts          # Provider interface
│   ├── claude.ts         # Anthropic Claude
│   ├── openai.ts         # OpenAI GPT
│   ├── ollama.ts         # Local Ollama
│   └── index.ts          # Provider factory
├── search/               # Search engine
│   ├── bm25.ts           # BM25 implementation
│   └── index.ts          # Search interface
└── templates/            # Vault scaffolding templates
    ├── agents-md.ts      # Default AGENTS.md content
    └── config-yaml.ts    # Default config.yaml content
```

## Code Style

- **TypeScript strict mode** &mdash; no `any`, no non-null assertions unless proven safe
- **Named exports only** &mdash; no default exports
- **`const` over `let`** &mdash; no `var`
- **Files under 400 lines** &mdash; split into modules if longer
- **Comments only for non-obvious intent** &mdash; code should be self-documenting
- **Error handling** &mdash; use explicit error messages, never swallow exceptions silently

## Commit Messages

We use [conventional commits](https://www.conventionalcommits.org/):

```
feat: add Deepgram audio transcription provider
fix: handle empty PDF text extraction gracefully
refactor: extract BM25 tokenizer into separate module
docs: add configuration guide
test: add E2E tests for ingest pipeline
```

## Adding a New Processor

1. Create `src/processors/your-format.ts`
2. Export `isYourFormatFile(path: string): boolean` and `processYourFormat(path: string): Promise<YourResult>`
3. Add the detection and processing call in `src/core/ingest.ts`
4. Add tests in `tests/processors/`
5. Update the multi-format table in `README.md`

## Adding a New LLM Provider

1. Create `src/providers/your-provider.ts` implementing `LLMProvider` from `types.ts`
2. Register it in the switch statement in `src/providers/index.ts`
3. Add environment variable documentation to `README.md`

## Adding a New Source Type (Scraper)

1. Add the type to the `SourceConfig` interface in `src/core/config.ts`
2. Add a `scrapeYourType` function in `src/core/scrape.ts`
3. Wire it into the switch statement in `scrapeSource`
4. Add example config in `src/templates/config-yaml.ts`

## Pull Requests

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run `pnpm build && pnpm test` &mdash; both must pass
4. Write a clear PR description explaining what and why
5. Keep PRs focused &mdash; one feature or fix per PR

## Issues

When filing an issue, include:

- **wikimem version** (`wikimem --version`)
- **Node.js version** (`node --version`)
- **OS** (macOS, Linux, Windows/WSL)
- **Steps to reproduce**
- **Expected vs actual behavior**

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
