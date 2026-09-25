// The desktop app's in-page host: extension/extension.js's lesson and game flow without VS Code.
// node:* imports resolve to the shims beside this file (vite.config.js aliases).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { lessons, modules } from '../src/curriculum.js';
import { findGame } from '../src/games/index.js';
import { practicePath } from '../src/routes.js';
import { ProgressStore } from '../extension/state.js';
import { assertCoding, findJdk, lessonPackage, runGame, runLesson, withPackage } from '../extension/runner.js';
import { GAME_REQUESTS, RUN_MODES, gamePackage, gameResult, gameRoute, gameSourcePath, mergeGameRecord } from '../shared/game-contract.js';
import { invoke } from './node-fs.js';
import pkg from '../package.json' with { type: 'json' };

const paths = await invoke('paths');
globalThis.process ??= { platform: paths.platform, env: {} };
// One folder the student never manages: Java sources in the VS Code layout, progress, settings.
const root = path.join(paths.home, '.pip-java'), settingsFile = path.join(root, 'settings.json');
await mkdir(root, { recursive: true });
const store = new ProgressStore(root);
await store.load();
let settings = {};
try { settings = JSON.parse(await readFile(settingsFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
let activeRun, lastResult, jdkPromise;

// platform.js already routes window messages with an `event` to subscribers.
const broadcast = (event, data) => window.postMessage({ event, data }, '*');
const navigate = route => { broadcast('navigate', { route }); return true; };
const patch = async data => { const value = await store.patch(data); broadcast('progress', value); return value; };
function getLesson(id) { const lesson = lessons.find(l => l.id === id); if (!lesson) throw new Error('Unknown lesson. Open it from the Pip course page.'); return lesson; }
function getGame(id) { const game = findGame(id); if (!game) throw new Error('Unknown game. Open it from the Pip course page.'); return game; }
// The Java file behind a request: `{ lessonId }` or `{ gameId }`.
function target({ lessonId, gameId }) {
  if (gameId !== undefined) { const game = getGame(gameId); return { key: 'gameId', id: game.id, file: gameSourcePath(game.id), starter: game.starter, namespace: gamePackage(game.id), route: gameRoute(game.id) }; }
  const lesson = assertCoding(getLesson(lessonId));
  return { key: 'lessonId', id: lesson.id, file: `src/pip/lessons/${lesson.id.replaceAll('-', '_')}/Student.java`, starter: lesson.starter, namespace: lessonPackage(lesson.id), route: practicePath(lesson), robot: lesson.kind === 'robot' };
}
const absolute = t => path.join(root, t.file);
const jdk = () => jdkPromise ??= findJdk([settings.javaHome, path.join(paths.resources, 'jre')]).catch(error => { jdkPromise = null; throw error; });
const writeNew = (file, text) => writeFile(file, text, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error; });

async function runtimeInfo() {
  let runtime, error;
  try { runtime = await jdk(); } catch (e) { error = e.message; }
  return { desktop: true, java: Boolean(runtime), jdk: runtime?.version, javaHome: runtime?.home, error, workspace: root, storage: store.file, version: pkg.version, trusted: true, javaSupport: true };
}
// The only place that creates a Java file; returns its text.
async function ensure(t) {
  const file = absolute(t), directory = path.dirname(file);
  await mkdir(directory, { recursive: true });
  await writeNew(file, withPackage(store.data.drafts[t.id] || t.starter, t.namespace));
  if (t.robot) await writeNew(path.join(directory, 'Robot.java'), withPackage(await readFile(path.join(paths.resources, 'Robot.java'), 'utf8'), t.namespace));
  return readFile(file, 'utf8');
}
async function open(t, reveal) {
  const source = await ensure(t);
  if (reveal) navigate(t.route);
  return { [t.key]: t.id, file: t.file, source, result: lastResult?.[t.key] === t.id ? lastResult : null };
}
async function write(t, source) {
  if (typeof source !== 'string' || source.length > 40000) throw new Error('Program is too large (40,000 characters maximum).');
  await ensure(t); await writeFile(absolute(t), source);
}
async function save(t, source) {
  await write(t, source); await patch({ drafts: { [t.id]: source } });
  broadcast('document.changed', { [t.key]: t.id }); return true;
}
async function restore(t, confirmed) {
  if (!confirmed) return { needsConfirm: true };
  const source = withPackage(t.starter, t.namespace);
  await save(t, source); broadcast('editor.replace', { [t.key]: t.id, source }); return { restored: true };
}
const daemonArgs = async (t, source) => ({ javaHome: (await jdk()).home, sourceRoot: path.join(root, 'src'), relPath: t.file.replace(/^src\//, ''), source });
async function diagnose(t, source) {
  if (typeof source !== 'string' || source.length > 40000) return [];
  const { diagnostics } = await invoke('diagnose', await daemonArgs(t, source));
  return diagnostics.map(d => ({ line: d.line, column: Math.max(0, d.col - 1), severity: d.severity === 'ERROR' ? 'error' : 'warning', message: d.message }));
}
// Type-aware completions at `offset` (a JS string index): [{ label, kind, detail, insertText }].
async function complete(t, source, offset) {
  if (typeof source !== 'string' || source.length > 40000 || !Number.isInteger(offset) || offset < 0 || offset > source.length) return [];
  return (await invoke('complete', { ...await daemonArgs(t, source), offset })).items;
}
function start(lock) {
  if (activeRun) throw new Error('A program is running. Stop it before starting another.');
  return activeRun = lock;
}
async function run(id, controlHz, customInput, edited) {
  const t = target({ lessonId: id }), lesson = getLesson(id), controller = start(new AbortController()), runId = randomBytes(8).toString('hex');
  const custom = customInput !== undefined;
  if (!custom) lastResult = undefined;
  broadcast('run.started', { lessonId: id, runId, custom });
  try {
    if (edited !== undefined) await write(t, edited);
    const source = await ensure(t), runtime = await jdk();
    if (controller.signal.aborted) throw new Error('Run cancelled.');
    const result = await runLesson({ lesson, source, jdk: runtime, resourceRoot: paths.resources, controlHz, signal: controller.signal, customInput });
    if (result.passed && !controller.signal.aborted) await patch({ completed: [...new Set([...store.data.completed, id])], assessments: { [id]: lesson.assessmentVersion } });
    await patch({ drafts: { [id]: source } });
    const packet = { lessonId: id, runId, result, custom };
    if (!custom) lastResult = packet;
    broadcast('run.finished', packet); return packet;
  } catch (error) { broadcast('run.finished', { lessonId: id, runId, custom, result: { error: error.message, stage: 'runtime' } }); throw error; }
  finally { activeRun = undefined; }
}
// Graded and custom-input runs differ only by `mode`; setup failures carry their own stage.
async function playGame(id, mode, customInput, edited) {
  const t = target({ gameId: id }), game = getGame(id), controller = start(new AbortController()), runId = randomBytes(8).toString('hex');
  const custom = mode === RUN_MODES.custom, savedStars = store.data.games?.[id]?.stars ?? 0;
  const finish = packet => { if (!custom) lastResult = packet; broadcast('run.finished', packet); return packet; };
  broadcast('run.started', { gameId: id, runId, mode });
  let stage = 'setup';
  try {
    if (edited !== undefined) await write(t, edited);
    const source = await ensure(t), runtime = await jdk();
    if (controller.signal.aborted) { stage = 'runtime'; throw new Error('Run cancelled.'); }
    stage = null;
    const result = await runGame({ game, source, jdk: runtime, resourceRoot: paths.resources, signal: controller.signal, mode, customInput, runId, onWorld: world => broadcast('run.progress', { gameId: id, runId, world }) });
    await patch({ drafts: { [id]: source } });
    // Cancellation and infrastructure errors leave the saved record untouched.
    if (!custom && !result.stage && !controller.signal.aborted) {
      const record = mergeGameRecord(store.data.games?.[id], { stars: result.earnedStars, best: result.best, updatedAt: new Date().toISOString() }, id);
      await patch({ games: { ...store.data.games, [id]: record } });
    }
    return finish({ gameId: id, runId, mode, result: { ...result, savedStars: store.data.games?.[id]?.stars ?? savedStars } });
  } catch (error) {
    finish({ gameId: id, runId, mode, result: gameResult({ gameId: id, runId, mode, earnedStars: custom ? null : 0, savedStars, stage: stage || 'runtime', error: error.message }) });
    throw error;
  } finally { activeRun = undefined; }
}
async function importProgress() {
  // ponytail: fixed file instead of a picker; add a dialog plugin when students need to browse.
  const file = path.join(root, 'pip-progress-import.json');
  let text;
  try { text = await readFile(file, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; return `Place a backup at ${file}, then import again.`; }
  if (text.length > 2000000) throw new Error('Progress backup is too large.');
  await store.import(JSON.parse(text)); broadcast('progress', store.data); return 'Backup merged. Existing Java files were kept.';
}

export async function handle(method, params = {}) {
  switch (method) {
    case 'progress.load': return store.data;
    case 'progress.patch': {
      const allowed = Object.fromEntries(['steps','answers','reflections','activities','view'].filter(key => params[key] !== undefined).map(key => [key, params[key]]));
      if (JSON.stringify(allowed).length > 200000) throw new Error('Progress update is too large.');
      return patch(allowed);
    }
    case 'progress.export': return `Progress is saved automatically in ${store.file}`;
    case 'progress.import': return importProgress();
    case 'runtime.info': return runtimeInfo();
    case 'lesson.open': return open(target({ lessonId: params.lessonId }), false);
    case 'lesson.focus': return open(target({ lessonId: params.lessonId }), true);
    case 'lesson.learn': getLesson(params.lessonId); return navigate(`/learn/${params.lessonId}`);
    case 'lesson.quiz': getLesson(params.lessonId); return navigate(`/quiz/${params.lessonId}`);
    case 'lesson.save': return save(target(params), params.source);
    case 'lesson.diagnose': return diagnose(target(params), params.source);
    case 'lesson.complete': return complete(target(params), params.source, params.offset);
    case 'lesson.run':
      if (params.input !== undefined && (typeof params.input !== 'string' || params.input.length > 10000)) throw new Error('Custom input must be text of at most 10,000 characters.');
      return run(params.lessonId, params.controlHz ?? 20, params.input, params.source);
    case 'lesson.rate': if (![1,20,60].includes(params.controlHz)) throw new Error('Invalid decision rate.'); getLesson(params.lessonId); return true;
    case 'lesson.restore': return restore(target({ lessonId: params.lessonId }), params.confirmed);
    case 'lesson.reveal': {
      if (typeof params.text !== 'string' || params.text.length > 500) throw new Error('Invalid code location.');
      const t = target(params); broadcast('editor.reveal', { [t.key]: t.id, text: params.text }); return true;
    }
    case GAME_REQUESTS.open: return open(target({ gameId: params.gameId }), false);
    case GAME_REQUESTS.focus: return open(target({ gameId: params.gameId }), true);
    case GAME_REQUESTS.run: {
      const mode = params.mode ?? RUN_MODES.graded;
      if (!Object.values(RUN_MODES).includes(mode)) throw new Error('Unsupported run mode.');
      if (mode === RUN_MODES.custom && (typeof params.input !== 'string' || params.input.length > 10000)) throw new Error('Custom input must be text of at most 10,000 characters.');
      return playGame(params.gameId, mode, mode === RUN_MODES.custom ? params.input : undefined, params.source);
    }
    case GAME_REQUESTS.restore: return restore(target({ gameId: params.gameId }), params.confirmed);
    case 'run.stop': activeRun?.abort(); return true;
    case 'course.open':
      return navigate(['projects','assignments'].includes(params.collection) ? `/${params.collection}` : params.moduleId ? `/module/${modules.find(m => m.id === params.moduleId)?.id || ''}` : '/');
    case 'settings.java': return navigate('/settings');
    case 'settings.get': return { javaHome: settings.javaHome || '' };
    case 'settings.set': {
      if (typeof params.javaHome !== 'string' || params.javaHome.length > 1000) throw new Error('Java home must be a folder path.');
      settings = { ...settings, javaHome: params.javaHome };
      await writeFile(settingsFile, JSON.stringify(settings, null, 2));
      jdkPromise = null; return { javaHome: settings.javaHome };
    }
    case 'workspace.open': return `Lesson files are saved in ${path.join(root, 'src')}.`;
    default: throw new Error('Unsupported Pip request.');
  }
}
