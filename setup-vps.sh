#!/bin/bash

# ============================================
# NEWS WORKER - SETUP COMPLETO NA VPS
# ============================================

set -e  # Para em caso de erro

echo "🚀 Iniciando setup do News Worker..."

# 1. Instalar dependências
echo "📦 Instalando dependências..."
cd ~/projetos/news-worker
npm install

# 2. Criar arquivo .env
echo "⚙️ Criando arquivo .env..."
cat > .env << 'EOF'
# Configurações do Worker
CRON_FREQUENCY=0 */2 * * *
USE_AI=false
OPENROUTER_KEY=
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Caminhos (ajustados para VPS)
REPO_PATH=/root/projetos/news-worker
POSTS_PATH=/root/projetos/news-worker/content/posts

# Configurações Git
GIT_USER_NAME=News Worker
GIT_USER_EMAIL=worker@juliano340.com

# Limites
MAX_POSTS_PER_SOURCE=10
REQUEST_TIMEOUT=30000

# Logs
LOG_LEVEL=info
LOG_FILE=/root/projetos/news-worker/logs/news-worker.log
EOF

# 3. Criar pasta de logs
echo "📁 Criando pasta de logs..."
mkdir -p logs

# 4. Configurar Git local
echo "🔧 Configurando Git..."
git config user.name "News Worker"
git config user.email "worker@juliano340.com"

# 5. Verificar se tem remote configurado
echo "🔗 Verificando remote do GitHub..."
if ! git remote get-url origin &> /dev/null; then
    echo "⚠️  ATENÇÃO: Nenhum remote configurado!"
    echo "   Execute: git remote add origin https://github.com/SEU_USUARIO/nome-do-repo.git"
    echo "   Substitua SEU_USUARIO e nome-do-repo pelo seu repositório no GitHub"
fi

# 6. Criar pasta content/posts se não existir
mkdir -p content/posts

echo ""
echo "✅ Setup básico concluído!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Configurar remote do GitHub (se ainda não fez):"
echo "   git remote add origin https://github.com/SEU_USUARIO/nome-do-repo.git"
echo ""
echo "2. Configurar autenticação GitHub:"
echo "   - Gere um token em: https://github.com/settings/tokens"
echo "   - Dê permissão 'repo'"
echo "   - Salve o token em lugar seguro"
echo ""
echo "3. Testar o worker:"
echo "   node worker.js"
echo ""
echo "4. Configurar cron (executar a cada 2 horas):"
echo "   crontab -e"
echo "   Adicione esta linha:"
echo "   0 */2 * * * cd /root/projetos/news-worker && node worker.js >> /root/projetos/news-worker/logs/cron.log 2>&1"
echo ""
echo "5. Para usar IA (opcional):"
echo "   - Edite .env e mude USE_AI=true"
echo "   - Adicione OPENROUTER_KEY=sua_chave"
echo ""
echo "📁 Estrutura criada em: /root/projetos/news-worker"
echo "📄 Logs serão salvos em: /root/projetos/news-worker/logs/"
echo "📰 Posts serão gerados em: /root/projetos/news-worker/content/posts/"
echo ""