const simpleGit = require('simple-git');
const config = require('./config');
const logger = require('./logger');

class GitService {
  constructor() {
    this.git = simpleGit(config.REPO_PATH);
  }

  async init() {
    try {
      await this.git.addConfig('user.name', config.GIT_USER_NAME);
      await this.git.addConfig('user.email', config.GIT_USER_EMAIL);
      logger.info('Git configurado com sucesso');
    } catch (error) {
      logger.error('Erro ao configurar Git', { error: error.message });
      throw error;
    }
  }

  async hasChanges() {
    try {
      const status = await this.git.status();
      return status.files.length > 0;
    } catch (error) {
      logger.error('Erro ao verificar status do Git', { error: error.message });
      return false;
    }
  }

  async commitAndPush(message) {
    try {
      const hasChanges = await this.hasChanges();
      
      if (!hasChanges) {
        logger.info('Nenhuma alteração para commitar');
        return false;
      }

      await this.git.add('.');
      await this.git.commit(message);
      await this.git.push('origin', 'main');
      
      logger.ok('Alterações commitadas e enviadas com sucesso');
      return true;
    } catch (error) {
      logger.error('Erro ao fazer commit/push', { error: error.message });
      return false;
    }
  }

  async pull() {
    try {
      await this.git.pull('origin', 'main');
      logger.info('Repositório atualizado (pull)');
      return true;
    } catch (error) {
      logger.error('Erro ao fazer pull', { error: error.message });
      return false;
    }
  }
}

module.exports = new GitService();