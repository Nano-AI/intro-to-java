import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { games } from '../src/games/index.js';
import { simulate } from '../src/games/engine.js';
import { automaticProjectSteps, verifiedProjectSteps } from '../shared/project-checks.js';
import { findJdk, runGame, withPackage } from '../host/runner.js';
import { gamePackage, RUN_MODES } from '../shared/game-contract.js';

const game = id => games.find(item => item.id === id);
const trial = (id, output) => {
  const project = game(id), world = project.sampleWorld;
  return { mode: RUN_MODES.custom, stage: null, sourceChecks: [], worlds: [{ world, ...simulate(world, output, project), passed: false }] };
};
const pickups = 'move 2\npick up';

test('only coding milestones are eligible; planning and short-game keys stay untouched', () => {
  const expected = {
    'supply-relay': [1, 2, 3], 'staircase-arena': [1, 2, 3, 4],
    'tower-rescue': [0, 1, 2, 3, 4], 'signal-patrol': [1, 2, 3, 4], 'mosaic-survey': [0, 1, 2, 3, 4],
  };
  for (const entry of games) assert.deepEqual(automaticProjectSteps(entry), expected[entry.id] || []);
});

test('a pickup-only trial verifies collection without inventing delivery or a calculation', () => {
  const result = trial('supply-relay', pickups);
  assert.deepEqual(verifiedProjectSteps(game('supply-relay'), result), [1]);
  assert.deepEqual(verifiedProjectSteps(game('supply-relay'), trial('supply-relay', 'move 2')), []);
  assert.deepEqual(verifiedProjectSteps(game('supply-relay'), { ...result, stage: 'compile' }), []);
  assert.deepEqual(verifiedProjectSteps(game('supply-relay'), { ...result, stage: 'runtime' }), []);
});

test('a delivery can verify navigation but a sample report cannot prove energy arithmetic', () => {
  const route = `${pickups}\nturn left\nmove\ndrop\nDelivered 1 part; energy 44`;
  assert.deepEqual(verifiedProjectSteps(game('supply-relay'), trial('supply-relay', route)), [1, 2]);
  assert.deepEqual(verifiedProjectSteps(game('supply-relay'), trial('supply-relay', `${pickups}\ndrop`)), [1], 'dropping cargo on the floor is not delivery');
});

test('a single painted row must also return to the next row in the right pose', () => {
  const id = 'staircase-arena';
  assert.deepEqual(verifiedProjectSteps(game(id), trial(id, 'paint blue')), []);
  assert.deepEqual(verifiedProjectSteps(game(id), trial(id, 'paint blue\nmove\nturn right\nturn right\nmove\nturn right\nmove\nturn right')), [1]);
});

test('an empty-cargo patrol must still travel out and back before its return step checks', () => {
  const project = game('signal-patrol'), world = structuredClone(project.sampleWorld);
  world.items = []; world.data.parts = 0;
  const result = { mode: RUN_MODES.custom, stage: null, sourceChecks: [], worlds: [{ world, ...simulate(world, '', project), passed: false }] };
  assert.deepEqual(verifiedProjectSteps(project, result), [], 'starting at home is not returning home');
});

const resourceRoot = fileURLToPath(new URL('../', import.meta.url));
const jdk = await findJdk([path.join(resourceRoot, 'src-tauri/jre'), path.join(resourceRoot, 'runtime/jdk')]);
const play = (project, source, mode = RUN_MODES.graded) => runGame({ game: project, source: withPackage(source, gamePackage(project.id)), jdk, resourceRoot, seeds: [1, 2, 3], mode, ...(mode === RUN_MODES.custom ? { customInput: project.sampleWorld?.input || '' } : {}) });

test('real solutions verify coding steps across all homework projects, never planning', async () => {
  for (const project of games.filter(entry => entry.project)) {
    const result = await play(project, project.solution);
    assert.equal(result.earnedStars, 1, `${project.id}: ${result.error}`);
    assert.deepEqual(verifiedProjectSteps(project, result), automaticProjectSteps(project), project.id);
    const earlier = { ...result, sourceChecks: result.sourceChecks.map(check => ({ ...check, message: check.message.replace('from another method instead', 'from `main` instead') })) };
    assert.deepEqual(verifiedProjectSteps(project, earlier), automaticProjectSteps(project), `${project.id}: older check messages remain readable`);
  }
});

test('independent method probes reject decorative helpers and keep evidence for working helpers', async () => {
  const project = game('tower-rescue');
  const decorative = project.rejects.find(reject => reject.label.includes('empty helper'));
  const result = await play(project, decorative.source);
  assert.equal(result.stage, 'checks');
  const verified = verifiedProjectSteps(project, result);
  assert.equal(verified.includes(1), false, 'a solved board cannot prove collectTower works');
  assert.ok(verified.includes(0) && verified.includes(2), 'working independent turnAround and supplyCount probes remain useful');
  const unused = await play(project, project.rejects.find(reject => reject.label.includes('never calls')).source);
  assert.equal(verifiedProjectSteps(project, unused).includes(1), false, 'unused helpers do not count');
});

test('hardcoded sample energy cannot complete the calculation milestone', async () => {
  const project = game('supply-relay'), source = project.rejects.find(reject => reject.label.startsWith('hardcodes 44')).source;
  const result = await play(project, source);
  assert.ok(result.sourceChecks.every(check => check.passed), 'the negative fixture has decorative but structurally valid variables');
  assert.equal(verifiedProjectSteps(project, result).includes(3), false);
  assert.deepEqual(verifiedProjectSteps(project, await play(project, source, RUN_MODES.custom)), [1, 2]);
});
