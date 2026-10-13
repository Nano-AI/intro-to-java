import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { codeQuality, passedCorrectness } from '../shared/code-quality.js';
import { inputDiagnosticLocation, replaceInputs } from '../host/assessment.js';
import { findJdk, runGame, runLesson, runProcess, withPackage } from '../host/runner.js';
import { lessons } from '../src/curriculum.js';
import { games } from '../src/games/index.js';
import { mergeProgress, normalizeProgress } from '../shared/progress.js';

const resourceRoot = fileURLToPath(new URL('../', import.meta.url));
const jdk = await findJdk([path.join(resourceRoot, 'runtime', 'jdk')]);
const warning = { line: 4, column: 2, severity: 'warning', message: '[cast] redundant cast to int' };
const lint = { graded: true, lint: 'complete' };
const warned = source => source.replace('public static void main(String[] args) {', 'public static void main(String[] args) {\n        int marker = 1;\n        int redundant = (int) marker;');

test('Perfect requires completed correctness and lint evidence; old results and trials remain unchecked', () => {
  assert.deepEqual(codeQuality({ passed: true }, lint), { status: 'perfect', lint: 'complete', warningCount: 0 });
  assert.equal(codeQuality({ passed: true, diagnostics: [warning] }, lint).status, 'warnings');
  assert.equal(codeQuality({ passed: false, diagnostics: [warning] }, lint).status, 'needs-work');
  assert.equal(codeQuality({ passed: true, diagnostics: [{ ...warning, severity: 'error' }] }, lint).status, 'needs-work');
  assert.equal(codeQuality({ passed: true }, { graded: true }).status, 'unchecked');
  assert.equal(codeQuality({ passed: true }, { ...lint, lint: 'failed' }).status, 'unchecked');
  assert.equal(codeQuality({ passed: true }, { ...lint, graded: false }).status, 'unchecked');
  assert.equal(codeQuality({ kind: 'game', worlds: [] }, lint).status, 'unchecked');
  assert.equal(codeQuality({ kind: 'game', worlds: [{ passed: true }], sourceChecks: [{ passed: false }] }, lint).status, 'needs-work');
  assert.equal(codeQuality({ error: 'Compiler unavailable', stage: 'setup' }, { graded: true }).status, 'needs-work');
});

test('correctness is independent of optional stars and still requires every check', () => {
  const result = { kind: 'game', earnedStars: 2, worlds: [{ passed: true }], sourceChecks: [{ passed: true }] };
  assert.equal(passedCorrectness(result), true);
  assert.equal(codeQuality(result, lint).status, 'perfect');
  assert.equal(passedCorrectness({ ...result, sourceChecks: [{ passed: false }] }), false);
  assert.equal(passedCorrectness({ ...result, worlds: [{ passed: false }] }), false);
  assert.equal(passedCorrectness({ ...result, stage: 'runtime' }), false);
  assert.equal(passedCorrectness({ ...result, diagnostics: [{ severity: 'error' }] }), false);
  assert.equal(passedCorrectness({ ...result, diagnostics: [warning] }), true);
  assert.equal(passedCorrectness(null), false);
  assert.equal(passedCorrectness({ passed: true }), true);
});

