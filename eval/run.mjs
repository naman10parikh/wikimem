#!/usr/bin/env node
// WikiMem golden-task evals. Deterministic, offline, free: every child process runs with the LLM keys removed, so
// nothing here can spend money. Each task is pass or fail, and a task passes only if it passes in all k runs
// (pass^k, default k = 3). Run after `pnpm build`.
//
//   node eval/run.mjs            table + summary, exit 1 on any failure
//   node eval/run.mjs --json     the same result as JSON (the weekly self-review reads this)
//   node eval/run.mjs --k 5      repeat each task five times
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'dist', 'index.js');
const MCP = join(ROOT, 'dist', 'mcp-entry.js');
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const K = Number(args[args.indexOf('--k') + 1]) || 3;
const ENV = { ...process.env };
for (const key of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'E2B_API_KEY', 'FIRECRAWL_API_KEY', 'DEEPGRAM_API_KEY']) {
  delete ENV[key];
}

if (!existsSync(CLI) || !existsSync(MCP)) {
  console.error('eval: dist/ is missing. Run `pnpm build` first.');
  process.exit(2);
}

const PAGES = {
  'concepts/bm25.md': '---\ntitle: BM25\ntags: [search]\nsummary: A keyword ranking function.\n---\n# BM25\n\nBM25 ranks documents by term frequency and inverse document frequency. It pairs well with [[RAG]].\n',
  'concepts/rag.md': '---\ntitle: RAG\ntags: [retrieval]\nsummary: Retrieval before generation.\n---\n# RAG\n\nRetrieval augmented generation fetches passages before answering. It often uses [[BM25]] for keyword recall.\n',
  'concepts/lonely.md': '---\ntitle: Lonely page\n---\n# Lonely page\n\nNothing links here, and it points to [[Missing Page]].\n',
};

function cli(...cmd) {
  const r = spawnSync(process.execPath, [CLI, ...cmd], { env: ENV, encoding: 'utf8', timeout: 60_000 });
  return { code: r.status, stdout: r.stdout ?? '', out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function makeVault(base) {
  const vault = join(base, 'vault');
  const r = cli('init', vault, '--template', 'personal');
  if (r.code !== 0) throw new Error(`init failed: ${r.out.slice(0, 300)}`);
  for (const [rel, body] of Object.entries(PAGES)) {
    mkdirSync(dirname(join(vault, 'wiki', rel)), { recursive: true });
    writeFileSync(join(vault, 'wiki', rel), body);
  }
  return vault;
}

function parseJson(text) {
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}

function mcpSession(vault, requests, waitForId) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [MCP, '--vault', vault], { env: ENV });
    const replies = new Map();
    let buf = '';
    const done = () => {
      child.kill();
      resolve(replies);
    };
    const timer = setTimeout(done, 20_000);
    child.stdout.on('data', (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('{')) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined) replies.set(msg.id, msg);
          if (msg.id === waitForId) {
            clearTimeout(timer);
            done();
          }
        } catch {
          // Intentionally silent: a non-JSON line on stdout is not a reply.
        }
      }
    });
    for (const req of requests) child.stdin.write(`${JSON.stringify(req)}\n`);
  });
}

const TASKS = [
  {
    id: 'init-vault',
    what: '`wikimem init` creates a vault with AGENTS.md, config.yaml, wiki/ and raw/',
    run: (vault) => ['AGENTS.md', 'config.yaml', 'wiki', 'raw'].every((p) => existsSync(join(vault, p))),
  },
  {
    id: 'bm25-search',
    what: 'BM25 search ranks the page that holds a distinctive phrase first',
    run: (vault) => {
      const r = cli('search', 'inverse document frequency', '--vault', vault);
      return r.code === 0 && /1\.\s+BM25\b/.test(r.out);
    },
  },
  {
    id: 'lint-finds-planted-faults',
    what: 'lint reports the planted broken link and orphan, and not the valid links',
    run: (vault) => {
      const r = cli('lint', '--vault', vault);
      return (
        r.out.includes('Broken wikilink: "Lonely page" links to non-existent "[[Missing Page]]"') &&
        r.out.includes('Orphan page: "Lonely page"') &&
        !r.out.includes('non-existent "[[RAG]]"') &&
        !r.out.includes('non-existent "[[BM25]]"')
      );
    },
  },
  {
    id: 'status-counts',
    what: '`status --json` counts the three planted wikilinks',
    run: (vault) => {
      const r = cli('status', '--json', '--vault', vault);
      const s = parseJson(r.stdout);
      return r.code === 0 && s.wikilinks === 3 && s.pages >= 5;
    },
  },
  {
    id: 'observer-free-report',
    what: 'the observer flags the orphan and the missing page, and changes nothing without --improve',
    run: (vault) => {
      const rep = parseJson(cli('observe', '--json', '--vault', vault).stdout);
      const orphan = rep.orphans.some((o) => o.title === 'Lonely page');
      const gap = rep.gaps.some((g) => /missing page/i.test(String(g.mentionedTopic)));
      return orphan && gap && rep.improvements.length === 0;
    },
  },
  {
    id: 'mcp-tools-and-search',
    what: 'the MCP server lists its 19 tools and answers wikimem_search over stdio',
    run: async (vault) => {
      const replies = await mcpSession(
        vault,
        [
          { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'eval', version: '1' } } },
          { jsonrpc: '2.0', method: 'notifications/initialized' },
          { jsonrpc: '2.0', id: 2, method: 'tools/list' },
          { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'wikimem_search', arguments: { query: 'inverse document frequency' } } },
        ],
        3,
      );
      const tools = (replies.get(2)?.result?.tools ?? []).map((t) => t.name);
      const need = ['wikimem_search', 'wikimem_read', 'wikimem_ask', 'wikimem_ingest', 'wikimem_observe', 'wikimem_lint'];
      const answer = JSON.stringify(replies.get(3)?.result ?? '');
      return tools.length >= 19 && need.every((n) => tools.includes(n)) && answer.includes('BM25');
    },
  },
  {
    id: 'dsip-contract',
    what: 'dsip.json is a valid DSIP 0.1 contract with a validate and a ship step',
    run: () => {
      const d = JSON.parse(readFileSync(join(ROOT, 'dsip.json'), 'utf8'));
      return d.dsip === '0.1' && d.loop?.steps?.includes('validate') && d.loop?.steps?.includes('ship') && !!d.eval?.rubric;
    },
  },
];

const results = [];
for (const task of TASKS) {
  let passes = 0;
  let error = '';
  for (let i = 0; i < K; i++) {
    const base = mkdtempSync(join(tmpdir(), 'wikimem-eval-'));
    try {
      const vault = makeVault(base);
      if (await task.run(vault)) passes += 1;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  }
  results.push({ id: task.id, what: task.what, passes, k: K, pass: passes === K, error });
}

const passed = results.filter((r) => r.pass).length;
if (JSON_OUT) {
  console.log(JSON.stringify({ suite: 'wikimem-golden', k: K, passed, total: results.length, results }, null, 2));
} else {
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(26)} ${r.passes}/${r.k}  ${r.what}${r.error ? `  (${r.error})` : ''}`);
  }
  console.log(`\nevals: ${passed}/${results.length} passed (pass^${K})`);
}
process.exit(passed === results.length ? 0 : 1);
