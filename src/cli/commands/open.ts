import { Command } from 'commander';
import chalk from 'chalk';
import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { getVaultConfig, slugify } from '../../core/vault.js';

interface OpenOptions {
  vault?: string;
  port?: string;
}

export function registerOpenCommand(program: Command): void {
  program
    .command('open <page>')
    .description('Open a wiki page in the default browser')
    .option('-v, --vault <path>', 'Vault root directory', '.')
    .option('--port <number>', 'Web UI port', '3141')
    .action((page: string, options: OpenOptions) => {
      const vaultRoot = resolve(options.vault ?? '.');
      const config = getVaultConfig(vaultRoot);

      if (!existsSync(config.schemaPath)) {
        console.error(chalk.red('Not a wikimem vault. Run `wikimem init` first.'));
        process.exit(1);
      }

      const port = options.port ?? '3141';
      const slug = slugify(page);
      const url = `http://localhost:${port}/page/${slug}`;

      console.log(chalk.blue(`Opening ${chalk.bold(page)} → ${chalk.underline(url)}`));

      const cmd =
        process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start'
            : 'xdg-open';

      exec(`${cmd} "${url}"`, (err) => {
        if (err) {
          console.error(chalk.yellow(`Could not open browser automatically.`));
          console.log(`Visit: ${chalk.underline(url)}`);
        }
      });
    });
}
