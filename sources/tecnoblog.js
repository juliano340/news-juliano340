const Parser = require('rss-parser');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');

class TecnoblogSource {
  constructor() {
    this.name = 'Tecnoblog';
    this.parser = new Parser(Utils.getRssParserOptions(config.REQUEST_TIMEOUT));
  }

  async fetch() {
    try {
      logger.info(`Buscando notícias do ${this.name}...`);
      const feed = await this.parser.parseURL(config.SOURCES.TECNOBLOG.url);

      return feed.items.slice(0, config.MAX_POSTS_PER_SOURCE).map((item) => {
        const title = Utils.normalizeEncoding(item.title);
        const raw = item['content:encoded'] || item.content || item.summary || '';
        const image_url = Utils.extractFirstImageUrl(item);
        const content = Utils.formatFullContent(raw, {
          heroImageUrl: image_url,
          onWarning: (reason, metadata) => {
            logger.warn(`Conteúdo malformado no ${this.name}`, {
              reason,
              url: item.link,
              ...metadata
            });
          }
        });

        return {
          title,
          date: Utils.formatDate(item.pubDate || item.isoDate),
          source: this.name,
          original_url: item.link,
          slug: Utils.generateSlug(title),
          content,
          image_url,
          tags: Utils.extractTags(title, Utils.stripHtml(content), this.name)
        };
      });
    } catch (error) {
      logger.error(`Erro ao buscar ${this.name}`, { error: error.message });
      return [];
    }
  }
}

module.exports = new TecnoblogSource();
