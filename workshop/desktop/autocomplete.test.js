import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findJdk, runProcess } from '../host/runner.js';

test('real Java completion finds println, project helpers and their parameters in a game package', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const jdk = await findJdk([path.join(root, 'runtime', 'jdk')]);
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'pip-completion-'));
  try {
    const compiled = await runProcess(jdk.javac, ['-encoding', 'UTF-8', '-d', temporary, path.join(root, 'desktop', 'DiagD.java')]);
    assert.equal(compiled.code, 0, compiled.error);
    const cases = [
      'public static void main(String[] args) { System.out.pr| }',
      'public static void walkSegment(int steps) { System.out.println("move " + steps); } public static void main(String[] args) { System.out.println("Ready: 🤖"); walk| }',
      'public static void walkSegment(int steps) { System.out.println(ste|); }',
    ];
    const input = cases.map(body => {
      const marked = `package pip.games.methods_robot; public class Student { ${body} }`;
      const offset = marked.indexOf('|'), source = marked.replace('|', '');
      return `C\n${temporary}\npip/games/methods_robot/Student.java\n${Buffer.byteLength(source)}\n${offset}\n${source}`;
    }).join('');
    const completed = await runProcess(jdk.java, ['-cp', temporary, 'DiagD'], { input });
    assert.equal(completed.code, 0, completed.error);
    const results = completed.stdout.trim().split('\n').map(line => JSON.parse(line).items);
    assert.equal(results.length, 3);
    assert.ok(results[0].some(item => item.label === 'println' && item.kind === 'method'));
    const helper = results[1].find(item => item.label === 'walkSegment');
    assert.equal(helper?.insertText, 'walkSegment(${1:steps})');
    assert.equal(helper?.detail, 'walkSegment(int steps) : void');
    assert.ok(results[2].some(item => item.label === 'steps' && item.kind === 'variable'));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
