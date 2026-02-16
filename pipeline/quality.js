const config = require('../config');

class QualityGate {
  requiredSections() {
    return [
      '## Resumo em 3 bullets',
      '## Contexto',
      '## O que muda na pratica',
      '## Checklist pratico',
      '## O que observar nos proximos dias',
      '## FAQ',
      '## Fonte e transparencia'
    ];
  }

  paragraphCount(text) {
    return String(text || '')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean).length;
  }

  countSummaryBullets(content) {
    const match = content.match(/## Resumo em 3 bullets\n([\s\S]*?)(\n## |$)/);
    if (!match) return 0;
    return (match[1].match(/^\s*-\s+/gm) || []).length;
  }

  sectionText(content, heading) {
    const safeHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${safeHeading}\\n([\\s\\S]*?)(\\n## |$)`);
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  }

  countSectionBullets(content, heading) {
    const section = this.sectionText(content, heading);
    if (!section) return 0;
    return (section.match(/^\s*-\s+/gm) || []).length;
  }

  countFaqQuestions(content) {
    const section = this.sectionText(content, '## FAQ');
    if (!section) return 0;
    return (section.match(/^\s*###\s+/gm) || []).length;
  }

  countWords(content) {
    return String(content || '')
      .replace(/`[^`]*`/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[#>*_\-]/g, ' ')
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean).length;
  }

  hasPlaceholderTerms(content) {
    const regex = /\b(topico\s*\d+|todo|lorem ipsum|placeholder|sem dados)\b/i;
    return regex.test(content || '');
  }

  hasVaguePhrasesWithoutReason(content) {
    const paragraphs = String(content || '')
      .split(/\n\s*\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    const vagueRegex = /(isso e importante|pode mudar tudo|impacta o mercado)/i;
    const reasonRegex = /(porque|pois|devido|ja que)/i;

    return paragraphs.some((paragraph) => vagueRegex.test(paragraph) && !reasonRegex.test(paragraph));
  }

  countInternalLinks(content) {
    const links = String(content || '').match(/\[[^\]]+\]\(([^)]+)\)/g) || [];
    let count = 0;
    for (const link of links) {
      const hrefMatch = link.match(/\(([^)]+)\)/);
      const href = hrefMatch ? hrefMatch[1] : '';
      if (/^\/(posts|tags|topics)\//.test(href) || /^https?:\/\/news\.juliano340\.com\/(posts|tags|topics)\//.test(href)) {
        count += 1;
      }
    }
    return count;
  }

  hasExternalSourceLink(content, primarySource) {
    if (!primarySource || !/^https?:\/\//i.test(primarySource)) return false;
    if (String(content || '').includes(primarySource)) return true;
    const escaped = primarySource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\([^)]*${escaped}[^)]*\\)`, 'i').test(content || '');
  }

  hasSemanticMismatch(post, content) {
    const title = String(post.title || '').toLowerCase();
    const body = String(content || '').toLowerCase();
    const entertainmentSignals = ['ator', 'atriz', 'filme', 'serie', 'trailer', 'oscar', 'celebridade', 'curiosidades', 'cinema'];
    const devSignals = ['backlog', 'roadmap', 'time de engenharia', 'lead time', 'pipeline', 'deploy', 'arquitetura', 'governanca de ia'];

    const titleLooksEntertainment = entertainmentSignals.some((signal) => title.includes(signal));
    const devCount = devSignals.filter((signal) => body.includes(signal)).length;
    const bodyHasEntertainment = entertainmentSignals.some((signal) => body.includes(signal));

    return titleLooksEntertainment && devCount >= 2 && !bodyHasEntertainment;
  }

  evaluate(post, editorial) {
    const reasons = [];
    const warnings = [];
    const checks = [];
    let score = 0;
    const content = editorial.content || '';
    const limits = config.QUALITY_LIMITS;
    const registerCheck = (id, passed, level, reason, details = {}) => {
      if (passed) score += 1;
      else {
        if (level === 'BLOCK') reasons.push(reason);
        if (level === 'WARN') warnings.push(reason);
      }
      checks.push({ id, status: passed ? 'PASS' : 'FAIL', level, reason, ...details });
    };

    const hasAllSections = this.requiredSections().every((section) => content.includes(section));
    registerCheck('sections', hasAllSections, 'BLOCK', 'secoes_obrigatorias_ausentes');

    const bullets = this.countSummaryBullets(content);
    registerCheck('summary_bullets', bullets >= limits.summary_bullets, 'BLOCK', 'resumo_sem_3_bullets', {
      bullets,
      min: limits.summary_bullets
    });

    const watchBullets = this.countSectionBullets(content, '## O que observar nos proximos dias');
    registerCheck('watch_bullets', watchBullets >= 3 && watchBullets <= 5, 'BLOCK', 'observacao_sem_3_a_5_bullets', {
      bullets: watchBullets
    });

    const faqCount = this.countFaqQuestions(content);
    registerCheck('faq_count', faqCount >= 3, 'BLOCK', 'faq_com_menos_de_3_perguntas', {
      count: faqCount
    });

    const hasPrimarySource = editorial.primary_source && /^https?:\/\//i.test(editorial.primary_source);
    registerCheck('primary_source', hasPrimarySource, 'BLOCK', 'fonte_primaria_invalida');

    const words = this.countWords(content);
    registerCheck('min_words', words >= limits.min_word_count, 'BLOCK', 'conteudo_curto', {
      words,
      min: limits.min_word_count
    });

    const paragraphCount = this.paragraphCount(content);
    registerCheck('paragraphs', paragraphCount >= 5, 'BLOCK', 'estrutura_com_poucos_paragrafos', {
      paragraphs: paragraphCount,
      min: 5
    });

    const hasPlaceholderTerms = this.hasPlaceholderTerms(content);
    registerCheck('placeholder_terms', !hasPlaceholderTerms, 'BLOCK', 'placeholder_detectado');

    const hasVagueParagraph = this.hasVaguePhrasesWithoutReason(content);
    registerCheck('vague_phrases', !hasVagueParagraph, 'BLOCK', 'frase_generica_sem_justificativa');

    const sourceInBody = this.hasExternalSourceLink(content, editorial.primary_source);
    registerCheck('source_link_in_body', sourceInBody, 'BLOCK', 'fonte_primaria_ausente_no_corpo');

    const semanticMismatch = this.hasSemanticMismatch(post, content);
    registerCheck('semantic_alignment', !semanticMismatch, 'BLOCK', 'desalinhamento_semantico_titulo_corpo');

    const internalLinks = this.countInternalLinks(content);
    registerCheck('internal_links', internalLinks >= limits.min_internal_links, 'WARN', 'poucos_links_internos', {
      links: internalLinks,
      min: limits.min_internal_links
    });

    const totalChecks = checks.length || 1;
    const percentageScore = Math.round((score / totalChecks) * 100);
    const hasBlockFailure = checks.some((check) => check.level === 'BLOCK' && check.status === 'FAIL');
    const status = hasBlockFailure ? 'BLOCK' : warnings.length > 0 ? 'WARN' : 'PASS';
    const passed = status !== 'BLOCK';

    return {
      score: percentageScore,
      status,
      passed,
      reasons,
      warnings,
      threshold: 100,
      shouldDiscard: config.EDITORIAL_AUTO_DISCARD && status === 'BLOCK',
      policy: config.EDITORIAL_AUTO_DISCARD ? 'auto_discard' : 'manual_review',
      source: post.source,
      checks
    };
  }
}

module.exports = new QualityGate();
