import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATALOG_ENTRY_COUNT, MAX_STARS, PROGRESS_VERSION, RUN_MODES, SUBTOPICS,
  emptyGameRecord, gamePackage, gameSourcePath, isGameRecord, mergeGameRecord,
  mulberry32, seedsFor, subtopicAnchor, subtopicUnit, totalStars,
  validateGame, validateWorld,
} from '../shared/game-contract.js';
import { fixtures, sampleWorld } from '../shared/game-fixtures.js';
import { games, gameIds, findGame } from '../src/games/index.js';
import { gitLessons } from '../src/git-unit.js';
import { arenaUnlocked, conceptPassed, gameComplete, skinUnlocked } from '../shared/completion.js';

test('the catalogue arithmetic in the design spec adds up', () => {
  assert.equal(SUBTOPICS.length, 11);
  assert.equal(CATALOG_ENTRY_COUNT, 57);
  assert.equal(MAX_STARS, 167);
  assert.equal(PROGRESS_VERSION, 6);
  assert.equal(subtopicUnit('1.1'), 'basics');
  assert.equal(subtopicUnit('5.2'), 'arrays');
  assert.equal(subtopicAnchor('2.1'), 'subtopic-2-1');
  assert.equal(gameSourcePath('hoop-streak'), 'src/pip/games/hoop_streak/Student.java');
  assert.equal(gamePackage('hoop-streak'), 'pip.games.hoop_streak');
});

test('seeded worlds are reproducible and seed 0 is usable', () => {
  const first = seedsFor(3).map(seed => mulberry32(seed)());
  const again = seedsFor(3).map(seed => mulberry32(seed)());
  assert.deepEqual(first, again);
  assert.equal(new Set(first).size, 3, 'different seeds must not collide');
  const zero = mulberry32(0);
  for (let i = 0; i < 50; i++) {
    const value = zero();
    assert.ok(value >= 0 && value < 1, `seed 0 produced ${value}`);
  }
});

test('game records merge monotonically, so no path can take a star away', () => {
  const earned = { stars: 2, best: 30, updatedAt: '2026-09-17T10:00:00.000Z' };
  const older = { stars: 3, best: 41, updatedAt: '2026-09-16T10:00:00.000Z' };
  const merged = mergeGameRecord(earned, older, 'hoop-streak');
  assert.equal(merged.stars, 3, 'keeps the best star count from either side');
  assert.equal(merged.best, 30, 'keeps the lowest action total');
  assert.equal(merged.updatedAt, '2026-09-17T10:00:00.000Z', 'keeps the latest timestamp');

  // An absent entry must not erase an existing record.
  assert.deepEqual(mergeGameRecord(earned, undefined, 'hoop-streak'), earned);
  // Projects award at most one star and never keep a best.
  const project = mergeGameRecord({ stars: 1, best: 9, updatedAt: null }, emptyGameRecord(), 'talent-show');
  assert.equal(project.best, null);
  assert.ok(!isGameRecord({ stars: 2, best: null, updatedAt: null }, 'talent-show'), 'a project cannot hold 2 stars');
  assert.ok(!isGameRecord({ stars: 4, best: null, updatedAt: null }, 'hoop-streak'), 'no game holds 4 stars');
});

test('unknown ids are preserved in a backup but never count toward unlocks', () => {
  const progress = {
    games: {
      'hoop-streak': { stars: 3, best: 12, updatedAt: null },
      'talent-show': { stars: 1, best: null, updatedAt: null },
      'game-from-the-future': { stars: 3, best: null, updatedAt: null },
    },
  };
  assert.equal(totalStars(progress.games, ['hoop-streak', 'talent-show']), 4);
  assert.ok(gameComplete('talent-show', progress));
  assert.ok(!gameComplete('never-played', progress));
  assert.ok(skinUnlocked(0, 0), 'the base skin is always available');
  assert.ok(!skinUnlocked(1, 9));
  assert.ok(skinUnlocked(1, 10));
  assert.ok(!arenaUnlocked('garden', 19));
  assert.ok(arenaUnlocked('garden', 20));
  assert.ok(arenaUnlocked('workshop', 0), 'workshop is always available');
});

test('a concept pass persists across a later wrong answer', () => {
  const lesson = { id: 'git-commit', assessmentVersion: 1 };
  assert.ok(!conceptPassed(lesson, { concepts: {} }));
  assert.ok(conceptPassed(lesson, { concepts: { 'git-commit': 1 } }));
  assert.ok(conceptPassed(lesson, { concepts: { 'git-commit': 2 } }), 'a newer recorded version still counts');
});

