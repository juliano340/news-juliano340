const test = require('node:test');
const assert = require('node:assert/strict');

const Utils = require('../utils');

test('preserva estrutura HTML principal sem truncar o conteúdo', () => {
  const raw = [
    '<p>Introducao com acento: ação.</p>',
    '<h2>Subtitulo</h2>',
    '<ul><li>Item 1</li><li>Item 2</li></ul>',
    '<p>Leia <a href="https://example.com/materia" target="_blank" rel="nofollow">a materia completa</a>.</p>'
  ].join('');

  const content = Utils.formatFullContent(raw);

  assert.ok(content.includes('<p>Introducao com acento: ação.</p>'));
  assert.ok(content.includes('<h2>Subtitulo</h2>'));
  assert.ok(content.includes('<ul><li>Item 1</li><li>Item 2</li></ul>'));
  assert.ok(content.includes('<a href="https://example.com/materia">a materia completa</a>'));
  assert.ok(!content.endsWith('...'));
});

test('remove scripts mantendo texto e tags seguras', () => {
  const raw = '<p>Texto</p><script>alert(1)</script><p>Final</p>';
  const content = Utils.formatFullContent(raw);

  assert.equal(content, '<p>Texto</p><p>Final</p>');
});
