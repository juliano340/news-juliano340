const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const Utils = require('./utils');
const git = require('./git');

const g1 = require('./sources/g1');
const tecnoblog = require('./sources/tecnoblog');
const canaltech = require('./sources/canaltech');
const tecmundo = require('./sources/tecmundo');
const boredpanda = require('./sources/boredpanda');

class NewsWorker {
  constructor() {
    this.sources = [];

    if (config.SOURCES.G1.enabled) this.sources.push(g1);
    if (config.SOURCES.TECNOBLOG.enabled) this.sources.push(tecnoblog);
    if (config.SOURCES.CANALTECH.enabled) this.sources.push(canaltech);
    if (config.SOURCES.TECMUNDO.enabled) this.sources.push(tecmundo);
    if (config.SOURCES.BOREDPANDA.enabled) this.sources.push(boredpanda);

    this.slugs = new Set();
    this.urls = new Set();
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
      `slug: "${this.escapeYaml(post.slug)}"\n` +
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

    logger.ok('Salvo: ' + post.title);
    return true;
  }

  async run() {
    const start = Date.now();
    let novos = 0;
    let pulados = 0;
    let erros = 0;

    logger.info('Iniciando...');

    for (const source of this.sources) {
      try {
        const posts = await source.fetch();

        for (const post of posts) {
          try {
            if (await this.savePost(post)) novos += 1;
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

    if (novos > 0) {
      await git.commitAndPush('feat: ' + novos + ' posts');
    }

    logger.ok('Fim em ' + ((Date.now() - start) / 1000).toFixed(1) + 's', {
      novos,
      pulados,
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
