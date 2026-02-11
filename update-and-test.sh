#!/bin/bash
cat > config.js << 'CONFIGEOF'
require('dotenv').config();
const path = require('path');
module.exports = {
  CRON_FREQUENCY: process.env.CRON_FREQUENCY || '0 */2 * * *',
  USE_AI: process.env.USE_AI === 'true' || false,
  OPENROUTER_KEY: process.env.OPENROUTER_KEY || '',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
  REPO_PATH: process.env.REPO_PATH || path.resolve(__dirname),
  POSTS_PATH: process.env.POSTS_PATH || path.resolve(__dirname, 'content/posts'),
  GIT_USER_NAME: process.env.GIT_USER_NAME || 'News Worker',
  GIT_USER_EMAIL: process.env.GIT_USER_EMAIL || 'worker@juliano340.com',
  MAX_POSTS_PER_SOURCE: parseInt(process.env.MAX_POSTS_PER_SOURCE) || 10,
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || path.resolve(__dirname, 'logs/news-worker.log'),
  SOURCES: {
    G1: { enabled: true, url: 'https://g1.globo.com/dynamo/tecnologia/rss2.xml' },
    TECNOBLOG: { enabled: true, url: 'https://tecnoblog.net/feed/' },
    CANALTECH: { enabled: true, url: 'https://feeds.feedburner.com/canaltech/' },
    TECMUNDO: { enabled: true, url: 'https://www.tecmundo.com.br/feed/' },
    BOREDPANDA: { enabled: true, url: 'https://www.boredpanda.com/feed/' }
  }
};
CONFIGEOF
echo "✅ Config atualizado!"
echo ""
echo "🧪 Testando worker..."
node worker.js