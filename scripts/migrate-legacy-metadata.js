const fs = require('fs').promises;
const path = require('path');

const config = require('../config');

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;
  return {
    fullMatch: match[0],
    block: match[1],
    body: markdown.slice(match[0].length)
  };
}

function getField(block, key) {
  const regex = new RegExp(`^${key}:\\s*"(.*)"\\s*$`, 'm');
  const match = block.match(regex);
  if (!match) return '';
  return match[1]
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();
}

function hasField(block, key) {
  return new RegExp(`^${key}:`, 'm').test(block);
}

function escapeYaml(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function plainTextFromBody(body) {
  return String(body || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampTextRange(text, min, max) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length > max) return normalized.slice(0, max).trim();
  if (normalized.length >= min) return normalized;
  const filler = ' Saiba o que muda na pratica, os riscos e os proximos passos para acompanhar o tema.';
  return (normalized + filler).slice(0, max).trim();
}

function buildMetadata(frontmatterBlock, body, fileName) {
  const slug = getField(frontmatterBlock, 'slug') || fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/i, '');
  const title = getField(frontmatterBlock, 'title');
  const date = getField(frontmatterBlock, 'date') || new Date().toISOString();
  const primarySource =
    getField(frontmatterBlock, 'primary_source') ||
    getField(frontmatterBlock, 'original_url') ||
    '';
  const canonicalUrl = `https://news.juliano340.com/posts/${slug}`;

  const bodyText = plainTextFromBody(body);
  const seed = bodyText ? `${title}. ${bodyText}` : `${title} com contexto, impacto pratico e acompanhamento.`;
  const description = clampTextRange(seed, 140, 160);
  const seoTitle = clampTextRange(title, 45, 62);

  return {
    seo_title: seoTitle,
    meta_description: description,
    canonical_url: canonicalUrl,
    og_type: 'article',
    published_at: date,
    modified_at: date,
    primary_source: primarySource,
    schema_type: 'NewsArticle',
    schema_headline: title,
    schema_description: description,
    schema_date_published: date,
    schema_date_modified: date,
    schema_author_name: 'News juliano340',
    schema_publisher_name: 'News juliano340',
    schema_publisher_logo: 'https://news.juliano340.com/logo.png',
    schema_main_entity_of_page: canonicalUrl,
    breadcrumb_home: 'https://news.juliano340.com/',
    breadcrumb_posts: 'https://news.juliano340.com/posts',
    breadcrumb_current: canonicalUrl,
    lang: 'pt-BR',
    is_ai_curated: 'true'
  };
}

function appendMissingFields(frontmatterBlock, metadata) {
  const linesToAppend = [];
  let updatedBlock = frontmatterBlock;
  const updatedKeys = [];

  for (const [key, value] of Object.entries(metadata)) {
    const valueStr = `${key}: "${escapeYaml(value)}"`;
    const existingMatch = updatedBlock.match(new RegExp(`^${key}:\\s*"(.*)"\\s*$`, 'm'));

    if (!existingMatch) {
      linesToAppend.push(`${key}: "${escapeYaml(value)}"`);
      continue;
    }

    const currentValue = existingMatch[1]
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .trim();

    if (!currentValue) {
      updatedBlock = updatedBlock.replace(new RegExp(`^${key}:\\s*".*"\\s*$`, 'm'), valueStr);
      updatedKeys.push(key);
    }
  }

  if (linesToAppend.length > 0) {
    updatedBlock = `${updatedBlock}\n${linesToAppend.join('\n')}`;
  }

  if (linesToAppend.length === 0 && updatedKeys.length === 0) {
    return { changed: false, updatedBlock: frontmatterBlock, added: [], updated: [] };
  }

  return {
    changed: true,
    updatedBlock,
    added: linesToAppend.map((line) => line.split(':')[0]),
    updated: updatedKeys
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

  const files = (await fs.readdir(config.POSTS_PATH)).filter((file) => file.endsWith('.md'));
  let processed = 0;
  let changed = 0;
  let skipped = 0;

  for (const file of files) {
    if (processed >= limit) break;
    processed += 1;

    const filePath = path.join(config.POSTS_PATH, file);
    const markdown = await fs.readFile(filePath, 'utf8');
    const parsed = parseFrontmatter(markdown);
    if (!parsed) {
      skipped += 1;
      continue;
    }

    const metadata = buildMetadata(parsed.block, parsed.body, file);
    const result = appendMissingFields(parsed.block, metadata);
    if (!result.changed) {
      skipped += 1;
      continue;
    }

    changed += 1;
    if (apply) {
      const updatedMarkdown = markdown.replace(parsed.fullMatch, `---\n${result.updatedBlock}\n---\n\n`);
      await fs.writeFile(filePath, updatedMarkdown, 'utf8');
    }
  }

  const mode = apply ? 'APPLY' : 'DRY-RUN';
  console.log(`[${mode}] Processados=${processed} | Alterados=${changed} | Sem mudanca=${skipped}`);
  if (!apply) {
    console.log('Use --apply para gravar as alteracoes.');
  }
}

main().catch((error) => {
  console.error('Falha na migracao de metadados:', error.message);
  process.exit(1);
});
