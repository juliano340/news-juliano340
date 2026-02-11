const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');

class TrendsSource {
  constructor() {
    this.name = 'Google Trends Brasil';
    this.url = 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=BR';
  }

  async fetch() {
    try {
      logger.info(`Buscando dados do ${this.name}...`);
      
      const response = await axios.get(this.url, {
        timeout: config.REQUEST_TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const posts = [];

      $('item').each((i, elem) => {
        if (i >= config.MAX_POSTS_PER_SOURCE) return false;
        
        try {
          const title = $(elem).find('title').text().trim();
          const traffic = $(elem).find('ht\\:approx_traffic').text() || 
                         $(elem).find('approx_traffic').text() || '';
          const pubDate = $(elem).find('pubDate').text();
          const link = $(elem).find('link').text();
          
          const content = traffic ? 
            `Tópico em alta com aproximadamente ${traffic} pesquisas.` : 
            'Tópico em alta no Google Trends Brasil.';
          
          const post = {
            title: `${title} - Em Alta no Google`,
            date: Utils.formatDate(pubDate),
            source: this.name,
            original_url: link || `https://trends.google.com/trends/explore?geo=BR&q=${encodeURIComponent(title)}`,
            slug: Utils.generateSlug(title),
            content: content,
            tags: ['trends', 'google', 'brasil', 'buscas', 'viral']
          };

          posts.push(post);
        } catch (itemError) {
          logger.warn(`Erro ao processar item do ${this.name}`, { error: itemError.message });
        }
      });

      logger.ok(`${posts.length} tópicos encontrados no ${this.name}`);
      return posts;
    } catch (error) {
      logger.error(`Erro ao buscar ${this.name}`, { error: error.message });
      return [];
    }
  }
}

module.exports = new TrendsSource();