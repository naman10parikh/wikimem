# Example: Personal Knowledge Wiki

A personal wiki for collecting and connecting everything you learn.

## Setup

```bash
# Create the vault
llmwiki init my-brain --template personal
cd my-brain
```

## Adding Knowledge

### Articles and notes

Drop markdown files, text files, or paste URLs:

```bash
# Ingest a blog post
llmwiki ingest https://paulgraham.com/greatwork.html

# Ingest your own notes
llmwiki ingest ~/Documents/meeting-notes.md

# Ingest a PDF
llmwiki ingest ~/Downloads/research-paper.pdf
```

### Voice memos and podcasts

If you have Whisper installed (`pip install openai-whisper`):

```bash
# Transcribe and ingest a voice memo
llmwiki ingest ~/voice-memos/idea-2026-04-07.m4a

# Transcribe a podcast episode
llmwiki ingest ~/Podcasts/episode-42.mp3
```

### Screenshots and images

With `ANTHROPIC_API_KEY` set (uses Claude Vision):

```bash
# Describe and ingest a whiteboard photo
llmwiki ingest ~/Photos/whiteboard-session.jpg

# Ingest a diagram
llmwiki ingest ~/Screenshots/architecture-diagram.png
```

## Querying

```bash
# Ask questions across all your knowledge
llmwiki query "What are the recurring themes in my reading?"
llmwiki query "What did Paul Graham say about doing great work?"

# Save an answer as a wiki page
llmwiki query "Summarize everything I know about transformers" --file
```

## Staying Current

Add RSS feeds to `config.yaml` to automatically pull in new content:

```yaml
sources:
  - name: "Hacker News"
    type: rss
    url: "https://hnrss.org/best"

  - name: "Favorite Blog"
    type: rss
    url: "https://example.com/feed.xml"
```

Then run:

```bash
llmwiki scrape
llmwiki ingest raw/2026-04-07/*.md
```

## Watch Mode

Set it and forget it:

```bash
# Auto-ingest anything dropped into raw/
llmwiki watch
```

Now just drag files into the `raw/` folder and they appear in your wiki automatically.

## Maintenance

```bash
# Check wiki health
llmwiki lint

# Self-improve (reorganize, fix broken links, add cross-references)
llmwiki improve

# See stats
llmwiki status
```

## Opening in Obsidian

1. Open Obsidian
2. Click "Open folder as vault"
3. Select your `my-brain/` directory
4. The graph view shows all connections between your knowledge

## Example Vault Structure

After a few weeks of use:

```
my-brain/
├── AGENTS.md
├── config.yaml
├── raw/
│   ├── 2026-04-01/
│   │   ├── paul-graham-great-work.md
│   │   └── voice-memo.m4a
│   ├── 2026-04-03/
│   │   ├── research-paper.pdf
│   │   └── whiteboard.jpg
│   └── 2026-04-07/
│       └── podcast-episode.mp3
└── wiki/
    ├── index.md
    ├── log.md
    ├── sources/
    │   ├── paul-graham-great-work.md
    │   ├── research-paper.md
    │   └── podcast-episode.md
    ├── entities/
    │   ├── paul-graham.md
    │   └── openai.md
    ├── concepts/
    │   ├── doing-great-work.md
    │   ├── transformer-architecture.md
    │   └── compound-knowledge.md
    └── syntheses/
        └── recurring-themes.md
```
