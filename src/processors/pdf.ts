import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';

export interface PdfResult {
  title: string;
  content: string;
  markdown: string;
  pageCount?: number;
  sourcePath: string;
}

export function isPdfFile(filePath: string): boolean {
  return extname(filePath).toLowerCase() === '.pdf';
}

export async function processPdf(filePath: string): Promise<PdfResult> {
  const title = basename(filePath, '.pdf');
  const buffer = readFileSync(filePath);

  // Extract text from PDF
  const text = extractTextFromPdf(buffer);
  const pageCount = countPages(buffer);

  const content = text.trim() || `[PDF content from ${title} — text extraction yielded no results]`;

  return {
    title,
    content,
    markdown: buildMarkdown(title, filePath, content, pageCount),
    pageCount,
    sourcePath: filePath,
  };
}

function buildMarkdown(title: string, filePath: string, content: string, pageCount?: number): string {
  return `# ${title}

> **Source:** [${basename(filePath)}](${filePath})
> **Type:** PDF${pageCount ? `\n> **Pages:** ${pageCount}` : ''}
> **Processed:** ${new Date().toISOString().split('T')[0]}

## Content

${content}
`;
}

function extractTextFromPdf(buffer: Buffer): string {
  const content = buffer.toString('latin1');
  const textParts: string[] = [];

  // Method 1: Extract from BT...ET text objects (basic PDF text extraction)
  const btEtRegex = /BT\s([\s\S]*?)\sET/g;
  let match: RegExpExecArray | null;

  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[1] ?? '';

    // Extract from Tj operator (single string)
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      if (tjMatch[1]) textParts.push(decodePdfString(tjMatch[1]));
    }

    // Extract from TJ operator (array of strings)
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tjArrMatch: RegExpExecArray | null;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const arr = tjArrMatch[1] ?? '';
      const strRegex = /\(([^)]*)\)/g;
      let strMatch: RegExpExecArray | null;
      while ((strMatch = strRegex.exec(arr)) !== null) {
        if (strMatch[1]) textParts.push(decodePdfString(strMatch[1]));
      }
    }
  }

  // Method 2: Extract from stream objects containing plain text
  if (textParts.length === 0) {
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch: RegExpExecArray | null;
    while ((streamMatch = streamRegex.exec(content)) !== null) {
      const streamContent = streamMatch[1] ?? '';
      // Only include streams that look like text (have readable ASCII)
      const readableChars = streamContent.replace(/[^\x20-\x7E\r\n]/g, '');
      if (readableChars.length > streamContent.length * 0.5 && readableChars.length > 50) {
        textParts.push(readableChars.trim());
      }
    }
  }

  return textParts.join(' ').replace(/\s+/g, ' ').trim();
}

function decodePdfString(s: string): string {
  // Handle basic PDF escape sequences
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function countPages(buffer: Buffer): number | undefined {
  const content = buffer.toString('latin1');
  // Count /Type /Page occurrences (excluding /Pages)
  const pageMatches = content.match(/\/Type\s*\/Page(?!\s*s)/g);
  return pageMatches ? pageMatches.length : undefined;
}
