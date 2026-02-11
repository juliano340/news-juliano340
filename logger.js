const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

class Logger {
  constructor() {
    this.logFile = config.LOG_FILE;
    this.level = config.LOG_LEVEL;
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
  }

  async log(level, message, data = null) {
    if (this.levels[level] > this.levels[this.level]) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    console.log(logEntry);
    if (data) console.log(JSON.stringify(data, null, 2));

    try {
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      await fs.appendFile(this.logFile, logEntry + (data ? ` ${JSON.stringify(data)}` : '') + '\n');
    } catch (err) {
      console.error('Erro ao escrever log:', err.message);
    }
  }

  info(message, data) { return this.log('info', message, data); }
  ok(message, data) { return this.log('info', `[OK] ${message}`, data); }
  skip(message, data) { return this.log('info', `[SKIP] ${message}`, data); }
  warn(message, data) { return this.log('warn', `[WARN] ${message}`, data); }
  error(message, data) { return this.log('error', `[ERROR] ${message}`, data); }
  debug(message, data) { return this.log('debug', `[DEBUG] ${message}`, data); }

  async init() {
    try {
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
    } catch (err) {
      console.warn('Aviso: Não foi possível criar diretório de logs:', err.message);
    }
  }
}

module.exports = new Logger();