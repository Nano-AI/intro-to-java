import test from 'node:test';
import assert from 'node:assert/strict';
import { gameCommands, isGameCommandPosition } from '../shared/game-commands.js';
import { COLORS, VERBS } from '../shared/game-contract.js';
import { parseCommand, simulate } from '../src/games/engine.js';

const output = entry => JSON.parse(/^System\.out\.println\((".*")\);$/.exec(entry.code)?.[1]);
const board = extra => ({ width: 8, height: 5, robot: { x: 1, y: 2, dir: 'E' }, ...extra });

test('the reference and autocomplete insert valid Java print statements for every supported command', () => {
  const entries = gameCommands({ commands: VERBS });
  assert.equal(new Set(entries.map(entry => entry.label)).size, entries.length);
  for (const entry of entries) {
    assert.match(entry.label, /^pip[A-Z]/);
    assert.ok(entry.description);
    const line = output(entry);
    const command = parseCommand(line);
    assert.ok(command === null || !command.speech, entry.label);
    assert.equal(entry.insertText.replace(/\$\{\d+:([^}]+)\}/g, '$1'), entry.code);
  }
  assert.deepEqual(new Set(entries.flatMap(entry => parseCommand(output(entry))?.verb ?? [])), new Set(VERBS));
  assert.ok(COLORS.every(color => entries.find(entry => entry.label === 'pipPaint').description.includes(color)));
});

test('the list hides unavailable commands while keeping speech', () => {
  assert.deepEqual(gameCommands({ commands: [] }).map(entry => entry.label), ['pipSay']);
  assert.deepEqual(gameCommands({ commands: ['move', 'turn'] }).map(entry => entry.label), ['pipMove', 'pipTurnLeft', 'pipTurnRight', 'pipSay']);
  assert.deepEqual(gameCommands({ commands: ['pick', 'drop'] }).map(entry => entry.label), ['pipPickUp', 'pipDrop', 'pipSay']);
  assert.deepEqual(gameCommands({}).map(entry => entry.label), gameCommands({ commands: VERBS }).map(entry => entry.label));
});

test('the exact ball request works when facing the shop and a shot reaches a hoop five tiles away', () => {
  const entries = gameCommands({ commands: ['move', 'turn', 'shoot'] });
  const request = output(entries.find(entry => entry.label === 'pipRequestBalls'));
  const shoot = output(entries.find(entry => entry.label === 'pipShoot'));
  const result = simulate(board({
    characters: [{ id: 'shop', kind: 'shop', x: 2, y: 2, stock: { ball: 3 } }],
    hoops: [{ x: 6, y: 2 }],
  }), `${request}\n${shoot}`, { commands: ['move', 'turn', 'shoot'] });
  assert.equal(result.end.scored, 1);
  assert.equal(result.end.held.ball, 2);
  assert.match(entries.find(entry => entry.label === 'pipRequestBalls').description, /directly ahead/);
  assert.match(entries.find(entry => entry.label === 'pipShoot').description, /five tiles/);
});

test('movement, pickup and drop examples match their documented tile positions', () => {
  const entries = gameCommands({ commands: ['move', 'pick', 'drop'] });
  const lines = ['pipMove', 'pipPickUp', 'pipDrop'].map(label => output(entries.find(entry => entry.label === label)));
  const result = simulate(board({ items: [{ id: 'part', kind: 'part', x: 4, y: 2 }] }), lines.join('\n'));
  assert.deepEqual(result.end.robot, { x: 4, y: 2, dir: 'E' });
  assert.equal(result.end.held.part, 0);
  const drop = result.events.find(event => event.kind === 'drop');
  assert.deepEqual(drop.at, { x: 5, y: 2 });
});

test('game snippets stay out of comments, strings and Java member completions', () => {
  const allowed = text => {
    const offset = text.indexOf('|');
    return isGameCommandPosition(text.replace('|', ''), offset);
  };
  for (const text of [
    'class Student { void run() { pi| } }',
    'class Student { void run() { /* note */ pi| } }',
    'class Student { void run() { // Print commands.\n pi| } }',
    'class Student { void run() { // Print commands.\r\n pi| } }',
    'class Student { void run() { String name = "Pip"; pi| } }',
  ]) assert.equal(allowed(text), true, text);
  for (const text of [
    'class Student { void run() { // pi|\n } }',
    'class Student { void run() { /* pi| */ } }',
    'class Student { void run() { /* pi|',
    'class Student { void run() { String name = "pi|"; } }',
    'class Student { void run() { String name = "pi|',
    'class Student { void run() { String name = "pi\\|',
    'class Student { void run() { String name = "// \\" pi|"; } }',
    "class Student { void run() { char letter = 'p|'; } }",
    "class Student { void run() { char letter = 'p|",
    'class Student { void run() { String text = """\npi|\n"""; } }',
    'class Student { void run() { System.out.pi| } }',
    'class Student { void run() { System.out. pi| } }',
    'class Student { void run() { System.out.\n pi| } }',
  ]) assert.equal(allowed(text), false, text);
});
