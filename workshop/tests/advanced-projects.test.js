import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projects } from '../src/games/advanced-projects.js';
import { lessons } from '../src/curriculum.js';
import { validateWorld } from '../shared/game-contract.js';
import { worldRng, simulate } from '../src/games/engine.js';
import { findJdk, runGame } from '../host/runner.js';

const resourceRoot = fileURLToPath(new URL('../', import.meta.url));
const jdk = await findJdk([path.join(resourceRoot, 'runtime', 'jdk')]);

test('later homework includes known prerequisites, input contracts and code quizzes', () => {
  assert.deepEqual(projects.map(game => game.unit), ['decisions', 'arrays']);
  for (const game of projects) {
    assert.ok(game.prerequisites.every(id => lessons.some(lesson => lesson.id === id)));
    assert.ok(game.prerequisites.includes('java-scanner'));
    assert.ok(game.summary && game.inputHelp);
    assert.deepEqual(game.estimatedMinutes, [90, 180]);
    assert.equal(game.refresher.length, 3);
    assert.ok(game.refresher.every(question => question.code && question.choices[question.answer] && question.response));
    assert.equal(game.milestones.length, 5);
    assert.ok(game.sampleWorld.input && game.sources.length);
    for (const rng of [() => 0, () => 0.999999, worldRng(7, 1)]) {
      const world = game.world(rng, 1);
      assert.deepEqual(validateWorld(world), []);
      assert.equal(game.goal(simulate(world, '', game).end, world).passed, false);
    }
  }
  assert.ok(projects[0].prerequisites.includes('java-while'));
  assert.ok(!projects[0].prerequisites.includes('java-arrays'));
  assert.ok(projects[1].prerequisites.includes('java-2d-arrays'));
});

test('later project solutions pass sample, minimum, maximum, and changing worlds with real Java', async () => {
  for (const game of projects) {
    for (const world of [game.sampleWorld, game.world(() => 0, 1), game.world(() => 0.999999, 1)]) {
      const result = await runGame({ game: { ...game, world: () => world }, source: game.solution, jdk, resourceRoot, seeds: [1] });
      assert.equal(result.stage, null, `${game.id}: ${result.error}`);
      assert.equal(result.earnedStars, 1, `${game.id}: ${result.worlds.map(run => run.message)}`);
    }
    const generated = await runGame({ game, source: game.solution, jdk, resourceRoot, seeds: [1, 2, 3] });
    assert.equal(generated.earnedStars, 1, `${game.id}: ${generated.error}`);
  }
});

test('incorrect decisions, skipped rows and decorative helpers never complete later projects', async () => {
  for (const game of projects) {
    for (const rejected of [{ label: 'starter', source: game.starter }, ...game.rejects]) {
      const result = await runGame({ game, source: rejected.source, jdk, resourceRoot, seeds: [1, 2, 3] });
      assert.equal(result.earnedStars, 0, `${game.id}: ${rejected.label}`);
    }
  }
});
