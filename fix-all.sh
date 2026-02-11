#!/bin/bash

# Script completo de atualização do News Worker

cd ~/projetos/news-worker

echo "🔄 Atualizando News Worker..."

# 1. Config.js
cat > config.js << 'CONFIGEOF'
require('dotenv').config();
const path = require('path');
module.exports = {
  CRON_FREQUENCY: '0 */2 * * *',
  USE_AI: false,
  OPENROUTER_KEY: '',
  REPO_PATH: path.resolve(__dirname),
  POSTS_PATH: path.resolve(__dirname, 'content/posts'),
  GIT_USER_NAME: 'News Worker',
  GIT_USER_EMAIL: 'worker@juliano340.com',
  MAX_POSTS_PER_SOURCE: 10,
  REQUEST_TIMEOUT: 30000,
  LOG_LEVEL: 'info',
  LOG_FILE: path.resolve(__dirname, 'logs/news-worker.log'),
  SOURCES: {
    G1: { enabled: true, url: 'https://g1.globo.com/dynamo/tecnologia/rss2.xml' },
    TECNOBLOG: { enabled: true, url: 'https://tecnoblog.net/feed/' },
    CANALTECH: { enabled: true, url: 'https://feeds.feedburner.com/canaltech/' },
    TECMUNDO: { enabled: true, url: 'https://www.tecmundo.com.br/feed/' },
    BOREDPANDA: { enabled: true, url: 'https://www.boredpanda.com/feed/' }
  }
};
CONFIGEOF

echo "✅ config.js"

# 2. Criar fonte Tecnoblog
cat > sources/tecnoblog.js << 'TECNOBLOG'
const Parser = require('rss-parser');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');

class TecnoblogSource {
  constructor() { this.name = 'Tecnoblog'; this.parser = new Parser({ timeout: config.REQUEST_TIMEOUT }); }
  async fetch() {
    try {
      logger.info('Buscando Tecnoblog...');
      const feed = await this.parser.parseURL(config.SOURCES.TECNOBLOG.url);
      return feed.items.slice(0, config.MAX_POSTS_PER_SOURCE).map(item => ({
        title: Utils.normalizeEncoding(item.title),
        date: Utils.formatDate(item.pubDate || item.isoDate),
        source: this.name,
        original_url: item.link,
        slug: Utils.generateSlug(item.title),
        content: Utils.truncateText(Utils.normalizeEncoding(Utils.stripHtml(item['content:encoded'] || item.content || item.summary || '')), 800),
        tags: Utils.extractTags(item.title, item.title, this.name)
      }));
    } catch (e) { logger.error('Erro Tecnoblog', { error: e.message }); return []; }
  }
}
module.exports = new TecnoblogSource();
TECNOBLOG

# 3. Criar fonte Canaltech
cat > sources/canaltech.js << 'CANALTECH'
const Parser = require('rss-parser');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');

class CanaltechSource {
  constructor() { this.name = 'Canaltech'; this.parser = new Parser({ timeout: config.REQUEST_TIMEOUT }); }
  async fetch() {
    try {
      logger.info('Buscando Canaltech...');
      const feed = await this.parser.parseURL(config.SOURCES.CANALTECH.url);
      return feed.items.slice(0, config.MAX_POSTS_PER_SOURCE).map(item => ({
        title: Utils.normalizeEncoding(item.title),
        date: Utils.formatDate(item.pubDate || item.isoDate),
        source: this.name,
        original_url: item.link,
        slug: Utils.generateSlug(item.title),
        content: Utils.truncateText(Utils.normalizeEncoding(Utils.stripHtml(item['content:encoded'] || item.content || item.summary || '')), 800),
        tags: Utils.extractTags(item.title, item.title, this.name)
      }));
    } catch (e) { logger.error('Erro Canaltech', { error: e.message }); return []; }
  }
}
module.exports = new CanaltechSource();
CANALTECH

# 4. Criar fonte BoredPanda
cat > sources/boredpanda.js << 'BOREDPANDA'
const Parser = require('rss-parser');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');

