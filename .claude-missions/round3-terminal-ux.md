Fix the terminal UX for wikimem at /Users/naman/llmwiki. Make it feel like AgentGrid.

Study /Users/naman/energy/tools/agentgrid/README.md for the style we want.

1. **Fix global install** — the bin entry in package.json needs to work. After `npm install -g wikimem`, running `wikimem` should work. Check that dist/index.js has #!/usr/bin/env node shebang. Test: npm install -g . && wikimem --help

2. **ASCII art on init** — when running `wikimem init`, show a nice ASCII art banner:
```
 ╦ ╦╦╦╔═╦╔╦╗╔═╗╔╦╗
 ║║║║╠╩╗║║║║║╠═╝║║║
 ╚╩╝╩╩ ╩╩╩ ╩╩╚═╝╩ ╩
```
or similar. Use chalk for colors. Purple (#6b21a8) accent.

3. **`wikimem` with no args** — if you're in a vault dir (AGENTS.md exists), show quick status + available commands. If not in a vault, show help.

4. **Progress spinners** — verify every long operation uses ora spinner with descriptive text.

5. **Exit messages** — every command should end with a helpful next-step suggestion.

Build: cd /Users/naman/llmwiki && pnpm build && pnpm test
Signal: echo "TERMINAL-UX DONE" > /Users/naman/llmwiki/.claude-signals/terminal-ux.done
