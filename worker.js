const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const Utils = require('./utils');
const git = require('./git');

const g1 = require('./sources/g1');
const gzh = require('./sources/gzh');
const correio = require('./sources/correio');
const tecmundo = require('./sources/tecmundo');
const trends = require('./sources/trends');

class NewsWorker {
  constructor() {
    this.sources = [];
    if (config.SOURCES.G1.enabled) this.sources.push(g1);
    if (config.SOURCES.GZH.enabled) this.sources.push(gzh);
    if (config.SOURCES.CORREIO.enabled) this.sources.push(correio);
    if (config.SOURCES.TECMUNDO.enabled) this.sources.push(tecmundo);
    if (config.SOURCES.TRENDS.enabled) this.sources.push(trends);
    
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
      
      logger.info(`${this.existingSlugs.size} posts existentes carregados`);
    } catch (error) {
      logger.error('Erro ao carregar posts existentes', { error: error.message });
    }
  }

  isDuplicate(post) {
    if (this.existingSlugs.has(post.slug)) return true;
    if (this.existingUrls.has(post.original_url)) return true;
    if (this.existingUrls.has(Utils.generateSlug(post.title))) return true;
    return false;
  }

  generateMarkdown(post) {
    const tagsString = post.tags.map(tag => `"${tag}"`).join(', ');
    
    return `---
title: "${post.title.replace(/"/g, '\\"')}"
date: "${post.date}"
tags: [${tagsString}]
source: "${post.source}"
original_url: "${post.original_url}"
slug: "${post.slug}"
---

${post.content}
`;
  }

  async savePost(post) {
    try {
      if (this.isDuplicate(post)) {
        logger.skip(`Post já existe: ${post.title}`);
        return false;
      }

      const fileName = Utils.generateFileName(post.slug, new Date(post.date));
      const filePath = path.join(config.POSTS_PATH, fileName);
      const markdown = this.generateMarkdown(post);
      
      await fs.writeFile(filePath, markdown, 'utf8');
      
      this.existingSlugs.add(post.slug);
      this.existingUrls.add(post.original_url);
      
      logger.ok(`Post salvo: ${post.title}`);
      return true;
    } catch (error) {
      logger.error(`Erro ao salvar post: ${post.title}`, { error: error.message });
      return false;
    }
  }

  async run() {
    const startTime = Date.now();
    let totalNew = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    logger.info('Iniciando execução do News Worker');

    for (const source of this.sources) {
      try {
        const posts = await source.fetch();
        
        for (const post of posts) {
          try {
            const saved = await this.savePost(post);
            if (saved) {
              totalNew++;
            } else {
              totalSkipped++;
            }
          } catch (postError) {
            logger.error(`Erro ao processar post`, { 
              title: post.title, 
              error: postError.message 
            });
            totalErrors++;
          }
        }
        
        await Utils.sleep(1000);
      } catch (sourceError) {
        logger.error(`Erro na fonte ${source.name}`, { error: sourceError.message });
        totalErrors++;
      }
    }

    if (totalNew > 0) {
      const commitMessage = `feat: adiciona ${totalNew} novos posts - ${new Date().toISOString()}`;
      await git.commitAndPush(commitMessage);
    } else {
      logger.info('Nenhum post novo para commitar');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.ok(`Execução concluída em ${duration}s`, {
      novos: totalNew,
      ignorados: totalSkipped,
      erros: totalErrors
    });
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