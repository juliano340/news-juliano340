const test = require('node:test');
const assert = require('node:assert/strict');

const ai = require('../ai');
const config = require('../config');
const editorial = require('../pipeline/editorial');
const quality = require('../pipeline/quality');

test('composer gera texto coerente para pauta de games sem forcar contexto dev', async () => {
  const originalGenerateEditorialArticle = ai.generateEditorialArticle;
  const originalAIRequired = config.AI_EDITORIAL_REQUIRED;
  config.AI_EDITORIAL_REQUIRED = true;
  ai.generateEditorialArticle = async () => ({
    content: [
      '# Avowed para PlayStation 5 e mais lancamentos de games da semana',
      'A semana traz novos jogos para PS5, Xbox e PC, com foco em RPG e acao.',
      '',
      '## Resumo em 3 bullets',
      '- Lancamentos relevantes para diferentes plataformas.',
      '- Comparacao de data, preco e disponibilidade.',
      '- Indicacoes para escolher em qual plataforma jogar.',
      '',
      '## Contexto',
      'A pauta esta ligada a lancamentos e comportamento de compra em jogos.',
      '',
      '## Insights e implicacoes',
      'Quem compara plataforma e desempenho inicial tende a acertar mais na escolha.',
      '',
      '## O que fazer agora',
      '- Conferir plataformas e datas.',
      '- Comparar preco no ecossistema de preferencia.',
      '- Avaliar desempenho inicial antes da compra.',
      '',
      '## O que vale acompanhar',
      '- Atualizacoes de preco.',
      '- Patches de desempenho.',
      '- Feedback da comunidade.',
      '',
      '## Fonte e transparencia',
      '- Fonte primaria: https://www.tecmundo.com.br/voxel/603072-avowed-para-playstation-5.htm',
      '',
      '## Por que isso importa',
      'Ajuda o leitor a comprar melhor e evitar arrependimento no lancamento.'
    ].join('\n'),
    post_type: 'standard',
    model_used: 'mock-model',
    latency_ms: 100,
    fallback_used: false,
    editorial_confidence: 90,
    risk_flags: []
  });

  try {
    const result = await editorial.compose({
      title: 'Avowed para PlayStation 5 e mais lancamentos de games da semana',
      raw_content: '<p>A semana traz novos jogos para PS5, Xbox e PC, com foco em RPG e acao.</p>',
      source: 'Tecmundo',
      original_url: 'https://www.tecmundo.com.br/voxel/603072-avowed-para-playstation-5.htm',
      date: '2026-02-15T19:30:00.000Z'
    });

    assert.equal(result.blocked, false);
    assert.equal(result.domain, 'games');
    assert.ok(result.content.includes('## O que fazer agora'));
    assert.ok(result.content.includes('Conferir plataformas e datas'));
    assert.equal(result.content.includes('time de engenharia'), false);
    assert.equal(result.content.includes('impasse entre as partes sobre requisitos de seguranca e governanca no uso de IA'), false);
  } finally {
    ai.generateEditorialArticle = originalGenerateEditorialArticle;
    config.AI_EDITORIAL_REQUIRED = originalAIRequired;
  }
});

