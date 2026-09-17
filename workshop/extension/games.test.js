// Every registered game, checked against the real JDK.
//
//   npm test                              every present game, 3 seeds per level
//   PIP_GAME_UNIT=2 npm test              only unit 2's file (content authors)
//   PIP_GAME_SEEDS=20 npm test            the full seed check before a handoff
//   PIP_GAME_CATALOG=complete npm test    the release gate: all 57 entries
//
// A partial registry passes without PIP_GAME_CATALOG, because units land one
// worktree at a time. Nothing here is mocked or skipped: a missing JDK fails.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATALOG_ENTRY_COUNT, DEFAULT_SEEDS, GAMES_PER_SUBTOPIC, PROJECT_IDS, SUBTOPICS, UNIT_IDS,
  gamePackage, seedsFor, subtopicUnit, validateGame, validateWorld,
} from '../shared/game-contract.js';
import { games, gamesForSubtopic } from '../src/games/index.js';
import { lessons } from '../src/curriculum.js';
import { worldRng } from '../src/games/engine.js';
import { findJdk, runGame, withPackage } from './runner.js';

const resourceRoot = fileURLToPath(new URL('../', import.meta.url));
const jdk = await findJdk([path.join(resourceRoot, 'runtime', 'jdk')]);
const seeds = seedsFor(Number(process.env.PIP_GAME_SEEDS) || DEFAULT_SEEDS);
const complete = process.env.PIP_GAME_CATALOG === 'complete';
const unitOf = game => (game.project ? UNIT_IDS.indexOf(game.unit) + 1 : Number(game.subtopic.split('.')[0]));
const filter = process.env.PIP_GAME_UNIT;
const selected = filter ? games.filter(game => String(unitOf(game)) === String(filter)) : games;
const play = (game, source) => runGame({ game, source: withPackage(source, gamePackage(game.id)), jdk, resourceRoot, seeds });
const label = game => `${game.id} (${game.project ? `project ${game.unit}` : game.subtopic})`;

test('every registered entry has a unique id, a known home, and a valid schema', () => {
  const ids = [...lessons.map(lesson => lesson.id), ...games.map(game => game.id)];
  assert.equal(new Set(ids).size, ids.length, 'game ids must not collide with lesson ids or each other');
  for (const game of games) {
    assert.deepEqual(validateGame(game), [], label(game));
    assert.equal(typeof game.hint, 'string', `${game.id} needs a hint`);
    if (game.project) assert.ok(PROJECT_IDS.includes(game.id));
    else assert.ok(SUBTOPICS.includes(game.subtopic));
    for (const reject of game.rejects || []) assert.equal(typeof reject.source, 'string', `${game.id}: ${reject.label}`);
  }
  if (!complete) return;
  // Release gate: the catalogue arithmetic from the design spec, for real.
  assert.equal(games.length, CATALOG_ENTRY_COUNT);
  assert.equal(games.filter(game => game.project).length, PROJECT_IDS.length);
  for (const subtopic of SUBTOPICS) {
    const group = gamesForSubtopic(subtopic);
    assert.equal(group.length, GAMES_PER_SUBTOPIC, `subtopic ${subtopic}`);
    assert.equal(group.filter(game => game.boss).length, 1, `subtopic ${subtopic} needs exactly one boss`);
    assert.equal(group.at(-1).boss, true, `subtopic ${subtopic}: the boss is listed last`);
  }
  for (const id of PROJECT_IDS) {
    const project = games.find(game => game.id === id);
    assert.ok(project && UNIT_IDS.includes(project.unit), `${id} needs a known unit`);
    assert.equal(subtopicUnit(`${UNIT_IDS.indexOf(project.unit) + 1}.1`), project.unit);
  }
});

test('world() is deterministic per seed and level, and every world it makes is valid', () => {
  for (const game of selected) {
    for (const level of game.project ? [1] : [1, 2]) {
      for (const seed of seeds) {
        const once = game.world(worldRng(seed, level), level);
        const again = game.world(worldRng(seed, level), level);
        assert.deepEqual(once, again, `${label(game)} level ${level} seed ${seed} is not reproducible`);
        assert.deepEqual(validateWorld(once, { id: `${game.id} level ${level} seed ${seed}` }), []);
      }
    }
  }
});

