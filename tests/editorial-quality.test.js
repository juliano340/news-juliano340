const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../config');
const editorial = require('../pipeline/editorial');
const quality = require('../pipeline/quality');

test('composer gera secoes editoriais obrigatorias', () => {
  const post = {
    title: 'Novo agente de IA reduz tempo de deploy em apps web',
    raw_content: '<p>Empresa X anunciou um agente autonomo para automacao de deploy em pipelines CI/CD.</p><p>A novidade inclui monitoramento e fallback em caso de erro.</p>',
    source: 'Fonte Teste',
    source_url: 'https://example.com/feed',
    original_url: 'https://example.com/noticia',
    date: '2026-02-13T10:00:00.000Z'
  };

  const result = editorial.compose(post);

  assert.ok(result.content.includes('## Resumo em 3 bullets'));
  assert.ok(result.content.includes('- **Topico 1**:'), 'summary should include named topic bullets');
  assert.ok(result.content.includes('## Por que isso importa para devs'));
  assert.ok(result.content.includes('## O que muda na pratica'));
  assert.ok(result.content.includes('## Contexto rapido'));
  assert.ok(result.content.includes('## Fonte primaria'));
  assert.equal(result.primary_source, 'https://example.com/noticia');
  assert.equal(result.content_kind, 'news-curated');
});

test('quality gate aprova conteudo curado completo', () => {
  const post = {
    source: 'Fonte Teste',
    original_url: 'https://example.com/noticia'
  };

  const editorialOutput = editorial.compose({
    title: 'LLM open source melhora coding assistant para equipes de dev',
    raw_content: '<p>Uma nova versao de LLM melhora performance de sugestoes em IDE e reduz latencia para autocomplete.</p><p>Equipes de engenharia devem revisar custo por token e fallback multi-modelo.</p>',
    source: 'Fonte Teste',
    original_url: 'https://example.com/noticia',
    date: '2026-02-13T10:00:00.000Z'
  });

  const result = quality.evaluate(post, editorialOutput);

  assert.equal(result.passed, true);
  assert.ok(result.score >= result.threshold);
  assert.equal(result.reasons.length, 0);
  assert.equal(result.checks.length, 5);
  assert.ok(result.checks.every((check) => check.passed));
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
  assert.ok(result.checks.some((check) => check.id === 'sections' && check.passed === false));
});

test('quality gate respeita pesos configuraveis', () => {
  const post = {
    source: 'Fonte Teste',
    original_url: 'https://example.com/noticia'
  };

  const editorialOutput = editorial.compose({
    title: 'Atualizacao de framework para IA em ambiente de producao',
    raw_content: '<p>Framework recebe atualizacoes para deploy e observabilidade de agentes em pipelines de engenharia.</p><p>Times podem reduzir latencia e padronizar monitoramento.</p>',
    source: 'Fonte Teste',
    original_url: 'https://example.com/noticia',
    date: '2026-02-13T10:00:00.000Z'
  });

  const oldWeights = { ...config.QUALITY_WEIGHTS };

  try {
    config.QUALITY_WEIGHTS.sections = 0;
    config.QUALITY_WEIGHTS.summary_bullets = 0;
    config.QUALITY_WEIGHTS.primary_source = 0;
    config.QUALITY_WEIGHTS.editorial_analysis = 0;
    config.QUALITY_WEIGHTS.min_length = 0;

    const result = quality.evaluate(post, editorialOutput);
    assert.equal(result.score, 0);
    assert.equal(result.passed, false);
  } finally {
    config.QUALITY_WEIGHTS.sections = oldWeights.sections;
    config.QUALITY_WEIGHTS.summary_bullets = oldWeights.summary_bullets;
    config.QUALITY_WEIGHTS.primary_source = oldWeights.primary_source;
    config.QUALITY_WEIGHTS.editorial_analysis = oldWeights.editorial_analysis;
    config.QUALITY_WEIGHTS.min_length = oldWeights.min_length;
  }
});
