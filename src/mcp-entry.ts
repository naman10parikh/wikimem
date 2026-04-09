#!/usr/bin/env node

/**
 * Lightweight MCP server entry point.
 * Bypasses the heavy CLI import chain (pdf-parse, mammoth, xlsx, etc.)
 * so the server starts in <2s instead of >90s.
 *
 * Usage: node dist/mcp-entry.js [--vault <path>]
 */

import { resolve } from 'node:path';
import { startMcpServer } from './mcp-server.js';

const args = process.argv.slice(2);
let vault = process.cwd();

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--vault' && args[i + 1]) {
    vault = resolve(args[i + 1] as string);
    break;
  }
}

startMcpServer(vault);
