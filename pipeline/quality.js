const config = require('../config');

class QualityGate {
  requiredSections() {
    return [
      '## Resumo em 3 bullets',
      '## Por que isso importa para devs',
      '## O que muda na pratica',
      '## Contexto rapido',
      '## Fonte primaria'
    ];
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

  evaluate(post, editorial) {
    const reasons = [];
    const checks = [];
    let score = 0;
    const content = editorial.content || '';
    const weights = config.QUALITY_WEIGHTS;
    const limits = config.QUALITY_LIMITS;

    const registerCheck = (id, passed, weight, reason, details = {}) => {
      if (passed) score += weight;
      else reasons.push(reason);
      checks.push({ id, passed, weight, reason, ...details });
    };

    const hasAllSections = this.requiredSections().every((section) => content.includes(section));
    registerCheck('sections', hasAllSections, weights.sections, 'secoes_obrigatorias_ausentes');

    const bullets = this.countSummaryBullets(content);
    registerCheck(
      'summary_bullets',
      bullets >= limits.summary_bullets,
      weights.summary_bullets,
      'resumo_sem_3_bullets',
      { bullets, min: limits.summary_bullets }
    );

    const hasPrimarySource = editorial.primary_source && /^https?:\/\//i.test(editorial.primary_source);
    registerCheck('primary_source', hasPrimarySource, weights.primary_source, 'fonte_primaria_invalida');

    const whyText = this.sectionText(content, '## Por que isso importa para devs');
    const practicalText = this.sectionText(content, '## O que muda na pratica');
    const hasEditorialAnalysis =
      whyText.length >= limits.why_min_chars && practicalText.length >= limits.practical_min_chars;
    registerCheck(
      'editorial_analysis',
      hasEditorialAnalysis,
      weights.editorial_analysis,
      'analise_editorial_insuficiente',
      {
        whyChars: whyText.length,
        whyMin: limits.why_min_chars,
        practicalChars: practicalText.length,
        practicalMin: limits.practical_min_chars
      }
    );

    registerCheck(
      'min_length',
      content.length >= limits.content_min_chars,
      weights.min_length,
      'conteudo_curto',
      { contentLength: content.length, min: limits.content_min_chars }
    );

    const passed = score >= config.EDITORIAL_MIN_SCORE;

    return {
      score,
      passed,
      reasons,
      threshold: config.EDITORIAL_MIN_SCORE,
      shouldDiscard: config.EDITORIAL_AUTO_DISCARD && !passed,
      policy: config.EDITORIAL_AUTO_DISCARD ? 'auto_discard' : 'manual_review',
      source: post.source,
      checks
    };
  }
}

module.exports = new QualityGate();
