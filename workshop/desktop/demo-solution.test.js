import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
import { runProcess, withPackage, lessonPackage } from '../host/runner.js';
import { lessons } from '../src/curriculum.js';
import { games } from '../src/games/index.js';
import { gamePackage, gameSourcePath } from '../shared/game-contract.js';
import { normalizeProgress } from '../shared/progress.js';

// Exercise the desktop host with real files and Java, through the same fs bridge.
// Everything lives under a disposable home, including student and demo workspaces.
test('demo solutions save and execute without changing real student Java or progress', async () => {
  const application = fileURLToPath(new URL('../', import.meta.url));
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'pip-demo-solution-'));
  const resources = path.join(home, 'resources'), student = path.join(home, '.pip-java');
  const lesson = lessons.find(item => item.id === 'hello-java');
  const game = games.find(item => item.id === 'supply-relay');
  const olderRelay = withPackage('// Saved before supplied inputs were locked.\npublic class Student { public static void main(String[] args) { int gap = 2; int supplies = 3; int energy = 50; int costPerTile = 2; System.out.println("My unfinished relay"); } }\n', gamePackage(game.id));
  const originals = new Map([
    [`src/pip/lessons/hello_java/Student.java`, withPackage('// Existing lesson notes.\n' + lesson.starter, lessonPackage(lesson.id))],
    [gameSourcePath(game.id), olderRelay],
    ['progress.json', JSON.stringify(normalizeProgress({ completed: ['java-variables'], answers: { 'hello-java:0': 1, 'supply-relay:10': 1, 'supply-relay:14': 0, 'staircase-arena:11': 1 }, games: { 'supply-relay': { stars: 1, best: null, updatedAt: null } }, drafts: { [lesson.id]: 'Keep this earlier draft.' } }), null, 2)],
  ]);
  let hooks;
  try {
    await fs.mkdir(resources);
    await fs.symlink(path.join(application, 'src-tauri/jre'), path.join(resources, 'jre'));
    for (const name of ['Robot.java', 'Runner.java', 'InspectSource.java']) await fs.copyFile(path.join(application, name), path.join(resources, name));
    for (const [relative, source] of originals) {
      const file = path.join(student, relative);
      await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, source);
    }
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
        default: throw new Error(`Unexpected desktop command: ${command}`);
      }
    } } } };
    const shims = { 'node:fs/promises': 'node-fs.js', 'node:path': 'node-path.js', 'node:os': 'node-os.js', 'node:crypto': 'node-crypto.js', './process.js': 'process.js' };
    hooks = registerHooks({ resolve(specifier, context, next) {
      if (shims[specifier] && /\/(host|desktop)\/[\w-]+\.js$/.test(context.parentURL || '')) return { url: new URL(shims[specifier], import.meta.url).href, shortCircuit: true };
      return next(specifier, context);
    } });
    const { handle } = await import('./host.js');
    for (const [method, params] of [['lesson.solution', { lessonId: lesson.id }], ['game.solution', { gameId: game.id }]]) await assert.rejects(handle(method, params), /demo mode/i);
    await handle('demo.set', { enabled: true });
    const demoRoot = (await handle('runtime.info')).workspace;
    assert.notEqual(demoRoot, student);
    const reopened = await handle('game.open', { gameId: game.id });
    assert.equal(reopened.source, olderRelay, 'opening the revised project preserves the old Java file byte-for-byte');
    const beforeExample = structuredClone(await handle('progress.load'));
    const example = await handle('game.example', { gameId: game.id });
    assert.equal(example.result.worlds.length, 1, 'Play demo runs exactly one worked example');
    assert.equal(example.result.earnedStars, null);
    assert.equal(example.source, undefined, 'example replay does not return solution Java');
    const expectedWorld = example.result.worlds[0];
    assert.equal(game.goal(expectedWorld.end, expectedWorld.world).passed, true, 'the example actually reaches the goal');
    assert.ok(expectedWorld.output.length > 0);
    assert.deepEqual(await handle('progress.load'), beforeExample, 'watching an example never awards or modifies progress');
    assert.equal((await handle('game.open', { gameId: game.id })).source, olderRelay);
    example.result.worlds.length = 0;
    assert.equal((await handle('game.example', { gameId: game.id })).result.worlds.length, 1, 'cached replay cannot be mutated by its caller');
    const legacyTrial = await handle('game.run', { gameId: game.id, mode: 'custom', input: '' });
    assert.equal(legacyTrial.result.stage, 'checks');
    assert.match(legacyTrial.result.error, /final int gap = 2;.*Restore starter/);
    assert.equal(await fs.readFile(path.join(demoRoot, gameSourcePath(game.id)), 'utf8'), olderRelay, 'validation never rewrites an older source');
    assert.deepEqual(await handle('game.restore', { gameId: game.id }), { needsConfirm: true });
    assert.equal(await fs.readFile(path.join(demoRoot, gameSourcePath(game.id)), 'utf8'), olderRelay);
    const restored = await handle('game.restore', { gameId: game.id, confirmed: true });
    assert.equal(restored.source, withPackage(game.starter, gamePackage(game.id)), 'confirmed restore returns the source for an explicit editor protection reset');
    assert.equal(restored.restored, true);
    for (const [method, params, authored, namespace, relative] of [
      ['lesson.solution', { lessonId: lesson.id }, lesson.solution, lessonPackage(lesson.id), 'src/pip/lessons/hello_java/Student.java'],
      ['game.solution', { gameId: game.id }, game.solution, gamePackage(game.id), gameSourcePath(game.id)],
    ]) {
      const inserted = await handle(method, params);
      assert.equal(inserted.source, withPackage(authored, namespace));
      assert.equal(await fs.readFile(path.join(demoRoot, relative), 'utf8'), inserted.source);
    }
    const lessonRun = await handle('lesson.run', { lessonId: lesson.id });
    assert.equal(lessonRun.result.passed, true, JSON.stringify(lessonRun.result));
    const partial = game.starter.replace('// Print commands to pick up and deliver the supply.', 'System.out.println("move " + gap);\nSystem.out.println("pick up");');
    const pickupRun = await handle('game.run', { gameId: game.id, mode: 'custom', input: '', source: withPackage(partial, gamePackage(game.id)) });
    assert.deepEqual(pickupRun.result.verifiedSteps, [1]);
    assert.equal(pickupRun.result.earnedStars, null, 'checking a trial step does not award the project');
    const afterPickup = structuredClone(await handle('progress.load'));
    assert.equal(afterPickup.answers['supply-relay:11'], 1, 'keeps the established checklist answer key');
    assert.equal(afterPickup.answers['supply-relay:10'], 1, 'keeps an old checked planning step');
    assert.equal(afterPickup.answers['supply-relay:14'], 0, 'does not check an unobserved explanation');
    assert.equal(afterPickup.answers['staircase-arena:11'], 1, 'keeps other project records');
    assert.equal(afterPickup.games['supply-relay'].stars, 1, 'a trial preserves an older project completion');
    const failed = await handle('game.run', { gameId: game.id, mode: 'custom', input: '', source: 'public class Student {' });
    assert.equal(failed.result.stage, 'compile');
    assert.deepEqual(failed.result.verifiedSteps, []);
    assert.deepEqual((await handle('progress.load')).answers, afterPickup.answers, 'a failed run never erases saved checklist progress');
    let stopping;
    window.postMessage = message => {
      if (message.event === 'run.progress' && message.data.gameId === game.id) stopping = handle('run.stop');
    };
    const cancelled = await handle('game.run', { gameId: game.id, mode: 'graded', source: withPackage(game.solution, gamePackage(game.id)) });
    await stopping; window.postMessage = () => {};
    assert.ok(cancelled.result.worlds.length > 0, 'cancellation happens after a simulated world provides evidence');
    assert.equal(cancelled.result.stage, 'runtime');
    assert.deepEqual(cancelled.result.verifiedSteps, []);
    assert.deepEqual((await handle('progress.load')).answers, afterPickup.answers, 'cancelled runs cannot add or erase checklist marks');
    assert.equal((await handle('progress.load')).games['supply-relay'].stars, 1, 'cancellation preserves older completion');
    await handle('game.solution', { gameId: game.id });
    const beforePublic = structuredClone(await handle('progress.load'));
    const publicRun = await handle('game.run', { gameId: game.id, mode: 'public' });
    assert.equal(publicRun.result.worlds.length, 3);
    assert.equal(publicRun.result.earnedStars, null);
    assert.deepEqual(publicRun.result.verifiedSteps, [1, 2], 'public execution can prove pickup and delivery, but not general energy arithmetic');
    const afterPublic = await handle('progress.load');
    for (const key of ['games', 'completed']) assert.deepEqual(afterPublic[key], beforePublic[key], `Run must not change ${key}`);
    assert.deepEqual(afterPublic.answers, { ...beforePublic.answers, 'supply-relay:11': 1, 'supply-relay:12': 1 }, 'only observed action steps change after Run');
    const gameRun = await handle('game.run', { gameId: game.id, mode: 'graded' });
    assert.equal(gameRun.result.earnedStars, 1, JSON.stringify(gameRun.result));
    assert.equal(gameRun.result.worlds.length, 20, 'Submit checks twenty worlds');
    for (const [relative, source] of originals) assert.equal(await fs.readFile(path.join(student, relative), 'utf8'), source, `${relative} must stay byte-identical`);
    await handle('demo.set', { enabled: false });
    await assert.rejects(fs.access(demoRoot), { code: 'ENOENT' });
    for (const [relative, source] of originals) assert.equal(await fs.readFile(path.join(student, relative), 'utf8'), source);
  } finally {
    hooks?.deregister();
    await fs.rm(home, { recursive: true, force: true });
  }
});
