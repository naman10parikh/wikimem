import { Command } from 'commander';
import chalk from 'chalk';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { getVaultConfig } from '../../core/vault.js';
import { publishWiki } from '../../core/publish.js';
import type { PublishOptions } from '../../core/publish.js';

interface PublishCliOptions {
  vault?: string;
  out?: string;
  baseUrl?: string;
  title?: string;
  description?: string;
  author?: string;
  format?: string;
}

const VALID_FORMATS = ['html', 'rss', 'json-feed', 'digest'] as const;

export function registerPublishCommand(program: Command): void {
  program
    .command('publish')
    .description('Publish wiki as static site, RSS feed, JSON feed, or digest')
    .option('-v, --vault <path>', 'Vault root directory', '.')
    .option('-o, --out <dir>', 'Output directory', './_site')
    .option('--base-url <url>', 'Base URL for published site', 'https://example.com')
    .option('--title <title>', 'Site title')
    .option('--description <desc>', 'Site description')
    .option('--author <name>', 'Author name')
    .option('-f, --format <formats>', 'Comma-separated formats: html,rss,json-feed,digest', 'html,rss,json-feed,digest')
    .action((options: PublishCliOptions) => {
      const vaultRoot = resolve(options.vault ?? '.');
      const config = getVaultConfig(vaultRoot);

      if (!existsSync(config.schemaPath)) {
        console.error(chalk.red('Not a wikimem vault. Run `wikimem init` first.'));
        process.exit(1);
      }

      // Parse formats
      const formatStr = options.format ?? 'html,rss,json-feed,digest';
      const formats = formatStr.split(',').map((f) => f.trim().toLowerCase());
      for (const f of formats) {
        if (!VALID_FORMATS.includes(f as typeof VALID_FORMATS[number])) {
          console.error(chalk.red(`Invalid format: "${f}". Valid: ${VALID_FORMATS.join(', ')}`));
          process.exit(1);
        }
      }

      // Read title/description from vault config or use defaults
      let siteTitle = options.title ?? 'My Wiki';
      let siteDescription = options.description ?? 'A knowledge base built with wikimem';
      try {
        const indexPath = config.indexPath;
        if (existsSync(indexPath)) {
          const indexContent = readFileSync(indexPath, 'utf-8');
          const titleMatch = indexContent.match(/^title:\s*(.+)$/m);
          if (titleMatch?.[1] && !options.title) {
            siteTitle = titleMatch[1].replace(/^["']|["']$/g, '');
          }
        }
      } catch {
        // Use defaults
      }

      const publishOpts: PublishOptions = {
        outDir: resolve(options.out ?? './_site'),
        baseUrl: options.baseUrl ?? 'https://example.com',
        title: siteTitle,
        description: siteDescription,
        author: options.author ?? 'wikimem',
        format: formats as PublishOptions['format'],
      };

      console.log(chalk.blue(`Publishing wiki from ${vaultRoot}...`));
      console.log(chalk.dim(`  Formats: ${formats.join(', ')}`));
      console.log(chalk.dim(`  Output:  ${publishOpts.outDir}`));

      const result = publishWiki(vaultRoot, publishOpts);

      if (result.pagesPublished === 0) {
        console.log(chalk.yellow('No pages to publish.'));
        return;
      }

      console.log(chalk.green(`\nPublished ${result.pagesPublished} pages → ${result.filesWritten} files`));
      console.log(chalk.dim(`  Formats: ${result.formats.join(', ')}`));
      console.log(chalk.dim(`  Output:  ${result.outputDir}`));

      if (result.formats.includes('html')) {
        console.log(chalk.dim(`  Open:    ${resolve(result.outputDir, 'index.html')}`));
      }
      if (result.formats.includes('rss')) {
        console.log(chalk.dim(`  RSS:     ${resolve(result.outputDir, 'feed.xml')}`));
      }
      if (result.formats.includes('json-feed')) {
        console.log(chalk.dim(`  JSON:    ${resolve(result.outputDir, 'feed.json')}`));
      }
      if (result.formats.includes('digest')) {
        console.log(chalk.dim(`  Digest:  ${resolve(result.outputDir, 'digest.md')}`));
      }
    });
}
