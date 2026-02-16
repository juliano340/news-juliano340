const config = require('../config');

class QualityGate {
  requiredSections(postType = 'standard') {
    if (postType === 'job_roundup') {
      return [
        '## Resumo em 3 bullets',
        '## Como usar esta lista',
        '## Destaques rapidos',
        '## Checklist de candidatura',
        '## O que observar nos proximos dias',
        '## FAQ',
        '## Fonte e transparencia'
      ];
    }

    return [
      '## Resumo em 3 bullets',
      '## Contexto',
      '## Insights e implicacoes',
      '## O que fazer agora',
      '## O que vale acompanhar',
      '## Fonte e transparencia'
    ];
  }

  normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  hasSectionHeading(content, headings) {
    const normalizedContent = this.normalizeText(content);
    const options = Array.isArray(headings) ? headings : [headings];
    return options.some((heading) => normalizedContent.includes(this.normalizeText(heading)));
  }

  countSectionBulletsAny(content, headings) {
    const options = Array.isArray(headings) ? headings : [headings];
    for (const heading of options) {
      const count = this.countSectionBullets(content, heading);
      if (count > 0) return count;
    }
    return 0;
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
    const regex = /\b(topico\s*\d+|todo|lorem ipsum|sem dados)\b/i;
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

  hasTruncatedBullets(content) {
    return /^\s*-\s+.*\.\.\.\s*$/gm.test(String(content || ''));
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

  hasForcedIABias(post, content) {
    const domain = String(post.domain || '').toLowerCase();
    if (!domain || domain === 'ia-dev') return false;

    const body = String(content || '').toLowerCase();
    const forcedSignals = [
      'governanca de implementacao',
      'programas que dependem de modelos generativos',
      'mapear onde o produto depende de um unico provedor de modelo',
      'rever arquitetura, custo, risco e governanca',
      'times que usam ia no dia a dia'
    ];

    return forcedSignals.some((signal) => body.includes(signal));
  }

  hasJobRoundupBoilerplate(content) {
    const text = String(content || '').toLowerCase();
    const forbidden = [
      'movimentacao do mercado sinaliza',
      'posicionamento no setor',
      'movimentos de concorrentes',
      'resultados financeiros',
      'mudancas regulatorias'
    ];
    return forbidden.some((term) => text.includes(term));
  }

  countHighlightsBullets(content) {
    return this.countSectionBullets(content, '## Destaques rapidos');
  }

  countHighlightsExamples(content) {
    const section = this.sectionText(content, '## Destaques rapidos');
    if (!section) return 0;
    return (section.match(/ex\.:/gi) || []).length;
  }

  sectionSimilarity(content, headingA, headingB) {
    const a = this.sectionText(content, headingA).toLowerCase().replace(/\s+/g, ' ').trim();
    const b = this.sectionText(content, headingB).toLowerCase().replace(/\s+/g, ' ').trim();
    if (!a || !b) return 0;
    if (a === b) return 1;

    const tokensA = new Set(a.split(' ').filter(Boolean));
    const tokensB = new Set(b.split(' ').filter(Boolean));
    let intersection = 0;
    for (const token of tokensA) {
      if (tokensB.has(token)) intersection += 1;
    }
    const union = new Set([...tokensA, ...tokensB]).size || 1;
    return intersection / union;
  }

  evaluate(post, editorial) {
    const reasons = [];
    const warnings = [];
    const checks = [];
    let score = 0;
    const postType = String(post.post_type || editorial.post_type || 'standard').toLowerCase();
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

    const requiredGroups = postType === 'job_roundup'
      ? [
        ['## Resumo em 3 bullets'],
        ['## Como usar esta lista', '## Como usar a lista'],
        ['## Destaques rapidos', '## Destaques da lista'],
        ['## Checklist de candidatura', '## Checklist pratico de candidatura'],
        ['## O que observar nos proximos dias', '## O que vale acompanhar nos proximos dias', '## O que vale acompanhar'],
        ['## FAQ'],
        ['## Fonte e transparencia']
      ]
      : this.requiredSections(postType).map((section) => [section]);

    const hasAllSections = requiredGroups.every((group) => this.hasSectionHeading(content, group));
    registerCheck('sections', hasAllSections, 'BLOCK', 'secoes_obrigatorias_ausentes');

    const bullets = this.countSummaryBullets(content);
    registerCheck('summary_bullets', bullets >= limits.summary_bullets, 'BLOCK', 'resumo_sem_3_bullets', {
      bullets,
      min: limits.summary_bullets
    });

    const watchHeading = postType === 'job_roundup'
      ? ['## O que observar nos proximos dias', '## O que vale acompanhar nos proximos dias', '## O que vale acompanhar']
      : ['## O que vale acompanhar'];
    const watchBullets = this.countSectionBulletsAny(content, watchHeading);
    const watchLevel = postType === 'job_roundup' ? 'WARN' : 'BLOCK';
    registerCheck('watch_bullets', watchBullets >= 3 && watchBullets <= 6, watchLevel, 'observacao_sem_3_a_5_bullets', {
      bullets: watchBullets
    });

    if (postType === 'job_roundup') {
      const faqCount = this.countFaqQuestions(content);
      registerCheck('faq_count', faqCount >= 4, 'BLOCK', 'faq_job_roundup_insuficiente', {
        count: faqCount,
        min: 4
      });

      const duplicated = this.sectionSimilarity(content, '## O que fazer agora', '## Checklist de candidatura') >= 0.85;
      registerCheck('non_duplicate_sections', !duplicated, 'BLOCK', 'secoes_duplicadas');

      const hasBoilerplate = this.hasJobRoundupBoilerplate(content);
      registerCheck('job_roundup_boilerplate', !hasBoilerplate, 'BLOCK', 'boilerplate_inadequado_para_job_roundup');

      const highlightsBullets = this.countHighlightsBullets(content);
      registerCheck('job_roundup_highlights_count', highlightsBullets >= 6, 'WARN', 'destaques_insuficientes_no_job_roundup', {
        count: highlightsBullets,
        min: 6
      });

      const highlightsExamples = this.countHighlightsExamples(content);
      registerCheck('job_roundup_highlights_examples', highlightsExamples >= 3, 'WARN', 'destaques_sem_exemplos_suficientes', {
        count: highlightsExamples,
        min: 3
      });
    }

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

    const truncatedBullets = this.hasTruncatedBullets(content);
    registerCheck('truncated_bullets', !truncatedBullets, 'BLOCK', 'bullet_truncado_com_reticencias');

    const sourceInBody = this.hasExternalSourceLink(content, editorial.primary_source);
    registerCheck('source_link_in_body', sourceInBody, 'WARN', 'fonte_primaria_ausente_no_corpo');

    const semanticMismatch = this.hasSemanticMismatch(post, content);
    registerCheck('semantic_alignment', !semanticMismatch, 'BLOCK', 'desalinhamento_semantico_titulo_corpo');

    const forcedIABias = this.hasForcedIABias(post, content);
    registerCheck('forced_ia_bias', !forcedIABias, 'BLOCK', 'viés_ia_forcado_em_tema_nao_ia');

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
