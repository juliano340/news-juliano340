const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const Utils = require('../utils');

function extractMarkdownBody(markdown) {
  const match = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n([\s\S]*)$/);
  return match ? match[1].trim() : markdown.trim();
}

function findRussiaFixture() {
  const postsDir = path.join(__dirname, '..', 'content', 'posts');
  const files = fs.readdirSync(postsDir);
  const match = files.find((file) => file.includes('russia-bloqueia-whatsapp'));
  if (!match) throw new Error('Fixture russia-bloqueia-whatsapp not found in content/posts');
  return path.join(postsDir, match);
}

test('quebra texto corrido em paragrafos legiveis no caso Russia bloqueia WhatsApp', () => {
  const fixturePath = findRussiaFixture();
  const markdown = fs.readFileSync(fixturePath, 'utf8');
  const body = extractMarkdownBody(markdown);

  const formatted = Utils.formatArticleContent(body, {
    heroImageUrl:
      'https://s2-g1.glbimg.com/Wpa4Y-pcTGKH6lFYbuXvE7Lmbn0=/i.s3.glbimg.com/v1/AUTH_59edd422c0c84a879bd37670ae4f538a/internal_photos/bs/2019/4/M/T2gsreTEaBSDgPCiTBmg/whatsapp-ronaldo-prass.jpg'
  });

  const paragraphs = formatted.split(/\n\n+/).filter(Boolean);
  assert.ok(paragraphs.length >= 3, 'expected at least 3 readable paragraphs');
  assert.ok(!formatted.startsWith('<br'), 'formatted content cannot start with <br>');
  assert.ok(!/(<br\s*\/?>\s*){2,}/i.test(formatted), 'formatted content cannot rely on repeated <br>');
  assert.ok(formatted.includes('Financial Times'), 'must preserve factual text');

  const maxParagraphLength = Math.max(...paragraphs.map((p) => p.length));
  assert.ok(maxParagraphLength < 700, 'paragraphs should not be excessively long');
});

test('preserva links relevantes convertendo para markdown', () => {
  const raw = '<p>Leia <a href="https://example.com/noticia">esta analise</a> completa.</p>';
  const formatted = Utils.formatArticleContent(raw);

  assert.ok(
    formatted.includes('[esta analise](https://example.com/noticia)'),
    'link text and destination should be preserved'
  );
});

test('remove duplicacao desnecessaria de hero e mantem imagem editorial', () => {
  const raw = [
    '<img src="https://cdn.site/hero.jpg" alt="Hero" />',
    '<p>Texto de abertura com contexto.</p>',
    '<img src="https://cdn.site/inline.jpg" alt="Grafico" />'
  ].join('');

  const formatted = Utils.formatArticleContent(raw, { heroImageUrl: 'https://cdn.site/hero.jpg' });

  assert.ok(!formatted.includes('(https://cdn.site/hero.jpg)'), 'hero duplicate should be removed');
  assert.ok(formatted.includes('![Grafico](https://cdn.site/inline.jpg)'), 'inline image should remain');
});

test('formatacao e idempotente para markdown ja tratado', () => {
  const once = Utils.formatArticleContent('<p>Primeira frase. Segunda frase. Terceira frase.</p>');
  const twice = Utils.formatArticleContent(once);

  assert.equal(twice, once, 'running formatter twice should keep stable output');
});

test('emite aviso claro quando conteudo chega malformado', () => {
  const warnings = [];

  Utils.formatArticleContent('<<<<<< Texto sem fechamento', {
    onWarning: (reason, metadata) => warnings.push({ reason, metadata })
  });

  assert.ok(warnings.length >= 1, 'should emit warning for malformed content');
  assert.equal(warnings[0].reason, 'html_malformado');
});
