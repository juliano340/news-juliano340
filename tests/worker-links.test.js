const test = require('node:test');
const assert = require('node:assert/strict');

const NewsWorker = require('../worker');

test('seleciona links relacionados por topico e tags', () => {
  const worker = new NewsWorker();
  worker.postIndex = [
    {
      slug: 'post-a',
      title: 'Post A',
      topic: 'llms',
      date: '2026-02-10T10:00:00.000Z',
      tags: ['ia', 'anthropic']
    },
    {
      slug: 'post-b',
      title: 'Post B',
      topic: 'llms',
      date: '2026-02-09T10:00:00.000Z',
      tags: ['ia']
    },
    {
      slug: 'post-c',
      title: 'Post C',
      topic: 'seguranca-ia',
      date: '2026-01-10T10:00:00.000Z',
      tags: ['compliance']
    }
  ];

  const related = worker.getRelatedLinks(
    {
      slug: 'novo-post',
      topic: 'llms',
      tags: ['ia', 'anthropic'],
      date: '2026-02-11T10:00:00.000Z'
    },
    3
  );

  assert.ok(related.length >= 2);
  assert.equal(related[0].slug, 'post-a');
  assert.equal(related[1].slug, 'post-b');
});

test('adiciona secao de leitura relacionada no conteudo', () => {
  const worker = new NewsWorker();
  const content = '## Resumo em 3 bullets\n- Item 1\n- Item 2\n- Item 3';
  const enriched = worker.appendRelatedLinks(content, [
    { slug: 'abc', title: 'Titulo ABC' },
    { slug: 'def', title: 'Titulo DEF' }
  ]);

  assert.ok(enriched.includes('## Leitura relacionada'));
  assert.ok(enriched.includes('[Titulo ABC](/posts/abc)'));
  assert.ok(enriched.includes('[Titulo DEF](/posts/def)'));
});

test('gera metadata SEO e schema obrigatorios', () => {
  const worker = new NewsWorker();
  const metadata = worker.buildSeoMetadata({
    slug: 'post-teste',
    title: 'Pentagono ameaca cortar Anthropic em disputa sobre salvaguardas de IA',
    date: '2026-02-15T15:49:53.000Z',
    summary_text: 'Pentagono pode suspender contratos com Anthropic por divergencia sobre salvaguardas de IA em sistemas sensiveis.'
  });

  assert.equal(metadata.canonical_url, 'https://news.juliano340.com/posts/post-teste');
  assert.equal(metadata.schema_type, 'NewsArticle');
  assert.equal(metadata.og_type, 'article');
  assert.ok(metadata.meta_description.length >= 140 && metadata.meta_description.length <= 160);
});

test('valida metadata e bloqueia quando campos obrigatorios faltam', () => {
  const worker = new NewsWorker();
  const report = worker.validatePostMetadata({
    title: 'Titulo',
    slug: 'slug-valido',
    date: '2026-02-15T15:49:53.000Z'
  });

  assert.equal(report.status, 'BLOCK');
  assert.ok(report.errors.length > 0);
  assert.ok(report.checks.some((check) => check.id === 'required_meta_description' && check.status === 'FAIL'));
});
