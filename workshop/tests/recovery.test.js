import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { recoverProgress } from '../tools/recover-progress.mjs';

async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pip-recovery-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const workspace = path.join(dir, 'old-workspace'), target = path.join(dir, '.pip-java');
  const progressFile = path.join(dir, 'old-progress.json');
  const current = { version: 5, completed: ['java-strings'], drafts: { 'hello-java': 'current draft' }, reflections: { 'hello-java': 'current note', 'java-strings': '' }, games: { 'hello-arena': { stars: 3, best: 7, updatedAt: '2026-09-25T23:34:12.809Z' } }, customMetadata: { kept: true } };
  const old = { version: 5, completed: ['hello-java', 'java-declare'], drafts: { 'hello-java': 'older draft', 'java-declare': 'old variable draft' }, reflections: { 'hello-java': 'old note', 'java-strings': 'earlier useful note' } };
  const files = {
    'src/pip/lessons/hello_java/Student.java': 'package pip.lessons.hello_java;\n// current student work\nclass Student {}\n',
    'src/pip/lessons/first_movement/Robot.java': 'package pip.lessons.first_movement;\n// customized robot\nclass Robot {}\n',
    'settings.json': '{"javaHome":"/existing/jdk"}',
  };
  for (const [rel, text] of Object.entries(files)) { await mkdir(path.dirname(path.join(target, rel)), { recursive: true }); await writeFile(path.join(target, rel), text); }
  await writeFile(path.join(target, 'progress.json'), JSON.stringify(current));
  await writeFile(progressFile, JSON.stringify(old));
  for (const [rel, text] of Object.entries({
    'src/pip/lessons/hello_java/Student.java': 'package pip.lessons.hello_java;\nclass Student { /* older */ }\n',
    'src/pip/lessons/first_movement/Robot.java': 'package pip.lessons.first_movement;\nclass Robot { /* older */ }\n',
    'src/pip/lessons/java_declare/Student.java': 'package pip.lessons.java_declare;\r\n// retain old CRLF and whitespace\r\nclass Student {}\r\n',
    'src/pip/lessons/java_types/Student.java': '// old source without package\nclass Student {}\n',
  })) { await mkdir(path.dirname(path.join(workspace, rel)), { recursive: true }); await writeFile(path.join(workspace, rel), text); }
  return { dir, workspace, target, progressFile, current, old, files, isAppRunning: async () => false };
}

test('recovery previews authentic passes and source conflicts without writing anything', async t => {
  const data = await fixture(t), before = await readdir(data.dir);
  const result = await recoverProgress(data);
  assert.equal(result.applied, false);
  assert.deepEqual(result.addedCompletionIds, ['hello-java', 'java-declare']);
  assert.equal(result.missingJava.length, 2);
  assert.equal(result.keptJava.length, 2);
  assert.equal(result.conflictingJava.length, 2);
  assert.deepEqual(await readdir(data.dir), before);
  assert.deepEqual(JSON.parse(await readFile(path.join(data.target, 'progress.json'))), data.current);
});

test('recovery backs up the entire desktop workspace, keeps current data, and only adds missing Java', async t => {
  const data = await fixture(t);
  const result = await recoverProgress({ ...data, apply: true });
  assert.equal(result.applied, true);
  assert.deepEqual(JSON.parse(await readFile(path.join(result.backup, 'progress.json'))), data.current);
  for (const [rel, text] of Object.entries(data.files)) {
    assert.equal(await readFile(path.join(data.target, rel), 'utf8'), text);
    assert.equal(await readFile(path.join(result.backup, rel), 'utf8'), text);
  }
  const merged = JSON.parse(await readFile(path.join(data.target, 'progress.json')));
  assert.deepEqual(new Set(merged.completed), new Set(['java-strings', 'hello-java', 'java-declare']));
  assert.deepEqual(merged.games, data.current.games);
  assert.equal(merged.drafts['hello-java'], 'current draft');
  assert.equal(merged.drafts['java-declare'], 'old variable draft');
  assert.equal(merged.reflections['hello-java'], 'current note');
  assert.equal(merged.reflections['java-strings'], 'earlier useful note');
  assert.deepEqual(merged.customMetadata, { kept: true });
  const rel = 'src/pip/lessons/java_declare/Student.java';
  assert.deepEqual(await readFile(path.join(data.target, rel)), await readFile(path.join(data.workspace, rel)));
  assert.match(await readFile(path.join(data.target, 'src/pip/lessons/java_types/Student.java'), 'utf8'), /^package pip\.lessons\.java_types;\n\n\/\/ old source/);
  const repeated = await recoverProgress(data);
  assert.deepEqual(repeated.addedCompletionIds, []);
  assert.deepEqual(repeated.missingJava, []);
});

test('recovery refuses to write while the desktop app is running', async t => {
  const data = await fixture(t), before = await readdir(data.dir);
  await assert.rejects(recoverProgress({ ...data, apply: true, isAppRunning: async () => true }), /Quit Pip Workshop/);
  assert.deepEqual(await readdir(data.dir), before);
  assert.deepEqual(JSON.parse(await readFile(path.join(data.target, 'progress.json'))), data.current);
});

test('saved code never invents a completion and incompatible packages require review', async t => {
  const data = await fixture(t);
  const preview = await recoverProgress(data);
  assert.ok(!preview.addedCompletionIds.includes('java-types'), 'saved source is not proof of passing');
  await writeFile(path.join(data.workspace, 'src/pip/lessons/java_types/Student.java'), 'package another.project;\nclass Student {}');
  await assert.rejects(recoverProgress(data), /Package mismatch/);
  assert.deepEqual(JSON.parse(await readFile(path.join(data.target, 'progress.json'))), data.current);
});
