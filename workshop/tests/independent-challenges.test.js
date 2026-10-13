import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { independentChallenges, lessons, modules, orderedLessons } from '../src/curriculum.js';
import { findJdk, runLesson, withPackage, lessonPackage } from '../host/runner.js';
import { assessmentCases } from '../host/assessment.js';

const resourceRoot = fileURLToPath(new URL('../', import.meta.url));
const jdk = await findJdk([path.join(resourceRoot, 'src-tauri/jre'), path.join(resourceRoot, 'runtime/jdk')]);
const run = (lesson, source) => runLesson({ lesson, source: withPackage(source, lessonPackage(lesson.id)), jdk, resourceRoot, assessmentSeed: 314159 });

test('independent work adds two gated challenges per module without changing the guided path', () => {
  assert.equal(independentChallenges.length, 10);
  assert.equal(new Set(lessons.map(lesson => lesson.id)).size, lessons.length);
  for (const unit of ['basics', 'loops', 'methods', 'decisions', 'arrays']) {
    assert.equal(independentChallenges.filter(lesson => lesson.unit === unit).length, 2);
  }
  const unitIndex = id => modules.findIndex(module => module.id === id);
  for (const lesson of independentChallenges) {
    assert.match(lesson.id, /^challenge-/);
    assert.equal(lesson.independent, true);
    assert.equal(lesson.kind, 'console');
    assert.equal(lesson.assessmentVersion, 2);
    assert.equal(lesson.examples[0].output, lesson.cases[0].expected);
    assert.ok(lesson.examples.every(example => example.output.split('\n').length === 2), 'both examples state both results');
    assert.deepEqual(lesson.steps, []);
    assert.equal(lesson.examples.length, 2);
    assert.ok(lesson.prerequisites.length > 0);
    assert.ok(lesson.cases.length >= 20 && lesson.cases.length <= 100);
    assert.equal(lesson.publicCases.length, 3);
    assert.equal(lesson.hint, undefined);
    assert.equal(orderedLessons.includes(lesson), false);
    assert.equal(modules.some(module => module.ids.includes(lesson.id)), false);
    for (const id of lesson.prerequisites) {
      assert.ok(lessons.find(item => item.id === id), `${lesson.id}: unknown prerequisite ${id}`);
      const prerequisiteModule = modules.find(module => module.ids.includes(id));
      assert.ok(prerequisiteModule && unitIndex(prerequisiteModule.id) <= unitIndex(lesson.unit), `${lesson.id}: later-topic prerequisite ${id}`);
    }
    assert.deepEqual(assessmentCases(lesson, 1).cases.map(({ label, ...item }) => item), lesson.cases.map(({ label, ...item }) => item), 'existing assessment runner retains the declared cases');
  }
  assert.equal(orderedLessons.length, 35);
});

for (const lesson of independentChallenges) test(`${lesson.id}: public Run shows three actual inputs and outcomes`, async () => {
  const result = await runLesson({ lesson, source: withPackage(lesson.solution, lessonPackage(lesson.id)), jdk, resourceRoot, mode: 'public' });
  assert.equal(result.kind, 'public'); assert.equal(result.passed, true, JSON.stringify(result));
  assert.equal(result.checks.length, 3); assert.equal(result.total, 3);
  for (const check of result.checks) assert.ok(check.input || check.inputs || check.label, 'each output identifies its actual input');
});

const resultVariables = {
  'challenge-battery-budget': ['spent', 'remaining'],
  'challenge-prize-tokens': ['tokens', 'leftover'],
  'challenge-round-points': ['total', 'readingSum'],
  'challenge-square-total': ['total', 'net'],
  'challenge-charge-time': ['minutes', 'charge'],
};
const fixedReturns = {
  'challenge-trip-cost': { tripCost: 12, roundTripCost: 30 },
  'challenge-match-score': { roundPoints: 3, matchScore: 23, rematchScore: 53 },
  'challenge-positive-gains': { positiveTotal: 11, positiveCount: 2 },
  'challenge-count-matches': { countMatches: 3, firstMatch: 0 },
};
function hardcoded(lesson) {
  let source = lesson.solution;
  if (resultVariables[lesson.id]) {
    for (const [index, name] of resultVariables[lesson.id].entries()) {
      source = source.replace(`System.out.println(${name});`, `${name} = ${lesson.cases[0].expected.split('\n')[index]};\n        System.out.println(${name});`);
    }
    return source;
  }
  if (lesson.id === 'challenge-battery-signal') return source.replace(/System\.out\.println\("[A-Z]+"\);/g, 'System.out.println("CHARGE");').replace('System.out.println(needed);', 'needed = 61; System.out.println(needed);');
  for (const [name, value] of Object.entries(fixedReturns[lesson.id])) {
    const start = source.indexOf(`    public static int ${name}(`), end = source.indexOf('\n    }', start);
    source = source.slice(0, start) + source.slice(start, end).replace(/return [^;]+;/g, `return ${value};`) + source.slice(end);
  }
  return source;
}

