require('dotenv').config();
const path = require('path');
module.exports = {
  CRON_FREQUENCY: '0 */2 * * *', USE_AI: false, OPENROUTER_KEY: '',
  REPO_PATH: path.resolve(__dirname), POSTS_PATH: path.resolve(__dirname, 'content/posts'),
  GIT_USER_NAME: 'News Worker', GIT_USER_EMAIL: 'worker@juliano340.com',
  MAX_POSTS_PER_SOURCE: 10, REQUEST_TIMEOUT: 30000, LOG_LEVEL: 'info',
  LOG_FILE: path.resolve(__dirname, 'logs/news-worker.log'),
  SOURCES: {
    G1: { enabled: true, url: 'https://g1.globo.com/rss/g1/tecnologia/' },
    TECNOBLOG: { enabled: true, url: 'https://tecnoblog.net/feed/' },
<<<<<<< HEAD
    CANALTECH: { enabled: true, url: 'https://canaltech.com.br/rss/' },
    TECMUNDO: { enabled: true, url: 'https://rss.tecmundo.com.br/feed' },
    BOREDPANDA: { enabled: true, url: 'https://www.boredpanda.com/feed/' }
  }
};
