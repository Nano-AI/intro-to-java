import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projects } from '../src/games/projects.js';
import { lessons } from '../src/curriculum.js';
import { validateWorld } from '../shared/game-contract.js';
import { worldRng, simulate } from '../src/games/engine.js';
import { findJdk, runGame } from '../host/runner.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const knownLessons = new Set(lessons.map(lesson => lesson.id));

test('homework covers the first three units without requiring later Java features', () => {
  assert.deepEqual(projects.map(project => project.unit), ['basics', 'loops', 'methods']);
  for (const project of projects) {
    assert.equal(project.project, true);
    assert.ok(project.prerequisites.length > 0);
    assert.ok(project.prerequisites.every(id => knownLessons.has(id)), project.id);
    assert.ok(project.milestones.length >= 4 && project.milestones.length <= 5);
    assert.ok(project.milestones.every(step => step.title && step.text && step.check));
    assert.equal(project.refresher.length, 3);
    for (const question of project.refresher) {
      assert.ok(question.code && question.title && question.response);
      assert.ok(question.answer >= 0 && question.answer < question.choices.length);
    }
    assert.ok(project.sources.every(source => /^https:\/\/(?:web\.stanford\.edu|compedu\.stanford\.edu|courses\.cs\.washington\.edu)\//.test(source.url) && source.adaptation));
    assert.doesNotMatch(project.solution, /\b(?:Scanner|while|if)\s*\(?/);
    assert.deepEqual(validateWorld(project.sampleWorld), [], project.id);
    assert.ok(project.rejects.length >= 3, `${project.id}: include meaningful incorrect solutions`);
    assert.ok(project.topics.length >= 3);
  }
  assert.ok(projects[1].prerequisites.includes('java-nested'));
  assert.ok(projects[1].prerequisites.includes('java-constants'));
  assert.ok(projects[2].prerequisites.includes('java-methods'));
  assert.ok(projects[2].prerequisites.includes('java-returns'));
  assert.doesNotMatch(projects[0].solution, /\bfor\b/);
  assert.deepEqual(projects[0].lockedInputs, { gap: 2, energy: 50, costPerTile: 2 });
  assert.equal((projects[0].starter.match(/final int /g) || []).length, 3, 'only supplied input declarations introduce final');
});

test('Supply Relay is one short delivery and varies distance as well as energy inputs', () => {
  const project = projects[0];
  assert.deepEqual(project.estimatedMinutes, [30, 60]);
  for (const world of [project.sampleWorld, project.world(() => 0), project.world(() => 0.999999)]) {
    assert.equal(world.items.length, 1);
    assert.equal(world.items[0].x - world.robot.x, world.variables.gap);
    assert.deepEqual(world.finish, { x: world.items[0].x, y: world.items[0].y - 1, dir: 'N' });
    assert.equal(world.data.travel, world.variables.gap + 1);
    assert.equal(world.data.remaining, world.variables.energy - world.data.travel * world.variables.costPerTile);
  }
  assert.equal(project.sampleWorld.data.remaining, 44);
  assert.notEqual(project.world(() => 0).variables.gap, project.world(() => 0.999999).variables.gap);
});

test('project worlds expose their finish and data, including smallest and largest sizes', () => {
  for (const project of projects) {
    for (const random of [() => 0, () => 0.999999, worldRng(7, 1)]) {
      const world = project.world(random, 1);
      assert.deepEqual(validateWorld(world), [], project.id);
      assert.ok(world.finish && world.data);
      const untouched = simulate(world, '', project).end;
      assert.equal(project.goal(untouched, world).passed, false, `${project.id}: an empty program must fail`);
    }
  }
});

test('project reference solutions pass the real Java runner at both size boundaries', async () => {
  const jdk = await findJdk([path.join(root, 'runtime', 'jdk')]);
  for (const project of projects) {
    for (const world of [project.sampleWorld, project.world(() => 0, 1), project.world(() => 0.999999, 1)]) {
      const result = await runGame({ game: { ...project, world: () => world }, source: project.solution, jdk, resourceRoot: root, seeds: [1] });
      assert.equal(result.stage, null, `${project.id}: ${result.error}`);
      assert.equal(result.earnedStars, 1, `${project.id}: ${result.worlds.map(run => run.message).join('; ')}`);
    }
  }
});

test('incorrect routes, loop totals, and decorative methods cannot complete homework', async () => {
  const jdk = await findJdk([path.join(root, 'runtime', 'jdk')]);
  for (const project of projects) {
    for (const reject of project.rejects) {
      const result = await runGame({ game: project, source: reject.source, jdk, resourceRoot: root, seeds: [1, 2, 3] });
      assert.equal(result.earnedStars, 0, `${project.id} accepted ${reject.label}`);
    }
  }
});