class BoredPandaSource {
  constructor() { this.name = 'Bored Panda'; this.parser = new Parser({ timeout: config.REQUEST_TIMEOUT }); }
  async fetch() {
    try {
      logger.info('Buscando Bored Panda...');
      const feed = await this.parser.parseURL(config.SOURCES.BOREDPANDA.url);
      return feed.items.slice(0, config.MAX_POSTS_PER_SOURCE).map(item => ({
        title: Utils.normalizeEncoding(item.title),
        date: Utils.formatDate(item.pubDate || item.isoDate),
        source: this.name,
        original_url: item.link,
        slug: Utils.generateSlug(item.title),
        content: Utils.truncateText(Utils.normalizeEncoding(Utils.stripHtml(item['content:encoded'] || item.content || item.summary || '')), 800),
        tags: Utils.extractTags(item.title, item.title, this.name)
      }));
    } catch (e) { logger.error('Erro BoredPanda', { error: e.message }); return []; }
  }
}
module.exports = new BoredPandaSource();
BOREDPANDA

# 5. Criar worker.js
cat > worker.js << 'WORKER'
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
    this.existingSlugs = new Set();
    this.existingUrls = new Set();
  }
  async init() {
    await logger.init();
    await git.init();
    await git.pull();
    await this.loadExistingPosts();
    logger.info('News Worker inicializado');
  }
  async loadExistingPosts() {
    try {
      const files = await fs.readdir(config.POSTS_PATH);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const c = await fs.readFile(path.join(config.POSTS_PATH, file), 'utf8');
          const s = c.match(/slug:\s*"([^"]+)"/);
          const u = c.match(/original_url:\s*"([^"]+)"/);
          const t = c.match(/title:\s*"([^"]+)"/);
          if (s) this.existingSlugs.add(s[1]);
          if (u) this.existingUrls.add(u[1]);
          if (t) this.existingUrls.add(Utils.generateSlug(t[1]));
        }
      }
    } catch (e) { logger.error('Erro loadPosts', { error: e.message }); }
  }
  isDuplicate(p) {
    return this.existingSlugs.has(p.slug) || this.existingUrls.has(p.original_url) || this.existingUrls.has(Utils.generateSlug(p.title));
  }
  async savePost(p) {
    if (this.isDuplicate(p)) { logger.skip('Já existe: ' + p.title); return false; }
    const fn = Utils.generateFileName(p.slug);
    await fs.writeFile(path.join(config.POSTS_PATH, fn), `---\ntitle: "${p.title}"\ndate: "${p.date}"\ntags: [${p.tags.map(t => `"${t}"`).join(', ')}]\nsource: "${p.source}"\noriginal_url: "${p.original_url}"\nslug: "${p.slug}"\n---\n\n${p.content}\n`, 'utf8');
    this.existingSlugs.add(p.slug);
    this.existingUrls.add(p.original_url);
    logger.ok('Salvo: ' + p.title);
    return true;
  }
  async run() {
    const start = Date.now();
    let novos = 0, pulados = 0, erros = 0;
    logger.info('Iniciando...');
    for (const src of this.sources) {
      try {
        const posts = await src.fetch();
        for (const p of posts) {
          try { novos += await this.savePost(p) ? 1 : (pulados++, 0); } catch (e) { logger.error('Erro post', { error: e.message }); erros++; }
        }
        await Utils.sleep(1000);
      } catch (e) { logger.error('Erro fonte ' + src.name, { error: e.message }); erros++; }
    }
    if (novos > 0) await git.commitAndPush('feat: ' + novos + ' novos posts');
    logger.ok('Concluído em ' + ((Date.now() - start) / 1000).toFixed(1) + 's', { novos, pulados, erros });
  }
}
new NewsWorker().init().then(() => new NewsWorker().run()).catch(e => { logger.error('Fatal', { error: e.message }); process.exit(1); });
WORKER

echo "✅ Tudo criado!"
echo ""
echo "🧪 Testando..."
node worker.js