for (const lesson of independentChallenges) test(`${lesson.id}: reference passes, starter and memorized output fail`, async () => {
  const solved = await run(lesson, lesson.solution);
  assert.equal(solved.passed, true, JSON.stringify(solved));
  assert.equal(solved.checks.length, lesson.cases.length);
  const starter = await run(lesson, lesson.starter);
  assert.notEqual(starter.stage, 'compile', 'starters must compile');
  assert.notEqual(starter.passed, true, 'starter must require independent work');
  const fixedAnswer = await run(lesson, hardcoded(lesson));
  assert.equal(fixedAnswer.passed, false, JSON.stringify(fixedAnswer));
  assert.equal(fixedAnswer.checks?.[0].passed, true, 'memorized original answer passes its example but fails changed input');
  assert.ok(fixedAnswer.checks.some(check => !check.passed));
});

test('array checks reject solutions that change caller-owned values', async () => {
  const lesson = independentChallenges.find(item => item.id === 'challenge-positive-gains');
  const mutating = lesson.solution.replace('if (gains[i] > 0)', 'gains[i] = Math.max(gains[i], 0);\n            if (gains[i] > 0)');
  const result = await run(lesson, mutating);
  assert.equal(result.checks[0].passed, true);
  assert.equal(result.passed, false);
  assert.match(result.checks.at(-1).label, /: array unchanged$/);
  assert.ok(result.checks.some(check => check.label.startsWith('positiveTotal(') && check.label.endsWith(': array unchanged') && !check.passed));
});


test('every array argument has a paired preservation check, including empty and singleton arrays', () => {
  for (const lesson of independentChallenges.filter(item => item.unit === 'arrays')) {
    const probes = lesson.cases.slice(1);
    assert.equal(probes.length % 2, 0);
    for (let i = 0; i < probes.length; i += 2) {
      assert.equal(probes[i + 1].label, `${probes[i].label}: array unchanged`);
      assert.match(probes[i + 1].invocation, /Arrays.toString/);
    }
    assert.ok(probes.some(item => item.label.includes('([]')));
    assert.ok(probes.some(item => item.label.includes('([0]')));
  }
});

for (const [id, array, result] of [['challenge-positive-gains', 'gains', 'total'], ['challenge-positive-gains', 'gains', 'count'], ['challenge-count-matches', 'readings', 'count'], ['challenge-count-matches', 'readings', 'first']]) {
  test(`${id} (${result}): correct returns cannot hide mutation limited to singleton arrays`, async () => {
    const lesson = independentChallenges.find(item => item.id === id);
    const source = lesson.solution.replace(`return ${result};`, `if (${array}.length == 1) { ${array}[0] = 999; }\n        return ${result};`);
    const checked = await run(lesson, source);
    assert.equal(checked.passed, false);
    const failed = checked.checks.filter(item => !item.passed);
    assert.ok(failed.length > 0);
    assert.ok(failed.every(item => item.label.endsWith(': array unchanged')), 'all numeric results still pass');
    assert.ok(checked.checks.find(item => item.label.includes('([0]') && item.label.endsWith(': array unchanged') && !item.passed));
  });
}

for (const lesson of independentChallenges) test(`${lesson.id}: solving only the original task cannot pass the two-result contract`, async () => {
  const secondOutput = {
    'challenge-battery-budget': 'System.out.println(spent);',
    'challenge-prize-tokens': 'System.out.println(leftover);',
    'challenge-round-points': 'System.out.println(readingSum);',
    'challenge-square-total': 'System.out.println(net);',
    'challenge-trip-cost': 'System.out.println(roundTripCost(4, 6, 3));',
    'challenge-match-score': 'System.out.println(rematchScore(3, 5));',
    'challenge-battery-signal': 'System.out.println(needed);',
    'challenge-charge-time': 'System.out.println(charge);',
    'challenge-positive-gains': 'System.out.println(positiveCount(gains));',
    'challenge-count-matches': 'System.out.println(firstMatch(readings, 3));',
  }[lesson.id];
  const source = lesson.solution.replace(secondOutput, '');
  const checked = await run(lesson, source);
  assert.equal(checked.passed, false);
  assert.notEqual(checked.stage, 'compile');
  assert.ok(checked.stage === 'checks' || checked.checks[0].passed === false, 'a missing result fails structure or output checks');
});
