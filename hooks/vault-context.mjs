#!/usr/bin/env node
// SessionStart hook for the WikiMem plugin. When the session opens inside a WikiMem vault (a folder with
// config.yaml and wiki/), it tells the agent how big the vault is and how to use it. Elsewhere it prints nothing.
// It only reads files, needs no build and no network, and always exits 0 so it can never block a session.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const wiki = join(root, 'wiki');

function countPages(dir, depth = 0) {
  if (depth > 6) return 0;
  let n = 0;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === '_templates') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) n += countPages(p, depth + 1);
    else if (name.endsWith('.md')) n += 1;
  }
  return n;
}

try {
  if (existsSync(join(root, 'config.yaml')) && existsSync(wiki) && statSync(wiki).isDirectory()) {
    const pages = countPages(wiki);
    console.log(
      `This folder is a WikiMem vault with ${pages} wiki pages. Read it with the wikimem MCP tools ` +
        '(wikimem_search, wikimem_read, wikimem_ask) or `wikimem search "<query>"`. ' +
        'Never write to raw/; run `wikimem lint` after adding pages.',
    );
  }
} catch {
  // Intentionally silent: a hook must never block the session.
}
process.exit(0);