test('quality is additive: legacy progress, packages and student source stay intact', async () => {
  const source = 'package student.saved;\npublic class Student { public static void main(String[] args) { System.out.println("Pip online"); System.out.println("Ready to learn"); } }';
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pip-quality-save-'));
  try {
    const file = path.join(directory, 'Student.java'); await writeFile(file, source);
    assert.equal(withPackage(source, 'pip.lessons.hello_java'), source);
    const result = await runLesson({ lesson: lessons.find(l => l.id === 'hello-java'), source: await readFile(file, 'utf8'), jdk, resourceRoot });
    assert.equal(result.passed, true); assert.equal(result.quality.status, 'perfect');
    assert.equal(await readFile(file, 'utf8'), source);
    const old = normalizeProgress({ completed: ['hello-java'], drafts: { 'hello-java': source }, answers: { 'hello-java:2': 0 } });
    const merged = mergeProgress(old, { completed: ['hello-java'], drafts: { 'hello-java': source } });
    assert.equal(merged.drafts['hello-java'], source); assert.equal(merged.answers['hello-java:2'], 0);
    assert(merged.completed.includes('hello-java')); assert.equal(merged.quality, undefined);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('real javac warnings preserve correctness for practice, challenge and project; public runs are unchecked', async () => {
  for (const id of ['hello-java', 'challenge-battery-budget']) {
    const lesson = lessons.find(l => l.id === id);
    const result = await runLesson({ lesson, source: warned(lesson.solution), jdk, resourceRoot });
    assert.equal(result.passed, true, JSON.stringify(result));
    assert.equal(result.quality.status, 'warnings'); assert.equal(result.quality.lint, 'complete');
    assert.equal(result.quality.warningCount, 1, 'a warning repeated across variants is counted once');
    assert.equal(result.diagnostics[0].line, 4); assert.match(result.diagnostics[0].message, /redundant cast/);
    if (lesson.independent) {
      const trial = await runLesson({ lesson, source: lesson.solution, jdk, resourceRoot, mode: 'public' });
      assert.equal(trial.passed, true); assert.equal(trial.quality.status, 'unchecked');
    }
  }
  const game = games.find(g => g.id === 'supply-relay');
  const result = await runGame({ game, source: warned(game.solution), jdk, resourceRoot, seeds: [1, 2] });
  assert.equal(result.earnedStars, 1, JSON.stringify(result)); assert(result.worlds.every(w => w.passed));
  assert.equal(result.quality.status, 'warnings'); assert.equal(result.quality.warningCount, 1);
  const publicResult = await runGame({ game, source: game.solution, jdk, resourceRoot, mode: 'public' });
  assert(publicResult.worlds.every(w => w.passed)); assert.equal(publicResult.quality.status, 'unchecked');
});

test('syntax and runtime errors cannot earn Perfect', async () => {
  const lesson = lessons.find(l => l.id === 'hello-java');
  const syntax = await runLesson({ lesson, source: lesson.solution.replace('println', 'missingMethod'), jdk, resourceRoot });
  assert.equal(syntax.stage, 'compile'); assert.equal(syntax.quality.status, 'needs-work'); assert.equal(syntax.quality.lint, 'failed');
  const runtime = await runLesson({ lesson, source: 'public class Student { public static void main(String[] args) { throw new RuntimeException("test"); } }', jdk, resourceRoot });
  assert.equal(runtime.stage, 'runtime'); assert.equal(runtime.quality.status, 'needs-work');
});

test('warnings introduced by changed inputs are retained and mapped to authored lines', async () => {
  const source = 'public class Student {\n public static void main(String[] args) {\n  final int divisor =\n    1;\n  if (false) System.out.println(1 / divisor);\n }\n}';
  const lesson = { id: 'lint-variant', kind: 'console', cases: [{ input: '', expected: '', inputs: { divisor: 1 }, mutate: false }, { input: '', expected: '', inputs: { divisor: 0 } }] };
  const result = await runLesson({ lesson, source, jdk, resourceRoot });
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.equal(result.quality.status, 'warnings'); assert.equal(result.diagnostics[0].line, 5); assert.match(result.diagnostics[0].message, /division by zero/);
  const original = 'int[] a = {\n 1, 2\n};\nint b = 4;\nint c = (int) b;';
  const start = original.indexOf('{'), end = original.indexOf('}') + 1;
  const analysis = { variables: [{ name: 'a', scope: 'main', start, end }] };
  const changed = replaceInputs(original, analysis, { a: [3] });
  assert.equal(changed.split('\n').length, 3);
  assert.deepEqual(inputDiagnosticLocation({ line: 3, column: 8 }, original, analysis, { a: [3] }), { line: 5, column: 8 });
});

test('warm diagnostics daemon returns real warnings and errors separately without changing its request protocol', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'pip-lint-daemon-'));
  try {
    const compiled = await runProcess(jdk.javac, ['-d', temporary, path.join(resourceRoot, 'desktop/DiagD.java')]);
    assert.equal(compiled.code, 0, compiled.error);
    const clean = 'package existing.student; public class Student { public static void main(String[] args) { System.out.println(1); } }';
    const sources = [clean, clean.replace('println(1)', 'println((int) 1)'), clean.replace('println(1)', 'missing(1)')];
    const input = sources.map(source => `D\n${temporary}\nexisting/student/Student.java\n${Buffer.byteLength(source)}\n${source}`).join('');
    const ran = await runProcess(jdk.java, ['-cp', temporary, 'DiagD'], { input });
    assert.equal(ran.code, 0, ran.error);
    const [good, warned, bad] = ran.stdout.trim().split('\n').map(JSON.parse);
    assert.equal(good.lint, 'complete'); assert.deepEqual(good.diagnostics, []);
    assert.equal(warned.lint, 'complete'); assert(warned.diagnostics.some(d => d.severity === 'WARNING'));
    assert.equal(bad.lint, 'failed'); assert(bad.diagnostics.some(d => d.severity === 'ERROR'));
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
