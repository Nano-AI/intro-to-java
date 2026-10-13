import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { assertCoding, lessonPackage, withPackage } from '../host/runner.js';
import { lessons } from '../src/curriculum.js';
import { games } from '../src/games/index.js';
import { projectPrerequisites } from '../shared/project-access.js';

// This boundary test controls when execution finishes. Real javac and assessment
// behavior are covered separately; here an edit must never inherit its old result.
const files = new Map(), events = [];
let execution = async () => {};
globalThis.__resultTestRunner = {
  assertCoding, lessonPackage, withPackage,
  findJdk: async () => ({ home: '/res/jre', version: '21' }),
  runLesson: async args => { await execution(args); return { passed: true, quality: { status: 'perfect', lint: 'complete', warningCount: 0 } }; },
  runGame: async args => { await execution(args); return { kind: 'game', mode: args.mode, worlds: [{ passed: true }], sourceChecks: [], earnedStars: 3, best: 4, quality: { status: 'perfect', lint: 'complete', warningCount: 0 } }; },
};
globalThis.window = { postMessage: message => events.push(message), __TAURI__: { core: { invoke: async (command, args) => {
  switch (command) {
    case 'paths': return { home: '/home', resources: '/res', temp: '/tmp', platform: 'darwin' };
    case 'fs_read': if (!files.has(args.path)) throw `ENOENT: ${args.path}`; return files.get(args.path);
    case 'fs_write': if (args.createNew && files.has(args.path)) throw 'EEXIST'; files.set(args.path, args.contents); return;
    case 'fs_rename': files.set(args.to, files.get(args.from)); files.delete(args.from); return;
    case 'fs_mkdir': return;
    default: throw new Error(`Unexpected command: ${command}`);
  }
} } } };
const shims = { 'node:fs/promises': 'node-fs.js', 'node:path': 'node-path.js', 'node:os': 'node-os.js', 'node:crypto': 'node-crypto.js' };
registerHooks({ resolve(specifier, context, next) {
  if (specifier === '../host/runner.js' && context.parentURL?.endsWith('/desktop/host.js')) {
    return { url: `data:text/javascript,${encodeURIComponent('export const { assertCoding, lessonPackage, withPackage, findJdk, runLesson, runGame } = globalThis.__resultTestRunner;')}`, shortCircuit: true };
  }
  if (shims[specifier] && /\/(host|desktop)\/[\w-]+\.js$/.test(context.parentURL || '') && !context.parentURL.endsWith('/host-results.test.js')) {
    return { url: new URL(shims[specifier], import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
} });
const { handle } = await import('./host.js');
const lesson = lessons.find(item => item.id === 'hello-java');
const game = games.find(item => item.id === 'hello-arena');
const targets = [{ key: 'lessonId', item: lesson, open: 'lesson.open', run: 'lesson.run' }, { key: 'gameId', item: game, open: 'game.open', run: 'game.run' }];
const progress = await handle('progress.load');
progress.completed.push(...projectPrerequisites(game));

test('student builds can watch one example without changing Java, progress or the current result', async () => {
  assert.deepEqual(await handle('demo.get'), { enabled: false, available: false });
  execution = async () => {};
  const opened = await handle('game.open', { gameId: game.id });
  const submitted = await handle('game.run', { gameId: game.id, source: opened.source });
  const before = structuredClone(await handle('progress.load')), savedFiles = new Map(files), eventCount = events.length;
  let calls = 0;
  execution = async args => {
    calls++;
    assert.equal(args.mode, 'custom');
    assert.equal(args.source, withPackage(game.solution, `pip.games.${game.id.replaceAll('-', '_')}`));
    assert.ok(args.game.sampleWorld);
  };
  const example = await handle('game.example', { gameId: game.id });
  assert.equal(example.gameId, game.id);
  assert.equal(example.source, undefined);
  assert.deepEqual(await handle('game.example', { gameId: game.id }), example);
  assert.equal(calls, 1, 'replay uses its cached reference result');
  assert.deepEqual(files, savedFiles);
  assert.deepEqual(await handle('progress.load'), before);
  assert.equal(events.length, eventCount, 'example does not emit student run or progress events');
  assert.equal((await handle('game.open', { gameId: game.id })).result.runId, submitted.runId);
});

for (const target of targets) {
  const params = { [target.key]: target.item.id };
  test(`${target.key}: same-source save retains result; edit-save-reopen invalidates it and preserves progress`, async () => {
    execution = async () => {};
    const first = await handle(target.open, params);
    const packet = await handle(target.run, { ...params, source: first.source });
    assert.equal(packet.stale, undefined);
    assert.equal((await handle(target.open, params)).result.result.quality.status, 'perfect');
    const before = structuredClone(await handle('progress.load'));
    const changes = events.filter(event => event.event === 'document.changed').length;
    await handle('lesson.save', { ...params, source: first.source });
    assert.equal((await handle(target.open, params)).result.runId, packet.runId);
    assert.equal(events.filter(event => event.event === 'document.changed').length, changes, 'a queued identical autosave must not clear the fresh result');
    const edited = `${first.source}\n// New work after Submit.\n`;
    await handle('lesson.save', { ...params, source: edited });
    await handle('lesson.open', { lessonId: 'java-variables' });
    const reopened = await handle(target.open, params);
    assert.equal(reopened.source, edited); assert.equal(reopened.result, null);
    assert.equal(files.get(`/home/.pip-java/${reopened.file}`), edited);
    const after = await handle('progress.load');
    assert.deepEqual(after.completed, before.completed);
    assert.deepEqual(after.assessments, before.assessments);
    assert.deepEqual(after.games, before.games);
    assert.equal(after.drafts[target.item.id], edited);
  });

  test(`${target.key}: newer saved source survives an older in-flight pass`, async () => {
    const before = await handle('progress.load');
    if (target.key === 'lessonId') {
      before.completed = before.completed.filter(id => id !== target.item.id);
      delete before.assessments[target.item.id];
    } else delete before.games[target.item.id];
    let finish, started;
    const executing = new Promise(resolve => { started = resolve; });
    execution = async args => { started(args.source); await new Promise(resolve => { finish = resolve; }); };
    const opened = await handle(target.open, params), submitted = opened.source;
    const running = handle(target.run, params);
    assert.equal(await executing, submitted);
    const edited = `${submitted}\n// Saved while the earlier program was running.\n`;
    await handle('lesson.save', { ...params, source: edited });
    finish(); const packet = await running;
    assert.equal(packet.stale, true);
    assert.equal(events.filter(event => event.event === 'run.finished').at(-1).data.stale, true);
    const reopened = await handle(target.open, params);
    assert.equal(reopened.result, null); assert.equal(reopened.source, edited);
    const after = await handle('progress.load');
    assert.equal(after.drafts[target.item.id], edited, 'the old run must not replace the newer saved draft');
    if (target.key === 'lessonId') assert(after.completed.includes(target.item.id), 'the actual judged pass remains earned');
    else assert.equal(after.games[target.item.id].stars, 3, 'the actual judged pass remains earned');
  });

  test(`${target.key}: unchanged save during execution is current, external file edits invalidate reopen`, async () => {
    let finish, started;
    const executing = new Promise(resolve => { started = resolve; });
    execution = async () => { started(); await new Promise(resolve => { finish = resolve; }); };
    const opened = await handle(target.open, params);
    const running = handle(target.run, params);
    await executing;
    await handle('lesson.save', { ...params, source: opened.source });
    finish(); const packet = await running;
    assert.equal(packet.stale, undefined);
    assert.equal((await handle(target.open, params)).result.runId, packet.runId);
    files.set(`/home/.pip-java/${opened.file}`, `${opened.source}\n// Edited outside Pip.\n`);
    assert.equal((await handle(target.open, params)).result, null);
  });

  test(`${target.key}: late infrastructure failure is stale after an edit and does not erase progress`, async () => {
    let finish, started;
    const executing = new Promise(resolve => { started = resolve; });
    execution = async () => { started(); await new Promise(resolve => { finish = resolve; }); throw new Error('Execution service stopped'); };
    const before = structuredClone(await handle('progress.load'));
    const opened = await handle(target.open, params);
    const running = handle(target.run, params);
    const rejected = assert.rejects(running, /Execution service stopped/);
    await executing;
    const edited = `${opened.source}\n// New draft before an old service failure.\n`;
    await handle('lesson.save', { ...params, source: edited });
    finish(); await rejected;
    assert.equal(events.filter(event => event.event === 'run.finished').at(-1).data.stale, true);
    assert.equal((await handle(target.open, params)).result, null);
    const after = await handle('progress.load');
    assert.equal(after.drafts[target.item.id], edited);
    assert.deepEqual(after.completed, before.completed);
    assert.deepEqual(after.games, before.games);
  });
}
