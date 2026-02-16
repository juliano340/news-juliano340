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
    const required = postType === 'job_roundup'
      ? ['## Resumo em 3 bullets', '## Como usar esta lista', '## Destaques rapidos', '## Checklist de candidatura', '## O que observar nos proximos dias', '## FAQ', '## Fonte e transparencia', '## Por que isso importa']
      : ['## Resumo em 3 bullets', '## Contexto', '## Insights e implicacoes', '## O que fazer agora', '## O que vale acompanhar', '## Fonte e transparencia', '## Por que isso importa'];

    const text = String(content || '');
    return required.every((heading) => text.includes(heading));
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
    const classification = await this.classifyPostType(input);
    if (!classification) {
      logger.warn('Falha ao classificar tipo de post com IA');
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

    const prompt = this.buildMarkdownPrompt(payload);
    const primaryContent = await this.tryMarkdownModel(this.editorialPrimaryModel, prompt);
    const fallbackUsed = !primaryContent;
    const generatedContent = primaryContent || await this.tryMarkdownModel(this.editorialFallbackModel, prompt);
    if (!generatedContent) {
      logger.warn('Falha ao gerar markdown editorial com IA');
      return null;
    }

    const reviewPrompt = this.buildReviewPrompt({
      post_type: classification.post_type,
      markdown: generatedContent
    });
    const reviewedPrimary = await this.tryMarkdownModel(this.editorialPrimaryModel, reviewPrompt, config.AI_EDITORIAL_TIMEOUT_MS, 2000);
    const reviewed = reviewedPrimary || await this.tryMarkdownModel(this.editorialFallbackModel, reviewPrompt, config.AI_EDITORIAL_TIMEOUT_MS, 2000);
    if (!reviewed) {
      logger.warn('Falha na revisão editorial com IA');
      return null;
    }

    if (!this.validateMarkdownStructure(reviewed, classification.post_type)) {
      logger.warn('Estrutura markdown inválida após revisão', { post_type: classification.post_type });
      return null;
    }

    return {
      content: reviewed,
      post_type: classification.post_type,
      editorial_confidence: classification.confidence,
      risk_flags: [],
      model_used: fallbackUsed ? this.editorialFallbackModel : this.editorialPrimaryModel,
      latency_ms: Date.now() - startedAt,
      fallback_used: fallbackUsed
    };
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
