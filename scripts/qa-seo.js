const fs = require('fs').promises;
const path = require('path');

const config = require('../config');

const REQUIRED_SECTIONS_STANDARD = [
  '## Resumo em 3 bullets',
  '## Contexto',
  '## Insights e implicacoes',
  '## O que fazer agora',
  '## O que vale acompanhar',
  '## Fonte e transparencia'
];

const REQUIRED_SECTIONS_JOB = [
  '## Resumo em 3 bullets',
  '## Como usar esta lista',
  '## Destaques rapidos',
  '## Checklist de candidatura',
  '## O que observar nos proximos dias',
  '## FAQ',
  '## Fonte e transparencia'
];

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
    data[key] = value
      .replace(/^"|"$/g, '')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  return {
    data,
    body: markdown.slice(match[0].length)
  };
}

function hasNewContract(frontmatter) {
  return ['seo_title', 'meta_description', 'canonical_url', 'schema_type'].every((key) => String(frontmatter[key] || '').trim());
}

function countWatchBullets(body) {
  const sectionMatch = body.match(/## O que vale acompanhar\n([\s\S]*?)(\n## |$)/) || body.match(/## O que observar nos proximos dias\n([\s\S]*?)(\n## |$)/);
  if (!sectionMatch) return 0;
  return (sectionMatch[1].match(/^\s*-\s+/gm) || []).length;
}

function countFaqQuestions(body) {
  const sectionMatch = body.match(/## FAQ\n([\s\S]*?)(\n## |$)/);
  if (!sectionMatch) return 0;
  return (sectionMatch[1].match(/^\s*###\s+/gm) || []).length;
}

function validatePost(file, frontmatter, body) {
  const errors = [];
  const warnings = [];

  const descriptionLength = String(frontmatter.meta_description || '').length;
  if (descriptionLength < 140 || descriptionLength > 160) {
    errors.push(`meta_description_fora_faixa(${descriptionLength})`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(frontmatter.slug || '').trim())) {
    errors.push('slug_invalido');
  }

  const expectedCanonical = `https://news.juliano340.com/posts/${frontmatter.slug}`;
  if (String(frontmatter.canonical_url || '') !== expectedCanonical) {
    errors.push('canonical_inconsistente');
  }

  if (String(frontmatter.og_type || '').trim() !== 'article') {
    errors.push('og_type_invalido');
  }

  if (String(frontmatter.schema_type || '').trim() !== 'NewsArticle') {
    errors.push('schema_type_invalido');
  }

  const requiredSchema = [
    'schema_headline',
    'schema_description',
    'schema_date_published',
    'schema_date_modified',
    'schema_author_name',
    'schema_publisher_name',
    'schema_main_entity_of_page'
  ];
  for (const field of requiredSchema) {
    if (!String(frontmatter[field] || '').trim()) {
      errors.push(`${field}_ausente`);
    }
  }

  const postType = String(frontmatter.post_type || 'standard').toLowerCase();
  const requiredSections = postType === 'job_roundup' ? REQUIRED_SECTIONS_JOB : REQUIRED_SECTIONS_STANDARD;

  for (const heading of requiredSections) {
    if (!body.includes(heading)) {
      const legacyChecklist = heading === '## O que fazer agora' && body.includes('## O que muda na pratica');
      if (!legacyChecklist) errors.push(`secao_ausente:${heading}`);
    }
  }

  if (postType === 'job_roundup') {
    const faqCount = countFaqQuestions(body);
    if (faqCount < 4) errors.push(`faq_job_roundup_insuficiente(${faqCount})`);
  }

  const watchBullets = countWatchBullets(body);
  if (watchBullets < 3 || watchBullets > 5) errors.push(`observacao_bullets_invalido(${watchBullets})`);

  const internalLinks = (body.match(/\[[^\]]+\]\((\/posts\/|\/tags\/|\/topics\/|https?:\/\/news\.juliano340\.com\/(posts|tags|topics)\/)[^)]+\)/g) || []).length;
  if (internalLinks < 3) warnings.push(`poucos_links_internos(${internalLinks})`);

  const hasSourceLink = String(frontmatter.primary_source || '') && body.includes(String(frontmatter.primary_source || ''));
  if (!hasSourceLink) errors.push('fonte_primaria_ausente_no_corpo');

  return {
    file,
    slug: frontmatter.slug || file.replace(/\.md$/i, ''),
    errors,
    warnings
  };
}

function validateMetadataOnly(file, frontmatter) {
  const errors = [];
  const warnings = [];

  const descriptionLength = String(frontmatter.meta_description || '').length;
  if (descriptionLength < 140 || descriptionLength > 160) {
    errors.push(`meta_description_fora_faixa(${descriptionLength})`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(frontmatter.slug || '').trim())) {
    errors.push('slug_invalido');
  }

  const expectedCanonical = `https://news.juliano340.com/posts/${frontmatter.slug}`;
  if (String(frontmatter.canonical_url || '') !== expectedCanonical) {
    errors.push('canonical_inconsistente');
  }

  if (String(frontmatter.og_type || '').trim() !== 'article') {
    errors.push('og_type_invalido');
  }

  if (String(frontmatter.schema_type || '').trim() !== 'NewsArticle') {
    errors.push('schema_type_invalido');
  }

  const requiredSchema = [
    'schema_headline',
    'schema_description',
    'schema_date_published',
    'schema_date_modified',
    'schema_author_name',
    'schema_publisher_name',
    'schema_main_entity_of_page'
  ];
  for (const field of requiredSchema) {
    if (!String(frontmatter[field] || '').trim()) {
      errors.push(`${field}_ausente`);
    }
  }

  return {
    file,
    slug: frontmatter.slug || file.replace(/\.md$/i, ''),
    errors,
    warnings
  };
}

async function main() {
  const strict = process.argv.includes('--strict');
  const metadataOnly = process.argv.includes('--metadata-only');
  const entries = await fs.readdir(config.POSTS_PATH);
  const files = entries.filter((file) => file.endsWith('.md'));

  let checked = 0;
  let legacySkipped = 0;
  const failed = [];
  const warned = [];

  for (const file of files) {
    const markdown = await fs.readFile(path.join(config.POSTS_PATH, file), 'utf8');
    const { data, body } = parseFrontmatter(markdown);

    if (!hasNewContract(data)) {
      legacySkipped += 1;
      if (strict) {
        failed.push({ file, slug: data.slug || '', errors: ['contrato_novo_ausente'], warnings: [] });
      }
      continue;
    }

    checked += 1;
    const result = metadataOnly
      ? validateMetadataOnly(file, data)
      : validatePost(file, data, body);
    if (result.errors.length > 0) failed.push(result);
    else if (result.warnings.length > 0) warned.push(result);
  }

  console.log(`QA SEO: verificados=${checked} | legacy=${legacySkipped} | falhas=${failed.length} | avisos=${warned.length}`);

  if (warned.length > 0) {
    console.log('Avisos:');
    for (const item of warned.slice(0, 20)) {
      console.log(`- ${item.file}: ${item.warnings.join(', ')}`);
    }
  }

  if (failed.length > 0) {
    console.error('Falhas SEO encontradas:');
    for (const item of failed.slice(0, 50)) {
      console.error(`- ${item.file}: ${item.errors.join(', ')}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Erro no QA SEO:', error.message);
  process.exit(1);
});
