const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../config');
const ai = require('../ai');
const editorial = require('../pipeline/editorial');
const quality = require('../pipeline/quality');

test('composer gera secoes editoriais obrigatorias', async () => {
  const originalGenerateEditorialDraft = ai.generateEditorialDraft;
  const originalAIRequired = config.AI_EDITORIAL_REQUIRED;
  config.AI_EDITORIAL_REQUIRED = false;
  ai.generateEditorialDraft = async () => null;

  try {
    const post = {
      title: 'Novo agente de IA reduz tempo de deploy em apps web',
      raw_content: '<p>Empresa X anunciou um agente autonomo para automacao de deploy em pipelines CI/CD.</p><p>A novidade inclui monitoramento e fallback em caso de erro.</p>',
      source: 'Fonte Teste',
      source_url: 'https://example.com/feed',
      original_url: 'https://example.com/noticia',
      date: '2026-02-13T10:00:00.000Z'
    };

    const result = await editorial.compose(post);

    assert.ok(result.content.includes('## Resumo em 3 bullets'));
    assert.ok(result.content.includes('- '), 'summary should include bullets');
    assert.equal(result.content.includes('**Topico 1**'), false, 'summary should not include numbered topic labels');
    assert.ok(result.content.includes('## Contexto'));
    assert.ok(result.content.includes('## Insights e implicacoes'));
    assert.ok(result.content.includes('## O que fazer agora'));
    assert.ok(result.content.includes('## O que vale acompanhar'));
    assert.ok(result.content.includes('## Fonte e transparencia'));
    assert.equal(result.primary_source, 'https://example.com/noticia');
    assert.equal(result.content_kind, 'news-curated');
  } finally {
    ai.generateEditorialDraft = originalGenerateEditorialDraft;
    config.AI_EDITORIAL_REQUIRED = originalAIRequired;
  }
});

test('quality gate aprova conteudo curado completo', async () => {
  const originalGenerateEditorialDraft = ai.generateEditorialDraft;
  const originalAIRequired = config.AI_EDITORIAL_REQUIRED;
  config.AI_EDITORIAL_REQUIRED = false;
  ai.generateEditorialDraft = async () => null;

  try {
    const post = {
      source: 'Fonte Teste',
      original_url: 'https://example.com/noticia'
    };

    const editorialOutput = await editorial.compose({
      title: 'LLM open source melhora coding assistant para equipes de dev',
      raw_content: '<p>Uma nova versao de LLM melhora performance de sugestoes em IDE e reduz latencia para autocomplete.</p><p>Equipes de engenharia devem revisar custo por token e fallback multi-modelo.</p>',
      source: 'Fonte Teste',
      original_url: 'https://example.com/noticia',
      date: '2026-02-13T10:00:00.000Z'
    });

    const result = quality.evaluate(post, editorialOutput);

    assert.equal(result.passed, true);
    assert.equal(result.reasons.length, 0);
    assert.equal(result.status, 'WARN');
    assert.ok(result.warnings.includes('poucos_links_internos'));
    assert.ok(result.checks.every((check) => check.status === 'PASS' || check.id === 'internal_links'));
  } finally {
    ai.generateEditorialDraft = originalGenerateEditorialDraft;
    config.AI_EDITORIAL_REQUIRED = originalAIRequired;
  }
});

test('quality gate reprova conteudo sem estrutura editorial', () => {
  const post = {
    source: 'Fonte Teste',
    original_url: 'https://example.com/noticia'
  };

  const lowQuality = {
    content: 'Texto curto sem estrutura e sem valor adicional.',
    primary_source: ''
  };

  const result = quality.evaluate(post, lowQuality);

  assert.equal(result.passed, false);
  assert.equal(result.shouldDiscard, true);
  assert.ok(result.reasons.includes('secoes_obrigatorias_ausentes'));
  assert.ok(result.reasons.includes('fonte_primaria_invalida'));
  assert.ok(result.checks.some((check) => check.id === 'sections' && check.status === 'FAIL'));
});

