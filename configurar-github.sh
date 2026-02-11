#!/bin/bash

# Script para configurar token GitHub no News Worker

echo "🔑 Configurando autenticação GitHub..."
echo ""
echo "Você precisa de um token de acesso pessoal do GitHub."
echo ""
echo "Para gerar:"
echo "1. Acesse: https://github.com/settings/tokens"
echo "2. Clique em 'Generate new token (classic)'"
echo "3. Selecione a permissão 'repo'"
echo "4. Copie o token gerado"
echo ""

# Configurar Git para usar HTTPS com token
git config --global credential.helper store

echo "Agora execute:"
echo ""
echo "git push -u origin main"
echo ""
echo "Quando pedir usuário: digite 'juliano340'"
echo "Quando pedir senha: cole seu token (não aparece na tela)"
echo ""

# Alternativa: configurar URL com token inline (mais fácil)
echo "OU execute este comando com seu token:"
echo ""
echo "git remote set-url origin https://SEU_TOKEN@github.com/juliano340/news-juliano340.git"
echo ""
echo "Depois: git push -u origin main"