const fs = require('fs').promises;
const path = require('path');

const config = require('../config');
const Utils = require('../utils');
const editorial = require('../pipeline/editorial');
const quality = require('../pipeline/quality');

const g1 = require('../sources/g1');
const tecnoblog = require('../sources/tecnoblog');
const canaltech = require('../sources/canaltech');
const tecmundo = require('../sources/tecmundo');

const escapeYaml = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ')
    .trim();

function enabledSources() {
  const list = [];
  if (config.SOURCES.G1.enabled) list.push(g1);
  if (config.SOURCES.TECNOBLOG.enabled) list.push(tecnoblog);
  if (config.SOURCES.CANALTECH.enabled) list.push(canaltech);
  if (config.SOURCES.TECMUNDO.enabled) list.push(tecmundo);
  return list;
}

function buildPostContent(post) {
  const tags = (post.tags || []).map((tag) => `"${escapeYaml(tag)}"`).join(',');

  return `---\n` +
    `title: "${escapeYaml(post.title)}"\n` +
    `date: "${escapeYaml(post.date)}"\n` +
    `tags: [${tags}]\n` +
    `source: "${escapeYaml(post.source)}"\n` +
    `original_url: "${escapeYaml(post.original_url)}"\n` +
    `image_url: "${escapeYaml(post.image_url || '')}"\n` +
    `image: "${escapeYaml(post.image_url || '')}"\n` +
    `slug: "${escapeYaml(post.slug)}"\n` +
    `topic: "${escapeYaml(post.topic || '')}"\n` +
    `subtopic: "${escapeYaml(post.subtopic || '')}"\n` +
    `content_kind: "${escapeYaml(post.content_kind || 'news-curated')}"\n` +
    `editorial_score: "${escapeYaml(post.editorial_score || '')}"\n` +
    `editorial_mode: "${escapeYaml(post.editorial_mode || '')}"\n` +
    `ai_model: "${escapeYaml(post.ai_model || '')}"\n` +
    `ai_confidence: "${escapeYaml(post.ai_confidence || '')}"\n` +
    `primary_source: "${escapeYaml(post.primary_source || post.original_url || '')}"\n` +
    `---\n\n` +
    `${post.content || ''}\n`;
}

async function pickFirstPost() {
  const sources = enabledSources();

  for (const source of sources) {
    const posts = await source.fetch();
    if (posts.length > 0) {
      return posts[0];
    }
  }

  return null;
}

async function main() {
  const rawPost = await pickFirstPost();
  if (!rawPost) {
    throw new Error('Nenhum post disponível para gerar preview.');
  }

  const curated = await editorial.compose(rawPost);

  if (curated.blocked) {
    throw new Error(`Preview bloqueado: ${curated.block_reason || 'ai_generation_failed'}`);
  }

  const report = quality.evaluate(rawPost, curated);

  if (!report.passed) {
    throw new Error(`Post de preview reprovado no quality gate: ${report.reasons.join(', ')}`);
  }

  const previewPost = {
    ...rawPost,
    slug: `preview-${Date.now()}-${rawPost.slug}`,
    content: curated.content,
    topic: curated.topic,
    subtopic: curated.subtopic,
    content_kind: curated.content_kind,
    primary_source: curated.primary_source,
    editorial_score: report.score,
    editorial_mode: curated.editorial_mode,
    ai_model: curated.ai_metadata?.model_used || '',
    ai_confidence: curated.ai_metadata?.editorial_confidence || null
  };

  const fileName = Utils.generateFileName(previewPost.slug, new Date());
  const filePath = path.join(config.POSTS_PATH, fileName);

  await fs.mkdir(config.POSTS_PATH, { recursive: true });
  await fs.writeFile(filePath, buildPostContent(previewPost), 'utf8');

  console.log('Preview gerado com sucesso:');
  console.log(`- arquivo: ${filePath}`);
  console.log(`- slug: ${previewPost.slug}`);
  console.log(`- score: ${report.score}`);
  console.log(`- topic: ${previewPost.topic}`);
}

main().catch((error) => {
  console.error('Falha ao gerar preview:', error.message);
  process.exit(1);
});
