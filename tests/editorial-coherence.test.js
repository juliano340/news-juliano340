const test = require('node:test');
const assert = require('node:assert/strict');

const ai = require('../ai');
const config = require('../config');
const editorial = require('../pipeline/editorial');
const quality = require('../pipeline/quality');

test('composer gera texto coerente para pauta de games sem forcar contexto dev', async () => {
  const originalGenerateEditorialDraft = ai.generateEditorialDraft;
  const originalAIRequired = config.AI_EDITORIAL_REQUIRED;
  config.AI_EDITORIAL_REQUIRED = false;
  ai.generateEditorialDraft = async () => null;

  try {
    const result = await editorial.compose({
      title: 'Avowed para PlayStation 5 e mais lancamentos de games da semana',
      raw_content: '<p>A semana traz novos jogos para PS5, Xbox e PC, com foco em RPG e acao.</p>',
      source: 'Tecmundo',
      original_url: 'https://www.tecmundo.com.br/voxel/603072-avowed-para-playstation-5.htm',
      date: '2026-02-15T19:30:00.000Z'
    });

    assert.equal(result.blocked, false);
    assert.ok(result.content.includes('## O que muda na pratica'));
    assert.ok(result.content.includes('Conferir plataformas e datas'));
    assert.equal(result.content.includes('time de engenharia'), false);
    assert.equal(result.content.includes('impasse entre as partes sobre requisitos de seguranca e governanca no uso de IA'), false);
  } finally {
    ai.generateEditorialDraft = originalGenerateEditorialDraft;
    config.AI_EDITORIAL_REQUIRED = originalAIRequired;
  }
});

test('quality gate bloqueia desalinhamento semantico entre titulo e corpo', () => {
  const post = {
    title: 'Ator famoso revela curiosidades de carreira no cinema',
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
      '## Para devs/negocios (checklist)',
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
