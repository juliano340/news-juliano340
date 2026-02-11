const slugify = require('slugify');
const cheerio = require('cheerio');

class Utils {
  static tryFixMojibake(text) {
    if (!text || !/[ÃÂâ]/.test(text)) return text;

    const replacements = {
      'Ã¡': 'á',
      'Ã¢': 'â',
      'Ã£': 'ã',
      'Ã¤': 'ä',
      'Ãª': 'ê',
      'Ã©': 'é',
      'Ã¨': 'è',
      'Ã­': 'í',
      'Ã¬': 'ì',
      'Ã³': 'ó',
      'Ã´': 'ô',
      'Ãµ': 'õ',
      'Ã¶': 'ö',
      'Ãº': 'ú',
      'Ã¼': 'ü',
      'Ã§': 'ç',
      'Ã±': 'ñ',
      'Ã': 'Á',
      'Ã‚': 'Â',
      'Ãƒ': 'Ã',
      'Ã„': 'Ä',
      'ÃŠ': 'Ê',
      'Ã‰': 'É',
      'Ã': 'Í',
      'Ã“': 'Ó',
      'Ã”': 'Ô',
      'Ã•': 'Õ',
      'Ãš': 'Ú',
      'Ã‡': 'Ç',
      'â€™': '’',
      'â€œ': '“',
      'â€': '”',
      'â€“': '–',
      'â€”': '—',
      'â€¦': '...'
    };

    let fixed = text;
    for (const [from, to] of Object.entries(replacements)) {
      fixed = fixed.split(from).join(to);
    }

    return fixed;
  }

  static decodeHtmlEntities(text) {
    if (!text) return '';

    const namedEntities = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&hellip;': '...',
      '&mdash;': '—',
      '&ndash;': '–'
    };

    let output = text;

    for (const [entity, char] of Object.entries(namedEntities)) {
      output = output.replace(new RegExp(entity, 'g'), char);
    }

    output = output
      .replace(/&#(\d+);/g, (match, code) => {
        const value = Number(code);
        if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) return match;
        return String.fromCodePoint(value);
      })
      .replace(/&#x([0-9a-f]+);/gi, (match, code) => {
        const value = parseInt(code, 16);
        if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) return match;
        return String.fromCodePoint(value);
      });

    return output;
  }

  static generateSlug(title) {
    return slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
  }

  static generateFileName(slug, date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    return `${dateStr}-${slug}.md`;
  }

  static stripHtml(html) {
    if (!html) return '';
    const $ = cheerio.load(html);
    return $.text().trim();
  }

  static getRssParserOptions(timeout, headers = {}) {
    return {
      timeout,
      headers,
      customFields: {
        item: [
          ['media:content', 'mediaContent', { keepArray: true }],
          ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
          ['enclosure', 'enclosure', { keepArray: true }]
        ]
      }
    };
  }

  static extractFirstImageUrl(item) {
    if (!item) return '';

    const html = item['content:encoded'] || item.content || item.summary || '';
    if (html) {
      try {
        const $ = cheerio.load(html);
        const img = $('img').first();
        const src = img.attr('src') || img.attr('data-src');
        if (src && /^https?:\/\//i.test(src)) return Utils.normalizeEncoding(src);
      } catch {
        // noop
      }
    }

    const mediaCandidates = [
      ...(Array.isArray(item.mediaContent) ? item.mediaContent : []),
      ...(Array.isArray(item.mediaThumbnail) ? item.mediaThumbnail : []),
      ...(Array.isArray(item.enclosure) ? item.enclosure : [])
    ];

    for (const candidate of mediaCandidates) {
      const url = candidate?.$?.url || candidate?.url || candidate?.$?.href || candidate?.href;
      if (url && /^https?:\/\//i.test(url)) return Utils.normalizeEncoding(url);
    }

    return '';
  }

  static truncateText(text, maxLength = 500) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  static normalizeEncoding(text) {
    if (!text) return '';

    const decoded = Utils.decodeHtmlEntities(String(text));

    return Utils.tryFixMojibake(decoded)
      .normalize('NFC')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static extractTags(title, content, source) {
    const tags = new Set();
    const text = `${title} ${content}`.toLowerCase();
    
    const tagRules = {
      tecnologia: ['tecnologia', 'tech', 'digital', 'software', 'app', 'aplicativo', 'internet', 'celular', 'smartphone'],
      negocios: ['negocio', 'empresa', 'mercado', 'economia', 'financas', 'startup', 'dinheiro', 'investimento'],
      ciencia: ['ciencia', 'pesquisa', 'estudo', 'cientista', 'laboratorio', 'descoberta'],
      saude: ['saude', 'bem-estar', 'medico', 'hospital', 'doenca', 'vacina', 'tratamento'],
      politica: ['politica', 'governo', 'presidente', 'congresso', 'eleicao', 'ministro'],
      esporte: ['esporte', 'futebol', 'basquete', 'olimpiada', 'atleta', 'jogo', 'campeonato'],
      entretenimento: ['cinema', 'musica', 'serie', 'filme', 'celebridade', 'show', 'tv', 'streaming'],
      educacao: ['educacao', 'escola', 'universidade', 'aluno', 'professor', 'curso', 'ensino'],
      seguranca: ['seguranca', 'hacker', 'virus', 'golpe', 'fraude', 'privacidade', 'senha'],
      inovacao: ['inovacao', 'futuro', 'tendencia', 'disrupcao', 'transformacao', 'revolucao']
    };

    for (const [tag, keywords] of Object.entries(tagRules)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        tags.add(tag);
      }
    }

    if (source) {
      tags.add(source.toLowerCase().replace(/\s+/g, '-'));
    }

    return Array.from(tags).slice(0, 5);
  }

  static formatDate(date) {
    if (!date) return new Date().toISOString();
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toISOString();
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Utils;