// A graded tier runs three worlds, so a generator that maps its draws onto a
// narrow range hands the student the same puzzle two or three times and one
// memorised answer clears the tier. Measured over more seeds than a graded run
// uses, because three samples cannot tell a wide range from a narrow one. This
// is pure JavaScript, so a large sample is free.
const SPREAD_SEEDS = 40;
const MIN_DISTINCT_WORLDS = 10;   // a memorised answer then clears a 3-world tier well under 1% of the time
const MAX_WORLD_SHARE = 0.4;      // and no single world may dominate a skewed draw
// Only the parts a solution depends on. Cosmetic variation (board width, where
// the hoop sits) does not make a second puzzle, so it must not count as spread.
const puzzleKey = world => JSON.stringify({ data: world.data ?? null, input: world.input ?? '' });

test('generators produce enough distinct worlds that one memorised answer cannot clear a tier', () => {
  const sample = seedsFor(Math.max(SPREAD_SEEDS, seeds.length));
  for (const game of selected) {
    const everyLevel = [];
    for (const level of game.project ? [1] : [1, 2]) {
      const keys = sample.map(seed => puzzleKey(game.world(worldRng(seed, level), level)));
      everyLevel.push(...keys);
      const counts = new Map();
      for (const key of keys) counts.set(key, (counts.get(key) || 0) + 1);
      const where = `${label(game)} level ${level}`;
      // Subtopic 1.1 fixed worlds are exempt by design. The flag is a stricter
      // contract rather than an escape hatch: declaring it means the world
      // really must be the same every time, on every seed and both levels.
      if (game.fixed) {
        assert.equal(counts.size, 1, `${where} declares fixed worlds but generated ${counts.size} of them`);
        continue;
      }
      const graded = new Set(seeds.map(seed => puzzleKey(game.world(worldRng(seed, level), level)))).size;
      assert.ok(
        counts.size >= MIN_DISTINCT_WORLDS,
        `${where} generated only ${counts.size} distinct worlds across ${sample.length} seeds (need ${MIN_DISTINCT_WORLDS}); a graded run drew ${graded} distinct of ${seeds.length}. Widen the range world() draws from.`,
      );
      assert.ok(
        Math.max(...counts.values()) <= MAX_WORLD_SHARE * sample.length,
        `${where} returned one world ${Math.max(...counts.values())} times in ${sample.length} seeds; no single world may exceed ${MAX_WORLD_SHARE * 100}% of the draw.`,
      );
    }
    if (game.fixed) assert.equal(new Set(everyLevel).size, 1, `${label(game)} declares fixed worlds, so both levels must be the same world`);
  }
});

test('the reference solution earns every star and the starter earns none', async () => {
  for (const game of selected) {
    const solved = await play(game, game.solution);
    const top = game.project ? 1 : 3;
    assert.equal(solved.stage, null, `${label(game)}: ${solved.error}`);
    assert.equal(solved.earnedStars, top, `${label(game)} scored ${solved.earnedStars}/${top}: ${JSON.stringify(solved.worlds.filter(world => !world.passed).map(world => [world.level, world.seed, world.message, world.end.actions, world.world.par]))}`);
    assert.equal(solved.worlds.length, seeds.length * (game.project ? 1 : 2));
    assert.equal(solved.worlds.every(world => world.passed), true);
    if (game.project) assert.equal(solved.best, null, `${label(game)}: projects keep best null`);

    const started = await runGame({ game, source: withPackage(game.starter, gamePackage(game.id)), jdk, resourceRoot, seeds: [1] });
    assert.equal(started.earnedStars, 0, `${label(game)}: the starter must not already solve the game`);
  }
});

test('authored incorrect solutions never earn a star', async () => {
  for (const game of selected) {
    for (const reject of game.rejects || []) {
      const result = await play(game, reject.source);
      assert.equal(result.earnedStars, 0, `${label(game)} accepted "${reject.label}"`);
    }
  }
});
