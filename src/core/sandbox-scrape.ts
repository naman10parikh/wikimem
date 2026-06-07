/**
 * Sandboxed scrape — fetch + parse UNTRUSTED external web content inside an
 * isolated E2B Firecracker microVM instead of on the host.
 *
 * Why this exists: `wikimem scrape` (Automation 2) fetches arbitrary remote
 * RSS/URL/GitHub content and runs HTML/markup stripping on it, on the host
 * machine, before depositing it into the user's vault. Remote content is
 * untrusted by definition. Running the fetch + parse step inside an E2B sandbox
 * means the untrusted bytes are handled in a disposable, network-isolated VM;
 * only the resulting cleaned markdown crosses back to the host vault.
 *
 * Uses the official E2B SDK (`e2b`), same package the Energy runtime uses
 * (packages/runtime/src/sandbox/container-runner.ts). The E2B_API_KEY is read
 * from the environment automatically by the SDK.
 *
 * This module is intentionally dependency-light at import time: the `e2b` SDK is
 * loaded lazily inside `scrapeUrlInSandbox` so the rest of the CLI never pays
 * the cost of loading it unless a sandbox run is requested.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VaultConfig } from './vault.js';
import { slugify } from './vault.js';
import { appendLog } from './log-manager.js';

/** A single URL to fetch + clean inside the sandbox. */
export interface SandboxScrapeTarget {
  /** Friendly name used for the output filename and log line. */
  name: string;
  /** The remote URL whose (untrusted) content will be fetched in the sandbox. */
  url: string;
}

/** Result of a sandboxed scrape run. */
export interface SandboxScrapeResult {
  /** E2B sandbox id that was booted (proof the VM ran). */
  sandboxId: string;
  /** Number of files written into the vault's raw/ dir. */
  filesDeposited: number;
  /** Per-target detail. */
  entries: Array<{ name: string; bytes: number; file: string }>;
}

/**
 * The script that runs INSIDE the E2B sandbox. It receives a JSON array of
 * targets via argv[2], fetches each URL, strips markup to plain text, and
 * prints a JSON result to stdout. Nothing from the remote response touches the
 * host: only this script (which we author) and its JSON stdout do.
 *
 * Kept as a string so it can be written verbatim into the sandbox filesystem.
 */
const IN_SANDBOX_SCRAPER = String.raw`
const targets = JSON.parse(process.argv[2] || '[]');
function stripHtml(html) {
  let t = html;
  t = t.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '');
  t = t.replace(/<\/?(br|p|div|li|h[1-6]|tr|blockquote)[^>]*>/gi, '\n');
  t = t.replace(/<[^>]*>/g, '');
  t = t.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  t = t.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
  t = t.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&nbsp;':' '}[m] || m));
  t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}
(async () => {
  const out = [];
  for (const target of targets) {
    try {
      const res = await fetch(target.url, { signal: AbortSignal.timeout(15000) });
      const body = await res.text();
      const text = stripHtml(body).slice(0, 10000);
      out.push({ name: target.name, ok: res.ok, status: res.status, text });
    } catch (e) {
      out.push({ name: target.name, ok: false, status: 0, text: '', error: String(e && e.message || e) });
    }
  }
  process.stdout.write(JSON.stringify(out));
})();
`;

/**
 * Boot an E2B sandbox, fetch + clean each target's untrusted remote content
 * inside it, and write the cleaned markdown into the vault's raw/<date>/ dir.
 *
 * @throws if E2B_API_KEY is missing or the sandbox cannot boot.
 */
export async function scrapeUrlInSandbox(
  config: VaultConfig,
  targets: SandboxScrapeTarget[],
): Promise<SandboxScrapeResult> {
  if (!process.env['E2B_API_KEY']) {
    throw new Error(
      'E2B_API_KEY is required for sandboxed scraping. Set it in your vault .env or shell.',
    );
  }
  if (targets.length === 0) {
    throw new Error('No scrape targets provided.');
  }

  // Lazy-load the SDK so the rest of the CLI never loads it unless we run here.
  const { Sandbox } = await import('e2b');

  // 150ms-ish cold start; network-isolated Firecracker microVM.
  const sandbox = await Sandbox.create({ timeoutMs: 120_000 });
  const sandboxId = sandbox.sandboxId;

  try {
    // Write our (trusted) scraper script into the sandbox filesystem.
    await sandbox.files.write('/home/user/scrape.cjs', IN_SANDBOX_SCRAPER);

    // Run it inside the VM. The untrusted fetch + parse happens HERE, isolated.
    const argv = JSON.stringify(JSON.stringify(targets));
    const exec = await sandbox.commands.run(`node /home/user/scrape.cjs ${argv}`);

    let parsed: Array<{ name: string; ok: boolean; status: number; text: string; error?: string }>;
    try {
      parsed = JSON.parse(exec.stdout) as typeof parsed;
    } catch {
      throw new Error(`Sandbox scraper returned unparseable output: ${exec.stderr || exec.stdout}`);
    }

    const date = new Date().toISOString().split('T')[0] ?? '';
    const dateDir = join(config.rawDir, date);
    mkdirSync(dateDir, { recursive: true });

    const entries: SandboxScrapeResult['entries'] = [];
    for (const item of parsed) {
      if (!item.ok || !item.text) continue;
      const target = targets.find((t) => t.name === item.name);
      const content = `# ${item.name}\n\nSource: ${target?.url ?? ''}\n\n${item.text}`;
      const file = `${slugify(item.name)}.md`;
      writeFileSync(join(dateDir, file), content, 'utf-8');
      entries.push({ name: item.name, bytes: Buffer.byteLength(content), file });
    }

    appendLog(
      config.logPath,
      `sandbox-run | ${entries.length} file(s) scraped in E2B sandbox ${sandboxId}`,
      entries.map((e) => `${e.name}: ${e.bytes} bytes`).join(', ') || 'No files scraped.',
    );

    return { sandboxId, filesDeposited: entries.length, entries };
  } finally {
    // Always tear the VM down — disposable trust envelope.
    await sandbox.kill();
  }
}
