const slugify = require('slugify');
const cheerio = require('cheerio');

class Utils {
  static normalizeUrl(url) {
    if (!url) return '';
    return String(url).trim().replace(/\s+/g, '');
  }

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

  static sanitizeHtml(html) {
    if (!html) return '';
    
    try {
      // Tags permitidas para formatação
      const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'];
      const allowedAttributes = {
        'a': ['href', 'title']
      };
      
      // Primeiro, limpar atributos de tags permitidas
      let cleaned = html;
      allowedTags.forEach(tag => {
        const attrs = allowedAttributes[tag] || [];
        if (tag === 'a' && attrs.length > 0) {
          // Para links, manter apenas href e title
          cleaned = cleaned.replace(
            new RegExp(`<${tag}\\b([^>]*)>`, 'gi'),
            (match, attributes) => {
              const href = attributes.match(/href=["']([^"']+)["']/i);
              const title = attributes.match(/title=["']([^"']+)["']/i);
              let newAttrs = '';
              if (href) newAttrs += ` href="${href[1]}"`;
              if (title) newAttrs += ` title="${title[1]}"`;
              return `<${tag}${newAttrs}>`;
            }
          );
        }
      });
      
      // Remover scripts e estilos completamente
      cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      
      // Tags perigosas para remover (manter conteúdo)
      const dangerousTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'];
      dangerousTags.forEach(tag => {
        cleaned = cleaned.replace(
          new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'),
          ''
        );
        cleaned = cleaned.replace(new RegExp(`<${tag}[^>]*\\/?>`, 'gi'), '');
      });
      
      return cleaned.trim();
    } catch (error) {
      return Utils.stripHtml(html);
    }
  }

