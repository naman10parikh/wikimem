#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import chalk from 'chalk';
import { createProgram } from './cli/index.js';
import { checkForUpdates } from './core/update-checker.js';
import { getVaultConfig, getVaultStats } from './core/vault.js';

const program = createProgram();

// Smart no-args: if user runs `wikimem` with no command, show contextual info
if (process.argv.length <= 2) {
  const cwd = resolve('.');
  const config = getVaultConfig(cwd);

  if (existsSync(config.schemaPath)) {
    // In a vault — show quick status + command hints
    const stats = getVaultStats(config);

    console.log();
    console.log(chalk.hex('#6b21a8').bold(' ╦ ╦╦╦╔═╦╔╦╗╔═╗╔╦╗'));
    console.log(chalk.hex('#6b21a8').bold(' ║║║║╠╩╗║║║║║╠═╝║║║'));
    console.log(chalk.hex('#6b21a8').bold(' ╚╩╝╩╩ ╩╩╩ ╩╩╚═╝╩ ╩'));
    console.log(chalk.dim(' self-improving knowledge bases'));
    console.log();
    console.log(chalk.bold('  Vault detected'));
    console.log(chalk.dim('  ─'.padEnd(40, '─')));
    console.log(`  ${chalk.blue('Pages:')}       ${stats.pageCount}`);
    console.log(`  ${chalk.blue('Words:')}       ${stats.wordCount.toLocaleString()}`);
    console.log(`  ${chalk.blue('Sources:')}     ${stats.sourceCount}`);
    console.log(`  ${chalk.blue('Wiki links:')}  ${stats.wikilinks}`);
    console.log();
    console.log(chalk.bold('  Commands'));
    console.log(chalk.dim('  ─'.padEnd(40, '─')));
    console.log(`  ${chalk.cyan('wikimem ingest <file|url>')}  Add knowledge`);
    console.log(`  ${chalk.cyan('wikimem query "question"')}   Ask the wiki`);
    console.log(`  ${chalk.cyan('wikimem status')}             Full statistics`);
    console.log(`  ${chalk.cyan('wikimem lint')}               Check wiki health`);
    console.log(`  ${chalk.cyan('wikimem improve')}            Self-improve cycle`);
    console.log(`  ${chalk.cyan('wikimem serve')}              Web UI at :3141`);
    console.log(`  ${chalk.cyan('wikimem --help')}             All commands`);
    console.log();
  } else {
    // Not in a vault — show help
    program.outputHelp();
    console.log();
    console.log(chalk.dim('Get started: wikimem init'));
  }

  process.exit(0);
} else {
  program.parse();
}

// Non-blocking: runs after command completes, never delays CLI
checkForUpdates().catch(() => {});
