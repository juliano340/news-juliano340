const fs = require('fs').promises;
const path = require('path');

const config = require('../config');

const REQUIRED_SECTIONS = [
  '## Resumo em 3 bullets',
  '## Contexto',
  '## O que muda na pratica',
  '## Checklist pratico',
  '## O que observar nos proximos dias',
  '## FAQ',
  '## Fonte e transparencia'
];

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;

  const data = {};
  const lines = match[1].split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    data[key] = value
      .replace(/^"|"$/g, '')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  return {
    header: match[0],
    body: markdown.slice(match[0].length),
    data
  };
}

function hasRequiredSections(body) {
  return REQUIRED_SECTIONS.every((heading) => body.includes(heading));
}

function normalizeText(text) {
  return String(text || '')
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]*\)/g, ' ')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceCandidates(text) {
  const clean = normalizeText(text);
  if (!clean) return [];
  return clean
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function truncate(text, max) {
  const value = String(text || '').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trim()}...`;
}

function buildSummary(sentences, title) {
  const pool = [...sentences];
  if (pool.length === 0 && title) pool.push(title);
  while (pool.length < 3) {
    pool.push('Atualizacao em andamento com base na fonte primaria e dados disponiveis no momento.');
  }
  return pool.slice(0, 3).map((line) => `- ${truncate(line, 160)}`).join('\n');
}

function buildContext(sentences, title) {
  const intro = sentences.slice(0, 3).join(' ');
  return truncate(
    intro ||
      `A noticia "${title}" foi reorganizada em formato de curadoria para destacar fatos verificaveis e impacto pratico para o leitor.`,
    650
  );
}

function buildPractical(topic) {
  const map = {
    llms: [
      'Revisar dependencia de provedor unico de modelo em fluxos criticos.',
      'Comparar custo, latencia e qualidade antes de ampliar rollout.',
      'Criar plano de fallback para indisponibilidade ou mudanca de politica.'
    ],
    agentes: [
      'Definir limites de autonomia com pontos de aprovacao humana.',
      'Mapear tarefas de maior risco e registrar trilha de auditoria.',
      'Testar cenarios de erro para reduzir impacto operacional.'
    ],
    frameworks: [
      'Validar compatibilidade da stack antes de migrar componentes.',
      'Priorizar rollout gradual com monitoramento de regressao.',
      'Documentar lock-in tecnico e alternativas de saida.'
    ]
  };

  const defaults = [
    'Mapear onde essa mudanca impacta produto, operacao e suporte.',
    'Atualizar prioridades de backlog com base em risco e retorno.',
    'Registrar decisoes tecnicas para acelerar resposta do time.'
  ];

  return (map[topic] || defaults).map((line) => `- ${line}`).join('\n');
}

function buildChecklist(topic) {
  const defaults = [
    'Identificar sistemas e fluxos afetados nas proximas duas semanas.',
    'Definir owner tecnico para monitorar novas atualizacoes do tema.',
    'Publicar plano de acao curto com risco, prazo e responsavel.'
  ];
  return defaults.map((line) => `- ${line}`).join('\n');
}

function buildWatchList() {
  return [
    '- Novos comunicados oficiais das empresas e orgaos envolvidos.',
    '- Mudancas de politica, compliance ou regras de uso da tecnologia.',
    '- Indicadores de impacto real em usuarios, mercado ou produto.'
  ].join('\n');
}

function buildFaq() {
  return [
    '### O que aconteceu de fato?',
    'O caso envolve uma mudanca relevante no ecossistema que pode afetar adocao, operacao e risco em produtos digitais.',
    '',
    '### Qual impacto pratico para times de tecnologia?',
    'Times de produto e engenharia devem revisar dependencia, governanca e plano de contingencia para reduzir risco de interrupcao.',
    '',
    '### O que fazer agora?',
    'Priorize monitoramento, ajuste de backlog e comunicacao interna para reagir com rapidez a novas atualizacoes do tema.'
  ].join('\n');
}

function buildSourceTransparency(sourceUrl) {
  const safeSource = sourceUrl && /^https?:\/\//i.test(sourceUrl)
    ? sourceUrl
    : 'Fonte primaria nao informada';

  return [
    `- Fonte primaria: ${safeSource}`,
    '- Conteudo gerado automaticamente com curadoria editorial assistida por IA.',
    '- Para correcao de informacoes, abra um issue no repositorio oficial do projeto.'
  ].join('\n');
}

function buildStructuredBody(post, body) {
  const sentences = sentenceCandidates(body);
  const intro = truncate(
    `Entenda o contexto de "${post.title}" e o que muda na pratica para quem acompanha tecnologia, produto e negocios digitais.`,
    220
  );

  return [
    intro,
    '',
    '## Resumo em 3 bullets',
    buildSummary(sentences, post.title),
    '',
    '## Contexto',
    buildContext(sentences, post.title),
    '',
    '## O que muda na pratica',
    buildPractical(post.topic || ''),
    '',
    '## Checklist pratico',
    buildChecklist(post.topic || ''),
    '',
    '## O que observar nos proximos dias',
    buildWatchList(),
    '',
    '## FAQ',
    buildFaq(),
    '',
    '## Fonte e transparencia',
    buildSourceTransparency(post.primary_source || post.original_url),
    ''
  ].join('\n');
}

async function main() {
  const apply = process.argv.includes('--apply');
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

  const files = (await fs.readdir(config.POSTS_PATH)).filter((file) => file.endsWith('.md'));
  let processed = 0;
  let migrated = 0;
  let skipped = 0;

  for (const file of files) {
    if (processed >= limit) break;
    processed += 1;

    const filePath = path.join(config.POSTS_PATH, file);
    const markdown = await fs.readFile(filePath, 'utf8');
    const parsed = parseFrontmatter(markdown);
    if (!parsed) {
      skipped += 1;
      continue;
    }

    if (hasRequiredSections(parsed.body)) {
      skipped += 1;
      continue;
    }

    const rebuiltBody = buildStructuredBody(parsed.data, parsed.body);
    const updatedMarkdown = `${parsed.header}${rebuiltBody.trim()}\n`;

    if (apply) {
      await fs.writeFile(filePath, updatedMarkdown, 'utf8');
    }
    migrated += 1;
  }

  const mode = apply ? 'APPLY' : 'DRY-RUN';
  console.log(`[${mode}] Processados=${processed} | Migrados=${migrated} | Ignorados=${skipped}`);
  if (!apply) {
    console.log('Use --apply para gravar a migracao de conteudo.');
  }
}

main().catch((error) => {
  console.error('Falha na migracao de conteudo legado:', error.message);
  process.exit(1);
});
