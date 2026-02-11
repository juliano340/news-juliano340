#!/bin/bash

# Script de atualização das fontes RSS - News Worker

echo "🔄 Atualizando News Worker com novas fontes..."

cd ~/projetos/news-worker

# 1. Atualizar config.js
cat > config.js << 'CONFIGEOF'
require('dotenv').config();
const path = require('path');
module.exports = {
  CRON_FREQUENCY: process.env.CRON_FREQUENCY || '0 */2 * * *',
  USE_AI: process.env.USE_AI === 'true' || false,
  OPENROUTER_KEY: process.env.OPENROUTER_KEY || '',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
  REPO_PATH: process.env.REPO_PATH || path.resolve(__dirname),
  POSTS_PATH: process.env.POSTS_PATH || path.resolve(__dirname, 'content/posts'),
  GIT_USER_NAME: process.env.GIT_USER_NAME || 'News Worker',
  GIT_USER_EMAIL: process.env.GIT_USER_EMAIL || 'worker@juliano340.com',
  MAX_POSTS_PER_SOURCE: parseInt(process.env.MAX_POSTS_PER_SOURCE) || 10,
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || path.resolve(__dirname, 'logs/news-worker.log'),
  SOURCES: {
    G1: { enabled: true, url: 'https://g1.globo.com/dynamo/tecnologia/rss2.xml' },
    TECNOBLOG: { enabled: true, url: 'https://tecnoblog.net/feed/' },
    CANALTECH: { enabled: true, url: 'https://feeds.feedburner.com/canaltech/' },
    TECMUNDO: { enabled: true, url: 'https://www.tecmundo.com.br/feed/' },
    BOREDPANDA: { enabled: true, url: 'https://www.boredpanda.com/feed/' }
  }
};
CONFIGEOF

echo "✅ config.js atualizado"

# 2. Criar fontes
cat > sources/tecnoblog.js << 'TECNOBLOG'
const Parser = require('rss-parser');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');
const ai = require('../ai');

class TecnoblogSource {
  constructor() {
    this.name = 'Tecnoblog';
    this.parser = new Parser({ timeout: config.REQUEST_TIMEOUT, headers: { 'User-Agent': 'Mozilla/5.0' } });
  }
  async fetch() {
    try {
      logger.info('Buscando notícias do Tecnoblog...');
      const feed = await this.parser.parseURL(config.SOURCES.TECNOBLOG.url);
      const posts = [];
      for (const item of feed.items.slice(0, config.MAX_POSTS_PER_SOURCE)) {
        try {
          const title = Utils.normalizeEncoding(item.title);
          const content = Utils.normalizeEncoding(Utils.stripHtml(item['content:encoded'] || item.content || item.summary || ''));
          const post = {
            title, date: Utils.formatDate(item.pubDate || item.isoDate),
            source: this.name, original_url: item.link,
            slug: Utils.generateSlug(title),
            content: Utils.truncateText(content, 800),
            tags: Utils.extractTags(title, content, this.name)
          };
          posts.push(post);
        } catch (e) { logger.warn('Erro ao processar item', { error: e.message }); }
      }
      logger.ok(`${posts.length} posts encontrados no Tecnoblog`);
      return posts;
    } catch (error) {
      logger.error('Erro ao buscar Tecnoblog', { error: error.message });
      return [];
    }
  }
}
module.exports = new TecnoblogSource();
TECNOBLOG

cat > sources/canaltech.js << 'CANALTECH'
const Parser = require('rss-parser');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');

class CanaltechSource {
  constructor() {
    this.name = 'Canaltech';
    this.parser = new Parser({ timeout: config.REQUEST_TIMEOUT, headers: { 'User-Agent': 'Mozilla/5.0' } });
  }
  async fetch() {
    try {
      logger.info('Buscando notícias do Canaltech...');
      const feed = await this.parser.parseURL(config.SOURCES.CANALTECH.url);
      const posts = [];
      for (const item of feed.items.slice(0, config.MAX_POSTS_PER_SOURCE)) {
        try {
          const title = Utils.normalizeEncoding(item.title);
          const content = Utils.normalizeEncoding(Utils.stripHtml(item['content:encoded'] || item.content || item.summary || ''));
          const post = {
            title, date: Utils.formatDate(item.pubDate || item.isoDate),
            source: this.name, original_url: item.link,
            slug: Utils.generateSlug(title),
            content: Utils.truncateText(content, 800),
            tags: Utils.extractTags(title, content, this.name)
          };
          posts.push(post);
        } catch (e) { logger.warn('Erro ao processar item', { error: e.message }); }
      }
      logger.ok(`${posts.length} posts encontrados no Canaltech`);
      return posts;
    } catch (error) {
      logger.error('Erro ao buscar Canaltech', { error: error.message });
      return [];
    }
  }
}
module.exports = new CanaltechSource();
CANALTECH

cat > sources/boredpanda.js << 'BOREDPANDA'
const Parser = require('rss-parser');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');

