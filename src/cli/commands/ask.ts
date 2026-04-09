import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { queryWiki } from '../../core/query.js';
import { getVaultConfig } from '../../core/vault.js';
import { createProviderFromUserConfig } from '../../providers/index.js';
import { loadConfig } from '../../core/config.js';

interface AskOptions {
  vault?: string;
  provider?: string;
  model?: string;
  file?: boolean;
}

export function registerAskCommand(program: Command): void {
  program
    .command('ask <question>')
    .description('Ask a question — LLM-powered Q&A against the wiki')
    .option('-v, --vault <path>', 'Vault root directory', '.')
    .option('-p, --provider <provider>', 'LLM provider (claude, openai, ollama)')
    .option('-m, --model <model>', 'Model to use')
    .option('--file', 'Save the answer as a new wiki page')
    .action(async (question: string, options: AskOptions) => {
      const vaultRoot = resolve(options.vault ?? '.');
      const config = getVaultConfig(vaultRoot);
      const userConfig = loadConfig(config.configPath);

      if (!existsSync(config.schemaPath)) {
        console.error(chalk.red('Not a wikimem vault. Run `wikimem init` first.'));
        process.exit(1);
      }

      const provider = createProviderFromUserConfig(userConfig, {
        providerOverride: options.provider,
        model: options.model,
      });

      const spinner = ora('Thinking…').start();

      try {
        const result = await queryWiki(question, config, provider, {
          fileBack: options.file ?? false,
        });

        spinner.stop();
        console.log();

        const formatted = result.answer
          .replace(/^(#{1,3})\s+(.+)$/gm, (_m, hashes: string, text: string) => {
            if (hashes === '#') return chalk.bold.underline(text);
            if (hashes === '##') return chalk.bold(text);
            return chalk.italic(text);
          })
          .replace(/\[\[([^\]]+)\]\]/g, (_m, link: string) => chalk.cyan(`[[${link}]]`))
          .replace(/`([^`]+)`/g, (_m, code: string) => chalk.yellow(code))
          .replace(/\*\*([^*]+)\*\*/g, (_m, bold: string) => chalk.bold(bold));

        console.log(formatted);
        console.log();

        if (result.sourcesConsulted.length > 0) {
          console.log(chalk.dim(`Sources: ${result.sourcesConsulted.join(', ')}`));
        }

        if (result.filedAs) {
          console.log(chalk.green(`Saved to: ${result.filedAs}`));
        }
      } catch (error) {
        spinner.fail('Failed');
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });
}
