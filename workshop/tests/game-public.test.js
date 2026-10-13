import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { findJdk, runGame } from '../host/runner.js';
import { RUN_MODES, PUBLIC_GAME_CASES, SUBMIT_GAME_CASES, validateWorld, worldResult } from '../shared/game-contract.js';
import { fixtures } from '../shared/game-fixtures.js';
import { games } from '../src/games/index.js';
import { publicGameWorld } from '../src/games/engine.js';

const resourceRoot = fileURLToPath(new URL('../', import.meta.url));
const jdk = await findJdk([`${resourceRoot}/src-tauri/jre`]);
const board = value => ({ width: 3, height: 2, robot: { x: 0, y: 0, dir: 'E' }, input: `${value}\n`, data: { value }, par: 10 });
const game = { id: 'public-case-probe', project: true, commands: [], sampleWorld: board(5), world: rng => board(1 + Math.floor(rng() * 9)), goal: (end, world) => ({ passed: end.said.includes(`Value ${world.data.value}`) }) };
const source = 'import java.util.Scanner; public class Student { public static void main(String[] args) { Scanner input = new Scanner(System.in); int n = input.nextInt(); System.out.println("Value " + n); } }';

test('visible cases are valid repeatable worlds, independent of saved or rendered mutations', () => {
  for (const entry of games) {
    for (let index = 0; index < PUBLIC_GAME_CASES; index++) {
      const once = publicGameWorld(entry, index), again = publicGameWorld(entry, index);
      assert.deepEqual(validateWorld(once), [], entry.id);
      assert.deepEqual(once, again, entry.id);
      once.robot.x = -100;
      assert.deepEqual(publicGameWorld(entry, index), again, entry.id);
    }
  }
});

test('public Run shows exactly three repeatable sample and boundary cases with input and raw output', async () => {
  const result = await runGame({ game: { ...game, requirements: { loops: { for: 1 } } }, source, jdk, resourceRoot, mode: RUN_MODES.public });
  assert.equal(result.stage, null, result.error);
  assert.equal(result.worlds.length, PUBLIC_GAME_CASES);
  assert.equal(result.earnedStars, null);
  assert.deepEqual(result.worlds.map(run => run.input), ['5\n', '1\n', '9\n']);
  assert.deepEqual(result.worlds.map(run => run.output), ['Value 5\n', 'Value 1\n', 'Value 9\n']);
  assert.deepEqual(result.worlds.map(run => run.label), ['Example 1', 'Example 2', 'Example 3']);
  assert.ok(result.worlds.every(run => run.passed));
  assert.ok(result.sourceChecks.some(check => !check.passed), 'unfinished structural work does not block public execution');
});

test('Submit runs twenty cases per entered tier and alone awards stars', async () => {
  const project = await runGame({ game, source, jdk, resourceRoot });
  assert.equal(project.worlds.length, SUBMIT_GAME_CASES);
  assert.equal(project.earnedStars, 1);
  const short = { ...game, project: false };
  const passed = await runGame({ game: short, source, jdk, resourceRoot });
  assert.equal(passed.worlds.length, SUBMIT_GAME_CASES * 2);
  assert.equal(passed.earnedStars, 3);
  const failed = await runGame({ game: { ...short, goal: () => ({ passed: false }) }, source, jdk, resourceRoot });
  assert.equal(failed.worlds.length, SUBMIT_GAME_CASES);
  assert.ok(failed.worlds.every(run => run.level === 1), 'a failed first tier still skips the second tier');
  assert.equal(failed.earnedStars, 0);
});

test('existing mode names and old result packets remain readable when new input/output fields are absent', () => {
  assert.equal(RUN_MODES.graded, 'graded');
  assert.equal(RUN_MODES.custom, 'custom');
  for (const result of [fixtures.success(), fixtures.inputExperiment()]) {
    for (const entry of result.worlds) for (const key of ['input', 'inputs', 'output', 'label']) delete entry[key];
    const before = structuredClone(result);
    for (const entry of result.worlds) {
      const normalized = worldResult(entry);
      assert.equal(normalized.level, entry.level);
      assert.deepEqual(normalized.world, entry.world);
      assert.equal(typeof normalized.input, 'string');
      assert.equal(typeof normalized.output, 'string');
    }
    assert.deepEqual(result, before, 'normalizing an old result does not mutate it');
  }
});
