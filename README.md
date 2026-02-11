# News Worker - juliano340

Sistema de automação de conteúdo para news.juliano340.com

## Descrição

Worker em Node.js que coleta notícias de múltiplas fontes RSS, processa o conteúdo e gera arquivos Markdown estruturados para um site estático.

## Fontes Suportadas

- G1 Tecnologia
- GZH (Zero Hora)
- Correio do Povo
- Tecmundo
- Google Trends Brasil

## Requisitos

- Node.js >= 18.0.0
- Git configurado
- Acesso à internet

## Instalação

```bash
# 1. Clonar ou criar estrutura
cd /opt/news-worker

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
nano .env  # Editar conforme necessário

# 4. Inicializar repositório Git (se necessário)
git init
git remote add origin https://github.com/seu-usuario/seu-repo.git

# 5. Testar execução manual
node worker.js
```

## Configuração do Cron

```bash
# Editar crontab
crontab -e

# Adicionar linha:
0 */2 * * * cd /opt/news-worker && node worker.js >> /var/log/news-worker.log 2>&1
```

## Estrutura de Arquivos

```
/opt/news-worker/
├── content/posts/     # Posts gerados em Markdown
├── sources/           # Coletores de cada fonte
├── worker.js          # Orquestrador principal
├── git.js             # Operações Git
├── ai.js              # Integração com IA (opcional)
├── config.js          # Configurações
├── logger.js          # Sistema de logs
├── utils.js           # Funções utilitárias
└── package.json       # Dependências
```

## Formato do Post

```markdown
---
title: "Título da notícia"
date: "2024-01-15T10:30:00.000Z"
tags: ["tecnologia", "inovacao"]
source: "G1 Tecnologia"
original_url: "https://..."
slug: "titulo-da-noticia"
---

Conteúdo ou resumo da notícia...
```

## Logs

Os logs são salvos em: `/var/log/news-worker.log`

Para acompanhar em tempo real:
```bash
tail -f /var/log/news-worker.log
```

## Comandos Úteis

```bash
# Execução manual
node worker.js

# Verificar logs
tail -f /var/log/news-worker.log

# Ver status do cron
crontab -l
```

## Integração com IA (Opcional)

Para usar IA na geração de resumos e tags:

1. Obter API key em: https://openrouter.ai
2. Configurar no `.env`:
   ```
   USE_AI=true
   OPENROUTER_KEY=sua_chave_aqui
   ```

## Licença

MIT