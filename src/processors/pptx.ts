/**
 * PowerPoint (.pptx) processor.
 * Extracts slide text and speaker notes from raw XML (no external deps).
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export interface PptxResult {
  title: string;
  content: string;
  markdown: string;
  slideCount: number;
  sourcePath: string;
}

interface SlideContent {
  slideNumber: number;
  texts: string[];
  notes: string[];
}

export async function processPptx(filePath: string): Promise<PptxResult> {
  const title = basename(filePath, '.pptx');

  const slides = extractSlides(filePath);
  const slideCount = slides.length;

  let content: string;
  if (slides.length > 0) {
    content = slides
      .map((slide) => formatSlide(slide))
      .join('\n\n---\n\n');
  } else {
    content = `[PowerPoint — no text content extracted from ${basename(filePath)}]`;
  }

  return {
    title,
    content,
    markdown: buildMarkdown(title, filePath, content, slideCount),
    slideCount,
    sourcePath: filePath,
  };
}

function extractSlides(filePath: string): SlideContent[] {
  const buffer = readFileSync(filePath);
  const content = buffer.toString('latin1');

  const slides: SlideContent[] = [];

  // .pptx is a zip containing XML files.
  // Slide content lives in ppt/slides/slide{N}.xml
  // Speaker notes live in ppt/notesSlides/notesSlide{N}.xml
  // Since we're reading raw bytes, we look for XML patterns directly.

  // Strategy: Split by slide boundaries and extract text from each section
  // The <a:t> elements contain all visible text in Office OpenXML
  const slideChunks = splitBySlides(content);

  for (let i = 0; i < slideChunks.length; i++) {
    const chunk = slideChunks[i];
    if (!chunk) continue;

    const texts = extractTextElements(chunk);
    if (texts.length > 0) {
      slides.push({
        slideNumber: i + 1,
        texts,
        notes: [], // Notes extraction below
      });
    }
  }

  // If chunk-based splitting didn't work, try a simpler approach
  if (slides.length === 0) {
    const allTexts = extractTextElements(content);
    if (allTexts.length > 0) {
      // Group texts into pseudo-slides (every ~5 text blocks = 1 slide)
      const chunkSize = 5;
      for (let i = 0; i < allTexts.length; i += chunkSize) {
        const slideTexts = allTexts.slice(i, i + chunkSize);
        slides.push({
          slideNumber: slides.length + 1,
          texts: slideTexts,
          notes: [],
        });
      }
    }
  }

  // Extract speaker notes — look for notesSlide patterns
  const noteChunks = splitByNotes(content);
  for (let i = 0; i < noteChunks.length; i++) {
    const chunk = noteChunks[i];
    if (!chunk) continue;

    const notes = extractTextElements(chunk);
    // Match notes to slides by index
    const slide = slides[i];
    if (slide && notes.length > 0) {
      slide.notes = notes;
    }
  }

  return slides;
}

function splitBySlides(content: string): string[] {
  // Look for slide{N}.xml boundaries in the zip
  const chunks: string[] = [];
  const slideMarker = /slide\d+\.xml/g;
  const positions: number[] = [];

  let match: RegExpExecArray | null;
  while ((match = slideMarker.exec(content)) !== null) {
    positions.push(match.index);
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i] ?? 0;
    const end = positions[i + 1] ?? content.length;
    chunks.push(content.substring(start, Math.min(end, start + 50000)));
  }

  return chunks;
}

function splitByNotes(content: string): string[] {
  const chunks: string[] = [];
  const noteMarker = /notesSlide\d+\.xml/g;
  const positions: number[] = [];

  let match: RegExpExecArray | null;
  while ((match = noteMarker.exec(content)) !== null) {
    positions.push(match.index);
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i] ?? 0;
    const end = positions[i + 1] ?? content.length;
    chunks.push(content.substring(start, Math.min(end, start + 50000)));
  }

  return chunks;
}

function extractTextElements(xml: string): string[] {
  const texts: string[] = [];

  // <a:t> elements contain text in Office OpenXML
  const textRegex = /<a:t>([\s\S]*?)<\/a:t>/g;
  let match: RegExpExecArray | null;

  while ((match = textRegex.exec(xml)) !== null) {
    const text = match[1]?.trim();
    if (text && text.length > 0) {
      texts.push(decodeXmlEntities(text));
    }
  }

  // Also check for <a:fld> (field codes that may contain text)
  const fldRegex = /<a:fld[^>]*>[\s\S]*?<a:t>([\s\S]*?)<\/a:t>[\s\S]*?<\/a:fld>/g;
  while ((match = fldRegex.exec(xml)) !== null) {
    const text = match[1]?.trim();
    if (text && text.length > 0 && !texts.includes(text)) {
      texts.push(decodeXmlEntities(text));
    }
  }

  return texts;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code as string, 10)));
}

function formatSlide(slide: SlideContent): string {
  let md = `### Slide ${slide.slideNumber}\n\n`;
  md += slide.texts.join('\n\n');

  if (slide.notes.length > 0) {
    md += `\n\n**Speaker Notes:**\n\n> ${slide.notes.join(' ')}`;
  }

  return md;
}

function buildMarkdown(title: string, filePath: string, content: string, slideCount: number): string {
  return `# ${title}

> **Source:** [${basename(filePath)}](${filePath})
> **Type:** PowerPoint Presentation (.pptx)
> **Slides:** ${slideCount}
> **Processed:** ${new Date().toISOString().split('T')[0]}

## Slides

${content}
`;
}
