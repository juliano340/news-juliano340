const Parser = require('rss-parser');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');

class CanaltechSource {
  constructor() {
    this.name = 'Canaltech';
    this.parser = new Parser(Utils.getRssParserOptions(config.REQUEST_TIMEOUT));
  }

  async fetch() {
    try {
      logger.info(`Buscando notícias do ${this.name}...`);
      const feed = await this.parser.parseURL(config.SOURCES.CANALTECH.url);

      const posts = [];

      for (const item of feed.items.slice(0, config.MAX_POSTS_PER_SOURCE)) {
        const title = Utils.normalizeEncoding(item.title);
        const raw_content = item['content:encoded'] || item.content || item.summary || '';
        const image_url = Utils.extractFirstImageUrl(item);

        posts.push({
          title,
          date: Utils.formatDate(item.pubDate || item.isoDate),
          published_at: Utils.formatDate(item.pubDate || item.isoDate),
          source: this.name,
          source_name: this.name,
          source_url: config.SOURCES.CANALTECH.url,
          original_url: item.link,
          slug: Utils.generateSlug(title),
          raw_content,
          image_url,
          tags: Utils.extractTags(title, Utils.stripHtml(raw_content), this.name)
        });
      }

      return posts;
    } catch (error) {
      logger.error(`Erro ao buscar ${this.name}`, { error: error.message });
      return [];
    }
  }
}

module.exports = new CanaltechSource();
