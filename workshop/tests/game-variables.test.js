import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { lockedInputProblem, variableProblem } from '../host/assessment.js';
import { findJdk, runGame } from '../host/runner.js';
import { projects } from '../src/games/projects.js';

const resourceRoot = fileURLToPath(new URL('../', import.meta.url));
const jdk = await findJdk([`${resourceRoot}/runtime/jdk`]);
const declaration = { name: 'energy', scope: 'main', type: 'int', start: 1, end: 3 };

test('changed local data requires exactly one initialized main variable with the matching type', () => {
  assert.equal(variableProblem({ variables: [declaration] }, { energy: 80 }), null);
  for (const variables of [[], [{ ...declaration, start: -1 }], [{ ...declaration, scope: 'class' }], [declaration, { ...declaration, scope: 'class' }]]) {
    assert.match(variableProblem({ variables }, { energy: 80 }), /int energy.*main/);
  }
  assert.match(variableProblem({ variables: [{ ...declaration, type: 'double' }] }, { energy: 80 }), /int/);
});

const world = { width: 3, height: 2, robot: { x: 0, y: 0, dir: 'E' }, constants: { TILES: 4 }, variables: { energy: 60, costPerTile: 3 } };
const game = { id: 'variable-probe', project: true, commands: [], world: () => world, goal: end => ({ passed: end.said.includes('48') }) };
const source = 'public class Student { public static final int TILES = 1; public static void main(String[] args) { int energy = 50; int costPerTile = 2; System.out.println(energy - TILES * costPerTile); } }';

test('local variables and class constants share a compiled variant without modifying the source', async () => {
  const result = await runGame({ game, source, jdk, resourceRoot, seeds: [1, 2, 3] });
  assert.equal(result.stage, null, result.error);
  assert.equal(result.earnedStars, 1);
  assert.equal(result.compiles, 2, 'one base compile and one cached data variant');
  assert.deepEqual(result.worlds.map(run => run.end.said), [['48'], ['48'], ['48']]);
  assert.match(source, /int energy = 50; int costPerTile = 2;/);
});

test('a missing initialized local variable is a clear source check, not an engine failure', async () => {
  const result = await runGame({ game, source: source.replace('int energy = 50;', 'int energy; energy = 50;'), jdk, resourceRoot, seeds: [1] });
  assert.equal(result.stage, 'checks');
  assert.equal(result.earnedStars, 0);
  assert.match(result.error, /energy.*starting value.*main/);
  assert.deepEqual(result.worlds, []);
});

test('locked inputs require the supplied final main declaration and literal value', () => {
  const text = 'final int energy = 50;';
  const input = { ...declaration, final: true, initializer: '50', start: 19, end: 21 };
  const analysis = { variables: [input], assignments: [] };
  assert.equal(lockedInputProblem(analysis, { energy: 50 }, text), null);
  for (const variables of [[], [{ ...input, final: false }], [{ ...input, scope: 'class' }], [{ ...input, type: 'double' }], [{ ...input, start: -1 }], [input, input]]) {
    assert.match(lockedInputProblem({ ...analysis, variables }, { energy: 50 }, text), /final int energy = 50;.*Restore starter/);
  }
  assert.match(lockedInputProblem(analysis, { energy: 50 }, text.replace('50', '51')), /final int energy = 50;/);
  assert.match(lockedInputProblem({ ...analysis, assignments: [{ name: 'energy', scope: 'main' }] }, { energy: 50 }, text), /final int energy = 50;/);
  assert.match(lockedInputProblem({ ...analysis, variables: [{ ...input, end: 23 }] }, { energy: 50 }, text.replace('50', '25+25')), /final int energy = 50;/);
});

const lockedInputs = { gap: 2, energy: 50, costPerTile: 2 };
const lockedSource = 'public class Student { public static void main(String[] args) { final int gap = 2; final int energy = 50; final int costPerTile = 2; System.out.println(energy - (gap + 1) * costPerTile); } }';
const lockedWorld = { width: 3, height: 2, robot: { x: 0, y: 0, dir: 'E' }, variables: { gap: 4, energy: 60, costPerTile: 3 } };
const lockedGame = { id: 'locked-variable-probe', project: true, commands: [], lockedInputs, sampleWorld: { ...lockedWorld, variables: lockedInputs }, world: () => lockedWorld, goal: end => ({ passed: end.said.includes('45') }) };

test('locked input values vary in temporary Java copies and trial uses the sample', async () => {
  const graded = await runGame({ game: lockedGame, source: lockedSource, jdk, resourceRoot, seeds: [1, 2] });
  assert.equal(graded.stage, null, graded.error);
  assert.equal(graded.earnedStars, 1);
  assert.deepEqual(graded.worlds.map(run => run.end.said), [['45'], ['45']]);
  const trial = await runGame({ game: lockedGame, source: lockedSource, jdk, resourceRoot, mode: 'custom', customInput: '', seeds: [1] });
  assert.equal(trial.stage, null, trial.error);
  assert.deepEqual(trial.worlds[0].end.said, ['44']);
  assert.match(lockedSource, /final int energy = 50;/);
});

test('trial, public Run and Submit reject tampered inputs, missing inputs and preserved older declarations', async () => {
  for (const source of [
    lockedSource.replace('gap = 2', 'gap = 4'),
    lockedSource.replace('energy = 50', 'energy = 25 + 25'),
    lockedSource.replace('final int costPerTile', 'int costPerTile'),
    lockedSource.replace('final int energy = 50;', 'final int energy; energy = 50;'),
    lockedSource.replace('final int gap = 2;', 'final int gap = 2; gap = 3;'),
    lockedSource.replace('final int gap = 2;', 'final int gap = 2; gap++;'),
  ]) {
    for (const mode of ['custom', 'public', 'graded']) {
      const result = await runGame({ game: lockedGame, source, jdk, resourceRoot, mode, customInput: '', seeds: [1] });
      assert.ok(['checks', 'compile'].includes(result.stage), `${mode}: ${result.error}`);
      assert.deepEqual(result.worlds, [], `${mode}: invalid supplied data must never execute`);
      if (result.stage === 'checks') assert.match(result.error, /Restore starter/);
    }
  }
});

test('Supply Relay always grades both input boundaries before generated cases', async () => {
  const game = projects.find(project => project.id === 'supply-relay');
  const result = await runGame({ game, source: game.solution, jdk, resourceRoot, seeds: [8, 9, 10] });
  assert.equal(result.stage, null, result.error);
  assert.equal(result.earnedStars, 1);
  assert.deepEqual(result.worlds.slice(0, 2).map(run => run.world.variables), [
    { gap: 1, energy: 60, costPerTile: 1 },
    { gap: 6, energy: 140, costPerTile: 3 },
  ]);
  assert.deepEqual(result.worlds.slice(0, 2).map(run => run.end.said), [
    ['Delivered 1 part; energy 58'], ['Delivered 1 part; energy 119'],
  ]);
  assert.ok(result.worlds.every(run => run.end.delivered.depot.part === 1));
  for (const prefix of ['hardcodes the sample movement', 'hardcodes three travelled', 'hardcodes 44']) {
    const source = game.rejects.find(reject => reject.label.startsWith(prefix)).source;
    const rejected = await runGame({ game, source, jdk, resourceRoot, seeds: [8, 9, 10] });
    assert.equal(rejected.earnedStars, 0, prefix);
    assert.ok(rejected.worlds.slice(0, 2).some(run => !run.passed), prefix);
  }
});
