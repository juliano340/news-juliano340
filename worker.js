const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const Utils = require('./utils');
const git = require('./git');
const editorial = require('./pipeline/editorial');
const quality = require('./pipeline/quality');

const g1 = require('./sources/g1');
const tecnoblog = require('./sources/tecnoblog');
const canaltech = require('./sources/canaltech');
const tecmundo = require('./sources/tecmundo');

class NewsWorker {
  constructor() {
    this.sources = [];

    if (config.SOURCES.G1.enabled) this.sources.push(g1);
    if (config.SOURCES.TECNOBLOG.enabled) this.sources.push(tecnoblog);
    if (config.SOURCES.CANALTECH.enabled) this.sources.push(canaltech);
    if (config.SOURCES.TECMUNDO.enabled) this.sources.push(tecmundo);

    this.slugs = new Set();
    this.urls = new Set();
    this.publishedPosts = [];
  }

  escapeYaml(value) {
    return String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, ' ')
      .trim();
  }

  async init() {
    await logger.init();
    await git.init();
    await git.pull();
    await this.loadExistingPosts();
    logger.info('Iniciado');
  }

  async loadExistingPosts() {
    try {
      const files = await fs.readdir(config.POSTS_PATH);

      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const content = await fs.readFile(path.join(config.POSTS_PATH, file), 'utf8');
        const slugMatch = content.match(/slug:\s*"([^"]+)"/);
        const urlMatch = content.match(/original_url:\s*"([^"]+)"/);
        const titleMatch = content.match(/title:\s*"([^"]+)"/);

        if (slugMatch) this.slugs.add(slugMatch[1]);
        if (urlMatch) this.urls.add(urlMatch[1]);
        if (titleMatch) this.urls.add(Utils.generateSlug(titleMatch[1]));
      }
    } catch (error) {
      logger.error('L', { error: error.message });
    }
  }

  isDuplicate(post) {
    return (
      this.slugs.has(post.slug) ||
      this.urls.has(post.original_url) ||
      this.urls.has(Utils.generateSlug(post.title))
    );
  }

  isTooOld(post) {
    const MAX_AGE_DAYS = 7;
    const postDate = new Date(post.date);
    const now = new Date();
    const diffTime = Math.abs(now - postDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > MAX_AGE_DAYS;
  }

  buildPostContent(post) {
    const tags = (post.tags || []).map((tag) => `"${this.escapeYaml(tag)}"`).join(',');

    return `---\n` +
      `title: "${this.escapeYaml(post.title)}"\n` +
      `date: "${this.escapeYaml(post.date)}"\n` +
      `tags: [${tags}]\n` +
      `source: "${this.escapeYaml(post.source)}"\n` +
      `original_url: "${this.escapeYaml(post.original_url)}"\n` +
      `image_url: "${this.escapeYaml(post.image_url || '')}"\n` +
      `image: "${this.escapeYaml(post.image_url || '')}"\n` +
      `slug: "${this.escapeYaml(post.slug)}"\n` +
      `topic: "${this.escapeYaml(post.topic || '')}"\n` +
      `subtopic: "${this.escapeYaml(post.subtopic || '')}"\n` +
      `content_kind: "${this.escapeYaml(post.content_kind || 'news')}"\n` +
      `editorial_score: "${this.escapeYaml(post.editorial_score || '')}"\n` +
      `editorial_mode: "${this.escapeYaml(post.editorial_mode || '')}"\n` +
      `ai_model: "${this.escapeYaml(post.ai_model || '')}"\n` +
      `ai_confidence: "${this.escapeYaml(post.ai_confidence || '')}"\n` +
      `primary_source: "${this.escapeYaml(post.primary_source || post.original_url || '')}"\n` +
      `---\n\n` +
      `${post.content || ''}\n`;
  }

  async savePost(post) {
    if (this.isDuplicate(post)) {
      logger.skip('Existe: ' + post.title);
      return false;
    }

    if (this.isTooOld(post)) {
      logger.skip('Antigo: ' + post.title);
      return false;
    }

    const fileName = Utils.generateFileName(post.slug);
    const filePath = path.join(config.POSTS_PATH, fileName);

    await fs.writeFile(filePath, this.buildPostContent(post), 'utf8');

    this.slugs.add(post.slug);
    this.urls.add(post.original_url);
    this.publishedPosts.push(post);

    logger.ok('Salvo: ' + post.title);
    return true;
  }

  async applyEditorialPolicy(post) {
    if (!config.EDITORIAL_ENABLED) {
      return {
        accepted: true,
        post,
        quality: null
      };
    }

    const curated = await editorial.compose(post);
    const qualityCheck = quality.evaluate(post, curated);

    if (!qualityCheck.passed && qualityCheck.shouldDiscard) {
      return {
        accepted: false,
        post,
        quality: qualityCheck
      };
    }

    return {
      accepted: true,
      quality: qualityCheck,
      post: {
        ...post,
        content: curated.content,
        topic: curated.topic,
        subtopic: curated.subtopic,
        content_kind: curated.content_kind,
        primary_source: curated.primary_source,
        editorial_score: qualityCheck.score,
        editorial_mode: curated.editorial_mode,
        ai_model: curated.ai_metadata?.model_used || '',
        ai_confidence: curated.ai_metadata?.editorial_confidence || null
      }
    };
  }

  async generateDigests() {
    if (this.publishedPosts.length === 0) return;

    await fs.mkdir(config.DIGEST_PATH, { recursive: true });

    const now = new Date();
    const cutoff24h = now.getTime() - (24 * 60 * 60 * 1000);
    const digest24h = this.publishedPosts
      .filter((post) => new Date(post.date).getTime() >= cutoff24h)
      .map((post) => ({
        title: post.title,
        slug: post.slug,
        topic: post.topic || '',
        source: post.source,
        date: post.date,
        editorial_score: post.editorial_score || null,
        original_url: post.original_url
      }));

    const digest24hPath = path.join(config.DIGEST_PATH, 'digest-24h.json');
    await fs.writeFile(
      digest24hPath,
      JSON.stringify(
        {
          generated_at: now.toISOString(),
          niche: config.EDITORIAL_NICHE,
          total: digest24h.length,
          posts: digest24h
        },
        null,
        2
      ),
      'utf8'
    );

    const weeklyTitle = now.toISOString().slice(0, 10);
    const weeklyPath = path.join(config.DIGEST_PATH, 'weekly-ia-dev.md');
    const weeklyContent = [
      `# Weekly IA para Devs - ${weeklyTitle}`,
      '',
      `Gerado em ${now.toISOString()}`,
      '',
      ...this.publishedPosts.slice(0, 25).map((post) => (
        `- [${post.title}](${post.original_url}) | topico: ${post.topic || 'n/a'} | score: ${post.editorial_score || 'n/a'}`
      ))
    ].join('\n');

    await fs.writeFile(weeklyPath, weeklyContent + '\n', 'utf8');
    logger.ok('Digests gerados', { digest24h: digest24hPath, weekly: weeklyPath });
  }

  async run() {
    const start = Date.now();
    let novos = 0;
    let pulados = 0;
    let erros = 0;
    let descartados = 0;

    logger.info('Iniciando...');

    for (const source of this.sources) {
      try {
        const posts = await source.fetch();

        for (const post of posts) {
          try {
            const policyResult = await this.applyEditorialPolicy(post);

            if (!policyResult.accepted) {
              descartados += 1;
              logger.skip('Descartado por qualidade: ' + post.title, {
                score: policyResult.quality.score,
                threshold: policyResult.quality.threshold,
                reasons: policyResult.quality.reasons,
                checks: policyResult.quality.checks
              });
              continue;
            }

            if (policyResult.quality) {
              logger.debug('Aprovado no quality gate: ' + post.title, {
                score: policyResult.quality.score,
                threshold: policyResult.quality.threshold,
                checks: policyResult.quality.checks,
                editorial_mode: policyResult.post.editorial_mode,
                ai_model: policyResult.post.ai_model,
                ai_confidence: policyResult.post.ai_confidence
              });
            }

            if (await this.savePost(policyResult.post)) novos += 1;
            else pulados += 1;
          } catch (error) {
            logger.error('P', { error: error.message });
            erros += 1;
          }
        }

        await Utils.sleep(1000);
      } catch (error) {
        logger.error('F ' + source.name, { error: error.message });
        erros += 1;
      }
    }

    await this.generateDigests();

    if (novos > 0) {
      await git.commitAndPush('feat: ' + novos + ' posts');
    }

    logger.ok('Fim em ' + ((Date.now() - start) / 1000).toFixed(1) + 's', {
      novos,
      pulados,
      descartados,
      erros
    });
  }
}

const worker = new NewsWorker();
worker
  .init()
  .then(() => worker.run())
  .catch((error) => {
    logger.error('Fatal', { error: error.message });
    process.exit(1);
  });
