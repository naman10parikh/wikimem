/**
 * Excel/spreadsheet (.xlsx, .xls) processor.
 * Uses xlsx (SheetJS) for extraction, with a raw XML fallback.
 */

import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';

export interface XlsxResult {
  title: string;
  content: string;
  markdown: string;
  sheetCount: number;
  sourcePath: string;
}

export async function processXlsx(filePath: string): Promise<XlsxResult> {
  const ext = extname(filePath).toLowerCase();
  const title = basename(filePath, ext);

  // Try SheetJS first (best quality), fall back to raw XML
  let content: string;
  let sheetCount = 0;

  try {
    const result = await extractWithSheetJS(filePath);
    content = result.content;
    sheetCount = result.sheetCount;
  } catch {
    const result = extractFromRawXml(filePath);
    content = result.content;
    sheetCount = result.sheetCount;
  }

  if (!content.trim()) {
    content = `[Spreadsheet — no data extracted from ${basename(filePath)}]`;
  }

  return {
    title,
    content,
    markdown: buildMarkdown(title, filePath, content, sheetCount),
    sheetCount,
    sourcePath: filePath,
  };
}

async function extractWithSheetJS(filePath: string): Promise<{ content: string; sheetCount: number }> {
  // Dynamic import — xlsx is an optional dependency
  const XLSX = await import('xlsx');
  const buffer = readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const sections: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Convert sheet to array of arrays
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    if (data.length === 0) continue;

    const table = arrayToMarkdownTable(data);
    if (table) {
      sections.push(`### ${sheetName}\n\n${table}`);
    }
  }

  return {
    content: sections.join('\n\n---\n\n'),
    sheetCount: workbook.SheetNames.length,
  };
}

function extractFromRawXml(filePath: string): { content: string; sheetCount: number } {
  // .xlsx is a zip file — try to find sharedStrings.xml for text content
  const buffer = readFileSync(filePath);
  const content = buffer.toString('latin1');

  const textParts: string[] = [];

  // Look for <t> elements (shared strings in xlsx XML)
  const textRegex = /<t[^>]*>([\s\S]*?)<\/t>/g;
  let match: RegExpExecArray | null;

  while ((match = textRegex.exec(content)) !== null) {
    if (match[1] && match[1].trim()) {
      textParts.push(match[1].trim());
    }
  }

  // Also look for <v> elements (cell values)
  const valueRegex = /<v>([\s\S]*?)<\/v>/g;
  while ((match = valueRegex.exec(content)) !== null) {
    if (match[1] && match[1].trim()) {
      textParts.push(match[1].trim());
    }
  }

  // Count sheets
  const sheetMatches = content.match(/<sheet /g);
  const sheetCount = sheetMatches ? sheetMatches.length : 1;

  if (textParts.length === 0) {
    return { content: '', sheetCount };
  }

  // Present as a simple list since we can't reconstruct table structure
  const uniqueParts = [...new Set(textParts)].slice(0, 500);
  return {
    content: `**Extracted cell values:**\n\n${uniqueParts.join(' | ')}`,
    sheetCount,
  };
}

function arrayToMarkdownTable(data: unknown[][]): string {
  if (data.length === 0) return '';

  // Filter out completely empty rows
  const rows = data.filter((row) =>
    Array.isArray(row) && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''),
  );

  if (rows.length === 0) return '';

  // Determine max columns
  const maxCols = Math.max(...rows.map((row) => (Array.isArray(row) ? row.length : 0)));
  if (maxCols === 0) return '';

  // Build markdown table
  const lines: string[] = [];

  for (let i = 0; i < Math.min(rows.length, 100); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const cells = [];
    for (let j = 0; j < maxCols; j++) {
      const cell = row[j];
      const cellStr = cell !== null && cell !== undefined ? String(cell).replace(/\|/g, '\\|').replace(/\n/g, ' ') : '';
      cells.push(cellStr);
    }
    lines.push(`| ${cells.join(' | ')} |`);

    // Add header separator after first row
    if (i === 0) {
      lines.push(`| ${cells.map(() => '---').join(' | ')} |`);
    }
  }

  if (rows.length > 100) {
    lines.push(`\n> _...and ${rows.length - 100} more rows (truncated)_`);
  }

  return lines.join('\n');
}

function buildMarkdown(title: string, filePath: string, content: string, sheetCount: number): string {
  return `# ${title}

> **Source:** [${basename(filePath)}](${filePath})
> **Type:** Spreadsheet (${extname(filePath)})
> **Sheets:** ${sheetCount}
> **Processed:** ${new Date().toISOString().split('T')[0]}

## Data

${content}
`;
}
