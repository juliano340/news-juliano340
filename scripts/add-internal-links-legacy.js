const fs = require('fs').promises;
const path = require('path');

const config = require('../config');

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;

  const block = match[1];
  const body = markdown.slice(match[0].length);

  const get = (key) => {
    const m = block.match(new RegExp(`^${key}:\\s*"(.*)"\\s*$`, 'm'));
    return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim() : '';
  };

  const tagsRaw = block.match(/^tags:\s*\[([^\]]*)\]\s*$/m);
  const tags = tagsRaw
    ? tagsRaw[1]
      .split(',')
      .map((tag) => tag.replace(/^\s*"|"\s*$/g, '').trim())
      .filter(Boolean)
    : [];

  return {
    header: match[0],
    body,
    data: {
      slug: get('slug'),
      title: get('title'),
      topic: get('topic'),
      tags
    }
  };
}

function countInternalLinks(body) {
  return (String(body || '').match(/\[[^\]]+\]\((\/(posts|tags|topics)\/|https?:\/\/news\.juliano340\.com\/(posts|tags|topics)\/)[^)]+\)/g) || []).length;
}

function buildRelatedSection(data) {
  const topic = data.topic || 'llms';
  const primaryTag = data.tags[0] || 'tecnologia';
  const secondaryTag = data.tags[1] || 'negocios';

  return [
    '## Leitura relacionada',
    `- [Mais noticias sobre este tema](/topics/${topic})`,
    `- [Conteudos da tag #${primaryTag}](/tags/${primaryTag})`,
    `- [Outros destaques em #${secondaryTag}](/tags/${secondaryTag})`
  ].join('\n');
}

async function main() {
  const apply = process.argv.includes('--apply');
  const files = (await fs.readdir(config.POSTS_PATH)).filter((file) => file.endsWith('.md'));
  let processed = 0;
  let changed = 0;
  let skipped = 0;

  for (const file of files) {
    processed += 1;
    const filePath = path.join(config.POSTS_PATH, file);
    const markdown = await fs.readFile(filePath, 'utf8');
    const parsed = parseFrontmatter(markdown);
    if (!parsed) {
      skipped += 1;
      continue;
    }

    if (countInternalLinks(parsed.body) >= 3) {
      skipped += 1;
      continue;
    }

    const section = buildRelatedSection(parsed.data);
    const alreadyHas = parsed.body.includes('## Leitura relacionada');
    const updatedBody = alreadyHas ? parsed.body : `${parsed.body.trim()}\n\n${section}\n`;

    if (updatedBody === parsed.body) {
      skipped += 1;
      continue;
    }

    changed += 1;
    if (apply) {
      await fs.writeFile(filePath, `${parsed.header}${updatedBody}`, 'utf8');
    }
  }

  const mode = apply ? 'APPLY' : 'DRY-RUN';
  console.log(`[${mode}] Processados=${processed} | Atualizados=${changed} | Ignorados=${skipped}`);
  if (!apply) console.log('Use --apply para gravar as alteracoes.');
}

main().catch((error) => {
  console.error('Falha ao adicionar links internos:', error.message);
  process.exit(1);
});
