const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

class AIService {
  constructor() {
    this.enabled = config.USE_AI && config.OPENROUTER_KEY;
    this.editorialEnabled = config.AI_EDITORIAL_ENABLED && Boolean(config.OPENROUTER_KEY);
    this.apiKey = config.OPENROUTER_KEY;
    this.model = config.OPENROUTER_MODEL;
    this.editorialPrimaryModel = config.AI_EDITORIAL_MODEL_PRIMARY;
    this.editorialFallbackModel = config.AI_EDITORIAL_MODEL_FALLBACK;
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  }

  buildHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': config.OPENROUTER_HTTP_REFERER,
      'X-Title': config.OPENROUTER_APP_TITLE
    };
  }

  async requestCompletion({ model, messages, maxTokens, timeoutMs, responseFormat }) {
    const payload = {
      model,
      messages,
      max_tokens: maxTokens
    };

    if (responseFormat) payload.response_format = responseFormat;

    const response = await axios.post(
      this.apiUrl,
      payload,
      {
        headers: this.buildHeaders(),
        timeout: timeoutMs
      }
    );

    return response.data?.choices?.[0]?.message?.content?.trim() || '';
  }

  extractJson(text) {
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch (_error) {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;

      try {
        return JSON.parse(match[0]);
      } catch (_innerError) {
        return null;
      }
    }
  }

  normalizeStringList(value, maxItems = 3) {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, maxItems);
  }

  normalizeEditorialDraft(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;

    const summaryBullets = this.normalizeStringList(parsed.summary_bullets, 3);
    const practicalActions = this.normalizeStringList(parsed.practical_actions, 3);
    const contextBullets = this.normalizeStringList(parsed.context_bullets, 3);
    const whyMatters = String(parsed.why_matters || '').trim();
    const sourceReference = String(parsed.source_reference || '').trim();
    const confidence = Number(parsed.editorial_confidence);
    const riskFlags = this.normalizeStringList(parsed.risk_flags, 5);

    if (summaryBullets.length < 3) return null;
    if (practicalActions.length < 3) return null;
    if (!whyMatters) return null;

    return {
      summary_bullets: summaryBullets,
      practical_actions: practicalActions,
      context_bullets: contextBullets,
      why_matters: whyMatters,
      source_reference: sourceReference,
      editorial_confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(100, confidence)) : 0,
      risk_flags: riskFlags
    };
  }

  normalizePostType(value) {
    const normalized = String(value || '').trim().toLowerCase();
    const allowed = ['job_roundup', 'news_event', 'howto_guide', 'product_release', 'other', 'standard'];
    if (allowed.includes(normalized)) return normalized;
    return 'standard';
  }

  buildPostTypePrompt(payload) {
    return [
      'Classifique o tipo de conteúdo da notícia.',
      'Retorne SOMENTE JSON válido no formato:',
      '{"post_type":"job_roundup|news_event|howto_guide|product_release|other|standard","confidence":0,"evidence":["...","...","..."]}',
      'Regras:',
      '- job_roundup: lista de vagas/oportunidades com links de candidatura.',
      '- news_event: evento/notícia factual.',
      '- howto_guide: tutorial/prática de como fazer.',
      '- product_release: lançamento/atualização de produto.',
      '- other/standard: quando não encaixar claramente.',
      'Entrada:',
      JSON.stringify(payload)
    ].join('\n');
  }

  buildMarkdownPrompt(payload) {
    const postType = this.normalizePostType(payload.post_type || 'standard');
    const commonRules = [
      'Escreva em Português do Brasil (pt-BR) natural e fluido.',
      'Não copie frases literais da fonte.',
      'Não invente fatos, números ou nomes que não estejam no material.',
      'Evite frases genéricas e vazias.',
      'Seja conciso: frases curtas e diretas.',
      'Prefira bullets curtos (ate 12 palavras por bullet).',
      'Evite parágrafos longos (máximo 2 frases por parágrafo).',
      'Retorne SOMENTE markdown final, sem explicações extras.'
    ];

    const jobRoundupTemplate = [
      '# <titulo>',
      '<intro de 2-3 linhas>',
      '## Resumo em 3 bullets',
      '- ...',
      '- ...',
      '- ...',
      '## Como usar esta lista',
      '- 4 a 6 bullets praticos',
      '## Destaques rapidos',
      '- 6 a 8 bullets com exemplos de cargos/areas',
      '## Checklist de candidatura',
      '- 8 a 12 bullets praticos',
      '## O que observar nos proximos dias',
      '- 4 a 6 bullets',
      '## FAQ',
      '### pergunta 1',
      'resposta',
      '### pergunta 2',
      'resposta',
      '### pergunta 3',
      'resposta',
      '### pergunta 4',
      'resposta',
      '## Fonte e transparencia',
      '- Fonte primaria: <url>',
      '- Conteudo gerado com apoio de IA e revisado automaticamente.',
      '## Por que isso importa',
      '<paragrafo final coeso>'
    ].join('\n');

    const standardTemplate = [
      '# <titulo>',
      '<intro de 2-3 linhas>',
      '## Resumo em 3 bullets',
      '- ...',
      '- ...',
      '- ...',
      '## Contexto',
      '<paragrafo>',
      '## Insights e implicacoes',
      '<paragrafo>',
      '## O que fazer agora',
      '- 3 a 5 bullets praticos',
      '## O que vale acompanhar',
      '- 3 a 5 bullets',
      '## Fonte e transparencia',
      '- Fonte primaria: <url>',
      '- Conteudo gerado com apoio de IA e revisado automaticamente.',
      '## Por que isso importa',
      '<paragrafo final coeso>'
    ].join('\n');

    const template = postType === 'job_roundup' ? jobRoundupTemplate : standardTemplate;

    return [
      'Você é um editor especialista em coesão textual e utilidade prática.',
      ...commonRules,
      '',
      `Tipo do post: ${postType}`,
      'Template obrigatório:',
      template,
      '',
      'Entrada:',
      JSON.stringify(payload)
    ].join('\n');
  }

  buildStructuredArticlePrompt(payload) {
    const postType = this.normalizePostType(payload.post_type || 'standard');

    const schema = postType === 'job_roundup'
      ? `{
  "title": "...",
  "intro": "...",
  "summary_bullets": ["...", "...", "..."],
  "how_to_use": ["...", "...", "...", "..."],
  "highlights": ["...", "...", "...", "...", "...", "..."],
  "application_checklist": ["...", "...", "...", "...", "...", "...", "...", "..."],
  "watch_items": ["...", "...", "...", "..."],
  "faq": [
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "why_it_matters": "..."
}`
      : `{
  "title": "...",
  "intro": "...",
  "summary_bullets": ["...", "...", "..."],
  "context": "...",
  "insights": "...",
  "do_now": ["...", "...", "..."],
  "watch_items": ["...", "...", "..."],
  "why_it_matters": "..."
}`;

    return [
      'Você é editor de notícias. Gere conteúdo em JSON estruturado para montagem do post.',
      'Use Português do Brasil natural.',
      'Não copie frases literais da fonte e não invente fatos.',
      'Responda SOMENTE JSON válido no schema exigido.',
      `Tipo do post: ${postType}`,
      'Schema obrigatório:',
      schema,
      'Regras de estilo:',
      '- Frases curtas e objetivas.',
      '- Bullets com no máximo 14 palavras.',
      '- Sem reticências no final de bullets.',
      '- Evitar jargão desnecessário.',
      '',
      'Entrada:',
      JSON.stringify(payload)
    ].join('\n');
  }

  normalizeStructuredArticle(parsed, postType, sourceUrl) {
    if (!parsed || typeof parsed !== 'object') return null;

    const title = String(parsed.title || '').trim();
    const intro = String(parsed.intro || '').trim();
    const summaryBullets = this.normalizeStringList(parsed.summary_bullets, 3);
    const whyItMatters = String(parsed.why_it_matters || '').trim();

    if (!title || !intro || summaryBullets.length < 3 || !whyItMatters) return null;

    if (postType === 'job_roundup') {
      const howToUse = this.normalizeStringList(parsed.how_to_use, 6);
      const highlights = this.normalizeStringList(parsed.highlights, 8);
      const checklist = this.normalizeStringList(parsed.application_checklist, 12);
      const watchItems = this.normalizeStringList(parsed.watch_items, 6);
      const faqRaw = Array.isArray(parsed.faq) ? parsed.faq : [];
      const faq = faqRaw
        .map((item) => ({
          q: String(item?.q || '').trim(),
          a: String(item?.a || '').trim()
        }))
        .filter((item) => item.q && item.a)
        .slice(0, 4);

      if (howToUse.length < 4 || highlights.length < 6 || checklist.length < 8 || watchItems.length < 4 || faq.length < 4) {
        return null;
      }

      return {
        content: [
          `# ${title}`,
          intro,
          '',
          '## Resumo em 3 bullets',
          ...summaryBullets.map((line) => `- ${line}`),
          '',
          '## Como usar esta lista',
          ...howToUse.map((line) => `- ${line}`),
          '',
          '## Destaques rapidos',
          ...highlights.map((line) => `- ${line}`),
          '',
          '## Checklist de candidatura',
          ...checklist.map((line) => `- ${line}`),
          '',
          '## O que observar nos proximos dias',
          ...watchItems.map((line) => `- ${line}`),
          '',
          '## FAQ',
          ...faq.flatMap((item) => [`### ${item.q.replace(/^#+\s*/, '')}`, item.a, '']),
          '## Fonte e transparencia',
          `- Fonte primaria: ${sourceUrl || ''}`,
          '- Conteudo gerado com apoio de IA e revisado automaticamente.',
          '',
          '## Por que isso importa',
          whyItMatters
        ].join('\n'),
        post_type: 'job_roundup'
      };
    }

    const context = String(parsed.context || '').trim();
    const insights = String(parsed.insights || '').trim();
    const doNow = this.normalizeStringList(parsed.do_now, 5);
    const watchItems = this.normalizeStringList(parsed.watch_items, 6);

    if (!context || !insights || doNow.length < 3 || watchItems.length < 3) return null;

    return {
      content: [
        `# ${title}`,
        intro,
        '',
        '## Resumo em 3 bullets',
        ...summaryBullets.map((line) => `- ${line}`),
        '',
        '## Contexto',
        context,
        '',
        '## Insights e implicacoes',
        insights,
        '',
        '## O que fazer agora',
        ...doNow.map((line) => `- ${line}`),
        '',
        '## O que vale acompanhar',
        ...watchItems.map((line) => `- ${line}`),
        '',
        '## Fonte e transparencia',
        `- Fonte primaria: ${sourceUrl || ''}`,
        '- Conteudo gerado com apoio de IA e revisado automaticamente.',
        '',
        '## Por que isso importa',
        whyItMatters
      ].join('\n'),
      post_type: postType
    };
  }

  buildReviewPrompt(payload) {
    return [
      'Você é revisor final de qualidade editorial.',
      'Reescreva o markdown para melhorar coesão, clareza e fluidez, preservando os fatos.',
      'Corrija acentuação/ortografia em pt-BR.',
      'Não remova headings obrigatórios do conteúdo.',
      'Não invente fatos.',
      'Retorne somente markdown revisado.',
      '',
      `Tipo do post: ${payload.post_type}`,
      'Markdown de entrada:',
      payload.markdown
    ].join('\n');
  }

  buildRepairPrompt(payload) {
    const template = payload.post_type === 'job_roundup'
      ? [
        '## Resumo em 3 bullets',
        '## Como usar esta lista',
        '## Destaques rapidos',
        '## Checklist de candidatura',
        '## O que observar nos proximos dias',
        '## FAQ',
        '## Fonte e transparencia',
        '## Por que isso importa'
      ].join('\n')
      : [
        '## Resumo em 3 bullets',
        '## Contexto',
        '## Insights e implicacoes',
        '## O que fazer agora',
        '## O que vale acompanhar',
        '## Fonte e transparencia',
        '## Por que isso importa'
      ].join('\n');

    return [
      'Reestruture o markdown abaixo para seguir EXATAMENTE os headings obrigatorios.',
      'Nao invente fatos.',
      'Preserve o conteúdo util e complete seções faltantes com texto curto e coerente.',
      'Retorne somente markdown.',
      '',
      `Tipo: ${payload.post_type}`,
      'Headings obrigatorios:',
      template,
      '',
      'Markdown atual:',
      payload.markdown,
      '',
      `Fonte primaria: ${payload.source_url || ''}`
    ].join('\n');
  }

  async tryJsonModel(model, prompt, timeoutMs = config.AI_EDITORIAL_TIMEOUT_MS, maxTokens = 400) {
    try {
      const raw = await this.requestCompletion({
        model,
        messages: [
          { role: 'system', content: 'Retorne apenas JSON válido.' },
          { role: 'user', content: prompt }
        ],
        maxTokens,
        timeoutMs,
        responseFormat: { type: 'json_object' }
      });
      return this.extractJson(raw);
    } catch (_error) {
      return null;
    }
  }

  async tryMarkdownModel(model, prompt, timeoutMs = config.AI_EDITORIAL_TIMEOUT_MS, maxTokens = 1800) {
    try {
      const raw = await this.requestCompletion({
        model,
        messages: [
          { role: 'system', content: 'Responda apenas com markdown final.' },
          { role: 'user', content: prompt }
        ],
        maxTokens,
        timeoutMs
      });
      return String(raw || '').trim();
    } catch (_error) {
      return '';
    }
  }

  validateMarkdownStructure(content, postType) {
    const normalized = String(content || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const requiredGroups = postType === 'job_roundup'
      ? [
        ['## resumo em 3 bullets'],
        ['## como usar esta lista', '## como usar a lista'],
        ['## destaques rapidos', '## destaques rapidos da lista'],
        ['## checklist de candidatura', '## checklist pratico de candidatura'],
        ['## o que observar nos proximos dias', '## o que vale acompanhar nos proximos dias'],
        ['## faq'],
        ['## fonte e transparencia'],
        ['## por que isso importa']
      ]
      : [
        ['## resumo em 3 bullets'],
        ['## contexto'],
        ['## insights e implicacoes'],
        ['## o que fazer agora'],
        ['## o que vale acompanhar'],
        ['## fonte e transparencia'],
        ['## por que isso importa']
      ];

    return requiredGroups.every((group) => group.some((heading) => normalized.includes(heading)));
  }

  async classifyPostType(input) {
    if (!this.editorialEnabled) return null;

    const payload = {
      title: input.title,
      source: input.source,
      source_url: input.source_url,
      original_url: input.original_url,
      excerpt: String(input.raw_content || '').replace(/\s+/g, ' ').trim().slice(0, 2000)
    };

    const prompt = this.buildPostTypePrompt(payload);
    const primary = await this.tryJsonModel(this.editorialPrimaryModel, prompt);
    const fallback = primary ? null : await this.tryJsonModel(this.editorialFallbackModel, prompt);
    const parsed = primary || fallback;
    if (!parsed) return null;

    return {
      post_type: this.normalizePostType(parsed.post_type),
      confidence: Number.isFinite(Number(parsed.confidence)) ? Number(parsed.confidence) : 0,
      evidence: this.normalizeStringList(parsed.evidence, 5)
    };
  }

  async generateEditorialArticle(input) {
    if (!this.editorialEnabled) return null;

    const startedAt = Date.now();
    const maxTotalMs = Math.max(10000, config.AI_EDITORIAL_TOTAL_TIMEOUT_MS || 40000);
    const timedOut = () => Date.now() - startedAt > maxTotalMs;

    const postTypeFromInput = this.normalizePostType(input.post_type || 'standard');
    const classification = postTypeFromInput === 'standard'
      ? await this.classifyPostType(input)
      : { post_type: postTypeFromInput, confidence: 100, evidence: ['post_type_fornecido_pelo_pipeline'] };

    if (!classification) {
      logger.warn('Falha ao classificar tipo de post com IA');
      return null;
    }

    if (timedOut()) {
      logger.warn('Timeout total da IA editorial apos classificacao', {
        elapsed_ms: Date.now() - startedAt,
        limit_ms: maxTotalMs,
        title: input.title
      });
      return null;
    }

    const payload = {
      title: input.title,
      source: input.source,
      source_url: input.source_url,
      original_url: input.original_url,
      published_at: input.date,
      domain: input.domain || 'geral',
      post_type: classification.post_type,
      article_excerpt: String(input.raw_content || '').replace(/\s+/g, ' ').trim().slice(0, config.AI_EDITORIAL_MAX_INPUT_CHARS)
    };

    const prompt = this.buildStructuredArticlePrompt(payload);
    logger.info('IA editorial: gerando markdown', {
      title: input.title,
      post_type: classification.post_type
    });

    const primaryJson = await this.tryJsonModel(
      this.editorialPrimaryModel,
      prompt,
      config.AI_EDITORIAL_TIMEOUT_MS,
      Math.max(350, config.AI_EDITORIAL_MAX_TOKENS)
    );
    const fallbackUsed = !primaryJson;
    const parsedContent = primaryJson || await this.tryJsonModel(
      this.editorialFallbackModel,
      prompt,
      config.AI_EDITORIAL_TIMEOUT_MS,
      Math.max(350, config.AI_EDITORIAL_MAX_TOKENS)
    );
    if (!parsedContent) {
      logger.warn('Falha ao gerar markdown editorial com IA');
      return null;
    }

    const structured = this.normalizeStructuredArticle(
      parsedContent,
      classification.post_type,
      input.original_url || input.source_url || ''
    );
    if (!structured) {
      logger.warn('Falha ao normalizar resposta estruturada da IA', {
        post_type: classification.post_type,
        title: input.title
      });
      return null;
    }
    const generatedContent = structured.content;

    if (classification.post_type === 'job_roundup' || config.AI_EDITORIAL_SKIP_REVIEW) {
      let finalContent = generatedContent;
      let generatedValid = this.validateMarkdownStructure(finalContent, classification.post_type);
      if (!generatedValid) {
        logger.warn('Estrutura markdown inválida na geracao; tentando reparo', { post_type: classification.post_type });
        const repairPrompt = this.buildRepairPrompt({
          post_type: classification.post_type,
          markdown: finalContent,
          source_url: input.original_url || input.source_url || ''
        });
        const repaired = await this.tryMarkdownModel(
          this.editorialPrimaryModel,
          repairPrompt,
          Math.min(config.AI_EDITORIAL_TIMEOUT_MS, 7000),
          Math.max(350, Math.floor(config.AI_EDITORIAL_MAX_TOKENS * 0.9))
        );
        if (repaired) {
          finalContent = repaired;
          generatedValid = this.validateMarkdownStructure(finalContent, classification.post_type);
        }

        if (!generatedValid) {
          logger.warn('Falha no reparo de estrutura markdown', { post_type: classification.post_type });
          return null;
        }
      }

      return {
        content: finalContent,
        post_type: structured.post_type || classification.post_type,
        editorial_confidence: classification.confidence,
        risk_flags: [],
        model_used: fallbackUsed ? this.editorialFallbackModel : this.editorialPrimaryModel,
        latency_ms: Date.now() - startedAt,
        fallback_used: fallbackUsed
      };
    }

    if (timedOut()) {
      logger.warn('Timeout total da IA editorial apos geracao', {
        elapsed_ms: Date.now() - startedAt,
        limit_ms: maxTotalMs,
        title: input.title,
        post_type: classification.post_type
      });
      return null;
    }

    const reviewPrompt = this.buildReviewPrompt({
      post_type: classification.post_type,
      markdown: generatedContent
    });
    logger.info('IA editorial: revisando markdown', {
      title: input.title,
      post_type: classification.post_type
    });

    const reviewedPrimary = await this.tryMarkdownModel(
      this.editorialPrimaryModel,
      reviewPrompt,
      config.AI_EDITORIAL_TIMEOUT_MS,
      Math.max(250, Math.floor(config.AI_EDITORIAL_MAX_TOKENS * 0.7))
    );
    const reviewed = reviewedPrimary || await this.tryMarkdownModel(
      this.editorialFallbackModel,
      reviewPrompt,
      config.AI_EDITORIAL_TIMEOUT_MS,
      Math.max(250, Math.floor(config.AI_EDITORIAL_MAX_TOKENS * 0.7))
    );
    if (!reviewed) {
      logger.warn('Falha na revisão editorial com IA');
      return null;
    }

    const reviewedValid = this.validateMarkdownStructure(reviewed, classification.post_type);
    if (!reviewedValid) {
      const generatedValid = this.validateMarkdownStructure(generatedContent, classification.post_type);
      if (generatedValid) {
        logger.warn('Revisao IA alterou estrutura; mantendo versao gerada original', {
          post_type: classification.post_type
        });
      } else {
        logger.warn('Estrutura markdown inválida após revisão e geração', { post_type: classification.post_type });
        return null;
      }
    }

    return {
      content: reviewedValid ? reviewed : generatedContent,
      post_type: classification.post_type,
      editorial_confidence: classification.confidence,
      risk_flags: [],
      model_used: fallbackUsed ? this.editorialFallbackModel : this.editorialPrimaryModel,
      latency_ms: Date.now() - startedAt,
      fallback_used: fallbackUsed
    };
  }

  async generateSeoTitle(input) {
    if (!this.editorialEnabled) return null;

    const payload = {
      title: String(input.title || '').trim(),
      post_type: this.normalizePostType(input.post_type || 'standard'),
      domain: String(input.domain || 'geral').trim(),
      summary: String(input.summary || '').replace(/\s+/g, ' ').trim().slice(0, 350)
    };

    const prompt = [
      'Gere um title SEO em pt-BR para notícia.',
      'Retorne SOMENTE JSON válido: {"seo_title":"..."}',
      'Regras:',
      '- 50 a 65 caracteres.',
      '- Sem clickbait e sem inventar fatos.',
      '- Preservar assunto principal do título original.',
      '- Linguagem clara e natural.',
      'Entrada:',
      JSON.stringify(payload)
    ].join('\n');

    const primary = await this.tryJsonModel(this.editorialPrimaryModel, prompt, Math.min(config.AI_EDITORIAL_TIMEOUT_MS, 6000), 180);
    const fallback = primary ? null : await this.tryJsonModel(this.editorialFallbackModel, prompt, Math.min(config.AI_EDITORIAL_TIMEOUT_MS, 6000), 180);
    const parsed = primary || fallback;
    if (!parsed || typeof parsed !== 'object') return null;

    const seoTitle = String(parsed.seo_title || '').replace(/\s+/g, ' ').trim();
    if (!seoTitle) return null;
    if (seoTitle.length < 35 || seoTitle.length > 90) return null;

    return seoTitle;
  }

  buildEditorialPrompt(payload) {
    return [
      'Você é editor de noticias de tecnologia e cultura digital.',
      'Todos os textos devem ser escritos em Português do Brasil (pt-BR).',
      'Escreva com clareza, sem frases soltas, sem invenção de fatos.',
      'Use apenas as informações do material de entrada.',
      'Retorne exclusivamente JSON válido, sem markdown e sem texto extra.',
      '',
      'Formato JSON obrigatório:',
      '{',
      '  "summary_bullets": ["...", "...", "..."],',
      '  "why_matters": "...",',
      '  "practical_actions": ["...", "...", "..."],',
      '  "context_bullets": ["...", "..."],',
      '  "source_reference": "...",',
      '  "editorial_confidence": 0,',
      '  "risk_flags": ["..."]',
      '}',
      '',
      'Regras:',
      '- summary_bullets: exatamente 3 bullets curtos, distintos, fieis aos fatos da fonte.',
      '- why_matters: 1 parágrafo coeso, concreto, sem repetir os bullets.',
      '- practical_actions: exatamente 3 acoes praticas e coerentes com o tema da noticia.',
      '- context_bullets: 2 ou 3 bullets com contexto factual direto.',
      '- Nao force viés de IA/dev quando o tema for games, entretenimento, hardware, negocios ou geral.',
      '- Use o campo "domain" da entrada para ajustar linguagem e recomendacoes.',
      '- source_reference: URL da fonte principal fornecida.',
      '- Todos os campos textuais do JSON devem estar em Português do Brasil (pt-BR), mesmo quando a fonte estiver em outro idioma.',
      '- Se faltar dado, adicionar flag em risk_flags.',
      '',
      'Entrada:',
      JSON.stringify(payload)
    ].join('\n');
  }

  async tryEditorialModel(model, prompt) {
    const startedAt = Date.now();
    let retries = 0;
    const maxRetries = Math.max(0, config.AI_EDITORIAL_MAX_RETRIES);

    while (retries <= maxRetries) {
      try {
        const raw = await this.requestCompletion({
          model,
          messages: [
            {
              role: 'system',
              content: 'Você é um editor rigoroso de noticias que retorna apenas JSON válido em Português do Brasil (pt-BR).'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          maxTokens: 900,
          timeoutMs: config.AI_EDITORIAL_TIMEOUT_MS,
          responseFormat: { type: 'json_object' }
        });

        const parsed = this.extractJson(raw);
        const draft = this.normalizeEditorialDraft(parsed);
        if (!draft) throw new Error('json_invalido_ou_incompleto');

        return {
          success: true,
          model,
          latency_ms: Date.now() - startedAt,
          draft
        };
      } catch (error) {
        retries += 1;
        if (retries > maxRetries) {
          return {
            success: false,
            model,
            latency_ms: Date.now() - startedAt,
            error: error.message
          };
        }
      }
    }

    return {
      success: false,
      model,
      latency_ms: Date.now() - startedAt,
      error: 'falha_desconhecida'
    };
  }

  async generateEditorialDraft(input) {
    if (!this.editorialEnabled) return null;

    const promptPayload = {
      title: input.title,
      source: input.source,
      source_url: input.source_url,
      original_url: input.original_url,
      published_at: input.date,
      topic: input.topic,
      domain: input.domain || 'geral',
      article_excerpt: String(input.raw_content || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, config.AI_EDITORIAL_MAX_INPUT_CHARS)
    };

    const prompt = this.buildEditorialPrompt(promptPayload);

    const primary = await this.tryEditorialModel(this.editorialPrimaryModel, prompt);
    if (primary.success) {
      return {
        ...primary.draft,
        model_used: primary.model,
        latency_ms: primary.latency_ms,
        fallback_used: false
      };
    }

    logger.warn('Falha no modelo editorial primario', {
      model: primary.model,
      error: primary.error,
      latency_ms: primary.latency_ms
    });

    const fallback = await this.tryEditorialModel(this.editorialFallbackModel, prompt);
    if (fallback.success) {
      return {
        ...fallback.draft,
        model_used: fallback.model,
        latency_ms: fallback.latency_ms,
        fallback_used: true
      };
    }

    logger.warn('Falha no modelo editorial fallback', {
      model: fallback.model,
      error: fallback.error,
      latency_ms: fallback.latency_ms
    });

    return null;
  }

  async generateSummary(text, maxLength = 300) {
    if (!this.enabled) return null;

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente que resume notícias de forma objetiva e clara em Português do Brasil (pt-BR).'
            },
            {
              role: 'user',
              content: `Resuma o seguinte texto em até ${maxLength} caracteres, sempre em Português do Brasil (pt-BR):\n\n${text}`
            }
          ],
          max_tokens: 200
        },
        {
          headers: this.buildHeaders(),
          timeout: 10000
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      logger.warn('Erro ao gerar resumo com IA', { error: error.message });
      return null;
    }
  }

  async suggestTags(title, content) {
    if (!this.enabled) return null;

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente que sugere tags relevantes para notícias em Português do Brasil (pt-BR). Retorne apenas um array JSON com as tags.'
            },
            {
              role: 'user',
              content: `Sugira até 5 tags relevantes para esta notícia:\nTítulo: ${title}\nConteúdo: ${content}\n\nRetorne no formato: ["tag1", "tag2", "tag3"]`
            }
          ],
          max_tokens: 100
        },
        {
          headers: this.buildHeaders(),
          timeout: 10000
        }
      );

      const content_text = response.data.choices[0].message.content.trim();
      const match = content_text.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return null;
    } catch (error) {
      logger.warn('Erro ao sugerir tags com IA', { error: error.message });
      return null;
    }
  }
}

module.exports = new AIService();
