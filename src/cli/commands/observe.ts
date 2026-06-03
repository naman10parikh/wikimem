import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { getVaultConfig } from '../../core/vault.js';
import { loadConfig } from '../../core/config.js';
import { runObserver } from '../../core/observer.js';

interface ObserveOptions {
  vault?: string;
  model?: string;
  maxPages?: string;
  budget?: string;
  improve?: boolean;
  maxImprovements?: string;
  json?: boolean;
}

export function registerObserveCommand(program: Command): void {
  program
    .command('observe')
    .description('Run the nightly observer on demand — scores pages, finds orphans, discovers gaps (Automation 2)')
    .option('-v, --vault <path>', 'Vault root directory', '.')
    .option('-m, --model <model>', 'LLM model override')
    .option('--max-pages <n>', 'Limit pages reviewed (default: all)')
    .option('--budget <usd>', 'Max spend on LLM improvements in USD (default: $2.00)')
    .option('--improve', 'Auto-improve weak pages (costs budget)', false)
    .option('--max-improvements <n>', 'Cap on pages auto-improved (default: 5)')
    .option('--json', 'Output full report as JSON', false)
    .action(async (options: ObserveOptions) => {
      const vaultRoot = resolve(options.vault ?? '.');
      const config = getVaultConfig(vaultRoot);
      const userConfig = loadConfig(config.configPath);

      if (!existsSync(config.schemaPath)) {
        console.error(chalk.red('Not a wikimem vault. Run `wikimem init` first.'));
        process.exit(1);
      }

      // Model: CLI flag > config observer_model field > observer default
      const model = options.model ?? userConfig.observer_model;
      const maxPagesToReview = options.maxPages ? parseInt(options.maxPages, 10) : undefined;
      const maxBudget = options.budget ? parseFloat(options.budget) : 2.0;
      const autoImprove = options.improve ?? false;
      const maxImprovements = options.maxImprovements ? parseInt(options.maxImprovements, 10) : 5;

      const spinner = ora('Running observer…').start();

      try {
        const report = await runObserver(config, {
          model,
          maxPagesToReview,
          autoImprove,
          maxImprovements,
          maxBudget,
        });

        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }

        // Human-readable summary
        console.log();
        console.log(chalk.bold(`Observer Report — ${report.date}`));
        console.log(chalk.dim(`${report.totalPages} total pages · ${report.pagesReviewed} reviewed`));
        console.log();

        const scoreColor = report.averageScore / report.maxScore >= 0.8
          ? chalk.green
          : report.averageScore / report.maxScore >= 0.6
            ? chalk.yellow
            : chalk.red;
        console.log(`Average quality score: ${scoreColor(String(report.averageScore))}/${report.maxScore}`);
        console.log();

        if (report.orphans.length > 0) {
          console.log(chalk.yellow(`Orphans (${report.orphans.length}):`));
          for (const o of report.orphans.slice(0, 5)) {
            console.log(`  · ${o.title}`);
          }
          if (report.orphans.length > 5) console.log(chalk.dim(`  … and ${report.orphans.length - 5} more`));
          console.log();
        }

        if (report.gaps.length > 0) {
          console.log(chalk.yellow(`Knowledge gaps (${report.gaps.length} broken wikilinks):`));
          for (const g of report.gaps.slice(0, 5)) {
            console.log(`  · [[${g.mentionedTopic}]] — mentioned in ${g.mentionCount} page(s)`);
          }
          if (report.gaps.length > 5) console.log(chalk.dim(`  … and ${report.gaps.length - 5} more`));
          console.log();
        }

        if (report.contradictions.length > 0) {
          console.log(chalk.red(`Potential contradictions (${report.contradictions.length}):`));
          for (const c of report.contradictions.slice(0, 3)) {
            console.log(`  · "${c.titleA}" vs "${c.titleB}" — ${c.reason}`);
          }
          console.log();
        }

        if (report.improvements.length > 0) {
          const improved = report.improvements.filter((i) => i.improved);
          console.log(chalk.green(`Auto-improved: ${improved.length} page(s)`));
          for (const i of improved.slice(0, 5)) {
            console.log(`  · ${i.title} — ${i.action}`);
          }
          console.log();
        }

        // Budget
        const b = report.budget;
        const spent = b.estimatedCostUsd.toFixed(3);
        const cap = maxBudget.toFixed(2);
        console.log(chalk.dim(
          `Budget: ~$${spent} estimated / $${cap} cap` +
          (b.capped ? chalk.yellow(' (capped)') : '')
        ));

        // Top issues
        if (report.topIssues.length > 0) {
          console.log();
          console.log(chalk.dim('Top issues across pages:'));
          for (const { issue, count } of report.topIssues.slice(0, 5)) {
            console.log(chalk.dim(`  ${count}× ${issue}`));
          }
        }

        console.log();
        console.log(chalk.dim(`Report saved to .wikimem/observer-reports/${report.date}.json`));
      } catch (error) {
        spinner.fail(chalk.red('Observer run failed'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });
}
