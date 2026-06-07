import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { getVaultConfig } from '../../core/vault.js';
import { loadConfig } from '../../core/config.js';
import { scrapeUrlInSandbox, type SandboxScrapeTarget } from '../../core/sandbox-scrape.js';

interface SandboxRunOptions {
  vault?: string;
  url?: string;
  source?: string;
}

/**
 * `wikimem sandbox-run` — fetch + clean UNTRUSTED external content inside an
 * isolated E2B Firecracker microVM, then deposit the cleaned markdown into the
 * vault's raw/ dir. Same intent as `wikimem scrape`, but the untrusted fetch +
 * parse runs in a disposable sandbox rather than on the host.
 */
export function registerSandboxRunCommand(program: Command): void {
  program
    .command('sandbox-run')
    .description('Scrape untrusted external content inside an isolated E2B sandbox (requires E2B_API_KEY)')
    .option('-v, --vault <path>', 'Vault root directory', '.')
    .option('-u, --url <url>', 'A single URL to fetch + clean inside the sandbox')
    .option('-s, --source <name>', 'A url/rss/github source name from config.yaml to run in the sandbox')
    .action(async (options: SandboxRunOptions) => {
      const vaultRoot = resolve(options.vault ?? '.');
      const config = getVaultConfig(vaultRoot);

      if (!existsSync(config.schemaPath)) {
        console.error(chalk.red('Not a wikimem vault. Run `wikimem init` first.'));
        process.exit(1);
      }

      // Build the target list: explicit --url, or a named source from config.
      const targets: SandboxScrapeTarget[] = [];
      if (options.url) {
        targets.push({ name: options.url.replace(/^https?:\/\//, '').split('/')[0] ?? 'source', url: options.url });
      } else if (options.source) {
        const userConfig = loadConfig(config.configPath);
        const match = (userConfig.sources ?? []).find((s) => s.name === options.source);
        if (!match?.url) {
          console.error(chalk.red(`Source "${options.source}" not found (or has no url) in config.yaml.`));
          process.exit(1);
        }
        targets.push({ name: match.name, url: match.url });
      } else {
        console.error(chalk.yellow('Provide --url <url> or --source <name>.'));
        process.exit(1);
      }

      const spinner = ora('Booting E2B sandbox and scraping...').start();
      try {
        const result = await scrapeUrlInSandbox(config, targets);
        spinner.succeed(
          chalk.green(`Sandbox ${result.sandboxId} → ${result.filesDeposited} file(s) deposited`),
        );
        for (const entry of result.entries) {
          console.log(chalk.dim(`  ${entry.name}: ${entry.bytes} bytes → raw/`));
        }
        if (result.filesDeposited > 0) {
          console.log();
          console.log(chalk.dim('Run `wikimem ingest` to process new raw files into the wiki.'));
        }
      } catch (error) {
        spinner.fail(chalk.red('Sandbox scrape failed'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });
}
