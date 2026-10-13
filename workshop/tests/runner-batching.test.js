import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runProcess } from '../host/process.js';

// Observe actual compiler launches, not elapsed-time thresholds that vary by
// machine. Student JVMs remain separate even when their compilation is shared.
let launches = [], activeCompilers = 0, maximumCompilers = 0, onStart;
globalThis.__batchingProcess = async (command, args, options) => {
  const compile = /javac(?:\.exe)?$/.test(command);
  launches.push({ command, args, options, compile });
  if (compile) maximumCompilers = Math.max(maximumCompilers, ++activeCompilers);
  try {
    const pending = runProcess(command, args, options);
    onStart?.({ command, args, options, compile });
    return await pending;
  } finally { if (compile) activeCompilers--; }
};
registerHooks({ resolve(specifier, context, next) {
  if (specifier === './process.js' && context.parentURL?.endsWith('/host/runner.js')) return { url: 'data:text/javascript,export const runProcess=globalThis.__batchingProcess;', shortCircuit: true };
  return next(specifier, context);
} });
const { findJdk, runLesson, runGame } = await import('../host/runner.js');
const resourceRoot = fileURLToPath(new URL('../', import.meta.url));
const jdk = await findJdk([path.join(resourceRoot, 'src-tauri/jre')]);
const reset = () => { launches = []; maximumCompilers = 0; onStart = undefined; };
const lesson = { id: 'batched-inputs', kind: 'console', cases: [1, 2, 3, 2, 4, 5, 6, 1].map((value, index) => ({ input: '', inputs: { value }, mutate: index === 7 ? false : true, expected: String(value) })) };
const source = 'package saved.student; public class Student { public static void main(String[] args) { int value = 1; System.out.println(value); } }';

test('distinct input variants compile with bounded concurrency and duplicates reuse bytecode without changing saved source', async () => {
  reset();
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pip-batching-'));
  const file = path.join(directory, 'Student.java');
  try {
    await writeFile(file, source);
    const result = await runLesson({ lesson, source: await readFile(file, 'utf8'), jdk, resourceRoot });
    assert.equal(result.passed, true, JSON.stringify(result));
    assert.deepEqual(result.checks.map(check => check.output.trim()), ['1', '2', '3', '2', '4', '5', '6', '1']);
    assert.equal(launches.filter(item => item.compile).length, 6, 'one original plus five distinct changed sources');
    assert.equal(maximumCompilers, 3);
    assert.equal(result.quality.status, 'perfect');
    assert.equal(await readFile(file, 'utf8'), source);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('method probes compile once together but keep independent static state and original main', async () => {
  reset();
  const source = 'package saved.methods; public class Student { static int calls = 0; public static int next() { return ++calls; } public static void main(String[] args) { System.out.println("main"); } }';
  const lesson = { id: 'batched-methods', kind: 'console', cases: [{ input: '', expected: 'main' }, ...Array.from({ length: 99 }, () => ({ input: '', invocation: 'System.out.println(Student.next());', expected: '1' }))] };
  const result = await runLesson({ lesson, source, jdk, resourceRoot });
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.equal(result.checks.length, 100);
  assert.equal(launches.filter(item => item.compile).length, 2);
  assert.equal(launches.filter(item => !item.compile && item.args.at(-1).startsWith('saved.methods.')).length, 100);
});

test('a failed changed-data compile never executes another variant or the original bytecode', async () => {
  reset();
  const source = 'public class Student { public static void main(String[] args) { final int value = 1; switch (value) { case 0: break; case value: System.out.println(value); } } }';
  const lesson = { id: 'failed-variant', kind: 'console', cases: [1, 0, 2, 1].map((value, i) => ({ input: '', inputs: { value }, mutate: i === 3 ? false : true, expected: String(value) })) };
  const result = await runLesson({ lesson, source, jdk, resourceRoot });
  assert.equal(result.passed, false);
  assert.equal(result.checks[1].passed, false);
  assert.match(result.checks[1].error, /no longer compiles/);
  assert.equal(result.checks[2].output.trim(), '2');
  assert.equal(result.checks[3].output.trim(), '1');
  assert.equal(result.quality.lint, 'failed');
  assert.notEqual(result.quality.status, 'perfect');
  assert.equal(launches.filter(item => !item.compile && item.args.at(-1) === 'Student').length, 3);
});

test('game batching preserves case order, data reuse and streamed headless outcomes', async () => {
  reset();
  const world = { width: 3, height: 2, robot: { x: 0, y: 0, dir: 'E' } };
  const game = { id: 'batch-game', project: true, commands: [], world: (_rng, _level, index) => ({ ...world, variables: { value: index % 5 + 1 } }), goal: (end, world) => ({ passed: end.said.includes(String(world.variables.value)) }) };
  const streamed = [];
  const result = await runGame({ game, source, jdk, resourceRoot, seeds: Array.from({ length: 20 }, (_, i) => i + 1), onWorld: world => streamed.push(world) });
  assert.equal(result.earnedStars, 1, JSON.stringify(result));
  assert.equal(result.worlds.length, 20);
  assert.deepEqual(streamed, result.worlds);
  assert.deepEqual(result.worlds.map(world => world.seed), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.deepEqual(result.worlds.map(world => world.output.trim()), Array.from({ length: 20 }, (_, i) => String(i % 5 + 1)));
  assert.equal(result.compiles, 5, 'original values reuse the initial compilation');
  assert(maximumCompilers <= 3);
});

test('cancelling parallel compilation stops every child before temporary files are removed', async () => {
  reset();
  const controller = new AbortController(), directory = await mkdtemp(path.join(os.tmpdir(), 'pip-batch-cancel-'));
  let variants = 0;
  onStart = ({ compile, options }) => { if (compile && /variant-\d+$/.test(options.cwd) && ++variants === 2) controller.abort(); };
  try {
    await assert.rejects(runLesson({ lesson, source, jdk, resourceRoot, signal: controller.signal, cacheRoot: directory }), /cancelled/);
    assert.equal(activeCompilers, 0);
    assert(variants >= 2 && variants <= 3, 'cancellation must not schedule work beyond the already-started batch');
    assert.deepEqual(await readdir(directory), []);
  } finally { onStart = undefined; await rm(directory, { recursive: true, force: true }); }
});