test('quality gate respeita pesos configuraveis', async () => {
  const originalGenerateEditorialDraft = ai.generateEditorialDraft;
  const originalAIRequired = config.AI_EDITORIAL_REQUIRED;
  config.AI_EDITORIAL_REQUIRED = false;
  ai.generateEditorialDraft = async () => null;

  try {
    const post = {
      source: 'Fonte Teste',
      original_url: 'https://example.com/noticia'
    };

    const editorialOutput = await editorial.compose({
      title: 'Atualizacao de framework para IA em ambiente de producao',
      raw_content: '<p>Framework recebe atualizacoes para deploy e observabilidade de agentes em pipelines de engenharia.</p><p>Times podem reduzir latencia e padronizar monitoramento.</p>',
      source: 'Fonte Teste',
      original_url: 'https://example.com/noticia',
      date: '2026-02-13T10:00:00.000Z'
    });

    const oldMinWords = config.QUALITY_LIMITS.min_word_count;
    try {
      config.QUALITY_LIMITS.min_word_count = 9999;

      const result = quality.evaluate(post, editorialOutput);
      assert.equal(result.status, 'BLOCK');
      assert.equal(result.passed, false);
    } finally {
      config.QUALITY_LIMITS.min_word_count = oldMinWords;
    }
  } finally {
    ai.generateEditorialDraft = originalGenerateEditorialDraft;
    config.AI_EDITORIAL_REQUIRED = originalAIRequired;
  }
});

test('composer usa output da IA quando draft valido', async () => {
  const originalGenerateEditorialDraft = ai.generateEditorialDraft;
  const originalAIRequired = config.AI_EDITORIAL_REQUIRED;
  config.AI_EDITORIAL_REQUIRED = false;
  ai.generateEditorialDraft = async () => ({
    summary_bullets: ['Mudanca em LLM reduz latencia para inferencia.', 'Fornecedor anunciou novo limite de contexto.', 'Times podem otimizar custo por requisicao.'],
    why_matters: 'A atualizacao muda a relacao custo-performance para apps de IA em producao e exige revisao de arquitetura no backlog tecnico.',
    practical_actions: ['Rodar benchmark com carga real.', 'Revisar fallback entre provedores.', 'Atualizar limites de custo e alertas.'],
    context_bullets: ['Anuncio oficial divulgado pelo fornecedor.', 'Impacto imediato em workloads de inferencia.'],
    source_reference: 'https://example.com/noticia',
    editorial_confidence: 82,
    risk_flags: [],
    model_used: 'qwen/qwen-2.5-72b-instruct:free',
    fallback_used: false,
    latency_ms: 900
  });

  try {
    const result = await editorial.compose({
      title: 'Fornecedor atualiza LLM com novo contexto',
      raw_content: '<p>Fornecedor anunciou atualizacao.</p>',
      source: 'Fonte Teste',
      original_url: 'https://example.com/noticia',
      date: '2026-02-13T10:00:00.000Z'
    });

    assert.equal(result.editorial_mode, 'ai_primary_model');
    assert.ok(result.content.includes('Rodar benchmark com carga real'));
    assert.ok(result.content.includes('## Resumo em 3 bullets'));
    assert.equal(result.ai_metadata.model_used, 'qwen/qwen-2.5-72b-instruct:free');
  } finally {
    ai.generateEditorialDraft = originalGenerateEditorialDraft;
    config.AI_EDITORIAL_REQUIRED = originalAIRequired;
  }
});

test('composer bloqueia publicacao quando IA e obrigatoria e draft falha', async () => {
  const originalGenerateEditorialDraft = ai.generateEditorialDraft;
  const originalAIRequired = config.AI_EDITORIAL_REQUIRED;
  config.AI_EDITORIAL_REQUIRED = true;
  ai.generateEditorialDraft = async () => null;

  try {
    const result = await editorial.compose({
      title: 'Teste de bloqueio por IA obrigatoria em LLM para devs',
      raw_content: '<p>Conteudo de teste.</p>',
      source: 'Fonte Teste',
      original_url: 'https://example.com/noticia',
      date: '2026-02-13T10:00:00.000Z'
    });

    assert.equal(result.blocked, true);
    assert.equal(result.block_reason, 'ai_generation_failed');
  } finally {
    ai.generateEditorialDraft = originalGenerateEditorialDraft;
    config.AI_EDITORIAL_REQUIRED = originalAIRequired;
  }
});
