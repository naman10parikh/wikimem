@AGENTS.md

# Claude Code notes for WikiMem

Everything about what WikiMem does, its tools and what not to do is in `AGENTS.md`, imported above. This file keeps
only what is specific to Claude Code.

## The harness in this repository

- `.claude/settings.json`: two `PreToolUse` hooks. `block-dangerous-commands.cjs` stops destructive shell commands;
  `protect-secrets.cjs` stops reads and writes of key files.
- `.claude/agents/`: the sub-agents listed in `AGENTS.md`. They research and report; you make the change.
- `.claude/skills/`, `.claude/rules/`, `.claude/commands/`: general working methods inherited from the fleet's
  template. WikiMem's own skills are in `skills/`.
- `.claude-plugin/`: the Claude Code plugin (`plugin.json`, `marketplace.json`). It ships `skills/`, the two
  WikiMem sub-agents, the `/wikimem-*` commands in `templates/claude-commands/`, the vault hook in
  `hooks/hooks.json` and the MCP server in `.mcp.json`. Check it with `claude plugin validate .`.

## MCP servers

- `.mcp.json` holds only WikiMem's own server, so it is safe for anyone who installs the plugin.
- `.mcp.dev.json` holds the servers used while developing (GitHub, Context7, a memory graph over `memory/`, an
  Obsidian server over `brain/`). Load them with `claude --mcp-config .mcp.dev.json`. The GitHub server reads
  `GITHUB_PERSONAL_ACCESS_TOKEN` from your environment.

## Operating model

Act, then verify. Run the gate (`pnpm build && pnpm test && pnpm eval`) before you say a change is done, and test a
UI change in the running app (`wikimem serve`, then `node scripts/vibe-audit.mjs <tag>`). When a correction teaches a
rule, add it to `memory/LEARNINGS.md`.
