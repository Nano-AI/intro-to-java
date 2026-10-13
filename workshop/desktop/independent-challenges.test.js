import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
import { runProcess } from '../host/runner.js';
import { lessons } from '../src/curriculum.js';
import { normalizeProgress } from '../shared/progress.js';
import { hasPassedPart } from '../shared/completion.js';

// Host-contract fixtures are test-only: no answers are added to learner content.
const base = { independent: true, kind: 'console', unit: 'basics', prerequisites: ['java-variables'], assessmentVersion: 1, starter: 'public class Student { public static void main(String[] args) {} }' };
const variables = { ...base, id: 'challenge-host-variables', requirements: { variables: { bolts: 'int', used: 'int', total: 'int' }, prints: ['total'] }, cases: [
  { input: '', inputs: { bolts: 10, used: 4 }, mutate: false, expected: '6' },
  { input: '', inputs: { bolts: 9, used: 9 }, expected: '0' },
  { input: '', inputs: { bolts: 14, used: 2 }, expected: '12' },
] };
const locked = { ...variables, id: 'challenge-host-locked', prerequisites: ['java-for'] };
const methods = { ...base, id: 'challenge-host-methods', unit: 'methods', requirements: { methods: [{ name: 'twice', returns: 'int', parameters: ['int'] }] }, cases: [-2, 0, 4].map(value => ({ input: '', invocation: `System.out.println(Student.twice(${value}));`, expected: String(value * 2) })) };
const input = { ...base, id: 'challenge-host-input', unit: 'decisions', requirements: { calls: ['nextInt'] }, cases: [4, -3, 0].map(value => ({ input: String(value), expected: String(value * 2) })) };
const fixtures = [variables, locked, methods, input];
for (const fixture of fixtures) fixture.publicCases = fixture.cases.slice(0, 3);

