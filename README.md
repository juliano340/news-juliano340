# News Worker - juliano340

Sistema de automação de conteúdo para [news.juliano340.com](https://news.juliano340.com)

## Arquitetura do Projeto

Este projeto é composto por **dois repositórios** que trabalham em conjunto:

### 1. news-worker-juliano340 (Este Repositório)
**Função:** Backend/Worker de automação
- Coleta notícias de múltiplas fontes RSS
- Processa e gera arquivos Markdown estruturados
- Realiza commits automáticos no repositório do site
- Executa via cron a cada 2 horas

**Repositório:** `https://github.com/juliano340/news-frontend`

### 2. news-juliano340 (Repositório do Site)
**Função:** Frontend/Site estático
- Site em Next.js que consome os posts Markdown
- Hospeda o conteúdo gerado pelo worker
- Faz deploy automático na Vercel

**Repositório:** `https://github.com/juliano340/news-juliano340`

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Fontes RSS        │     │   news-worker       │     │   news-juliano340   │
│   (G1, GZH, etc)    │────▶│   (Este Repo)       │────▶│   (Site Frontend)   │
│                     │     │   - Coleta notícias │     │   - Next.js         │
│                     │     │   - Gera Markdown   │     │   - Vercel Deploy   │
└─────────────────────┘     │   - Git Push        │     │   - Exibe posts     │
                            └─────────────────────┘     └─────────────────────┘
```

## Dependência

⚠️ **IMPORTANTE:** Este worker depende do repositório do site para funcionar corretamente. 

O worker clona o repo do site em um diretório local (configurável via `REPO_PATH`) e gera os posts na pasta `content/posts/`. Em seguida, faz commit e push das alterações para o repositório do site.

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
- Clone do repositório `news-juliano340` no mesmo servidor

## Instalação

### 1. Clonar ambos os repositórios

```bash
# Criar diretório base
mkdir -p /opt

# Clonar o worker (este repositório)
cd /opt
git clone https://github.com/juliano340/news-frontend.git news-worker
cd news-worker

# O worker irá clonar/gerenciar o repo do site automaticamente
# ou você pode clonar manualmente:
git clone https://github.com/juliano340/news-juliano340.git /opt/news-juliano340
```

### 2. Instalar dependências do worker

```bash
cd /opt/news-worker
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env  # Editar conforme necessário
```

**Configurações importantes:**
```env
# Caminho onde o worker encontrará o repo do site
REPO_PATH=/opt/news-juliano340

# Caminho onde os posts serão gerados (dentro do repo do site)
POSTS_PATH=/opt/news-juliano340/content/posts
```

### 4. Configurar Git para push automático

```bash
# Gerar token de acesso pessoal no GitHub
# Settings > Developer settings > Personal access tokens > Tokens (classic)

# Configurar remote com token
git remote set-url origin https://SEU_TOKEN@github.com/juliano340/news-juliano340.git
```

### 5. Testar execução manual

```bash
node worker.js --dry-run  # Modo de teste
node worker.js            # Execução real
```

## Configuração do Cron

```bash
# Editar crontab
crontab -e

# Adicionar linha para executar a cada 2 horas:
0 */2 * * * cd /opt/news-worker && node worker.js >> /var/log/news-worker.log 2>&1
```

## Estrutura de Arquivos

```
/opt/news-worker/                    # Este repositório
├── worker.js                        # Orquestrador principal
├── sources/                         # Coletores de cada fonte RSS
├── ai.js                            # Integração com IA (opcional)
├── config.js                        # Configurações
├── logger.js                        # Sistema de logs
├── utils.js                         # Funções utilitárias
└── package.json

/opt/news-juliano340/                # Repositório do site (dependência)
├── content/posts/                   # Posts gerados em Markdown
├── app/                             # Código Next.js
├── components/                      # Componentes React
└── ...
```

## Formato do Post Gerado

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
cd /opt/news-worker && node worker.js

# Verificar logs
tail -f /var/log/news-worker.log

# Ver status do cron
crontab -l

# Verificar se o repo do site está atualizado
cd /opt/news-juliano340 && git status

# Forçar push manual
cd /opt/news-juliano340 && git push origin main
```

## Integração com IA (Opcional)

Para usar IA na geração de resumos e tags:

1. Obter API key em: https://openrouter.ai
2. Configurar no `.env`:
   ```env
   USE_AI=true
   OPENROUTER_KEY=sua_chave_aqui
   ```

## Troubleshooting

### Worker não consegue fazer push
- Verificar se o token GitHub tem permissões de escrita
- Confirmar que `REPO_PATH` aponta para o diretório correto
- Verificar se o remote está configurado com HTTPS + token

### Posts não aparecem no site
- Verificar se o commit foi enviado para `news-juliano340`
- Confirmar que a Vercel fez o deploy (pode levar alguns minutos)
- Verificar se os arquivos estão em `content/posts/`

### Erro de permissão
```bash
# Garantir permissões corretas
sudo chown -R $USER:$USER /opt/news-worker
sudo chown -R $USER:$USER /opt/news-juliano340
```

## Repositórios Relacionados

- **Worker (Backend):** https://github.com/juliano340/news-frontend
- **Site (Frontend):** https://github.com/juliano340/news-juliano340

## Licença

MIT

---

**Nota:** Este projeto foi desenvolvido para automatizar a coleta e publicação de notícias. O worker mantém o site atualizado automaticamente, permitindo foco na curadoria de conteúdo.