test('quality gate bloqueia desalinhamento semantico entre titulo e corpo', () => {
  const post = {
    title: 'Ator famoso revela curiosidades de carreira no cinema',
    domain: 'entretenimento',
    source: 'Fonte Teste',
    original_url: 'https://example.com/entretenimento'
  };

  const editorialOutput = {
    primary_source: 'https://example.com/entretenimento',
    content: [
      'Times de engenharia devem priorizar backlog e roadmap tecnico.',
      '',
      '## Resumo em 3 bullets',
      '- Equipes de engenharia revisam deploy.',
      '- Backlog tecnico ganha prioridade.',
      '- Arquitetura precisa de ajustes.',
      '',
      '## Contexto',
      'A discussao afeta time de engenharia e criterio de deploy.',
      '',
      '## O que muda na pratica',
      '- Ajustar pipeline de deploy.',
      '- Revisar lead time.',
      '- Repriorizar backlog.',
      '',
      '## Checklist pratico',
      '- Definir owner tecnico.',
      '- Atualizar indicadores.',
      '- Revisar processos.',
      '',
      '## O que observar nos proximos dias',
      '- Mudancas de roadmap.',
      '- Ajustes de pipeline.',
      '- Revisao de arquitetura.',
      '',
      '## FAQ',
      '### O que aconteceu de fato?',
      'Resumo objetivo do caso.',
      '',
      '### Qual o impacto para times de tecnologia?',
      'Impacta backlog e deploy.',
      '',
      '### O que fazer agora?',
      'Ajustar arquitetura e processo.',
      '',
      '## Fonte e transparencia',
      '- Fonte primaria: https://example.com/entretenimento'
    ].join('\n')
  };

  const result = quality.evaluate(post, editorialOutput);
  assert.equal(result.status, 'BLOCK');
  assert.ok(result.reasons.includes('desalinhamento_semantico_titulo_corpo'));
});

test('composer evita viés ia-dev em pauta de consumo de hardware', async () => {
  const originalGenerateEditorialArticle = ai.generateEditorialArticle;
  const originalAIRequired = config.AI_EDITORIAL_REQUIRED;
  config.AI_EDITORIAL_REQUIRED = true;
  ai.generateEditorialArticle = async () => ({
    content: [
      '# Quanto voce economiza trazendo um iPad dos EUA?',
      'Comparativo de preco entre EUA e Brasil, com impostos e cotacao.',
      '',
      '## Resumo em 3 bullets',
      '- Diferença de preço pode ser relevante dependendo da cotação.',
      '- Impostos alteram o custo final.',
      '- Decisão depende de perfil de uso e momento de compra.',
      '',
      '## Contexto',
      'Mercado de hardware e custo total de compra internacional.',
      '',
      '## Insights e implicacoes',
      'Comparar preço final evita decisão por hype.',
      '',
      '## O que fazer agora',
      '- Simular custo total com impostos.',
      '- Comparar garantia e suporte local.',
      '- Avaliar se o ganho financeiro compensa o risco.',
      '',
      '## O que vale acompanhar',
      '- Variação de câmbio.',
      '- Preço no varejo local.',
      '- Disponibilidade de estoque.',
      '',
      '## Fonte e transparencia',
      '- Fonte primaria: https://canaltech.com.br/tablet/quanto-voce-economiza-trazendo-um-ipad-dos-eua/',
      '',
      '## Por que isso importa',
      'Economizar bem depende de conta completa, não só de preço de vitrine.'
    ].join('\n'),
    post_type: 'standard',
    model_used: 'mock-model',
    latency_ms: 100,
    fallback_used: false,
    editorial_confidence: 90,
    risk_flags: []
  });

  try {
    const result = await editorial.compose({
      title: 'Quanto voce economiza trazendo um iPad dos EUA?',
      raw_content: '<p>Comparativo de preco entre EUA e Brasil, com impostos e cotacao.</p><p>Inclui dicas de compra e limite de isencao alfandegaria.</p>',
      source: 'Canaltech',
      original_url: 'https://canaltech.com.br/tablet/quanto-voce-economiza-trazendo-um-ipad-dos-eua/',
      date: '2026-02-16T00:00:00.000Z'
    });

    assert.equal(result.blocked, false);
    assert.notEqual(result.domain, 'ia-dev');
    assert.equal(result.content.includes('governanca de implementacao'), false);
    assert.equal(result.content.includes('provedor de modelo'), false);
    assert.equal(result.content.includes('## Por que isso importa para devs'), false);
    assert.ok(result.content.includes('## Por que isso importa'));
  } finally {
    ai.generateEditorialArticle = originalGenerateEditorialArticle;
    config.AI_EDITORIAL_REQUIRED = originalAIRequired;
  }
});

