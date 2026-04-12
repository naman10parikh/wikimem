/**
 * Content Distribution Engine — generates static site, RSS, JSON feed, and digest
 * from wiki content. The outbound complement to ingest/scrape/improve.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { join, basename, extname, relative } from 'node:path';
import { getVaultConfig, listWikiPages, readWikiPage, getVaultStats, extractWikilinks } from './vault.js';
import type { VaultConfig, WikiPage } from './vault.js';

export interface PublishOptions {
  outDir: string;
  baseUrl: string;
  title: string;
  description: string;
  author: string;
  format: ('html' | 'rss' | 'json-feed' | 'digest')[];
}

export interface PublishResult {
  pagesPublished: number;
  filesWritten: number;
  outputDir: string;
  formats: string[];
}

interface PageMeta {
  slug: string;
  title: string;
  category: string;
  summary: string;
  wordCount: number;
  updated: string;
  content: string;
  wikilinks: string[];
  path: string;
}

// ── Main publish function ──────────────────────────────────────────────────

export function publishWiki(vaultRoot: string, options: PublishOptions): PublishResult {
  const config = getVaultConfig(vaultRoot);
  const pages = listWikiPages(config.wikiDir);

  if (pages.length === 0) {
    return { pagesPublished: 0, filesWritten: 0, outputDir: options.outDir, formats: [] };
  }

  mkdirSync(options.outDir, { recursive: true });

  // Parse all pages
  const pageMetas: PageMeta[] = [];
  for (const pagePath of pages) {
    try {
      const page = readWikiPage(pagePath);
      const slug = basename(pagePath, extname(pagePath));
      const category = (page.frontmatter['type'] as string)
        ?? (page.frontmatter['category'] as string)
        ?? inferCategory(pagePath, config);
      const summary = (page.frontmatter['summary'] as string)
        ?? page.content.split(/[.!?]\s/)[0]?.substring(0, 160)
        ?? '';
      const updated = getUpdatedDate(page, pagePath);

      pageMetas.push({
        slug,
        title: page.title,
        category,
        summary,
        wordCount: page.wordCount,
        updated,
        content: page.content,
        wikilinks: page.wikilinks,
        path: relative(config.wikiDir, pagePath),
      });
    } catch {
      // Skip unreadable pages
    }
  }

  // Sort by updated date (newest first)
  pageMetas.sort((a, b) => b.updated.localeCompare(a.updated));

  let filesWritten = 0;
  const formatsWritten: string[] = [];

  for (const fmt of options.format) {
    switch (fmt) {
      case 'html': {
        const count = generateStaticSite(pageMetas, options, config);
        filesWritten += count;
        formatsWritten.push('html');
        break;
      }
      case 'rss': {
        generateRssFeed(pageMetas, options);
        filesWritten++;
        formatsWritten.push('rss');
        break;
      }
      case 'json-feed': {
        generateJsonFeed(pageMetas, options);
        filesWritten++;
        formatsWritten.push('json-feed');
        break;
      }
      case 'digest': {
        generateDigest(pageMetas, options, config);
        filesWritten++;
        formatsWritten.push('digest');
        break;
      }
    }
  }

  return {
    pagesPublished: pageMetas.length,
    filesWritten,
    outputDir: options.outDir,
    formats: formatsWritten,
  };
}

// ── Static HTML Site ───────────────────────────────────────────────────────

function generateStaticSite(pages: PageMeta[], options: PublishOptions, config: VaultConfig): number {
  const pagesDir = join(options.outDir, 'pages');
  mkdirSync(pagesDir, { recursive: true });

  const titleMap = new Map(pages.map((p) => [p.title, p.slug]));
  const titleMapLower = new Map(pages.map((p) => [p.title.toLowerCase(), p.slug]));

  let count = 0;

  // Generate individual pages
  for (const page of pages) {
    const html = renderPageHtml(page, options, titleMap, titleMapLower);
    writeFileSync(join(pagesDir, `${page.slug}.html`), html, 'utf-8');
    count++;
  }

  // Generate index
  const indexHtml = renderIndexHtml(pages, options, config);
  writeFileSync(join(options.outDir, 'index.html'), indexHtml, 'utf-8');
  count++;

  // Generate CSS
  writeFileSync(join(options.outDir, 'style.css'), getStylesheet(), 'utf-8');
  count++;

  return count;
}

function renderPageHtml(
  page: PageMeta,
  options: PublishOptions,
  titleMap: Map<string, string>,
  titleMapLower: Map<string, string>,
): string {
  const renderedContent = markdownToHtml(page.content, titleMap, titleMapLower);
  const categoryLabel = page.category.charAt(0).toUpperCase() + page.category.slice(1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.title)} — ${escapeHtml(options.title)}</title>
  <meta name="description" content="${escapeHtml(page.summary)}">
  <link rel="stylesheet" href="../style.css">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(options.title)}" href="../feed.xml">
</head>
<body>
  <nav class="topbar">
    <a href="../index.html" class="site-title">${escapeHtml(options.title)}</a>
    <span class="breadcrumb">${escapeHtml(categoryLabel)} / ${escapeHtml(page.title)}</span>
  </nav>
  <main class="page-content">
    <article>
      <header class="page-header">
        <span class="category-badge category-${page.category}">${escapeHtml(categoryLabel)}</span>
        <h1>${escapeHtml(page.title)}</h1>
        <div class="page-meta">
          <span>${page.wordCount.toLocaleString()} words</span>
          <span>Updated ${page.updated}</span>
          ${page.wikilinks.length > 0 ? `<span>${page.wikilinks.length} links</span>` : ''}
        </div>
      </header>
      <div class="prose">
        ${renderedContent}
      </div>
      ${page.wikilinks.length > 0 ? renderRelatedLinks(page.wikilinks, titleMap, titleMapLower) : ''}
    </article>
  </main>
  <footer class="site-footer">
    <p>Built with <a href="https://www.npmjs.com/package/wikimem">wikimem</a></p>
  </footer>
</body>
</html>`;
}

function renderRelatedLinks(
  wikilinks: string[],
  titleMap: Map<string, string>,
  titleMapLower: Map<string, string>,
): string {
  const links = wikilinks.map((link) => {
    const slug = titleMap.get(link) ?? titleMapLower.get(link.toLowerCase());
    if (slug) {
      return `<a href="${slug}.html">${escapeHtml(link)}</a>`;
    }
    return `<span class="broken-link">${escapeHtml(link)}</span>`;
  });

  return `<aside class="related-pages">
    <h3>Related Pages</h3>
    <div class="related-grid">${links.join('')}</div>
  </aside>`;
}

function renderIndexHtml(pages: PageMeta[], options: PublishOptions, config: VaultConfig): string {
  const stats = getVaultStats(config);
  const grouped = groupByCategory(pages);

  const sections = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, categoryPages]) => {
      const label = category.charAt(0).toUpperCase() + category.slice(1);
      const items = categoryPages
        .map(
          (p) =>
            `<li>
          <a href="pages/${p.slug}.html">${escapeHtml(p.title)}</a>
          <span class="item-meta">${p.wordCount} words</span>
        </li>`,
        )
        .join('\n');
      return `<section class="category-section">
      <h2><span class="category-badge category-${category}">${escapeHtml(label)}</span> ${escapeHtml(label)} <span class="count">(${categoryPages.length})</span></h2>
      <ul>${items}</ul>
    </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title)}</title>
  <meta name="description" content="${escapeHtml(options.description)}">
  <link rel="stylesheet" href="style.css">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(options.title)}" href="feed.xml">
  <link rel="alternate" type="application/feed+json" title="${escapeHtml(options.title)}" href="feed.json">
</head>
<body>
  <nav class="topbar">
    <a href="index.html" class="site-title">${escapeHtml(options.title)}</a>
  </nav>
  <main class="index-content">
    <header class="hero">
      <h1>${escapeHtml(options.title)}</h1>
      <p class="hero-desc">${escapeHtml(options.description)}</p>
      <div class="stats-bar">
        <span>${stats.pageCount} pages</span>
        <span>${stats.wordCount.toLocaleString()} words</span>
        <span>${stats.sourceCount} sources</span>
        <span>${stats.wikilinks} links</span>
      </div>
    </header>
    ${sections}
  </main>
  <footer class="site-footer">
    <p>Built with <a href="https://www.npmjs.com/package/wikimem">wikimem</a></p>
    <p class="feed-links">
      <a href="feed.xml">RSS Feed</a> · <a href="feed.json">JSON Feed</a>
    </p>
  </footer>
</body>
</html>`;
}

// ── RSS Feed ───────────────────────────────────────────────────────────────

function generateRssFeed(pages: PageMeta[], options: PublishOptions): void {
  const recent = pages.slice(0, 50);
  const now = new Date().toUTCString();
  const baseUrl = options.baseUrl.replace(/\/$/, '');

  const items = recent
    .map(
      (p) => `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(baseUrl)}/pages/${p.slug}.html</link>
      <guid isPermaLink="true">${xmlEscape(baseUrl)}/pages/${p.slug}.html</guid>
      <description>${xmlEscape(p.summary)}</description>
      <category>${xmlEscape(p.category)}</category>
      <pubDate>${new Date(p.updated).toUTCString()}</pubDate>
    </item>`,
    )
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(options.title)}</title>
    <link>${xmlEscape(baseUrl)}</link>
    <description>${xmlEscape(options.description)}</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${xmlEscape(baseUrl)}/feed.xml" rel="self" type="application/rss+xml"/>
    <generator>wikimem</generator>
${items}
  </channel>
</rss>`;

  writeFileSync(join(options.outDir, 'feed.xml'), rss, 'utf-8');
}

// ── JSON Feed ──────────────────────────────────────────────────────────────

function generateJsonFeed(pages: PageMeta[], options: PublishOptions): void {
  const recent = pages.slice(0, 50);
  const baseUrl = options.baseUrl.replace(/\/$/, '');

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: options.title,
    home_page_url: baseUrl,
    feed_url: `${baseUrl}/feed.json`,
    description: options.description,
    authors: [{ name: options.author }],
    items: recent.map((p) => ({
      id: `${baseUrl}/pages/${p.slug}.html`,
      url: `${baseUrl}/pages/${p.slug}.html`,
      title: p.title,
      summary: p.summary,
      date_modified: new Date(p.updated).toISOString(),
      tags: [p.category],
      content_text: p.content.substring(0, 2000),
    })),
  };

  writeFileSync(join(options.outDir, 'feed.json'), JSON.stringify(feed, null, 2), 'utf-8');
}

// ── Digest ─────────────────────────────────────────────────────────────────

function generateDigest(pages: PageMeta[], options: PublishOptions, config: VaultConfig): void {
  const stats = getVaultStats(config);
  const now = new Date().toISOString().split('T')[0] ?? '';

  // Group recent changes (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recent = pages.filter((p) => new Date(p.updated) >= weekAgo);

  const grouped = groupByCategory(recent);

  let md = `# ${options.title} — Weekly Digest\n\n`;
  md += `**${now}** · ${stats.pageCount} pages · ${stats.wordCount.toLocaleString()} words · ${stats.wikilinks} links\n\n`;

  if (recent.length === 0) {
    md += 'No changes in the last 7 days.\n';
  } else {
    md += `## ${recent.length} pages updated this week\n\n`;

    for (const [category, categoryPages] of Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))) {
      const label = category.charAt(0).toUpperCase() + category.slice(1);
      md += `### ${label}\n\n`;
      for (const p of categoryPages) {
        md += `- **${p.title}** — ${p.summary || `${p.wordCount} words`}\n`;
      }
      md += '\n';
    }
  }

  // Top connected pages
  const topLinked = [...pages]
    .sort((a, b) => b.wikilinks.length - a.wikilinks.length)
    .slice(0, 10);
  md += `## Most Connected Pages\n\n`;
  for (const p of topLinked) {
    md += `- **${p.title}** — ${p.wikilinks.length} outbound links\n`;
  }

  md += `\n---\n*Generated by [wikimem](https://www.npmjs.com/package/wikimem)*\n`;

  writeFileSync(join(options.outDir, 'digest.md'), md, 'utf-8');

  // Also write HTML version
  const htmlDigest = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title)} — Digest</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="topbar">
    <a href="index.html" class="site-title">${escapeHtml(options.title)}</a>
    <span class="breadcrumb">Digest</span>
  </nav>
  <main class="page-content">
    <article class="prose">
      ${markdownToHtml(md, new Map(), new Map())}
    </article>
  </main>
  <footer class="site-footer">
    <p>Built with <a href="https://www.npmjs.com/package/wikimem">wikimem</a></p>
  </footer>
</body>
</html>`;
  writeFileSync(join(options.outDir, 'digest.html'), htmlDigest, 'utf-8');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function inferCategory(pagePath: string, config: VaultConfig): string {
  const rel = relative(config.wikiDir, pagePath);
  const dir = rel.split('/')[0] ?? '';
  if (['sources', 'entities', 'concepts', 'syntheses'].includes(dir)) return dir.replace(/s$/, '');
  return 'page';
}

function getUpdatedDate(page: WikiPage, filePath: string): string {
  const fmDate = (page.frontmatter['updated'] as string)
    ?? (page.frontmatter['created'] as string);
  if (fmDate) return fmDate;
  try {
    return statSync(filePath).mtime.toISOString().split('T')[0] ?? '';
  } catch {
    return new Date().toISOString().split('T')[0] ?? '';
  }
}

function groupByCategory(pages: PageMeta[]): Record<string, PageMeta[]> {
  const grouped: Record<string, PageMeta[]> = {};
  for (const p of pages) {
    const key = p.category;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  }
  return grouped;
}

/**
 * Minimal markdown → HTML converter. Handles headings, paragraphs, bold,
 * italic, links, code, lists, blockquotes, and wikilinks. No external deps.
 */
