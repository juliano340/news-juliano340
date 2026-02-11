const slugify = require('slugify');
const cheerio = require('cheerio');

class Utils {
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

  static truncateText(text, maxLength = 500) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  static normalizeEncoding(text) {
    if (!text) return '';
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&hellip;/g, '...')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
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