  static formatFullContent(rawContent, options = {}) {
    if (!rawContent) return '';

    const onWarning = typeof options.onWarning === 'function' ? options.onWarning : null;
    const allowedTags = new Set([
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'a',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre'
    ]);

    const allowedAttributes = {
      a: ['href', 'title']
    };

    try {
      const $ = cheerio.load(String(rawContent), {
        decodeEntities: false,
        xmlMode: false
      });

      $('script,style,iframe,object,embed,form,input,button,textarea,noscript').remove();

      $('*').each((_, element) => {
        const tag = (element.tagName || '').toLowerCase();
        const node = $(element);

        if (!allowedTags.has(tag)) {
          node.replaceWith(node.contents());
          return;
        }

        const attrs = Object.keys(element.attribs || {});
        const allowed = allowedAttributes[tag] || [];

        for (const attr of attrs) {
          if (!allowed.includes(attr.toLowerCase())) {
            node.removeAttr(attr);
          }
        }

        if (tag === 'a') {
          const href = Utils.normalizeUrl(node.attr('href') || '');
          if (!href || !/^(https?:|mailto:)/i.test(href)) {
            node.removeAttr('href');
          } else {
            node.attr('href', href);
          }
        }
      });

      const bodyHtml = ($('body').html() || $.root().html() || '')
        .replace(/\r\n?/g, '\n')
        .replace(/\u00A0/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (onWarning && !bodyHtml) {
        onWarning('conteudo_vazio_apos_sanitizacao', {});
      }

      return bodyHtml;
    } catch (error) {
      if (onWarning) {
        onWarning('falha_sanitizacao_html', { error: error.message });
      }

      return Utils.sanitizeHtml(String(rawContent));
    }
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

  static normalizeTextPreserveParagraphs(text) {
    if (!text) return '';

    return Utils.tryFixMojibake(Utils.decodeHtmlEntities(String(text)))
      .normalize('NFC')
      .replace(/\u00A0/g, ' ')
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  static splitLongParagraph(text, options = {}) {
    const maxSentences = options.maxSentences || 3;
    const maxChars = options.maxChars || 420;
    const normalized = text.replace(/\s+/g, ' ').trim();

    if (!normalized) return [];

    const placeholders = [];
    const protectedText = normalized.replace(/\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s)]+/gi, (value) => {
      const key = `__URL_PLACEHOLDER_${placeholders.length}__`;
      placeholders.push(value);
      return key;
    });

    const sentences = protectedText.match(/[^.!?…]+(?:[.!?…]+["')\]]*)?|[^.!?…]+$/g) || [protectedText];
    const result = [];
    let current = '';
    let sentenceCount = 0;

    const restorePlaceholders = (input) =>
      placeholders.reduce((acc, value, index) => acc.replace(`__URL_PLACEHOLDER_${index}__`, value), input);

    for (const sentence of sentences) {
      const cleanSentence = sentence.replace(/\s+/g, ' ').trim();
      if (!cleanSentence) continue;

      const candidate = current ? `${current} ${cleanSentence}` : cleanSentence;
      const shouldFlush =
        (sentenceCount >= maxSentences && current.length >= 140) ||
        (candidate.length > maxChars && current.length >= 120);

      if (shouldFlush) {
        result.push(current);
        current = cleanSentence;
        sentenceCount = 1;
      } else {
        current = candidate;
        sentenceCount += 1;
      }
    }

    if (current) result.push(current);
    return result.map((paragraph) => restorePlaceholders(paragraph));
  }

  static extractInlineImages(html) {
    if (!html) return [];

    const images = [];
    const seen = new Set();
    const imageRegex = /<img\b([^>]*)>/gi;
    let match;

    while ((match = imageRegex.exec(html)) !== null) {
      const attrs = match[1] || '';
      const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      if (!srcMatch) continue;

      const src = Utils.normalizeUrl(srcMatch[1]);
      if (!src || seen.has(src)) continue;

      const altMatch = attrs.match(/\balt\s*=\s*["']([^"']*)["']/i);
      images.push({ src, alt: Utils.normalizeEncoding(altMatch ? altMatch[1] : '') });
      seen.add(src);
    }

    return images;
  }

  static formatArticleContent(rawContent, options = {}) {
    if (!rawContent) return '';

    const onWarning = typeof options.onWarning === 'function' ? options.onWarning : null;
    const heroImageUrl = Utils.normalizeUrl(options.heroImageUrl || '');
    let html = Utils.sanitizeHtml(String(rawContent));

    const openTagCount = (html.match(/</g) || []).length;
    const closeTagCount = (html.match(/>/g) || []).length;
    if (onWarning && Math.abs(openTagCount - closeTagCount) >= 3) {
      onWarning('html_malformado', { openTagCount, closeTagCount });
    }

    const inlineImages = Utils.extractInlineImages(html)
      .filter((img) => img.src && img.src !== heroImageUrl)
      .slice(0, 1);

    html = html.replace(/<img\b[^>]*>/gi, ' ');

    html = html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs, labelHtml) => {
      const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
      const href = hrefMatch ? Utils.normalizeUrl(hrefMatch[1]) : '';
      const label = Utils.stripHtml(labelHtml).replace(/\s+/g, ' ').trim();
      const safeLabel = label || href;

      if (!href) return safeLabel;
      return `[${safeLabel}](${href})`;
    });

    html = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|section|article|ul|ol|li|blockquote|h[1-6])>/gi, '\n\n')
      .replace(/<(p|div|section|article|ul|ol|li|blockquote|h[1-6])\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');

    const normalized = Utils.normalizeTextPreserveParagraphs(html)
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .trim();

    const blocks = normalized
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

    if (blocks.length === 0) {
      if (onWarning) onWarning('conteudo_vazio_apos_formatacao', {});
      return '';
    }

    const paragraphs = [];
    for (const block of blocks) {
      const split = Utils.splitLongParagraph(block);
      for (const part of split) {
        if (part) paragraphs.push(part);
      }
    }

    let content = paragraphs.join('\n\n').trim();

    if (inlineImages.length > 0 && content) {
      const imageMarkdown = inlineImages
        .map((img) => `![${img.alt || 'Imagem da notícia'}](${img.src})`)
        .join('\n\n');
      content = `${content}\n\n${imageMarkdown}`;
    }

    return content;
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