test('composer usa template job roundup com seções orientadas a candidatura', async () => {
  const originalGenerateEditorialArticle = ai.generateEditorialArticle;
  const originalAIRequired = config.AI_EDITORIAL_REQUIRED;
  config.AI_EDITORIAL_REQUIRED = true;
  ai.generateEditorialArticle = async () => ({
    content: [
      '# Home office: 44 vagas para trabalho remoto internacional [15/02]',
      'Saiu uma lista com vagas remotas internacionais para candidatura online.',
      '',
      '## Resumo em 3 bullets',
      '- Lista de vagas atualizada.',
      '- Oportunidades em varias areas.',
      '- Links para candidatura.',
      '',
      '## Como usar esta lista',
      '- Filtrar por area e senioridade.',
      '- Ajustar CV e LinkedIn.',
      '- Priorizar vagas com maior aderencia.',
      '- Verificar idioma e fuso.',
      '',
      '## Destaques rapidos',
      '- Vagas em tecnologia (ex.: software engineer).',
      '- Vagas em produto (ex.: product manager).',
      '- Vagas em design (ex.: product designer).',
      '- Vagas em marketing (ex.: marketing specialist).',
      '- Vagas em vendas (ex.: sales representative).',
      '- Vagas administrativas (ex.: assistente administrativo).',
      '',
      '## Checklist de candidatura',
      '- CV em ingles.',
      '- LinkedIn atualizado.',
      '- Portfolio com casos reais.',
      '- Carta curta para cada vaga.',
      '- Revisar tipo de contrato.',
      '- Validar pagamento internacional.',
      '- Checar reputacao da empresa.',
      '- Organizar follow-up.',
      '',
      '## O que observar nos proximos dias',
      '- Novas listas semanais.',
      '- Vagas que fecham rapido.',
      '- Mudancas de requisito.',
      '- Novas areas com demanda.',
      '',
      '## FAQ',
      '### Preciso falar ingles para me candidatar?',
      'Na maioria dos casos, sim.',
      '### Fuso horario realmente importa?',
      'Sim, muitas vagas exigem sobreposicao minima.',
      '### Como receber em dolar ou euro trabalhando do Brasil?',
      'Depende do contrato e do meio de pagamento definido pela empresa.',
      '### Como evitar vagas falsas?',
      'Valide dominio, reputacao e canais oficiais.',
      '',
      '## Fonte e transparencia',
      '- Fonte primaria: https://www.tecmundo.com.br/mercado/410741-home-office-44-vagas-para-trabalho-remoto-internacional-1502.htm',
      '',
      '## Por que isso importa',
      'Uma boa curadoria reduz ruído e acelera candidatura com mais chance de aderência.'
    ].join('\n'),
    post_type: 'job_roundup',
    model_used: 'mock-model',
    latency_ms: 110,
    fallback_used: false,
    editorial_confidence: 92,
    risk_flags: []
  });

  try {
    const result = await editorial.compose({
      title: 'Home office: 44 vagas para trabalho remoto internacional [15/02]',
      raw_content: '<p>Lista com 44 vagas remotas internacionais para brasileiros em areas como marketing, design, produto e TI, com links para candidatura na Remotar.</p>',
      source: 'Tecmundo',
      original_url: 'https://www.tecmundo.com.br/mercado/410741-home-office-44-vagas-para-trabalho-remoto-internacional-1502.htm',
      date: '2026-02-16T00:00:00.000Z'
    });

    assert.equal(result.post_type, 'job_roundup');
    assert.ok(result.content.includes('## Como usar esta lista'));
    assert.ok(result.content.includes('## Checklist de candidatura'));
    assert.ok(result.content.includes('## FAQ'));
    assert.equal(result.content.includes('movimentos de concorrentes'), false);
    assert.equal(result.content.includes('resultados financeiros'), false);
  } finally {
    ai.generateEditorialArticle = originalGenerateEditorialArticle;
    config.AI_EDITORIAL_REQUIRED = originalAIRequired;
  }
});