function markdownToHtml(
  md: string,
  titleMap: Map<string, string>,
  titleMapLower: Map<string, string>,
): string {
  let html = md;

  // Wikilinks → real links
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_, title: string) => {
    const slug = titleMap.get(title) ?? titleMapLower.get(title.toLowerCase());
    if (slug) {
      return `<a href="${slug}.html" class="wiki-link">${escapeHtml(title)}</a>`;
    }
    return `<span class="wiki-link broken">${escapeHtml(title)}</span>`;
  });

  // Fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
    if (!match.startsWith('<ul>')) return `<ul>${match}</ul>`;
    return match;
  });

  // Wrap remaining lines in paragraphs (skip already-wrapped content)
  const lines = html.split('\n');
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push('');
    } else if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<li') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('<hr') ||
      trimmed.startsWith('<aside') ||
      trimmed.startsWith('<div') ||
      trimmed.startsWith('<article') ||
      trimmed.startsWith('<nav') ||
      trimmed.startsWith('<footer') ||
      trimmed.startsWith('<header') ||
      trimmed.startsWith('<section')
    ) {
      result.push(trimmed);
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }

  return result.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function xmlEscape(s: string): string {
  return escapeHtml(s).replace(/'/g, '&apos;');
}

// ── Stylesheet ─────────────────────────────────────────────────────────────

function getStylesheet(): string {
  return `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #1a1a2e;
  --bg-surface: #16213e;
  --bg-card: #1e2a47;
  --bg-hover: #243352;
  --border: #2a3a5c;
  --text: #e0e0e0;
  --text-bright: #f0f0f0;
  --text-secondary: #a0a8c0;
  --text-dim: #6b7394;
  --accent: #4f9eff;
  --accent-hover: #6db3ff;
  --green: #4ec9b0;
  --amber: #d7ba7d;
  --purple: #9c78d8;
  --orange: #ce9178;
  --red: #f14c4c;
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-display: 'Instrument Serif', Georgia, serif;
  --radius: 6px;
}

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  line-height: 1.7;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.site-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--text-bright);
  text-decoration: none;
}

.breadcrumb {
  color: var(--text-dim);
  font-size: 0.85rem;
}

.hero {
  text-align: center;
  padding: 64px 24px 48px;
}

.hero h1 {
  font-family: var(--font-display);
  font-size: 2.5rem;
  color: var(--text-bright);
  margin-bottom: 12px;
}

.hero-desc {
  color: var(--text-secondary);
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto 24px;
}

.stats-bar {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.stats-bar span {
  background: var(--bg-card);
  padding: 4px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.index-content, .page-content {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px;
  flex: 1;
  width: 100%;
}

.category-section {
  margin-bottom: 32px;
}

.category-section h2 {
  font-size: 1.2rem;
  color: var(--text-bright);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count {
  color: var(--text-dim);
  font-weight: 400;
  font-size: 0.85rem;
}

.category-section ul {
  list-style: none;
  display: grid;
  gap: 4px;
}

.category-section li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius);
  transition: background 0.15s;
}

.category-section li:hover {
  background: var(--bg-hover);
}

.category-section li a {
  color: var(--accent);
  text-decoration: none;
}

.category-section li a:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

.item-meta {
  color: var(--text-dim);
  font-size: 0.8rem;
}

.category-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 3px;
  color: var(--text-bright);
}

.category-source { background: rgba(79,158,255,0.2); color: var(--accent); }
.category-entity { background: rgba(78,201,176,0.2); color: var(--green); }
.category-concept { background: rgba(156,120,216,0.2); color: var(--purple); }
.category-synthesi, .category-synthesis { background: rgba(206,145,120,0.2); color: var(--orange); }
.category-page { background: rgba(215,186,125,0.2); color: var(--amber); }

.page-header {
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.page-header h1 {
  font-family: var(--font-display);
  font-size: 2rem;
  color: var(--text-bright);
  margin: 8px 0 12px;
}

.page-meta {
  display: flex;
  gap: 16px;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.prose h1 { font-size: 1.8rem; margin: 32px 0 16px; color: var(--text-bright); }
.prose h2 { font-size: 1.4rem; margin: 28px 0 12px; color: var(--text-bright); }
.prose h3 { font-size: 1.15rem; margin: 24px 0 8px; color: var(--text-bright); }
.prose h4 { font-size: 1rem; margin: 20px 0 8px; color: var(--text-secondary); }

.prose p { margin: 0 0 16px; }

.prose a { color: var(--accent); text-decoration: none; }
.prose a:hover { text-decoration: underline; }

.prose .wiki-link { color: var(--green); border-bottom: 1px dashed var(--green); }
.prose .wiki-link.broken { color: var(--red); border-bottom: 1px dashed var(--red); }

.prose code {
  background: var(--bg-card);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.prose pre {
  background: var(--bg-card);
  padding: 16px;
  border-radius: var(--radius);
  overflow-x: auto;
  margin: 16px 0;
  border: 1px solid var(--border);
}

.prose pre code {
  background: none;
  padding: 0;
}

.prose blockquote {
  border-left: 3px solid var(--accent);
  padding: 8px 16px;
  margin: 16px 0;
  color: var(--text-secondary);
  background: rgba(79,158,255,0.05);
  border-radius: 0 var(--radius) var(--radius) 0;
}

.prose ul {
  margin: 8px 0 16px 20px;
}

.prose li {
  margin: 4px 0;
}

.prose hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 32px 0;
}

.related-pages {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.related-pages h3 {
  font-size: 0.9rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.related-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.related-grid a, .related-grid .broken-link {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius);
  font-size: 0.85rem;
  text-decoration: none;
  transition: background 0.15s;
}

.related-grid a {
  background: rgba(78,201,176,0.1);
  color: var(--green);
  border: 1px solid rgba(78,201,176,0.2);
}

.related-grid a:hover {
  background: rgba(78,201,176,0.2);
}

.related-grid .broken-link {
  background: rgba(241,76,76,0.1);
  color: var(--text-dim);
  border: 1px solid rgba(241,76,76,0.15);
}

.site-footer {
  text-align: center;
  padding: 24px;
  border-top: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 0.8rem;
}

.site-footer a { color: var(--accent); text-decoration: none; }
.site-footer a:hover { text-decoration: underline; }

.feed-links {
  margin-top: 8px;
}

@media (max-width: 640px) {
  .hero h1 { font-size: 1.8rem; }
  .stats-bar { flex-wrap: wrap; }
  .page-header h1 { font-size: 1.5rem; }
  .page-meta { flex-wrap: wrap; }
}
`;
}
