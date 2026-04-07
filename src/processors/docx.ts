/**
 * Word document (.docx) processor.
 * Uses mammoth for HTML extraction, with a built-in XML fallback.
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export interface DocxResult {
  title: string;
  content: string;
  markdown: string;
  sourcePath: string;
}

export async function processDocx(filePath: string): Promise<DocxResult> {
  const title = basename(filePath, '.docx');

  // Try mammoth first (best quality), fall back to raw XML extraction
  let content: string;
  try {
    content = await extractWithMammoth(filePath);
  } catch {
    content = extractFromRawXml(filePath);
  }

  if (!content.trim()) {
    content = `[Word document — no text content extracted from ${basename(filePath)}]`;
  }

  return {
    title,
    content,
    markdown: buildMarkdown(title, filePath, content),
    sourcePath: filePath,
  };
}

async function extractWithMammoth(filePath: string): Promise<string> {
  // Dynamic import — mammoth is an optional dependency
  const mammoth = await import('mammoth');
  const buffer = readFileSync(filePath);
  const result = await mammoth.convertToHtml({ buffer });

  // Convert HTML to simplified markdown (strip tags, keep structure)
  let md = result.value
    .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Add any warnings as comments
  if (result.messages.length > 0) {
    const warnings = result.messages
      .filter((m: { type: string }) => m.type === 'warning')
      .map((m: { message: string }) => m.message)
      .join(', ');
    if (warnings) {
      md += `\n\n> **Conversion notes:** ${warnings}`;
    }
  }

  return md;
}

function extractFromRawXml(filePath: string): string {
  // .docx is a zip file — read raw bytes and extract text from document.xml
  // This is a lightweight fallback when mammoth is not installed
  const buffer = readFileSync(filePath);
  const content = buffer.toString('latin1');

  const textParts: string[] = [];

  // Look for w:t elements in the XML (Word text runs)
  const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let match: RegExpExecArray | null;

  while ((match = textRegex.exec(content)) !== null) {
    if (match[1]) {
      textParts.push(match[1]);
    }
  }

  if (textParts.length > 0) {
    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  }

  // Broader fallback: extract any readable text between XML tags
  const anyText = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\x20-\x7E\r\n]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Only return if it looks like actual text (>30% alphabetic)
  const alphaCount = (anyText.match(/[a-zA-Z]/g) ?? []).length;
  if (anyText.length > 0 && alphaCount / anyText.length > 0.3) {
    return anyText.substring(0, 20000);
  }

  return '';
}

function buildMarkdown(title: string, filePath: string, content: string): string {
  return `# ${title}

> **Source:** [${basename(filePath)}](${filePath})
> **Type:** Word Document (.docx)
> **Processed:** ${new Date().toISOString().split('T')[0]}

## Content

${content}
`;
}
