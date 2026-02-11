const Parser = require('rss-parser');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');

class GoogleTechSource {
  constructor() {
    this.name = 'Google Blog Brasil';
    this.parser = new Parser(
      Utils.getRssParserOptions(config.REQUEST_TIMEOUT, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      })
    );
  }

  async fetch() {
    try {
      logger.info(`Buscando notícias do ${this.name}...`);
      const feed = await this.parser.parseURL(config.SOURCES.GOOGLE_TECH.url);
      const posts = [];

      for (const item of feed.items.slice(0, config.MAX_POSTS_PER_SOURCE)) {
        try {
          const title = Utils.normalizeEncoding(item.title);
          const raw = item['content:encoded'] || item.content || item.summary || '';
          const content = Utils.truncateText(
            Utils.normalizeEncoding(Utils.stripHtml(raw)),
            4000
          );

          posts.push({
            title,
            date: Utils.formatDate(item.pubDate || item.isoDate),
            source: this.name,
            original_url: item.link,
            slug: Utils.generateSlug(title),
            content,
            image_url: Utils.extractFirstImageUrl(item),
            tags: Utils.extractTags(title, content, this.name)
          });
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

module.exports = new GoogleTechSource();
