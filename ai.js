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

  buildEditorialPrompt(payload) {
    return [
      'Você é editor de tecnologia focado em IA para desenvolvedores.',
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
      '- summary_bullets: exatamente 3 bullets curtos, distintos, orientados a devs.',
      '- why_matters: 1 parágrafo coeso, concreto, sem repetir os bullets.',
      '- practical_actions: exatamente 3 ações executáveis para time técnico.',
      '- context_bullets: 2 ou 3 bullets com contexto factual direto.',
      '- source_reference: URL da fonte principal fornecida.',
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
              content: 'Você é um editor técnico rigoroso que retorna apenas JSON válido.'
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
              content: 'Você é um assistente que resume notícias de forma objetiva e clara em português.'
            },
            {
              role: 'user',
              content: `Resuma o seguinte texto em até ${maxLength} caracteres:\n\n${text}`
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
              content: 'Você é um assistente que sugere tags relevantes para notícias em português. Retorne apenas um array JSON com as tags.'
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
