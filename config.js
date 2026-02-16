require('dotenv').config();
const path = require('path');

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return String(value).toLowerCase() === 'true';
};

const parseNumber = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

module.exports = {
  CRON_FREQUENCY: process.env.CRON_FREQUENCY || '0 */2 * * *',
  USE_AI: parseBoolean(process.env.USE_AI, false),
  OPENROUTER_KEY: process.env.OPENROUTER_KEY || '',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  AI_EDITORIAL_ENABLED: parseBoolean(process.env.AI_EDITORIAL_ENABLED, true),
  AI_EDITORIAL_REQUIRED: parseBoolean(process.env.AI_EDITORIAL_REQUIRED, true),
  AI_EDITORIAL_MODEL_PRIMARY: process.env.AI_EDITORIAL_MODEL_PRIMARY || 'qwen/qwen-2.5-72b-instruct:free',
  AI_EDITORIAL_MODEL_FALLBACK: process.env.AI_EDITORIAL_MODEL_FALLBACK || 'deepseek/deepseek-chat:free',
  AI_EDITORIAL_TIMEOUT_MS: parseNumber(process.env.AI_EDITORIAL_TIMEOUT_MS, 12000),
  AI_EDITORIAL_MAX_RETRIES: parseNumber(process.env.AI_EDITORIAL_MAX_RETRIES, 1),
  AI_EDITORIAL_MAX_INPUT_CHARS: parseNumber(process.env.AI_EDITORIAL_MAX_INPUT_CHARS, 12000),
  OPENROUTER_HTTP_REFERER: process.env.OPENROUTER_HTTP_REFERER || 'https://juliano340.com',
  OPENROUTER_APP_TITLE: process.env.OPENROUTER_APP_TITLE || 'News Worker',
  EDITORIAL_ENABLED: parseBoolean(process.env.EDITORIAL_ENABLED, true),
  EDITORIAL_MIN_SCORE: parseNumber(process.env.EDITORIAL_MIN_SCORE, 70),
  EDITORIAL_AUTO_DISCARD: parseBoolean(process.env.EDITORIAL_AUTO_DISCARD, true),
  EDITORIAL_NICHE: process.env.EDITORIAL_NICHE || 'ia-para-desenvolvedores',
  QUALITY_WEIGHTS: {
    sections: parseNumber(process.env.QUALITY_WEIGHT_SECTIONS, 35),
    summary_bullets: parseNumber(process.env.QUALITY_WEIGHT_SUMMARY_BULLETS, 15),
    primary_source: parseNumber(process.env.QUALITY_WEIGHT_PRIMARY_SOURCE, 20),
    editorial_analysis: parseNumber(process.env.QUALITY_WEIGHT_EDITORIAL_ANALYSIS, 15),
    min_length: parseNumber(process.env.QUALITY_WEIGHT_MIN_LENGTH, 15)
  },
  QUALITY_LIMITS: {
    summary_bullets: parseNumber(process.env.QUALITY_MIN_SUMMARY_BULLETS, 3),
    min_word_count: parseNumber(process.env.QUALITY_MIN_WORD_COUNT, 220),
    min_internal_links: parseNumber(process.env.QUALITY_MIN_INTERNAL_LINKS, 3)
  },
  TOPIC_TAXONOMY: [
    'llms',
    'agentes',
    'frameworks',
    'infra-ia',
    'seguranca-ia',
    'produtividade-dev'
  ],
  REPO_PATH: path.resolve(__dirname), POSTS_PATH: path.resolve(__dirname, 'content/posts'),
  DIGEST_PATH: path.resolve(__dirname, 'content/digests'),
  REPORT_PATH: path.resolve(__dirname, 'content/reports'),
  GIT_USER_NAME: 'News Worker', GIT_USER_EMAIL: 'worker@juliano340.com',
  MAX_POSTS_PER_SOURCE: 10, REQUEST_TIMEOUT: 30000, LOG_LEVEL: 'info',
  LOG_FILE: path.resolve(__dirname, 'logs/news-worker.log'),
  SOURCES: {
    G1: { enabled: true, url: 'https://g1.globo.com/rss/g1/tecnologia/' },
    TECNOBLOG: { enabled: true, url: 'https://tecnoblog.net/feed/' },
    CANALTECH: { enabled: true, url: 'https://canaltech.com.br/rss/' },
    TECMUNDO: { enabled: true, url: 'https://rss.tecmundo.com.br/feed' },
    UOL: { enabled: true, url: 'https://rss.uol.com.br/feed/tecnologia.xml' }
  }
};
