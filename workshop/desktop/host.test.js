import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Resolve node:* and ./process.js to the desktop shims, as vite.config.js does.
const shims = { 'node:fs/promises': 'node-fs.js', 'node:path': 'node-path.js', 'node:os': 'node-os.js', 'node:crypto': 'node-crypto.js', './process.js': 'process.js' };
registerHooks({ resolve(specifier, context, next) {
  const shim = shims[specifier];
  if (shim && /\/(host|desktop)\/(?!host\.test)[\w-]+\.js$/.test(context.parentURL || '')) return { url: new URL(shim, import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });

const files = new Map(), events = [];
const commands = {
  paths: () => ({ home: '/home', resources: '/res', temp: '/tmp', platform: 'darwin', development: true }),
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
const { projectPrerequisites } = await import('../shared/project-access.js');
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
  const game = games[0];
  (await handle('progress.load')).completed.push(...projectPrerequisites(game));
  const opened = await handle('game.focus', { gameId: game.id });
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

test('locked legacy projects cannot open or run saved files, including custom input', async () => {
  const project = lessons.find(l => l.id === 'java-final-report');
  const existing = `/home/.pip-java/src/pip/lessons/java_final_report/Student.java`;
  const progress = await handle('progress.load');
  const originalCompleted = [...progress.completed];
  progress.completed.push(project.id);
  files.set(existing, 'saved project code');
  const before = structuredClone(progress);
  const started = events.filter(e => e.event === 'run.started').length;
  try {
    for (const [method, params] of [
      ['lesson.open', {}], ['lesson.focus', {}],
      ['lesson.run', { source: 'replacement' }],
      ['lesson.run', { input: '1 10', source: 'replacement' }],
      ['lesson.restore', { confirmed: true }],
    ]) await assert.rejects(handle(method, { lessonId: project.id, ...params }), /Project locked/);
    assert.equal(files.get(existing), 'saved project code');
    assert.deepEqual(await handle('progress.load'), before);
    assert.equal(events.filter(e => e.event === 'run.started').length, started);
    progress.completed.push(...projectPrerequisites(project));
    assert.equal((await handle('lesson.open', { lessonId: project.id })).source, 'saved project code');
  } finally { progress.completed.splice(0, progress.completed.length, ...originalCompleted); }
});

test('game prerequisites guard existing files and every run mode before editing or execution', async () => {
  const game = games.find(g => !g.project), originalPrerequisites = game.prerequisites;
  game.prerequisites = ['java-methods'];
  const existing = `/home/.pip-java/${gameSourcePath(game.id)}`;
  const originalFile = files.get(existing);
  const progress = await handle('progress.load'), originalRecord = progress.games[game.id];
  progress.games[game.id] = { stars: 1, best: null, updatedAt: null };
  files.set(existing, 'saved game project code');
  const before = structuredClone(progress);
  const started = events.filter(e => e.event === 'run.started').length;
  try {
    for (const [method, params] of [
      ['game.open', {}], ['game.focus', {}],
      ['game.example', {}],
      ['game.run', { mode: 'graded', source: 'replacement' }],
      ['game.run', { mode: 'custom', input: '3', source: 'replacement' }],
      ['game.restore', { confirmed: true }],
    ]) await assert.rejects(handle(method, { gameId: game.id, ...params }), /Project locked/);
    assert.equal(files.get(existing), 'saved game project code');
    assert.deepEqual(await handle('progress.load'), before);
    assert.equal(events.filter(e => e.event === 'run.started').length, started);
  } finally {
    if (originalPrerequisites === undefined) delete game.prerequisites; else game.prerequisites = originalPrerequisites;
    if (originalRecord === undefined) delete progress.games[game.id]; else progress.games[game.id] = originalRecord;
    if (originalFile === undefined) files.delete(existing); else files.set(existing, originalFile);
  }
});

test('earlier progress and Java files survive importing and reopening in the desktop app', async () => {
  const savedJava = 'package pip.lessons.java_variables;\n// My earlier solution stays exactly as written.\npublic class Student { public static void main(String[] args) { int parts = 12; int used = 5; parts = parts - used; System.out.println(parts); } }\n';
  const oldDraft = 'package pip.lessons.java_strings;\n// Draft from the previous app.\npublic class Student { public static void main(String[] args) { String label = "PIP-07"; System.out.println(label.length()); System.out.println(label.charAt(0)); } }\n';
  const savedFile = '/home/.pip-java/src/pip/lessons/java_variables/Student.java';
  const supportFile = '/home/.pip-java/src/pip/lessons/first_movement/Robot.java';
  const savedSupport = '// Earlier support file with personal notes.\npublic class Robot {}\n';
  files.set(savedFile, savedJava);
  files.set(supportFile, savedSupport);
  files.set('/res/Robot.java', 'public class Robot { public void newMethod() {} }');
  files.set('/home/.pip-java/pip-progress-import.json', JSON.stringify({
    version: 5, completed: [0, 'java-variables'],
    drafts: { 'java-variables': 'older imported draft must not replace the real file', 'java-strings': oldDraft },
    activities: { 'java-variables': 1 }, answers: { 'java-variables:2': 1 },
    reflections: { 'java-variables': 'Keep this explanation.' }, assessments: { 'java-variables': 1 },
  }));
  await handle('progress.import');
  const progress = await handle('progress.load');
  assert.ok(progress.completed.includes('first-movement'), 'numeric IDs from older backups are retained');
  assert.ok(progress.completed.includes('java-variables'));
  assert.equal(progress.reflections['java-variables'], 'Keep this explanation.');
  assert.equal(progress.answers['java-variables:2'], 1);
  assert.equal(progress.activities['java-variables'], 1);
  assert.equal((await handle('lesson.open', { lessonId: 'java-variables' })).source, savedJava);
  assert.equal((await handle('lesson.open', { lessonId: 'java-strings' })).source, oldDraft);
  await handle('lesson.open', { lessonId: 'first-movement' });
  assert.equal(files.get(savedFile), savedJava);
  assert.equal(files.get(supportFile), savedSupport, 'updates never overwrite a saved Robot.java');
});

test('demo mode bypasses locks in an isolated workspace and preserves student files and progress', async () => {
  assert.deepEqual(await handle('demo.get'), { enabled: false, available: true });
  commands.fs_mkdtemp = ({ prefix }) => `${prefix}test`;
  const progress = await handle('progress.load');
  const before = structuredClone(progress);
  const project = games.find(game => game.id === 'supply-relay');
  const realFile = `/home/.pip-java/${gameSourcePath(project.id)}`;
  files.set(realFile, 'saved student program');
  await assert.rejects(() => handle('demo.set', { enabled: 'yes' }), /boolean/i);
  assert.equal((await handle('demo.set', { enabled: true })).enabled, true);
  assert.equal((await handle('game.open', { gameId: project.id })).source, 'saved student program');
  await handle('lesson.save', { gameId: project.id, source: 'preview edit' });
  await handle('progress.patch', { answers: { 'supply-relay:0': 2 } });
  (await handle('progress.load')).completed.push('preview-only');
  assert.equal(files.get(realFile), 'saved student program');
  assert.equal((await handle('runtime.info')).demo, true);
  assert.equal((await handle('demo.set', { enabled: false })).enabled, false);
  assert.deepEqual(await handle('progress.load'), before);
  assert.equal(files.get(realFile), 'saved student program');
});

test('demo switches reject concurrent toggles and active saves', async () => {
  let finishDirectory;
  commands.fs_mkdtemp = () => new Promise(resolve => { finishDirectory = resolve; });
  const enabling = handle('demo.set', { enabled: true });
  await assert.rejects(() => handle('demo.set', { enabled: false }), /changing/);
  finishDirectory('/tmp/pip-preview-concurrent');
  await enabling;
  const originalWrite = commands.fs_write;
  let finishWrite;
  commands.fs_write = args => new Promise(resolve => { finishWrite = () => { originalWrite(args); resolve(); }; });
  const saving = handle('progress.patch', { answers: { 'supply-relay:1': 1 } });
  await assert.rejects(() => handle('demo.set', { enabled: false }), /Wait for/);
  while (!finishWrite) await new Promise(resolve => setImmediate(resolve));
  finishWrite(); await saving;
  commands.fs_write = originalWrite;
  await handle('demo.set', { enabled: false });
});

test('background completions do not block preview switching or write student files', async () => {
  const originalComplete = commands.complete;
  let finishCompletion;
  commands.complete = () => new Promise(resolve => { finishCompletion = () => resolve({ items: [] }); });
  commands.fs_mkdtemp = ({ prefix }) => `${prefix}read-only`;
  const before = structuredClone(await handle('progress.load'));
  const completing = handle('lesson.complete', { lessonId: lesson.id, source: 'class Student {}', offset: 3 });
  while (!finishCompletion) await new Promise(resolve => setImmediate(resolve));
  await handle('demo.set', { enabled: true });
  finishCompletion(); await completing;
  await handle('demo.set', { enabled: false });
  assert.deepEqual(await handle('progress.load'), before);
  commands.complete = originalComplete;
});

test('solutions are available only in demo and preserve student files and progress', async () => {
  commands.fs_mkdtemp = ({ prefix }) => `${prefix}solutions`;
  const game = games.find(item => item.id === 'supply-relay');
  const gameFile = `/home/.pip-java/${gameSourcePath(game.id)}`;
  files.set(gameFile, '// Student game stays byte-for-byte unchanged.');
  const originals = new Map([[file, files.get(file)], [gameFile, files.get(gameFile)]]);
  const progress = structuredClone(await handle('progress.load'));
  for (const [method, params] of [['lesson.solution', { lessonId: lesson.id }], ['game.solution', { gameId: game.id }]]) {
    await assert.rejects(handle(method, params), /demo mode/i);
  }
  await handle('demo.set', { enabled: true });
  try {
    for (const [method, params, authored, expectedFile] of [
      ['lesson.solution', { lessonId: lesson.id }, lesson.solution, file.replace('/home/.pip-java', '/tmp/pip-preview-solutions')],
      ['game.solution', { gameId: game.id }, game.solution, `/tmp/pip-preview-solutions/${gameSourcePath(game.id)}`],
    ]) {
      const inserted = await handle(method, params);
      assert.ok(inserted.source.endsWith(authored));
      assert.match(inserted.source, /^package pip\.(lessons|games)\./);
      assert.equal(files.get(expectedFile), inserted.source);
      assert.equal((await handle('progress.load')).drafts[params.lessonId || params.gameId], inserted.source);
    }
    assert.deepEqual((await handle('progress.load')).completed, progress.completed, 'inserting does not award completion');
    for (const [path, original] of originals) assert.equal(files.get(path), original);
    const originalSolution = lesson.solution;
    delete lesson.solution;
    try { await assert.rejects(handle('lesson.solution', { lessonId: lesson.id }), /No solution/i); }
    finally { lesson.solution = originalSolution; }
  } finally { await handle('demo.set', { enabled: false }); }
  assert.deepEqual(await handle('progress.load'), progress);
  for (const [path, original] of originals) assert.equal(files.get(path), original);
});

test('solution insertion rejects active writes and runs, and holds the demo workspace until saved', async () => {
  commands.fs_mkdtemp = ({ prefix }) => `${prefix}solution-lock`;
  await handle('demo.set', { enabled: true });
  await handle('lesson.open', { lessonId: lesson.id });
  const originalWrite = commands.fs_write;
  let finishWrite;
  commands.fs_write = args => !args.createNew && args.path.endsWith('/Student.java') ? new Promise(resolve => {
    finishWrite = () => { originalWrite(args); resolve(); };
  }) : originalWrite(args);
  try {
    const saving = handle('lesson.save', { lessonId: lesson.id, source: 'class Student {}' });
    await assert.rejects(handle('lesson.solution', { lessonId: lesson.id }), /current save or run/i);
    while (!finishWrite) await new Promise(resolve => setImmediate(resolve));
    finishWrite(); await saving; finishWrite = undefined;
    const inserting = handle('lesson.solution', { lessonId: lesson.id });
    for (const [method, params] of [
      ['demo.set', { enabled: false }], ['lesson.run', { lessonId: lesson.id }],
      ['lesson.save', { lessonId: lesson.id, source: 'must not replace solution' }],
      ['lesson.solution', { lessonId: lesson.id }],
    ]) await assert.rejects(handle(method, params), /changing/i);
    while (!finishWrite) await new Promise(resolve => setImmediate(resolve));
    finishWrite(); await inserting;
    commands.fs_write = originalWrite;
    files.set('/res/InspectSource.java', 'class InspectSource {}');
    const running = handle('lesson.run', { lessonId: lesson.id });
    await assert.rejects(handle('lesson.solution', { lessonId: lesson.id }), /current save or run/i);
    await running;
  } finally {
    commands.fs_write = originalWrite;
    await handle('demo.set', { enabled: false });
  }
});

test('independent challenges suppress solutions and autocomplete at the host boundary, including demo', async () => {
  const challenge = { ...lesson, id: 'challenge-host-guard-fixture', independent: true, prerequisites: [], solution: 'public class Student {}' };
  lessons.push(challenge);
  commands.fs_mkdtemp = ({ prefix }) => `${prefix}independent`;
  const existing = `/home/.pip-java/src/pip/lessons/challenge_host_guard_fixture/Student.java`;
  const saved = 'package earlier.work;\n// Preserve my code.\npublic class Student {}';
  files.set(existing, saved);
  const originalComplete = commands.complete;
  commands.complete = () => { throw new Error('Challenge autocomplete must not call the daemon.'); };
  try {
    await assert.rejects(handle('lesson.solution', { lessonId: challenge.id }), /solution/i);
    await handle('demo.set', { enabled: true });
    const opened = await handle('lesson.open', { lessonId: challenge.id });
    assert.equal(opened.source, saved);
    await assert.rejects(handle('lesson.solution', { lessonId: challenge.id }), /independent challenges/i);
    assert.deepEqual(await handle('lesson.complete', { lessonId: challenge.id, source: saved, offset: 3 }), []);
    assert.equal((await handle('lesson.open', { lessonId: challenge.id })).source, saved);
    assert.equal(files.get(existing), saved);
    await handle('demo.set', { enabled: false });
    assert.deepEqual(await handle('lesson.complete', { lessonId: challenge.id, source: saved, offset: 3 }), []);
  } finally {
    await handle('demo.set', { enabled: false });
    commands.complete = originalComplete;
    lessons.splice(lessons.indexOf(challenge), 1);
  }
});
