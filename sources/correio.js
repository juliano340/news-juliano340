const Parser = require('rss-parser');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');
const ai = require('../ai');

class CorreioSource {
  constructor() {
    this.name = 'Correio do Povo';
    this.parser = new Parser({
      timeout: config.REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }

  async fetch() {
    try {
      logger.info(`Buscando notícias do ${this.name}...`);
      
      const feed = await this.parser.parseURL(config.SOURCES.CORREIO.url);
      const posts = [];

      for (const item of feed.items.slice(0, config.MAX_POSTS_PER_SOURCE)) {
        try {
          const title = Utils.normalizeEncoding(item.title);
          const content = Utils.formatFullContent(item['content:encoded'] || item.content || item.summary || '', {
            onWarning: (reason, metadata) => {
              logger.warn(`Conteúdo malformado no ${this.name}`, {
                reason,
                url: item.link,
                ...metadata
              });
            }
          });
          
          const post = {
            title: title,
            date: Utils.formatDate(item.pubDate || item.isoDate),
            source: this.name,
            original_url: item.link,
            slug: Utils.generateSlug(title),
            content
          };

          let tags = Utils.extractTags(title, Utils.stripHtml(content), this.name);
          tags.push('rio-grande-do-sul');
          
          if (config.USE_AI) {
            const aiTags = await ai.suggestTags(title, content);
            if (aiTags) {
              tags = [...new Set([...tags, ...aiTags])].slice(0, 5);
            }
          }
          
          post.tags = tags;
          posts.push(post);
        } catch (itemError) {
          logger.warn(`Erro ao processar item do ${this.name}`, { error: itemError.message });
        }
      }

      logger.ok(`${posts.length} posts encontrados no ${this.name}`);
      return posts;
    } catch (error) {
      logger.error(`Erro ao buscar ${this.name}`, { error: error.message });
      return [];
    }
  }
}

module.exports = new CorreioSource();
