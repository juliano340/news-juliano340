const Parser = require('rss-parser');
const axios = require('axios');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');
const ai = require('../ai');

class G1Source {
  constructor() {
    this.name = 'G1 Tecnologia';
    this.parser = new Parser(
      Utils.getRssParserOptions(config.REQUEST_TIMEOUT, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      })
    );
  }

  async fetch() {
    try {
      logger.info(`Buscando notícias do ${this.name}...`);

      let feed;
      try {
        feed = await this.parser.parseURL(config.SOURCES.G1.url);
      } catch (parseError) {
        if (!parseError.message.includes('Non-whitespace before first tag')) throw parseError;

        const response = await axios.get(config.SOURCES.G1.url, {
          timeout: config.REQUEST_TIMEOUT,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
            'Accept-Encoding': 'identity'
          },
          responseType: 'text'
        });

        feed = await this.parser.parseString(response.data);
      }

      const posts = [];

      for (const item of feed.items) {
        if (posts.length >= config.MAX_POSTS_PER_SOURCE) break;

        try {
          const itemUrl = new URL(item.link);
          if (!itemUrl.pathname.startsWith('/tecnologia/')) {
            logger.skip(`Fora de tecnologia no ${this.name}: ${item.link}`);
            continue;
          }

          const image_url = Utils.extractFirstImageUrl(item);
          const title = Utils.normalizeEncoding(item.title);
          const content = Utils.formatFullContent(item['content:encoded'] || item.content || item.summary || '', {
            heroImageUrl: image_url,
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
            content,
            image_url
          };

          let tags = Utils.extractTags(title, Utils.stripHtml(content), this.name);
          
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

module.exports = new G1Source();
