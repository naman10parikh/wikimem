import { Command } from 'commander';
import chalk from 'chalk';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { getVaultConfig, getVaultStats } from '../../core/vault.js';

interface StatusOptions {
  vault?: string;
  json?: boolean;
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show vault statistics')
    .option('-v, --vault <path>', 'Vault root directory', '.')
    .option('--json', 'Output as JSON (machine-readable)')
    .action((options: StatusOptions) => {
      const vaultRoot = resolve(options.vault ?? '.');
      const config = getVaultConfig(vaultRoot);

      if (!existsSync(config.schemaPath)) {
        if (options.json) {
          console.log(JSON.stringify({ error: 'Not a wikimem vault', hint: 'Run `wikimem init` first' }));
        } else {
          console.error(chalk.red('Not a wikimem vault. Run `wikimem init` first.'));
        }
        process.exit(1);
      }

      const stats = getVaultStats(config);

      if (options.json) {
        console.log(JSON.stringify({
          pages: stats.pageCount,
          words: stats.wordCount,
          sources: stats.sourceCount,
          wikilinks: stats.wikilinks,
          orphanPages: stats.orphanPages,
          lastUpdated: stats.lastUpdated,
        }));
        return;
      }

      console.log();
      console.log(chalk.bold('wikimem vault status'));
      console.log(chalk.dim('─'.repeat(40)));
      console.log(`  ${chalk.blue('Pages:')}        ${stats.pageCount}`);
      console.log(`  ${chalk.blue('Words:')}        ${stats.wordCount.toLocaleString()}`);
      console.log(`  ${chalk.blue('Sources:')}      ${stats.sourceCount}`);
      console.log(`  ${chalk.blue('Wiki links:')}   ${stats.wikilinks}`);
      console.log(`  ${chalk.blue('Orphan pages:')} ${stats.orphanPages > 0 ? chalk.yellow(stats.orphanPages) : chalk.green(0)}`);
      console.log(`  ${chalk.blue('Last updated:')} ${stats.lastUpdated}`);
      console.log();
      console.log(chalk.dim('Next: wikimem lint — check wiki health'));
    });
}