test('independent Run is ungraded, Submit checks new data, and prerequisites preserve older Java and records', async () => {
  const application = fileURLToPath(new URL('../', import.meta.url));
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'pip-independent-'));
  const resources = path.join(home, 'resources'), student = path.join(home, '.pip-java');
  const fileFor = lesson => path.join(student, 'src/pip/lessons', lesson.id.replaceAll('-', '_'), 'Student.java');
  const oldJava = 'package earlier.student;\r\n// Saved in an earlier app.\r\npublic class Student { public static void main(String[] args) { int bolts = 10; int used = 4; int total = bolts - used; System.out.println(total); } }\r\n';
  const oldLockedJava = '// Earlier completed challenge stays saved while prerequisites are locked.\npublic class Student {}';
  const oldProgress = JSON.stringify(normalizeProgress({ completed: ['hello-java', 'java-variables', locked.id], drafts: { [variables.id]: 'An older draft must not replace the file.' }, answers: { 'hello-java:0': 1 }, reflections: { 'java-variables': 'Keep these notes.' } }), null, 2);
  let hooks, diagnosed;
  lessons.push(...fixtures);
  try {
    await fs.mkdir(resources); await fs.mkdir(student);
    await fs.symlink(path.join(application, 'src-tauri/jre'), path.join(resources, 'jre'));
    await fs.copyFile(path.join(application, 'InspectSource.java'), path.join(resources, 'InspectSource.java'));
    for (const [lesson, source] of [[variables, oldJava], [locked, oldLockedJava]]) {
      await fs.mkdir(path.dirname(fileFor(lesson)), { recursive: true }); await fs.writeFile(fileFor(lesson), source);
    }
    await fs.writeFile(path.join(student, 'progress.json'), oldProgress);
    globalThis.window = { postMessage() {}, __TAURI__: { core: { async invoke(command, args = {}) {
      switch (command) {
        case 'paths': return { home, resources, temp: home, platform: process.platform, development: true };
        case 'fs_read': return fs.readFile(args.path, 'utf8');
        case 'fs_write': return fs.writeFile(args.path, args.contents, { flag: args.createNew ? 'wx' : 'w' });
        case 'fs_mkdir': return fs.mkdir(args.path, { recursive: true });
        case 'fs_remove': return fs.rm(args.path, { recursive: true, force: true });
        case 'fs_rename': return fs.rename(args.from, args.to);
        case 'fs_exists': return fs.access(args.path).then(() => true, () => false);
        case 'fs_mkdtemp': return fs.mkdtemp(args.prefix);
        case 'run_process': return runProcess(args.command, args.args, { cwd: args.cwd || undefined, input: args.input, timeout: args.timeoutMs, maxOutput: args.maxOutput });
        case 'diagnose': diagnosed = args; return { diagnostics: [{ line: 3, col: 7, severity: 'ERROR', message: 'incompatible types' }] };
        case 'complete': throw new Error('Independent challenges must not invoke autocomplete.');
        default: throw new Error(`Unexpected desktop command: ${command}`);
      }
    } } } };
    const shims = { 'node:fs/promises': 'node-fs.js', 'node:path': 'node-path.js', 'node:os': 'node-os.js', 'node:crypto': 'node-crypto.js', './process.js': 'process.js' };
    hooks = registerHooks({ resolve(specifier, context, next) {
      if (shims[specifier] && /\/(host|desktop)\/[\w-]+\.js$/.test(context.parentURL || '')) return { url: new URL(shims[specifier], import.meta.url).href, shortCircuit: true };
      return next(specifier, context);
    } });
    const { handle } = await import('./host.js');
    for (const [method, params] of [
      ['lesson.open', {}], ['lesson.focus', {}], ['lesson.save', { source: 'must not overwrite' }],
      ['lesson.run', { source: 'must not overwrite' }], ['lesson.run', { input: '', source: 'must not overwrite' }],
      ['lesson.restore', { confirmed: true }],
    ]) await assert.rejects(handle(method, { lessonId: locked.id, ...params }), /locked/i);
    assert.equal(await fs.readFile(fileFor(locked), 'utf8'), oldLockedJava);
    assert.equal(await fs.readFile(path.join(student, 'progress.json'), 'utf8'), oldProgress);
    const opened = await handle('lesson.open', { lessonId: variables.id });
    assert.equal(opened.source, oldJava, 'preserves source, CRLF, package, and notes');
    assert.equal('solution' in opened || 'hint' in opened, false);
    const run = await handle('lesson.run', { lessonId: variables.id, input: '' });
    assert.equal(run.custom, true); assert.equal(run.result.kind, 'custom'); assert.equal(run.result.output.trim(), '6');
    assert.equal(run.result.passed, undefined); assert.equal(run.result.checks, undefined);
    assert.equal((await handle('progress.load')).completed.includes(variables.id), false);
    assert.equal((await handle('progress.load')).assessments[variables.id], undefined);
    const publicRun = await handle('lesson.run', { lessonId: variables.id, mode: 'public' });
    assert.equal(publicRun.custom, true); assert.equal(publicRun.mode, 'public');
    assert.equal(publicRun.result.kind, 'public'); assert.equal(publicRun.result.passed, true);
    assert.equal(publicRun.result.checks.length, 3);
    assert.deepEqual(publicRun.result.checks.map(check => check.inputs), variables.publicCases.map(check => check.inputs));
    assert.equal((await handle('progress.load')).completed.includes(variables.id), false, 'passing public cases does not complete the challenge');
    assert.equal(await fs.readFile(fileFor(variables), 'utf8'), oldJava, 'public input replacement leaves old Java byte-identical');
    await assert.rejects(handle('lesson.run', { lessonId: variables.id, mode: 'public', input: '9' }), /Public cases/);
    const submitted = await handle('lesson.run', { lessonId: variables.id });
    assert.equal(submitted.custom, false); assert.equal(submitted.result.passed, true);
    assert.deepEqual(submitted.result.checks.map(check => check.output.trim()), ['6', '0', '12']);
    assert.equal((await handle('progress.load')).assessments[variables.id], 1);
    assert.equal(await fs.readFile(fileFor(variables), 'utf8'), oldJava, 'Submit mutates temporary Java copies only');
    variables.assessmentVersion = 2;
    variables.cases = variables.cases.map(check => ({ ...check, expected: `${check.inputs.used}\n${check.expected}` }));
    const beforeRevisionOpen = await fs.readFile(path.join(student, 'progress.json'), 'utf8');
    assert.equal((await handle('lesson.open', { lessonId: variables.id })).source, oldJava);
    assert.equal(await fs.readFile(path.join(student, 'progress.json'), 'utf8'), beforeRevisionOpen, 'opening a harder version retains the earlier pass and draft');
    assert.equal(hasPassedPart(variables, await handle('progress.load')), false, 'version 1 is not a pass for the revised task');
    assert.equal((await handle('lesson.run', { lessonId: variables.id })).result.passed, false);
    assert.equal((await handle('progress.load')).assessments[variables.id], 1, 'failed recheck preserves the earlier assessment record');
    assert.equal(await fs.readFile(fileFor(variables), 'utf8'), oldJava, 'revision never rewrites the older Java automatically');
    const revisedSource = oldJava.replace('System.out.println(total);', 'System.out.println(used); System.out.println(total);');
    assert.equal((await handle('lesson.run', { lessonId: variables.id, source: revisedSource })).result.passed, true);
    assert.equal(hasPassedPart(variables, await handle('progress.load')), true);
    assert.equal((await handle('progress.load')).assessments[variables.id], 2);
    assert.deepEqual(await handle('lesson.complete', { lessonId: variables.id, source: oldJava, offset: 3 }), []);
    const diagnostics = await handle('lesson.diagnose', { lessonId: variables.id, source: oldJava });
    assert.equal(diagnosed.source, oldJava); assert.equal(diagnostics[0].severity, 'error');
    await assert.rejects(handle('lesson.solution', { lessonId: variables.id }), /independent challenges/i);

    const methodSource = 'package earlier.methods; public class Student { public static void main(String[] args) { System.out.println("local test"); } public static int twice(int value) { return 4; } }';
    const methodRun = await handle('lesson.run', { lessonId: methods.id, input: '', source: methodSource });
    assert.equal(methodRun.result.output.trim(), 'local test', 'Run executes original main instead of method probes');
    const wrong = await handle('lesson.run', { lessonId: methods.id });
    assert.equal(wrong.result.passed, false);
    assert.equal((await handle('progress.load')).completed.includes(methods.id), false, 'a failed Submit cannot award completion');
    const corrected = methodSource.replace('return 4;', 'return value * 2;');
    assert.equal((await handle('lesson.run', { lessonId: methods.id, source: corrected })).result.passed, true);
    const failedCompile = await handle('lesson.run', { lessonId: input.id, source: 'public class Student {' });
    assert.equal(failedCompile.result.stage, 'compile');
    assert.equal((await handle('progress.load')).completed.includes(input.id), false);
    const inputSource = 'import java.util.Scanner; public class Student { public static void main(String[] args) { Scanner scanner = new Scanner(System.in); System.out.println(scanner.nextInt() * 2); } }';
    const inputRun = await handle('lesson.run', { lessonId: input.id, source: inputSource, input: input.cases[0].input });
    assert.equal(inputRun.result.output.trim(), '8'); assert.equal(inputRun.result.kind, 'custom');
    assert.equal((await handle('progress.load')).completed.includes(input.id), false);
    assert.equal((await handle('lesson.run', { lessonId: input.id })).result.passed, true);
    const ambiguous = oldJava.replace('public class Student {', 'public class Student { public static int bolts = 99;');
    await assert.rejects(handle('lesson.run', { lessonId: variables.id, source: ambiguous }), /Declare bolts once with an initial value/);
    const progress = await handle('progress.load');
    assert.ok(progress.completed.includes(locked.id));
    assert.equal(progress.answers['hello-java:0'], 1); assert.equal(progress.reflections['java-variables'], 'Keep these notes.');
    assert.equal(await fs.readFile(fileFor(locked), 'utf8'), oldLockedJava);
  } finally {
    hooks?.deregister();
    for (const fixture of fixtures) lessons.splice(lessons.indexOf(fixture), 1);
    await fs.rm(home, { recursive: true, force: true });
  }
});
