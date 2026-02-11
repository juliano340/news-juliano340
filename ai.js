const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

class AIService {
  constructor() {
    this.enabled = config.USE_AI && config.OPENROUTER_KEY;
    this.apiKey = config.OPENROUTER_KEY;
    this.model = config.OPENROUTER_MODEL;
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
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
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://juliano340.com',
            'X-Title': 'News Worker'
          },
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
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://juliano340.com',
            'X-Title': 'News Worker'
          },
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