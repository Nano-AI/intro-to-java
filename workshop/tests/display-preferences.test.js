import test from 'node:test';
import assert from 'node:assert/strict';
import { DISPLAY_KEYS, INTERFACE_SCALES, editorFontSize, interfaceScale, readDisplayPreference, saveDisplayPreference } from '../shared/display-preferences.js';

test('old editor font preferences remain readable without changing unrelated saved data', () => {
  const values = new Map([['pip.editorSize', '19'], ['pip.appearance', 'dark'], ['pip.route', '/game/supply-relay']]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(readDisplayPreference(storage, 'editorSize'), 19);
  assert.equal(readDisplayPreference(storage, 'interfaceScale'), 100);
  assert.equal(values.has(DISPLAY_KEYS.interfaceScale), false, 'reading never migrates preferences');
  saveDisplayPreference(storage, 'interfaceScale', 125);
  assert.equal(values.get('pip.editorSize'), '19');
  saveDisplayPreference(storage, 'editorSize', 20);
  assert.equal(values.get('pip.interfaceScale'), '125');
  assert.equal(values.get('pip.appearance'), 'dark');
  assert.equal(values.get('pip.route'), '/game/supply-relay');
  assert.equal(values.size, 4, 'no student progress or source keys are introduced');
});

test('display values remain bounded and unavailable storage has safe defaults', () => {
  for (const value of INTERFACE_SCALES) assert.equal(interfaceScale(String(value)), value);
  for (const value of [null, undefined, '', 'broken', 0, 500]) assert.equal(interfaceScale(value), 100);
  for (const value of [null, undefined, '', 'broken', Infinity]) assert.equal(editorFontSize(value), 15);
  assert.equal(editorFontSize(9), 10);
  assert.equal(editorFontSize(30), 28);
  const storage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(readDisplayPreference(storage, 'editorSize'), 15);
  assert.equal(saveDisplayPreference(storage, 'editorSize', 18), 18);
  assert.equal(saveDisplayPreference(storage, 'interfaceScale', 110), 110);
});
