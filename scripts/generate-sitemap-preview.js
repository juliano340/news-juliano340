const fs = require('fs').promises;
const path = require('path');

const config = require('../config');

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: markdown || '' };

  const data = {};
  const lines = match[1].split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    data[key] = value.replace(/^"|"$/g, '');
  }

  return {
    data,
    body: markdown.slice(match[0].length)
  };
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoDate(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

async function main() {
  const entries = await fs.readdir(config.POSTS_PATH);
  const files = entries.filter((file) => file.endsWith('.md'));
  const urls = [];

  for (const file of files) {
    const filePath = path.join(config.POSTS_PATH, file);
    const markdown = await fs.readFile(filePath, 'utf8');
    const { data } = parseFrontmatter(markdown);
    const slug = data.slug || file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/i, '');
    const loc = data.canonical_url || `https://news.juliano340.com/posts/${slug}`;
    const lastmod = toIsoDate(data.modified_at || data.date);
    urls.push({ loc, lastmod });
  }

  urls.sort((a, b) => (a.lastmod < b.lastmod ? 1 : -1));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((entry) => [
      '  <url>',
      `    <loc>${escapeXml(entry.loc)}</loc>`,
      `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`,
      '  </url>'
    ].join('\n')),
    '</urlset>',
    ''
  ].join('\n');

  await fs.mkdir(config.REPORT_PATH, { recursive: true });
  const outputPath = path.join(config.REPORT_PATH, 'sitemap-preview.xml');
  await fs.writeFile(outputPath, xml, 'utf8');

  console.log(`Sitemap preview gerado: ${outputPath} (${urls.length} URLs)`);
}

main().catch((error) => {
  console.error('Falha ao gerar sitemap preview:', error.message);
  process.exit(1);
});
