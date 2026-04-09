import { Command } from 'commander';
import chalk from 'chalk';
import { resolve, relative } from 'node:path';
import { existsSync } from 'node:fs';
import { getVaultConfig, listWikiPages, readWikiPage } from '../../core/vault.js';
import { searchPages } from '../../search/index.js';

interface SearchOptions {
  vault?: string;
  limit?: string;
}

export function registerSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Search wiki pages (BM25 keyword search)')
    .option('-v, --vault <path>', 'Vault root directory', '.')
    .option('-l, --limit <number>', 'Max results to show', '10')
    .action(async (query: string, options: SearchOptions) => {
      const vaultRoot = resolve(options.vault ?? '.');
      const config = getVaultConfig(vaultRoot);

      if (!existsSync(config.schemaPath)) {
        console.error(chalk.red('Not a wikimem vault. Run `wikimem init` first.'));
        process.exit(1);
      }

      const allPages = listWikiPages(config.wikiDir);
      if (allPages.length === 0) {
        console.log(chalk.yellow('No wiki pages found. Run `wikimem ingest` first.'));
        return;
      }

      const limit = parseInt(options.limit ?? '10', 10);
      const results = await searchPages(query, allPages, { mode: 'bm25', limit });

      if (results.length === 0) {
        console.log(chalk.yellow(`No results for "${query}"`));
        return;
      }

      console.log();
      console.log(chalk.bold(`Results for "${query}"`) + chalk.dim(` (${results.length} matches)`));
      console.log(chalk.dim('─'.repeat(60)));
      console.log();

      for (let i = 0; i < results.length; i++) {
        const pagePath = results[i];
        if (!pagePath) continue;

        try {
          const page = readWikiPage(pagePath);
          const type = (page.frontmatter['type'] as string) ?? 'page';
          const relPath = relative(config.wikiDir, pagePath);

          const snippet = page.content
            .replace(/^---[\s\S]*?---/m, '')
            .replace(/^#+\s.+$/gm, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 150);

          console.log(`  ${chalk.dim(`${i + 1}.`)} ${chalk.cyan.bold(page.title)} ${chalk.magenta(`[${type}]`)}`);
          if (snippet) {
            console.log(`     ${chalk.dim(snippet)}${snippet.length >= 150 ? chalk.dim('…') : ''}`);
          }
          console.log(`     ${chalk.dim(relPath)}`);
          console.log();
        } catch {
          // skip unreadable pages
        }
      }
    });
}
