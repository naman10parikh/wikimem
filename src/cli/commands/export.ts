import { Command } from 'commander';
import chalk from 'chalk';
import { resolve, relative } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { getVaultConfig, listWikiPages, readWikiPage } from '../../core/vault.js';

interface ExportOptions {
  vault?: string;
  format?: string;
  output?: string;
}

interface GraphNode {
  id: string;
  title: string;
  type: string;
  wordCount: number;
  path: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description('Export wiki as graph data (JSON, CSV, or GraphML)')
    .option('-v, --vault <path>', 'Vault root directory', '.')
    .option('-f, --format <format>', 'Output format: json, csv, graphml', 'json')
    .option('-o, --output <file>', 'Write to file instead of stdout')
    .action((options: ExportOptions) => {
      const vaultRoot = resolve(options.vault ?? '.');
      const config = getVaultConfig(vaultRoot);

      if (!existsSync(config.schemaPath)) {
        console.error(chalk.red('Not a wikimem vault. Run `wikimem init` first.'));
        process.exit(1);
      }

      const pages = listWikiPages(config.wikiDir);
      if (pages.length === 0) {
        console.error(chalk.yellow('No wiki pages to export.'));
        return;
      }

      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      for (const pagePath of pages) {
        try {
          const page = readWikiPage(pagePath);
          const type = (page.frontmatter['type'] as string) ?? 'page';

          nodes.push({
            id: page.title,
            title: page.title,
            type,
            wordCount: page.wordCount,
            path: relative(config.wikiDir, pagePath),
          });

          for (const link of page.wikilinks) {
            edges.push({ source: page.title, target: link });
          }
        } catch {
          // skip unreadable pages
        }
      }

      const format = (options.format ?? 'json').toLowerCase();
      let output: string;

      switch (format) {
        case 'json':
          output = JSON.stringify({ nodes, edges }, null, 2);
          break;
        case 'csv':
          output =
            'source,target\n' +
            edges.map((e) => `"${csvEscape(e.source)}","${csvEscape(e.target)}"`).join('\n');
          break;
        case 'graphml':
          output = buildGraphML(nodes, edges);
          break;
        default:
          console.error(chalk.red(`Unknown format: "${format}". Use json, csv, or graphml.`));
          process.exit(1);
      }

      if (options.output) {
        writeFileSync(options.output, output, 'utf-8');
        console.error(
          chalk.green(`Exported ${nodes.length} nodes, ${edges.length} edges → ${options.output}`),
        );
      } else {
        console.log(output);
      }
    });
}

function csvEscape(s: string): string {
  return s.replace(/"/g, '""');
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildGraphML(nodes: GraphNode[], edges: GraphEdge[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
    '  <key id="d_title" for="node" attr.name="title" attr.type="string"/>',
    '  <key id="d_type" for="node" attr.name="type" attr.type="string"/>',
    '  <key id="d_words" for="node" attr.name="wordCount" attr.type="int"/>',
    '  <graph id="wiki" edgedefault="directed">',
  ];

  for (const node of nodes) {
    lines.push(`    <node id="${xmlEscape(node.id)}">`);
    lines.push(`      <data key="d_title">${xmlEscape(node.title)}</data>`);
    lines.push(`      <data key="d_type">${xmlEscape(node.type)}</data>`);
    lines.push(`      <data key="d_words">${node.wordCount}</data>`);
    lines.push('    </node>');
  }

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (!edge) continue;
    lines.push(
      `    <edge id="e${i}" source="${xmlEscape(edge.source)}" target="${xmlEscape(edge.target)}"/>`,
    );
  }

  lines.push('  </graph>');
  lines.push('</graphml>');
  return lines.join('\n');
}
