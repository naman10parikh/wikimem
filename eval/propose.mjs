#!/usr/bin/env node
// WikiMem's weekly self-review. It runs the golden evals, then points WikiMem at this repository's own notes
// (brain/) and writes a short list of proposed fixes. Offline and free: LLM keys are removed from every child
// process. It never edits the repository; a person turns the proposals worth doing into a pull request.
//
//   node eval/propose.mjs                 print the proposals as Markdown
//   node eval/propose.mjs proposals.md    also write them to a file
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'dist', 'index.js');
const ENV = { ...process.env };
for (const key of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'E2B_API_KEY', 'FIRECRAWL_API_KEY', 'DEEPGRAM_API_KEY']) {
  delete ENV[key];
}

function node(script, ...args) {
  const r = spawnSync(process.execPath, [script, ...args], { env: ENV, encoding: 'utf8', timeout: 300_000 });
  return { code: r.status, stdout: r.stdout ?? '' };
}

function json(text) {
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}

const evals = json(node(join(ROOT, 'eval', 'run.mjs'), '--json').stdout);

const base = mkdtempSync(join(tmpdir(), 'wikimem-self-'));
const vault = join(base, 'vault');
node(CLI, 'init', vault, '--template', 'personal');
mkdirSync(join(vault, 'wiki', 'brain'), { recursive: true });
for (const f of readdirSync(join(ROOT, 'brain')).filter((n) => n.endsWith('.md'))) {
  copyFileSync(join(ROOT, 'brain', f), join(vault, 'wiki', 'brain', f));
}
const report = json(node(CLI, 'observe', '--json', '--vault', vault).stdout);
rmSync(base, { recursive: true, force: true });

const inBrain = (p) => String(p).includes('/wiki/brain/');
const weakest = report.scores.filter((s) => inBrain(s.page)).sort((a, b) => a.score - b.score).slice(0, 5);
const orphans = report.orphans.filter((o) => inBrain(o.page));
const lines = [
  `# WikiMem self-review, ${new Date().toISOString().slice(0, 10)}`,
  '',
  '## Evals',
  '',
  `${evals.passed}/${evals.total} golden tasks passed (pass^${evals.k}).`,
  ...evals.results.filter((r) => !r.pass).map((r) => `- **Fix first:** \`${r.id}\` failed: ${r.what}`),
  '',
  "## Proposals for this repository's own notes (brain/)",
  '',
  `WikiMem scored ${weakest.length ? report.scores.filter((s) => inBrain(s.page)).length : 0} notes.`,
  '',
  '### Weakest notes',
  '',
  ...weakest.map((s) => `- **${s.title}** (${s.score}/${s.maxScore}): ${s.issues.slice(0, 3).join('; ')}`),
  '',
  '### Missing pages that notes link to',
  '',
  ...(report.gaps.length
    ? report.gaps.slice(0, 10).map((g) => `- \`[[${g.mentionedTopic}]]\`, linked from ${g.mentionedIn.join(', ')}`)
    : ['- none']),
  '',
  '### Notes nothing links to',
  '',
  ...(orphans.length ? orphans.slice(0, 10).map((o) => `- ${o.title}`) : ['- none']),
  '',
  'These are proposals. Nothing is merged automatically: a person opens a pull request for the ones worth doing,',
  'and CI runs the tests and the evals on it.',
];
const md = `${lines.join('\n')}\n`;
if (process.argv[2]) writeFileSync(process.argv[2], md);
process.stdout.write(md);
process.exit(evals.passed === evals.total ? 0 : 1);
