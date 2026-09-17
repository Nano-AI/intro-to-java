// Shared game fixtures. Engine and UI consume these same objects so a replay
// built against a fixture renders identically against a real host result
// (design spec step 0, item 4).
//
// Fixture mode is development/test-only: nothing here may persist earned stars.

import { RUN_MODES, gameResult, worldResult } from './game-contract.js';

// A small hand-built world: the robot starts facing east, a hoop sits three
// tiles ahead, one ball is underfoot, and a greeter stands to the south.
export const sampleWorld = (level = 1) => ({
  width: 6,
  height: 5,
  robot: { x: 0, y: 2, dir: 'E' },
  walls: [[3, 0], [3, 4]],
  hurdles: level === 2 ? [[2, 2]] : [],
  items: [{ id: 'ball-1', kind: 'ball', x: 0, y: 2 }],
  characters: [{ id: 'greet-1', kind: 'greeter', x: 1, y: 4, expectedPhrase: 'Hello!', reply: 'Hi, Pip!' }],
  hoops: [{ x: 4, y: 2 }],
  signs: [{ x: 1, y: 2, text: 'Score 1' }],
  input: '1\n',
  par: level === 2 ? 4 : 3,
  data: { baskets: 1 },
});

const passingEvents = [
  { seq: 1, action: 0, kind: 'pick', item: { id: 'ball-1', kind: 'ball' }, at: { x: 0, y: 2 }, held: { ball: 1 } },
  { seq: 2, action: 1, kind: 'move', from: { x: 0, y: 2 }, to: { x: 1, y: 2 } },
  { seq: 3, action: 1, kind: 'move', from: { x: 1, y: 2 }, to: { x: 2, y: 2 } },
  { seq: 4, action: 2, kind: 'shoot', from: { x: 2, y: 2 }, hit: true, hoop: { x: 4, y: 2 }, held: { ball: 0 } },
];

const passingEnd = {
  robot: { x: 2, y: 2, dir: 'E' },
  held: { ball: 0 },
  acquired: [{ id: 'ball-1', kind: 'ball' }],
  ground: [],
  scored: 1,
  painted: [],
  said: [],
  delivered: {},
  stock: {},
  gates: {},
  actions: 3,
  bumped: false,
  limited: false,
};

// 1. A graded run that earns all three stars.
export const successResult = () => gameResult({
  gameId: 'hoop-streak',
  runId: 'fixture-success',
  earnedStars: 3,
  savedStars: 3,
  sourceChecks: [{ passed: true, message: 'Uses a for loop.' }],
  worlds: [
    ...[1, 2, 3].map(seed => worldResult({ level: 1, seed, world: sampleWorld(1), events: passingEvents, end: passingEnd, passed: true, message: 'Scored 1 basket.' })),
    ...[1, 2, 3].map(seed => worldResult({ level: 2, seed, world: sampleWorld(2), events: passingEvents, end: passingEnd, passed: true, message: 'Scored 1 basket.' })),
  ],
});

// 2. Level 1 passes, one level-2 world fails on a bump: the attempt keeps one star.
export const failedWorldResult = () => gameResult({
  gameId: 'hoop-streak',
  runId: 'fixture-failed-world',
  earnedStars: 1,
  savedStars: 3,
  sourceChecks: [{ passed: true, message: 'Uses a for loop.' }],
  worlds: [
    ...[1, 2, 3].map(seed => worldResult({ level: 1, seed, world: sampleWorld(1), events: passingEvents, end: passingEnd, passed: true, message: 'Scored 1 basket.' })),
    worldResult({
      level: 2,
      seed: 1,
      world: sampleWorld(2),
      events: [
        { seq: 1, action: 0, kind: 'move', from: { x: 0, y: 2 }, to: { x: 1, y: 2 } },
        { seq: 2, action: 0, kind: 'bump', at: { x: 1, y: 2 }, into: { x: 2, y: 2 }, reason: 'hurdle' },
        { seq: 3, action: 0, kind: 'reply', speaker: 'robot', text: 'Ouch, wall ahead' },
      ],
      end: { ...passingEnd, robot: { x: 1, y: 2, dir: 'E' }, scored: 0, held: {}, acquired: [], ground: [{ id: 'ball-1', kind: 'ball', x: 0, y: 2 }], actions: 1, bumped: true },
      passed: false,
      message: 'Pip bumped into a hurdle. Jump over it instead of driving through.',
    }),
  ],
});

// 3. The program does not compile: no world ever runs.
export const compileErrorResult = () => gameResult({
  gameId: 'hoop-streak',
  runId: 'fixture-compile-error',
  savedStars: 1,
  stage: 'compile',
  error: "Student.java:6: error: ';' expected",
  diagnostics: [{ line: 6, column: 34, severity: 'error', message: "';' expected" }],
});

// 4. The student pressed Stop. Nothing is saved and remaining worlds are skipped.
export const stoppedRunResult = () => gameResult({
  gameId: 'hoop-streak',
  runId: 'fixture-stopped',
  savedStars: 1,
  stage: 'runtime',
  error: 'Run cancelled.',
  worlds: [worldResult({ level: 1, seed: 1, world: sampleWorld(1), events: passingEvents, end: passingEnd, passed: true, message: 'Scored 1 basket.' })],
});

// 5. "Try own input": ungraded, one level-1 world, no pass/fail and no stars.
export const inputExperimentResult = () => ({
  ...gameResult({
    gameId: 'hoop-streak',
    runId: 'fixture-input-experiment',
    mode: RUN_MODES.custom,
    savedStars: 1,
    worlds: [worldResult({ level: 1, seed: 7, world: sampleWorld(1), events: passingEvents, end: passingEnd, message: 'Input experiment. Nothing was graded.' })],
  }),
  input: '4\n',
  generatedInput: '1\n',
  earnedStars: null, // never a number in custom mode: there is nothing to earn
});

export const fixtures = {
  success: successResult,
  failedWorld: failedWorldResult,
  compileError: compileErrorResult,
  stopped: stoppedRunResult,
  inputExperiment: inputExperimentResult,
};
