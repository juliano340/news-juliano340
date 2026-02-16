const Parser = require('rss-parser');
const axios = require('axios');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');

class UolSource {
  constructor() {
    this.name = 'UOL Tecnologia';
    this.parser = new Parser(Utils.getRssParserOptions(config.REQUEST_TIMEOUT));
  }

  async fetch() {
    try {
      logger.info(`Buscando noticias do ${this.name}...`);
      let feed;

      try {
        feed = await this.parser.parseURL(config.SOURCES.UOL.url);
      } catch (_parseError) {
        const response = await axios.get(config.SOURCES.UOL.url, {
          timeout: config.REQUEST_TIMEOUT,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
            'Accept-Encoding': 'identity'
          },
          responseType: 'arraybuffer'
        });

        const rawBuffer = Buffer.from(response.data);
        const candidates = [rawBuffer.toString('latin1'), rawBuffer.toString('utf8')];

        let parsed = null;
        for (const xmlCandidate of candidates) {
          try {
            const sanitized = xmlCandidate.replace(/^[\uFEFF\u0000-\u001F]+/, '');
            parsed = await this.parser.parseString(sanitized);
            break;
          } catch {
            // tenta proximo decoding
          }
        }

        if (!parsed) {
          for (const xmlCandidate of candidates) {
            const manualItems = this.parseFeedManually(xmlCandidate);
            if (manualItems.length > 0) {
              parsed = { items: manualItems };
              break;
            }
          }
        }

        if (!parsed) throw new Error('Feed not recognized as RSS 1 or 2.');
        feed = parsed;
      }

      const posts = [];

      for (const item of feed.items.slice(0, config.MAX_POSTS_PER_SOURCE)) {
        const title = Utils.normalizeEncoding(item.title);
        const raw_content = item['content:encoded'] || item.content || item.summary || '';
        const image_url = Utils.extractFirstImageUrl(item);
        const resolvedDate = this.resolveItemDate(item.pubDate || item.isoDate);

        posts.push({
          title,
          date: Utils.formatDate(resolvedDate),
          published_at: Utils.formatDate(resolvedDate),
          source: this.name,
          source_name: this.name,
          source_url: config.SOURCES.UOL.url,
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

  parseFeedManually(xml) {
    const source = String(xml || '');
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;

    const extractTag = (input, tag) => {
      const cdataRegex = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i');
      const cdataMatch = input.match(cdataRegex);
      if (cdataMatch) return cdataMatch[1].trim();

      const plainRegex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const plainMatch = input.match(plainRegex);
      return plainMatch ? plainMatch[1].trim() : '';
    };

    let match;
    while ((match = itemRegex.exec(source)) !== null) {
      const block = match[1];
      const title = extractTag(block, 'title');
      const link = extractTag(block, 'link');
      const description = extractTag(block, 'description');
      const pubDate = extractTag(block, 'pubDate');

      if (!title || !link) continue;
      items.push({ title, link, description, pubDate });
    }

    return items;
  }

  resolveItemDate(value) {
    const raw = String(value || '').trim();
    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) return raw;

    const cleaned = raw.replace(/^[^,]+,\s*/i, '');
    const match = cleaned.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]{3})\s+(\d{4})\s+(\d{2}:\d{2}:\d{2})\s*([+-]\d{4})$/);
    if (!match) return new Date().toISOString();

    const [, dayRaw, monthRaw, year, time, tzRaw] = match;
    const monthMap = {
      jan: '01',
      fev: '02',
      mar: '03',
      abr: '04',
      mai: '05',
      jun: '06',
      jul: '07',
      ago: '08',
      set: '09',
      out: '10',
      nov: '11',
      dez: '12'
    };

    const normalizedMonth = monthRaw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const month = monthMap[normalizedMonth] || '01';
    const day = dayRaw.padStart(2, '0');
    const tz = `${tzRaw.slice(0, 3)}:${tzRaw.slice(3)}`;

    return `${year}-${month}-${day}T${time}${tz}`;
  }
}

module.exports = new UolSource();
