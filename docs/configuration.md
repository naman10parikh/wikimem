# Configuration Reference

wikimem is configured through `config.yaml` in the vault root. This file is created by `wikimem init` and can be edited at any time.

## Complete config.yaml

```yaml
# =============================================================================
# wikimem configuration
# Full reference: https://github.com/naman10parikh/wikimem/blob/main/docs/configuration.md
# =============================================================================

# ---------------------------------------------------------------------------
# LLM Provider
# ---------------------------------------------------------------------------
provider: claude          # claude | openai | ollama
model: ~                  # Provider-specific model name, or ~ for default
# api_key: ~              # Inline API key (prefer env vars instead)

# Provider defaults:
#   claude  → claude-sonnet-4-20250514   (env: ANTHROPIC_API_KEY)
#   openai  → gpt-4o                     (env: OPENAI_API_KEY)
#   ollama  → llama3.2                   (env: OLLAMA_BASE_URL)

# ---------------------------------------------------------------------------
# Vault Settings
# ---------------------------------------------------------------------------
vault:
  name: "My Wiki"         # Display name for the vault
  template: personal       # Template used at init: personal | research | business | codebase

# ---------------------------------------------------------------------------
# External Sources — Automation 2 (Scraping)
# ---------------------------------------------------------------------------
# Each source fetches external content and deposits it in raw/{date}/
# Run manually: wikimem scrape
# Run one source: wikimem scrape -s "Source Name"
sources: []

# Source types and their fields:
#
# RSS Feed:
#   - name: "HN Top Stories"
#     type: rss
#     url: "https://hnrss.org/frontpage"
#     schedule: "0 8 * * *"              # Optional: cron expression
#
# GitHub Repo Search:
#   - name: "Trending TypeScript"
#     type: github
#     query: "stars:>100 created:>7d language:typescript"
#     schedule: "0 12 * * MON"
#
# Plain URL:
#   - name: "Company Blog"
#     type: url
#     url: "https://example.com/blog"
#     schedule: "0 */6 * * *"

# ---------------------------------------------------------------------------
# Self-Improvement — Automation 3
# ---------------------------------------------------------------------------
improve:
  enabled: true            # Enable/disable the improvement cycle
  schedule: "0 3 * * *"   # Cron: when to run (default: daily at 3am)
  threshold: 80            # Quality score threshold (0-100)
  auto_apply: false        # true = apply changes automatically
                           # false = require `wikimem improve` to apply

# ---------------------------------------------------------------------------
# Search Engine
# ---------------------------------------------------------------------------
search:
  engine: bm25             # Built-in BM25 full-text search
  # For large vaults (500+ pages), you may want an external search tool.
  # BM25 works well up to several thousand pages.

# ---------------------------------------------------------------------------
# Multi-Modal Processing
# ---------------------------------------------------------------------------
processing:
  # Audio transcription
  audio:
    enabled: false          # Set true to enable audio processing
    provider: whisper       # whisper (local CLI) | deepgram (cloud API)
    # deepgram_api_key: ~   # Or set DEEPGRAM_API_KEY env var

  # Image description via vision model
  image:
    enabled: false          # Requires ANTHROPIC_API_KEY (uses Claude Vision)

  # PDF text extraction
  pdf:
    enabled: true           # Built-in, no external dependencies

  # Video processing (audio extraction + transcription)
  video:
    enabled: false          # Requires ffmpeg + whisper
```

## Field Reference

### Top-Level Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | `claude` | LLM provider: `claude`, `openai`, `ollama` |
| `model` | string | Provider default | Model name (e.g., `gpt-4o-mini`, `llama3.2:70b`) |
| `api_key` | string | From env | API key (prefer env vars over inline) |

### vault

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `vault.name` | string | `"My Wiki"` | Display name for the vault |
| `vault.template` | string | `personal` | Template used at init time |

### sources[]

Each source is an object with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable source name |
| `type` | string | Yes | Source type: `rss`, `github`, `url` |
| `url` | string | For `rss`, `url` | URL to fetch |
| `query` | string | For `github` | GitHub search query |
| `schedule` | string | No | Cron expression for automated scraping |

### improve

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `improve.enabled` | boolean | `true` | Whether self-improvement is enabled |
| `improve.schedule` | string | `"0 3 * * *"` | Cron expression for scheduled runs |
| `improve.threshold` | number | `80` | Score below which improvements trigger |
| `improve.auto_apply` | boolean | `false` | Apply changes without manual approval |

### search

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `search.engine` | string | `bm25` | Search engine to use |

### processing

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `processing.audio.enabled` | boolean | `false` | Enable audio transcription |
| `processing.audio.provider` | string | `whisper` | Transcription provider |
| `processing.image.enabled` | boolean | `false` | Enable image description |
| `processing.pdf.enabled` | boolean | `true` | Enable PDF extraction |
| `processing.video.enabled` | boolean | `false` | Enable video processing |

## Environment Variables

Environment variables take precedence over `config.yaml` for API keys.

| Variable | Purpose | Used By |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Claude API access | Claude provider, image processor |
| `OPENAI_API_KEY` | OpenAI API access | OpenAI provider |
| `OLLAMA_BASE_URL` | Ollama server URL | Ollama provider (default: `http://localhost:11434`) |
| `FIRECRAWL_API_KEY` | Firecrawl web scraping API | URL processor (optional, falls back to fetch) |
| `DEEPGRAM_API_KEY` | Deepgram audio transcription | Audio processor (optional, falls back to Whisper) |

## CLI Flag Precedence

When a setting is specified in multiple places, the order of precedence is:

1. **CLI flags** (`-p openai`, `-m gpt-4o-mini`) &mdash; highest priority
2. **Environment variables** (`ANTHROPIC_API_KEY`)
3. **config.yaml** (`provider: claude`)
4. **Defaults** (`claude`, `claude-sonnet-4-20250514`)

## Example Configurations

### Minimal (Claude, no automations)

```yaml
provider: claude
```

### Research project with daily scraping

```yaml
provider: openai
model: gpt-4o

sources:
  - name: "ArXiv AI"
    type: rss
    url: "https://rss.arxiv.org/rss/cs.AI"
    schedule: "0 6 * * *"

  - name: "AI Research Repos"
    type: github
    query: "topic:machine-learning stars:>50 pushed:>7d"
    schedule: "0 12 * * MON"

improve:
  enabled: true
  threshold: 85
  auto_apply: true
```

### Fully local (Ollama, no cloud)

```yaml
provider: ollama
model: llama3.2:70b

processing:
  audio:
    enabled: true
    provider: whisper
  pdf:
    enabled: true
```

### Business intelligence wiki

```yaml
provider: claude
model: claude-sonnet-4-20250514

sources:
  - name: "Industry News"
    type: rss
    url: "https://feeds.feedburner.com/TechCrunch"
    schedule: "0 7 * * 1-5"

  - name: "Competitor Blog"
    type: url
    url: "https://competitor.com/blog"
    schedule: "0 9 * * MON"

improve:
  enabled: true
  threshold: 75
  auto_apply: false

processing:
  pdf:
    enabled: true
  image:
    enabled: true
```