class BoredPandaSource {
  constructor() {
    this.name = 'Bored Panda';
    this.parser = new Parser({ timeout: config.REQUEST_TIMEOUT, headers: { 'User-Agent': 'Mozilla/5.0' } });
  }
  async fetch() {
    try {
      logger.info('Buscando notícias do Bored Panda...');
      const feed = await this.parser.parseURL(config.SOURCES.BOREDPANDA.url);
      const posts = [];
      for (const item of feed.items.slice(0, config.MAX_POSTS_PER_SOURCE)) {
        try {
          const title = Utils.normalizeEncoding(item.title);
          const content = Utils.normalizeEncoding(Utils.stripHtml(item['content:encoded'] || item.content || item.summary || ''));
          const post = {
            title, date: Utils.formatDate(item.pubDate || item.isoDate),
            source: this.name, original_url: item.link,
            slug: Utils.generateSlug(title),
            content: Utils.truncateText(content, 800),
            tags: Utils.extractTags(title, content, this.name)
          };
          posts.push(post);
        } catch (e) { logger.warn('Erro ao processar item', { error: e.message }); }
      }
      logger.ok(`${posts.length} posts encontrados no Bored Panda`);
      return posts;
    } catch (error) {
      logger.error('Erro ao buscar Bored Panda', { error: error.message });
      return [];
    }
  }
}
module.exports = new BoredPandaSource();
BOREDPANDA

echo "✅ Fontes criadas"

# 3. Atualizar worker.js para usar novas fontes
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
      await fs.mkdir(config.POSTS_PATH, { recursive: true });
      const files = await fs.readdir(config.POSTS_PATH);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(config.POSTS_PATH, file), 'utf8');
          const slugMatch = content.match(/slug:\s*"([^"]+)"/);
          const urlMatch = content.match(/original_url:\s*"([^"]+)"/);
          const titleMatch = content.match(/title:\s*"([^"]+)"/);
          if (slugMatch) this.existingSlugs.add(slugMatch[1]);
          if (urlMatch) this.existingUrls.add(urlMatch[1]);
          if (titleMatch) this.existingUrls.add(Utils.generateSlug(titleMatch[1]));
        }
      }
      logger.info(\`\${this.existingSlugs.size} posts existentes carregados\`);
    } catch (error) {
      logger.error('Erro ao carregar posts existentes', { error: error.message });
    }
  }
  isDuplicate(post) {
    return this.existingSlugs.has(post.slug) || this.existingUrls.has(post.original_url) || this.existingUrls.has(Utils.generateSlug(post.title));
  }
  generateMarkdown(post) {
    return \`---
title: "\${post.title.replace(/"/g, '\\\\"')}"
date: "\${post.date}"
tags: [\${post.tags.map(tag => \`"\${tag}"\`).join(', ')}]
source: "\${post.source}"
original_url: "\${post.original_url}"
slug: "\${post.slug}"
---

\${post.content}
\`;
  }
  async savePost(post) {
    try {
      if (this.isDuplicate(post)) {
        logger.skip(\`Post já existe: \${post.title}\`);
        return false;
      }
      const fileName = Utils.generateFileName(post.slug, new Date(post.date));
      const filePath = path.join(config.POSTS_PATH, fileName);
      await fs.writeFile(filePath, this.generateMarkdown(post), 'utf8');
      this.existingSlugs.add(post.slug);
      this.existingUrls.add(post.original_url);
      logger.ok(\`Post salvo: \${post.title}\`);
      return true;
    } catch (error) {
      logger.error(\`Erro ao salvar post: \${post.title}\`, { error: error.message });
      return false;
    }
  }
  async run() {
    const startTime = Date.now();
    let totalNew = 0, totalSkipped = 0, totalErrors = 0;
    logger.info('Iniciando execução do News Worker');
    for (const source of this.sources) {
      try {
        const posts = await source.fetch();
        for (const post of posts) {
          try {
            const saved = await this.savePost(post);
            if (saved) totalNew++; else totalSkipped++;
          } catch (postError) {
            logger.error('Erro ao processar post', { title: post.title, error: postError.message });
            totalErrors++;
          }
        }
        await Utils.sleep(1000);
      } catch (sourceError) {
        logger.error(\`Erro na fonte \${source.name}\`, { error: sourceError.message });
        totalErrors++;
      }
    }
    if (totalNew > 0) {
      await git.commitAndPush(\`feat: adiciona \${totalNew} novos posts - \${new Date().toISOString()}\`);
    }
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.ok(\`Execução concluída em \${duration}s\`, { novos: totalNew, ignorados: totalSkipped, erros: totalErrors });
  }
}
async function main() {
  const worker = new NewsWorker();
  await worker.init();
  await worker.run();
}
main().catch(error => {
  logger.error('Erro fatal no worker', { error: error.message });
  process.exit(1);
});
WORKER

echo "✅ worker.js atualizado"
echo ""
echo "🧪 Testando..."
node worker.js