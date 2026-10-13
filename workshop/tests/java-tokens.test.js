import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeJava } from '../src/java-tokens.js';

test('loop comparisons distinguish names, operators and values', () => {
  assert.deepEqual(tokenizeJava('i <= count'), [
    {text:'i',kind:'variable'}, {text:' ',kind:null}, {text:'<=',kind:'operator'},
    {text:' ',kind:null}, {text:'count',kind:'variable'},
  ]);
  assert.deepEqual(tokenizeJava('int total = 0;').filter(part => part.kind).map(part => part.kind),
    ['keyword', 'variable', 'operator', 'literal', 'punctuation']);
});

test('comments and strings keep their contents intact instead of highlighting apparent Java inside them', () => {
  const source = 'System.out.println("for i <= 4 // \\\"Pip\\\""); // int count = 3;\n';
  const parts = tokenizeJava(source);
  assert.equal(parts.map(part => part.text).join(''), source);
  assert.deepEqual(parts.filter(part => part.kind === 'string').map(part => part.text), ['"for i <= 4 // \\\"Pip\\\""']);
  assert.equal(parts.at(-2).kind, 'comment');
  assert.equal(parts.find(part => part.text === 'println').kind, 'function');
  assert.equal(parts.find(part => part.text === 'System').kind, 'type');
});

test('examples retain every character including whitespace and unusual literals', () => {
  for (const source of ['', '\n    return values[i] >= -2.5;\n', "char marker = '\\n';", 'long limit = 1_000L; double scale = 2e-3;', '/* if (true) {} */\nboolean ready = false;', 'String text = "<img src=x>";']) {
    assert.equal(tokenizeJava(source).map(part => part.text).join(''), source);
  }
});
