const Parser = require('rss-parser');
const axios = require('axios');
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
      const candidateUrls = [
        config.SOURCES.GOOGLE_TECH.url,
        'https://blog.google/technology/rss/'
      ];

      let feed = null;

      for (const url of candidateUrls) {
        try {
          feed = await this.parser.parseURL(url);
        } catch {
          try {
            const response = await axios.get(url, {
              timeout: config.REQUEST_TIMEOUT,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
                'Accept-Encoding': 'identity'
              },
              responseType: 'text'
            });

            feed = await this.parser.parseString(response.data);
          } catch {
            feed = null;
          }
        }

        if (feed?.items?.length) break;
      }

      if (!feed?.items?.length) {
        throw new Error('Nenhum feed Google válido encontrado');
      }

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
      logger.error(`Erro ao buscar ${this.name}`, {
        error: error?.message || String(error),
        code: error?.code || '',
        status: error?.response?.status || null
      });
      return [];
    }
  }
}

module.exports = new GoogleTechSource();
