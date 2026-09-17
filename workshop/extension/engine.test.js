import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIMITS, ROBOT_REPLIES, RUN_MODES, mergeGameRecord } from '../shared/game-contract.js';
import { gradeWorlds, parseCommand, parseLines, simulate, worldRng } from '../src/games/engine.js';
import { checkStructure, constantProblem } from './assessment.js';
import { assertCoding, findJdk, runGame } from './runner.js';

const resourceRoot = fileURLToPath(new URL('../', import.meta.url));
const jdk = await findJdk([path.join(resourceRoot, 'runtime', 'jdk')]);

const board = extra => ({ width: 6, height: 3, robot: { x: 0, y: 1, dir: 'E' }, walls: [], hurdles: [], items: [], characters: [], hoops: [], signs: [], ...extra });
const run = (world, output, commands) => simulate(world, output, commands ? { commands } : undefined);
const kinds = events => events.map(event => event.kind).join(' ');
const source = (...body) => `public class Student {\n    public static void main(String[] args) {\n${body.map(line => `        ${line}`).join('\n')}\n    }\n}\n`;
const say = line => `System.out.println(${JSON.stringify(line)});`;

test('lines become actions regardless of case, spacing, blank lines, and the final newline', () => {
  assert.deepEqual(parseLines('a\r\nb\n\n  c  \nd'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(parseLines('a\n'), ['a']);
  assert.deepEqual(parseLines(''), []);
  assert.deepEqual(parseLines('\n \n\t\n'), []);
  // Case is ignored and internal whitespace collapses for parsing only; speech
  // keeps its own case and spacing after trimming.
  const result = run(board({ width: 8 }), '  MOVE   2 \r\n\nTurn LEFT\n  Hello,   Arena!  ', ['move', 'turn']);
  assert.deepEqual(result.end.robot, { x: 2, y: 1, dir: 'N' });
  assert.deepEqual(result.end.said, ['Hello,   Arena!']);
  // `move 2` is one action but emits one movement event per tile.
  assert.equal(result.end.actions, 3);
  assert.equal(kinds(result.events), 'move move turn say');
  assert.deepEqual(result.events.map(event => event.action), [0, 0, 1, 2]);
  assert.deepEqual(result.events.map(event => event.seq), [1, 2, 3, 4]);
  // A final unterminated line counts as an action.
  assert.equal(run(board(), 'move 1', ['move']).end.actions, 1);
});

test('unknown verbs, malformed arguments, and near misses fall back to speech with a hint', () => {
  const commands = ['move', 'turn'];
  for (const line of ['move 0', 'move -2', 'move 2.5', 'move 2 3', 'move +2', 'turn up', 'turn']) {
    const result = run(board(), line, commands);
    assert.deepEqual(result.end.robot, { x: 0, y: 1, dir: 'E' }, line);
    assert.equal(result.end.said[0], line, line);
    assert.match(result.events[0].hint, /^Write `(move|turn)/, line);
  }
  // A canonical verb outside this game's list is named in the feedback.
  const barred = run(board(), 'shoot', commands);
  assert.equal(barred.events[0].hint, '`shoot` is not used in this game.');
  // One insertion, deletion, or substitution away from an allowed verb.
  for (const [line, hint] of [['mov 2', 'move'], ['moove 2', 'move'], ['mave 2', 'move'], ['trn left', 'turn']]) {
    assert.equal(run(board(), line, commands).events[0].hint, `Did you mean \`${hint}\`?`, line);
  }
  assert.equal(run(board(), 'Hello there', commands).events[0].hint, undefined);
  assert.equal(parseCommand('jump', ['move']).hint, '`jump` is not used in this game.');
  assert.deepEqual(parseCommand('MOVE  3', ['move']), { verb: 'move', tiles: 3 });
  assert.equal(parseCommand('hello world', ['move']), null);
  // Hints never fail a world and never add an action.
  assert.equal(barred.end.actions, 1);
  assert.equal(barred.end.bumped, false);
});

test('walls, edges, characters, and hurdles bump; a jump clears a hurdle', () => {
  const walled = run(board({ walls: [[2, 1]] }), 'move 5\nmove 1', ['move']);
  assert.equal(kinds(walled.events), 'move bump reply');
  assert.equal(walled.events.at(-2).reason, 'wall');
  assert.equal(walled.events.at(-1).text, ROBOT_REPLIES.bump);
  assert.deepEqual(walled.end.robot, { x: 1, y: 1, dir: 'E' });
  // The run stops at the first bump: the second line never becomes an action.
  assert.equal(walled.end.actions, 1);
  assert.equal(walled.end.bumped, true);

  assert.equal(run(board({ width: 2 }), 'move 9', ['move']).events.at(-2).reason, 'edge');
  assert.equal(run(board({ characters: [{ id: 'g', kind: 'greeter', x: 1, y: 1 }] }), 'move 1', ['move']).events.at(-2).reason, 'character');
  assert.equal(run(board({ hurdles: [[1, 1]] }), 'move 1', ['move']).events.at(-2).reason, 'hurdle');

  // `jump` lands on the hurdle tile and moving off it afterwards is allowed.
  const hopped = run(board({ hurdles: [[1, 1]] }), 'jump\nmove 1', ['move', 'jump']);
  assert.equal(kinds(hopped.events), 'jump move');
  assert.deepEqual(hopped.end.robot, { x: 2, y: 1, dir: 'E' });
  // A jump into a wall still bumps.
  assert.equal(run(board({ walls: [[1, 1]] }), 'jump', ['jump']).end.bumped, true);
});

test('exactly 1000 actions are allowed and the 1001st is rejected before it applies', () => {
  const lines = Array.from({ length: LIMITS.actions }, (_, i) => `line ${i}`);
  const at = run(board(), lines.join('\n'), []);
  assert.equal(at.end.actions, LIMITS.actions);
  assert.equal(at.end.limited, false);

  const over = run(board({ width: 3 }), [...lines, 'move 1'].join('\n'), ['move']);
  assert.equal(over.end.actions, LIMITS.actions);
  assert.equal(over.end.limited, true);
  assert.deepEqual(over.end.robot, { x: 0, y: 1, dir: 'E' }, 'the rejected action must not move the robot');
  assert.equal(over.events.at(-2).kind, 'limit');
  assert.equal(over.events.at(-2).action, LIMITS.actions);
  assert.equal(over.events.at(-1).text, ROBOT_REPLIES.limit);
});

test('a shopkeeper counts, pluralises, runs out, and ignores anything it cannot read', () => {
  const world = board({ characters: [{ id: 'shop-1', kind: 'shop', x: 1, y: 1, stock: { ball: 2 } }] });
  const result = run(world, ['Can I have 1 ball?', 'I would like 3 balls please', '2 balls', 'hello there', '0 balls'].join('\n'), []);
  const replies = result.events.filter(event => event.kind === 'reply').map(event => event.text);
  assert.deepEqual(replies, [
    'Here is 1 ball.',
    'Only 1 left.',
    'Sold out.',
    'I stock ball. What do you need?',
    'How many do you need? Try `3 balls please`.',
  ]);
  assert.deepEqual(result.end.held, { ball: 2 });
  assert.deepEqual(result.end.stock, { 'shop-1': { ball: 0 } });
  assert.deepEqual(result.end.acquired.map(item => item.kind), ['ball', 'ball']);
  assert.equal(new Set(result.end.acquired.map(item => item.id)).size, 2, 'granted items need distinct ids');
  const gives = result.events.filter(event => event.kind === 'give');
  assert.deepEqual(gives.map(event => event.count), [1, 1]);
  // Only the character directly ahead reacts.
  const behind = run(world, 'turn right\nCan I have 1 ball?', ['turn']);
  assert.deepEqual(behind.end.held, {});
  // A second stocked kind in the same sentence is ambiguous, so nothing moves.
  const two = board({ characters: [{ id: 'shop-2', kind: 'shop', x: 1, y: 1, stock: { ball: 5, crate: 5 } }] });
  assert.deepEqual(run(two, '2 balls and 1 crate', []).end.held, {});
});

test('a shot needs a ball, a clear line, and a hoop within five tiles', () => {
  const stocked = extra => board({ items: [{ id: 'b1', kind: 'ball', x: 0, y: 1 }, { id: 'b2', kind: 'ball', x: 0, y: 1 }], ...extra });
  const commands = ['pick', 'shoot', 'move'];
  assert.equal(run(board(), 'shoot', ['shoot']).events[0].text, ROBOT_REPLIES.noBall);

  const near = run(stocked({ hoops: [{ x: 3, y: 1 }] }), 'pick up\nshoot', commands);
  assert.equal(near.end.scored, 1);
  assert.deepEqual(near.end.held, { ball: 0 });
  assert.equal(near.events.at(-1).hit, true);

  // Out of range: the ball is still spent.
  const far = run({ ...stocked({ hoops: [{ x: 6, y: 1 }] }), width: 8 }, 'pick up\nshoot', commands);
  assert.equal(far.end.scored, 0);
  assert.deepEqual(far.end.held, { ball: 0 });

  // A wall blocks the shot; a hurdle does not.
  assert.equal(run(stocked({ hoops: [{ x: 3, y: 1 }], walls: [[2, 1]] }), 'pick up\nshoot', commands).end.scored, 0);
  assert.equal(run(stocked({ hoops: [{ x: 3, y: 1 }], hurdles: [[2, 1]] }), 'pick up\nshoot', commands).end.scored, 1);
  // Hoops are reusable.
  assert.equal(run(stocked({ hoops: [{ x: 3, y: 1 }] }), 'pick up\npick up\nshoot\nshoot', commands).end.scored, 2);
});

test('painting replaces a tile colour and a customer records what it receives', () => {
  const painted = run(board(), 'paint red\npaint blue\nmove 1\npaint green\npaint purple', ['paint', 'move']);
  assert.deepEqual(painted.end.painted, [{ x: 0, y: 1, color: 'blue' }, { x: 1, y: 1, color: 'green' }]);
  assert.equal(painted.end.said.at(-1), 'paint purple', 'an unknown colour is speech');

  const world = board({
    items: [{ id: 'c1', kind: 'crate', x: 0, y: 1 }],
    characters: [{ id: 'buyer-1', kind: 'customer', x: 1, y: 1, accepts: ['crate'], reply: 'Thanks!' }],
  });
  const delivered = run(world, 'pick up\ndrop', ['pick', 'drop']);
  assert.deepEqual(delivered.end.delivered, { 'buyer-1': { crate: 1 } });
  assert.deepEqual(delivered.end.held, { crate: 0 });
  assert.deepEqual(delivered.end.ground, [], 'a delivered crate does not land on the floor');
  assert.equal(delivered.events.at(-1).text, 'Thanks!');
});

test('inventory is a stack, bad drops change nothing, a gate opens, and the world is never mutated', () => {
  const world = board({
    items: [{ id: 'c1', kind: 'crate', x: 0, y: 1 }, { id: 'b1', kind: 'ball', x: 0, y: 1 }],
    characters: [{ id: 'gate-1', kind: 'gate', x: 3, y: 1, expectedPhrase: 'Open up', reply: 'Opening.' }],
    hoops: [{ x: 4, y: 1 }],
    walls: [[0, 0]],
  });
  const before = structuredClone(world);

  // `pick up` takes items in world-array order; `drop` returns the newest.
  const picked = run(world, 'pick up\npick up\ndrop', ['pick', 'drop']);
  assert.deepEqual(picked.end.acquired.map(item => item.id), ['c1']);
  assert.deepEqual(picked.end.ground, [{ id: 'b1', kind: 'ball', x: 1, y: 1 }]);
  assert.deepEqual(picked.end.held, { crate: 1, ball: 0 });

  // Empty-handed drops, drops into a wall, and drops onto a rejecting character
  // are no-ops that leave inventory untouched.
  const rejected = run(world, 'drop\nturn left\npick up\ndrop', ['pick', 'drop', 'turn']);
  assert.deepEqual(rejected.end.held, { crate: 1 });
  assert.deepEqual(rejected.end.acquired.map(item => item.id), ['c1']);
  assert.deepEqual(rejected.events.filter(event => event.kind === 'drop'), []);
  assert.equal(rejected.events[0].text, 'Nothing to drop.');

  // A closed gate blocks movement and shots; the exact phrase opens it.
  const shut = run(world, 'pick up\npick up\nmove 3', ['pick', 'move']);
  assert.equal(shut.events.at(-2).reason, 'gate');
  assert.deepEqual(shut.end.gates, { 'gate-1': false });
  assert.equal(run(world, 'pick up\nmove 2\nshoot', ['pick', 'move', 'shoot']).end.scored, 0);
  const opened = run(world, 'pick up\nmove 2\nOpen up\nshoot', ['pick', 'move', 'shoot']);
  assert.deepEqual(opened.end.gates, { 'gate-1': true });
  assert.equal(opened.end.scored, 0, 'the crate is not a ball');
  const scoring = run(world, 'pick up\npick up\nmove 2\nOpen up\nshoot', ['pick', 'move', 'shoot']);
  assert.equal(scoring.end.scored, 1, 'an opened gate no longer blocks the shot');
  // Case matters after trimming, and only the character directly ahead hears.
  assert.deepEqual(run(world, 'move 2\nopen up', ['move']).end.gates, { 'gate-1': false });
  assert.deepEqual(run(world, 'Open up', []).end.gates, { 'gate-1': false });

  assert.deepEqual(world, before, 'simulate must never mutate the world it is given');
});

test('stars are cumulative, par applies only to level 2, and projects stop at one', () => {
  const at = (level, passed, actions, par = 5) => ({ level, passed, end: { actions }, world: { par } });
  const three = [...[1, 2, 3].map(() => at(1, true, 9)), ...[1, 2, 3].map(() => at(2, true, 4))];
  assert.deepEqual(gradeWorlds(three), { stars: 3, best: 12 });

  const slow = [...[1, 2, 3].map(() => at(1, true, 9)), at(2, true, 4), at(2, true, 6), at(2, true, 4)];
  assert.deepEqual(gradeWorlds(slow), { stars: 2, best: null }, 'one world over par costs the third star');

  const partial = [...[1, 2, 3].map(() => at(1, true, 1)), at(2, true, 1), at(2, false, 1), at(2, true, 1)];
  assert.deepEqual(gradeWorlds(partial), { stars: 1, best: null }, 'a level-2 failure still earns the first star');

  const failed = [at(1, true, 1), at(1, false, 1), at(1, true, 1)];
  assert.deepEqual(gradeWorlds(failed), { stars: 0, best: null });
  assert.deepEqual(gradeWorlds([]), { stars: 0, best: null });

  assert.deepEqual(gradeWorlds([...[1, 2, 3].map(() => at(1, true, 99))], { project: true }), { stars: 1, best: null });
  assert.deepEqual(gradeWorlds(three, { project: true }), { stars: 1, best: null }, 'projects never keep a best');
  // A world with no authored par can never reach the third star.
  assert.equal(gradeWorlds([...[1, 2, 3].map(() => at(1, true, 1)), ...[1, 2, 3].map(() => at(2, true, 1, null))]).stars, 2);
});

test('a late result cannot take away a star, and a concept lesson has no coding path', () => {
  const saved = { stars: 3, best: 12, updatedAt: '2026-09-17T12:00:00.000Z' };
  const late = { stars: 1, best: 40, updatedAt: '2026-09-17T11:00:00.000Z' };
  assert.deepEqual(mergeGameRecord(saved, late, 'hoop-streak'), saved);
  assert.deepEqual(mergeGameRecord(late, saved, 'hoop-streak'), saved);

  assert.throws(() => assertCoding({ id: 'git-stage', kind: 'concept' }), /concept lesson/);
  assert.throws(() => assertCoding(undefined), /concept lesson/);
  assert.equal(assertCoding({ id: 'java-for', kind: 'console' }).id, 'java-for');
  assert.equal(assertCoding({ id: 'make-a-turn', kind: 'robot' }).id, 'make-a-turn');
});

test('nested loops, helper use, and world constants are checked before anything is replaced', () => {
  // Two separate loops are not a nested loop, whatever the flat count says.
  const separate = { loops: [{ kind: 'for', scope: 'main', depth: 1, parent: -1 }, { kind: 'for', scope: 'main', depth: 1, parent: -1 }] };
  const inside = { loops: [{ kind: 'for', scope: 'main', depth: 1, parent: -1 }, { kind: 'for', scope: 'main', depth: 2, parent: 0 }] };
  const rules = { requirements: { nested: { for: 2 } } };
  assert.equal(checkStructure(rules, separate)[0].passed, false);
  assert.equal(checkStructure(rules, inside)[0].passed, true);
  assert.equal(checkStructure({ requirements: { loops: { for: 2 } } }, separate)[0].passed, true, 'the flat count keeps its old meaning');
  // A while inside a for is not two nested for loops.
  assert.equal(checkStructure(rules, { loops: [{ kind: 'for', scope: 'main', depth: 1, parent: -1 }, { kind: 'while', scope: 'main', depth: 2, parent: 0 }] })[0].passed, false);

  const helper = { requirements: { methods: [{ name: 'side', returns: 'void', parameters: ['int'], used: true }] } };
  const declared = { methods: [{ name: 'side', returns: 'void', parameters: ['int'] }], calls: [], loops: [] };
  const called = { ...declared, calls: [{ name: 'side', scope: 'main' }] };
  const recursive = { ...declared, calls: [{ name: 'side', scope: 'side' }] };
  assert.deepEqual(checkStructure(helper, declared).map(check => check.passed), [true, false], 'a declared but unused helper fails');
  assert.deepEqual(checkStructure(helper, called).map(check => check.passed), [true, true]);
  assert.deepEqual(checkStructure(helper, recursive).map(check => check.passed), [true, false]);

  const analysis = { variables: [{ name: 'SHELVES', scope: 'class', type: 'int', final: true, start: 10, end: 11 }] };
  assert.equal(constantProblem(analysis, { SHELVES: 4 }), null);
  assert.match(constantProblem(analysis, { SHELVES: 'four' }), /Declare `SHELVES` as `String`/);
  assert.match(constantProblem({ variables: [] }, { SHELVES: 4 }), /public static final int SHELVES/);
  assert.match(constantProblem({ variables: [{ name: 'SHELVES', scope: 'main', type: 'int', final: false, start: 1, end: 2 }] }, { SHELVES: 4 }), /public static final int SHELVES/);
});

// ---------------------------------------------------------------- real Java

// Two moves per level, read from stdin: level 2 wants more of them.
const twoStep = {
  id: 'two-step',
  subtopic: '1.2',
  title: 'Two Step',
  commands: ['move'],
  brief: 'b', task: 't', starter: source('// nothing'), solution: '',
  world(rng, level) {
    const steps = level === 2 ? 3 : 1;
    return { ...board({ width: 6 }), input: `${steps}\n`, par: steps, data: { steps } };
  },
  goal(end, world) { return { passed: end.robot.x === world.data.steps, message: `Pip stopped at ${end.robot.x}.` }; },
};
const reader = (...body) => source('java.util.Scanner in = new java.util.Scanner(System.in);', 'int n = in.nextInt();', ...body);

// One compiled variant per distinct set of constants, reused within the run.
const shelfGame = {
  id: 'shelf-check',
  subtopic: '2.2',
  title: 'Shelf Check',
  commands: ['move'],
  brief: 'b', task: 't', starter: 'x', solution: 'x',
  world(rng, level) {
    const shelves = level === 2 ? 4 : 2;
    return { ...board({ width: 8 }), par: shelves, constants: { SHELVES: shelves }, data: { shelves } };
  },
  goal(end, world) { return { passed: end.robot.x === world.data.shelves, message: '' }; },
};
const shelfSource = 'public class Student {\n    public static final int SHELVES = 2;\n    public static void main(String[] args) {\n        for (int i = 0; i < SHELVES; i++) System.out.println("move 1");\n    }\n}\n';

const play = (game, code, options = {}) => runGame({ game, source: code, jdk, resourceRoot, seeds: [1, 2, 3], ...options });

test('a game run compiles once, grades every tier it enters, and skips level 2 after a level-1 failure', async () => {
  const perfect = await play(twoStep, reader('System.out.println("move " + n);'));
  assert.equal(perfect.stage, null, perfect.error);
  assert.equal(perfect.earnedStars, 3);
  assert.equal(perfect.best, 3, 'best is the summed actions of the three level-2 worlds');
  assert.equal(perfect.worlds.length, 6);
  assert.equal(perfect.compiles, 1, 'a game without constants compiles once');
  assert.deepEqual(perfect.worlds.map(world => world.level), [1, 1, 1, 2, 2, 2]);

  // Extra chatter is still an action, so par is missed and the third star is not.
  const chatty = await play(twoStep, reader('System.out.println("move " + n);', say('one'), say('two'), say('three')));
  assert.equal(chatty.earnedStars, 2);
  assert.equal(chatty.best, null);

  // Passes level 1, fails level 2: one star, and all three level-2 worlds still
  // run so the student sees every failure.
  const partial = await play(twoStep, source(say('move 1')));
  assert.equal(partial.earnedStars, 1);
  assert.equal(partial.worlds.length, 6);
  assert.deepEqual(partial.worlds.slice(3).map(world => world.passed), [false, false, false]);
  assert.match(partial.worlds[3].message, /Pip stopped at 1/);

  // Level 1 fails, so level 2 is never generated.
  const stuck = await play(twoStep, source(say('hello')));
  assert.equal(stuck.earnedStars, 0);
  assert.equal(stuck.worlds.length, 3);
  assert.equal(stuck.worlds.every(world => world.level === 1), true);
});

test('constants recompile per distinct variant and are verified before replacement', async () => {
  const result = await play(shelfGame, shelfSource);
  assert.equal(result.stage, null, result.error);
  assert.equal(result.earnedStars, 3);
  // One base compile plus one variant per level, not one per world.
  assert.equal(result.compiles, 3);
  assert.deepEqual(result.worlds.map(world => world.end.robot.x), [2, 2, 2, 4, 4, 4]);

  // A constant that is not a final class field is an engine error, not a
  // mislabelled student failure, and `replaceInputs` is never reached.
  const local = 'public class Student {\n    public static void main(String[] args) {\n        int SHELVES = 2;\n        for (int i = 0; i < SHELVES; i++) System.out.println("move 1");\n    }\n}\n';
  const rejected = await play(shelfGame, local);
  assert.equal(rejected.stage, 'simulate');
  assert.match(rejected.error, /public static final int SHELVES/);
  assert.equal(rejected.earnedStars, 0);
  assert.deepEqual(rejected.worlds, []);
});

test('compile, check, and process failures never pass a goal on partial output', async () => {
  const broken = await play(twoStep, 'public class Student { public static void main(String[] args) { oops } }');
  assert.equal(broken.stage, 'compile');
  assert.equal(broken.earnedStars, 0);
  assert.deepEqual(broken.worlds, []);
  assert.equal(broken.diagnostics[0].severity, 'error');

  // The winning line is printed and then the program dies: no world may pass.
  const dies = await play(twoStep, reader('System.out.println("move " + n);', 'System.exit(3);'));
  assert.equal(dies.stage, 'runtime');
  assert.equal(dies.earnedStars, 0);
  assert.deepEqual(dies.worlds, []);

  const required = { ...twoStep, requirements: { loops: { for: 1 } } };
  const noLoop = await play(required, reader('System.out.println("move " + n);'));
  assert.equal(noLoop.stage, 'checks');
  assert.equal(noLoop.earnedStars, 0);
  assert.equal(noLoop.sourceChecks[0].passed, false);
  assert.deepEqual(noLoop.worlds, []);
});

test('a stopped run keeps its finished worlds, saves nothing, and skips the rest', async () => {
  const controller = new AbortController();
  const result = await play(twoStep, reader('System.out.println("move " + n);'), {
    signal: controller.signal,
    onWorld: () => controller.abort(),
  });
  assert.equal(result.stage, 'runtime');
  assert.equal(result.error, 'Run cancelled.');
  assert.equal(result.earnedStars, 0);
  assert.equal(result.best, null);
  assert.equal(result.worlds.length, 1, 'the world that finished before the stop is kept for replay');
  assert.equal(result.worlds[0].passed, true);
});

test('an input experiment replays one world, grades nothing, and claims no stars', async () => {
  const result = await play(twoStep, reader('System.out.println("move " + n);'), { mode: RUN_MODES.custom, customInput: '2\n' });
  assert.equal(result.mode, RUN_MODES.custom);
  assert.equal(result.earnedStars, null, 'custom mode must never render a star claim');
  assert.equal(result.best, null);
  assert.equal(result.input, '2\n');
  assert.equal(result.generatedInput, '1\n');
  assert.equal(result.worlds.length, 1);
  assert.equal(result.worlds[0].passed, false);
  assert.equal(result.worlds[0].end.robot.x, 2, 'the typed input replaces stdin only');
  assert.match(result.worlds[0].message, /Input experiment/);

  // A failing structure check cannot block exploration.
  const checked = await runGame({ game: { ...twoStep, requirements: { loops: { for: 1 } } }, source: reader('System.out.println("move " + n);'), jdk, resourceRoot, seeds: [1], mode: RUN_MODES.custom, customInput: '2\n' });
  assert.equal(checked.stage, null, checked.error);
  assert.equal(checked.sourceChecks[0].passed, false);
});

test('worlds are reproducible per seed and level, and an unsolvable world is an engine error', async () => {
  for (const level of [1, 2]) {
    for (const seed of [1, 2, 3]) {
      assert.deepEqual(twoStep.world(worldRng(seed, level), level), twoStep.world(worldRng(seed, level), level));
    }
  }
  const offBoard = { ...twoStep, world: () => ({ ...board(), robot: { x: 99, y: 0, dir: 'E' } }) };
  const result = await play(offBoard, source(say('hello')));
  assert.equal(result.stage, 'simulate');
  assert.match(result.error, /robot must start on the board/);
  assert.deepEqual(result.worlds, []);
});
