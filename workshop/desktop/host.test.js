import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Resolve node:* and ./process.js to the desktop shims, as vite.config.js does.
const shims = { 'node:fs/promises': 'node-fs.js', 'node:path': 'node-path.js', 'node:os': 'node-os.js', 'node:crypto': 'node-crypto.js', './process.js': 'process.js' };
registerHooks({ resolve(specifier, context, next) {
  const shim = shims[specifier];
  if (shim && /\/(extension|desktop)\/(?!host\.test)[\w-]+\.js$/.test(context.parentURL || '')) return { url: new URL(shim, import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });

const files = new Map(), events = [];
const commands = {
  paths: () => ({ home: '/home', resources: '/res', temp: '/tmp', platform: 'darwin' }),
  fs_read: ({ path }) => { if (!files.has(path)) throw `ENOENT: ${path}`; return files.get(path); },
  fs_write: ({ path, contents, createNew }) => { if (createNew && files.has(path)) throw 'EEXIST'; files.set(path, contents); },
  fs_rename: ({ from, to }) => { files.set(to, files.get(from)); files.delete(from); },
  fs_mkdir: () => {}, fs_remove: () => {}, fs_exists: ({ path }) => files.has(path),
  run_process: () => ({ code: 1, stdout: '', stderr: '', error: 'no java' }),
  complete: args => { commands.complete.args = args; return { items: [{ label: 'nextInt', kind: 'method', detail: 'nextInt() : int', insertText: 'nextInt()' }] }; },
};
globalThis.window = {
  __TAURI__: { core: { invoke: async (name, args) => commands[name](args) } },
  postMessage: message => events.push(message),
};
const { handle } = await import('./host.js');
const { lessons } = await import('../src/curriculum.js');
const { games } = await import('../src/games/index.js');
const { gamePackage, gameRoute, gameSourcePath } = await import('../shared/game-contract.js');
const lesson = lessons.find(l => l.kind === 'console'), file = `/home/.pip-java/src/pip/lessons/${lesson.id.replaceAll('-', '_')}/Student.java`;

test('lesson.open creates Student.java in the lesson package', async () => {
  const opened = await handle('lesson.open', { lessonId: lesson.id });
  assert.match(files.get(file), new RegExp(`^package pip\\.lessons\\.${lesson.id.replaceAll('-', '_')};`));
  assert.equal(opened.source, files.get(file));
  assert.equal(opened.file, file.replace('/home/.pip-java/', ''));
});

test('lesson.save persists the file and draft and reports the change', async () => {
  await handle('lesson.save', { lessonId: lesson.id, source: 'class Student {}' });
  assert.equal(files.get(file), 'class Student {}');
  assert.equal(JSON.parse(files.get('/home/.pip-java/progress.json')).drafts[lesson.id], 'class Student {}');
  assert.ok(events.some(e => e.event === 'document.changed' && e.data.lessonId === lesson.id));
});

test('lesson.restore asks first and changes nothing', async () => {
  assert.deepEqual(await handle('lesson.restore', { lessonId: lesson.id }), { needsConfirm: true });
  assert.equal(files.get(file), 'class Student {}');
});

test('game.focus creates the game file and navigates to the game', async () => {
  const game = games[0], opened = await handle('game.focus', { gameId: game.id });
  assert.equal(opened.file, gameSourcePath(game.id));
  assert.ok(files.get(`/home/.pip-java/${gameSourcePath(game.id)}`).startsWith(`package ${gamePackage(game.id)};`));
  assert.ok(events.some(e => e.event === 'navigate' && e.data.route === gameRoute(game.id)));
});

test('lesson.complete asks the daemon about the lesson file', async () => {
  // findJdk checks the bundled jre and runs `javac -version`; pretend both work.
  const run = commands.run_process;
  files.set('/res/jre/bin/java', ''); files.set('/res/jre/bin/javac', '');
  commands.run_process = () => ({ code: 0, stdout: '', stderr: 'openjdk version "21.0.1"', error: '' });
  try {
    const items = await handle('lesson.complete', { lessonId: lesson.id, source: 'console.', offset: 8 });
    assert.deepEqual(items.map(i => i.label), ['nextInt']);
    assert.deepEqual(commands.complete.args, { javaHome: '/res/jre', sourceRoot: '/home/.pip-java/src', relPath: file.replace('/home/.pip-java/src/', ''), source: 'console.', offset: 8 });
    assert.deepEqual(await handle('lesson.complete', { lessonId: lesson.id, source: 'x', offset: 9 }), []);
  } finally { commands.run_process = run; }
});