test('world validation rejects the mistakes a generator actually makes', () => {
  assert.deepEqual(validateWorld(sampleWorld(1)), []);
  assert.deepEqual(validateWorld(sampleWorld(2)), []);

  const problems = message => validateWorld(message).join(' | ');
  assert.match(problems({ width: 40, height: 4, robot: { x: 0, y: 0, dir: 'N' } }), /width must be an integer/);
  assert.match(problems({ width: 4, height: 4, robot: { x: 9, y: 0, dir: 'N' } }), /robot must start on the board/);
  assert.match(problems({ width: 4, height: 4, robot: { x: 0, y: 0, dir: 'UP' } }), /robot\.dir/);
  assert.match(problems({ width: 4, height: 4, robot: { x: 0, y: 0, dir: 'N' }, walls: [[0, 0]] }), /cannot cover the robot's start/);
  assert.match(
    problems({ width: 4, height: 4, robot: { x: 0, y: 0, dir: 'N' }, walls: [[1, 1]], hurdles: [[1, 1]] }),
    /overlaps a wall/,
  );
  assert.match(
    problems({
      width: 4, height: 4, robot: { x: 0, y: 0, dir: 'N' },
      characters: [{ id: 'a', kind: 'shop', x: 1, y: 1 }, { id: 'a', kind: 'greeter', x: 2, y: 2 }],
    }),
    /duplicate character id a/,
  );
  assert.match(
    problems({ width: 4, height: 4, robot: { x: 0, y: 0, dir: 'N' }, characters: [{ id: 's', kind: 'shop', x: 1, y: 1, stock: { ball: -1 } }] }),
    /nonnegative integer/,
  );
  assert.match(problems({ width: 4, height: 4, robot: { x: 0, y: 0, dir: 'N' }, par: 5000 }), /par must be an integer/);
  assert.match(problems({ width: 4, height: 4, robot: { x: 0, y: 0, dir: 'N' }, items: [{ kind: 'ball', x: 9, y: 0 }] }), /off the board/);
});

test('registry entries are validated against the frozen schema', () => {
  const good = {
    id: 'hoop-streak', subtopic: '2.1', title: 'Hoop Streak', commands: ['move', 'turn', 'shoot'],
    brief: 'b', task: 't', starter: 's', solution: 'x', world: () => sampleWorld(1), goal: () => ({ passed: true }),
  };
  assert.deepEqual(validateGame(good), []);
  assert.match(validateGame({ ...good, id: 'Hoop Streak' }).join(' '), /kebab-case/);
  assert.match(validateGame({ ...good, subtopic: '9.9' }).join(' '), /subtopic must be one of/);
  assert.match(validateGame({ ...good, commands: ['fly'] }).join(' '), /commands must be a subset/);
  assert.match(validateGame({ ...good, world: undefined }).join(' '), /world\(rng, level\)/);
  assert.deepEqual(validateGame({ ...good, id: 'talent-show', subtopic: undefined, project: true, unit: 'basics' }), []);
  assert.match(validateGame({ ...good, subtopic: undefined, project: true, unit: 'nope' }).join(' '), /project unit must be one of/);
});

test('the shared fixtures match the shapes engine and UI both consume', () => {
  for (const [name, build] of Object.entries(fixtures)) {
    const result = build();
    assert.equal(result.kind, 'game', `${name} is a game result`);
    assert.equal(typeof result.runId, 'string', `${name} carries a runId`);
    assert.ok(Array.isArray(result.worlds), `${name} carries a worlds array`);
    for (const world of result.worlds) {
      assert.deepEqual(validateWorld(world.world), [], `${name} seed ${world.seed} is a valid world`);
      assert.ok([1, 2].includes(world.level), `${name} level is 1 or 2`);
    }
  }

  assert.equal(fixtures.success().earnedStars, 3);
  // A level-2 failure still keeps the star earned at level 1.
  assert.equal(fixtures.failedWorld().earnedStars, 1);
  // A run that never produced a world cannot report a pass.
  assert.equal(fixtures.compileError().stage, 'compile');
  assert.deepEqual(fixtures.compileError().worlds, []);
  assert.equal(fixtures.stopped().earnedStars, 0, 'a cancelled run awards nothing');
  // The input experiment is ungraded: no star claim at all.
  const experiment = fixtures.inputExperiment();
  assert.equal(experiment.mode, RUN_MODES.custom);
  assert.equal(experiment.earnedStars, null);
  assert.ok(experiment.worlds.every(world => world.passed === false));
});

// Holds at every stage of the build: empty scaffolds, a partial catalogue during
// Phase 2, and the complete release. Completeness itself is games.test.js's job
// under PIP_GAME_CATALOG=complete, because a partial registry is expected here.
test('the registries stay import-safe and internally consistent', () => {
  assert.ok(Array.isArray(games) && Array.isArray(gitLessons));
  assert.deepEqual(gameIds, games.map(game => game.id));
  assert.equal(new Set(gameIds).size, gameIds.length, 'game ids are unique');
  for (const game of games) {
    assert.deepEqual(validateGame(game), [], `${game.id} matches the frozen schema`);
    assert.equal(findGame(game.id), game);
  }
  assert.equal(findGame('no-such-game'), null);

  const conceptIds = gitLessons.map(lesson => lesson.id);
  assert.equal(new Set(conceptIds).size, conceptIds.length, 'concept ids are unique');
  for (const lesson of gitLessons) {
    assert.equal(lesson.kind, 'concept', `${lesson.id} must be kind 'concept'`);
    assert.ok(Number.isInteger(lesson.assessmentVersion) && lesson.assessmentVersion > 0);
  }
  // Games, concepts, and coding lessons share one progress id space.
  assert.deepEqual(conceptIds.filter(id => gameIds.includes(id)), [], 'no concept id collides with a game id');

  if (process.env.PIP_GAME_CATALOG === 'complete') {
    assert.equal(games.length, CATALOG_ENTRY_COUNT);
    assert.equal(gitLessons.length, 8);
  }
});
