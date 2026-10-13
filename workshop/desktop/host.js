// The desktop app's in-page host for lessons, games and saved progress.
// node:* imports resolve to the shims beside this file (vite.config.js aliases).
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { lessons, modules } from '../src/curriculum.js';
import { findGame } from '../src/games/index.js';
import { publicGameWorld } from '../src/games/engine.js';
import { practicePath } from '../src/routes.js';
import { ProgressStore } from '../host/state.js';
import { assertCoding, findJdk, lessonPackage, runGame, runLesson, withPackage } from '../host/runner.js';
import { GAME_REQUESTS, RUN_MODES, gamePackage, gameResult, gameRoute, gameSourcePath, mergeGameRecord } from '../shared/game-contract.js';
import { assertProjectAccess } from '../shared/project-access.js';
import { verifiedProjectSteps } from '../shared/project-checks.js';
import { codeQuality } from '../shared/code-quality.js';
import { invoke } from './node-fs.js';
import pkg from '../package.json' with { type: 'json' };

const paths = await invoke('paths');
const demoAvailable = paths.development === true;
globalThis.process ??= { platform: paths.platform, env: {} };
// Keep the existing Java source layout and progress location across app updates.
const studentRoot = path.join(paths.home, '.pip-java'), settingsFile = path.join(studentRoot, 'settings.json');
let root = studentRoot, demo = false, switching = false, pendingRequests = 0;
await mkdir(root, { recursive: true });
let store = new ProgressStore(root);
await store.load();
const studentStore = store;
let settings = {};
try { settings = JSON.parse(await readFile(settingsFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
let activeRun, lastResult, lastResultSource, jdkPromise;
const sourceVersions = new Map();

// platform.js already routes window messages with an `event` to subscribers.
const broadcast = (event, data) => window.postMessage({ event, data }, '*');
const navigate = route => { broadcast('navigate', { route }); return true; };
const patch = async data => { const value = await store.patch(data); broadcast('progress', value); return value; };
function getLesson(id) { const lesson = lessons.find(l => l.id === id); if (!lesson) throw new Error('Unknown lesson. Open it from the Pip course page.'); return lesson; }
function getGame(id) { const game = findGame(id); if (!game) throw new Error('Unknown game. Open it from the Pip course page.'); return game; }
// The Java file behind a request: `{ lessonId }` or `{ gameId }`.
function target({ lessonId, gameId }) {
  if (gameId !== undefined) {
    const game = getGame(gameId);
    if (!demo) assertProjectAccess(game, store.data, id => lessons.find(l => l.id === id));
    return { key: 'gameId', id: game.id, file: gameSourcePath(game.id), starter: game.starter, solution: game.solution, namespace: gamePackage(game.id), route: gameRoute(game.id) };
  }
  const lesson = assertCoding(getLesson(lessonId));
  if (!demo) assertProjectAccess(lesson, store.data, id => lessons.find(l => l.id === id));
  return { key: 'lessonId', id: lesson.id, file: `src/pip/lessons/${lesson.id.replaceAll('-', '_')}/Student.java`, starter: lesson.starter, solution: lesson.solution, independent: lesson.independent === true, namespace: lessonPackage(lesson.id), route: practicePath(lesson), robot: lesson.kind === 'robot' };
}
const absolute = t => path.join(root, t.file);
const jdk = () => jdkPromise ??= findJdk([settings.javaHome, path.join(paths.resources, 'jre')]).catch(error => { jdkPromise = null; throw error; });
const writeNew = (file, text) => writeFile(file, text, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error; });

async function runtimeInfo() {
  let runtime, error;
  try { runtime = await jdk(); } catch (e) { error = e.message; }
  return { desktop: true, demo, java: Boolean(runtime), jdk: runtime?.version, javaHome: runtime?.home, error, workspace: root, storage: store.file, version: pkg.version, trusted: true, javaSupport: true };
}
// The only place that creates a Java file; returns its text.
async function ensure(t) {
  const file = absolute(t), directory = path.dirname(file);
  await mkdir(directory, { recursive: true });
  const previewCopy = async (relative, fallback) => {
    if (demo) try { return await readFile(path.join(studentRoot, relative), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return fallback;
  };
  await writeNew(file, await previewCopy(t.file, withPackage(store.data.drafts[t.id] || t.starter, t.namespace)));
  if (t.robot) await writeNew(path.join(directory, 'Robot.java'), await previewCopy(t.file.replace(/Student\.java$/, 'Robot.java'), withPackage(await readFile(path.join(paths.resources, 'Robot.java'), 'utf8'), t.namespace)));
  return readFile(file, 'utf8');
}
async function open(t, reveal) {
  const source = await ensure(t);
  if (lastResult?.[t.key] === t.id && source !== lastResultSource) lastResult = undefined;
  if (reveal) navigate(t.route);
  return { [t.key]: t.id, file: t.file, source, result: lastResult?.[t.key] === t.id ? lastResult : null };
}
async function write(t, source) {
  if (typeof source !== 'string' || source.length > 40000) throw new Error('Program is too large (40,000 characters maximum).');
  const previous = await ensure(t), file = absolute(t);
  if (previous !== source) {
    sourceVersions.set(file, (sourceVersions.get(file) || 0) + 1);
    if (lastResult?.[t.key] === t.id) lastResult = undefined;
  }
  await writeFile(file, source);
  return previous !== source;
}
const sourceVersion = t => sourceVersions.get(absolute(t)) || 0;
const currentSource = async (t, source, version) => sourceVersion(t) === version && await ensure(t) === source && sourceVersion(t) === version;
async function save(t, source) {
  const changed = await write(t, source); await patch({ drafts: { [t.id]: source } });
  if (changed) broadcast('document.changed', { [t.key]: t.id });
  return true;
}
async function restore(t, confirmed) {
  if (!confirmed) return { needsConfirm: true };
  const source = withPackage(t.starter, t.namespace);
  await save(t, source); broadcast('editor.replace', { [t.key]: t.id, source }); return { restored: true, source };
}
async function insertSolution(params) {
  if (params.lessonId !== undefined && getLesson(params.lessonId).independent) throw new Error('Solutions are not available for independent challenges.');
  if (!demo) throw new Error('Insert solution is available only in demo mode.');
  if (activeRun || pendingRequests > 1) throw new Error('Wait for the current save or run to finish, then insert the solution.');
  const t = target(params);
  if (typeof t.solution !== 'string' || !t.solution.trim()) throw new Error('No solution is available for this activity.');
  // Hold the workspace guard so saves, runs and demo toggles cannot race this replacement.
  switching = true;
  try {
    const source = withPackage(t.solution, t.namespace);
    await save(t, source); lastResult = undefined;
    broadcast('editor.replace', { [t.key]: t.id, source });
    return { source };
  } finally { switching = false; }
}
const daemonArgs = async (t, source) => ({ javaHome: (await jdk()).home, sourceRoot: path.join(root, 'src'), relPath: t.file.replace(/^src\//, ''), source });
async function diagnose(t, source) {
  if (typeof source !== 'string' || source.length > 40000) return [];
  const { diagnostics } = await invoke('diagnose', await daemonArgs(t, source));
  return diagnostics.filter(d => ['ERROR', 'WARNING', 'MANDATORY_WARNING'].includes(d.severity)).map(d => ({ line: d.line, column: Math.max(0, d.col - 1), severity: d.severity === 'ERROR' ? 'error' : 'warning', message: d.message }));
}
// Type-aware completions at `offset` (a JS string index): [{ label, kind, detail, insertText }].
async function complete(t, source, offset) {
  if (t.independent) return [];
  if (typeof source !== 'string' || source.length > 40000 || !Number.isInteger(offset) || offset < 0 || offset > source.length) return [];
  return (await invoke('complete', { ...await daemonArgs(t, source), offset })).items;
}
function start(lock) {
  if (activeRun) throw new Error('A program is running. Stop it before starting another.');
  return activeRun = lock;
}
const examples = new Map();
async function playExample(id) {
  target({ gameId: id });
  if (examples.has(id)) return structuredClone(examples.get(id));
  const game = getGame(id), world = publicGameWorld(game, 0), controller = start(new AbortController());
  try {
    const result = await runGame({ game: { ...game, sampleWorld: world }, source: withPackage(game.solution, gamePackage(id)), jdk: await jdk(), resourceRoot: paths.resources, mode: RUN_MODES.custom, customInput: world.input || '', signal: controller.signal });
    if (controller.signal.aborted) throw new Error('Example cancelled.');
    if (result.error || !result.worlds?.length) throw new Error(result.error || 'The example could not run.');
    const example = { gameId: id, input: world.input || '', result };
    examples.set(id, example);
    return structuredClone(example);
  } finally { activeRun = undefined; }
}
async function run(id, controlHz, customInput, edited, mode = 'graded') {
  const t = target({ lessonId: id }), lesson = getLesson(id), controller = start(new AbortController()), runId = randomBytes(8).toString('hex');
  const custom = customInput !== undefined || mode === 'public';
  if (!custom) lastResult = undefined;
  broadcast('run.started', { lessonId: id, runId, custom, mode });
  let source, version;
  try {
    if (edited !== undefined) await write(t, edited);
    source = await ensure(t); version = sourceVersion(t);
    const runtime = await jdk();
    if (controller.signal.aborted) throw new Error('Run cancelled.');
    const result = await runLesson({ lesson, source, jdk: runtime, resourceRoot: paths.resources, controlHz, signal: controller.signal, customInput, mode });
    if (!custom && result.passed && !controller.signal.aborted) await patch({ completed: [...new Set([...store.data.completed, id])], assessments: { [id]: lesson.assessmentVersion } });
    if (await currentSource(t, source, version) && sourceVersion(t) === version) await patch({ drafts: { [id]: source } });
    const stale = !await currentSource(t, source, version) || sourceVersion(t) !== version;
    const packet = { lessonId: id, runId, result, custom, mode, ...(stale ? { stale: true } : {}) };
    if (!custom && !stale) { lastResult = packet; lastResultSource = source; }
    broadcast('run.finished', packet); return packet;
  } catch (error) {
    const result = { error: error.message, stage: 'runtime' };
    const stale = source !== undefined && (!await currentSource(t, source, version).catch(() => false) || sourceVersion(t) !== version);
    broadcast('run.finished', { lessonId: id, runId, custom, mode, ...(stale ? { stale: true } : {}), result: { ...result, quality: codeQuality(result, { graded: !custom }) } });
    throw error;
  }
  finally { activeRun = undefined; }
}
// Only Submit records project completion; public examples and trials never award stars.
async function playGame(id, mode, customInput, edited) {
  const t = target({ gameId: id }), game = getGame(id), controller = start(new AbortController()), runId = randomBytes(8).toString('hex');
  const custom = mode === RUN_MODES.custom, graded = mode === RUN_MODES.graded, savedStars = store.data.games?.[id]?.stars ?? 0;
  let judgedSource, version;
  const finish = packet => { if (!custom && !packet.stale) { lastResult = packet; lastResultSource = judgedSource; } broadcast('run.finished', packet); return packet; };
  broadcast('run.started', { gameId: id, runId, mode });
  let stage = 'setup';
  try {
    if (edited !== undefined) await write(t, edited);
    const source = await ensure(t);
    judgedSource = source; version = sourceVersion(t);
    const runtime = await jdk();
    if (controller.signal.aborted) { stage = 'runtime'; throw new Error('Run cancelled.'); }
    stage = null;
    const result = await runGame({ game, source, jdk: runtime, resourceRoot: paths.resources, signal: controller.signal, mode, customInput, runId, onWorld: world => broadcast('run.progress', { gameId: id, runId, world }) });
    if (await currentSource(t, source, version) && sourceVersion(t) === version) await patch({ drafts: { [id]: source } });
    // Cancellation and infrastructure errors leave the saved record untouched.
    if (graded && !result.stage && !controller.signal.aborted) {
      const record = mergeGameRecord(store.data.games?.[id], { stars: result.earnedStars, best: result.best, updatedAt: new Date().toISOString() }, id);
      await patch({ games: { ...store.data.games, [id]: record } });
    }
    const verifiedSteps = controller.signal.aborted ? [] : verifiedProjectSteps(game, result);
    const answers = Object.fromEntries(verifiedSteps.map(index => [`${id}:${10 + index}`, 1]).filter(([key]) => store.data.answers[key] !== 1));
    if (Object.keys(answers).length) await patch({ answers });
    const stale = !await currentSource(t, source, version) || sourceVersion(t) !== version;
    return finish({ gameId: id, runId, mode, ...(stale ? { stale: true } : {}), result: { ...result, verifiedSteps, savedStars: store.data.games?.[id]?.stars ?? savedStars } });
  } catch (error) {
    const result = gameResult({ gameId: id, runId, mode, earnedStars: graded ? 0 : null, savedStars, stage: stage || 'runtime', error: error.message });
    const stale = judgedSource !== undefined && (!await currentSource(t, judgedSource, version).catch(() => false) || sourceVersion(t) !== version);
    finish({ gameId: id, runId, mode, ...(stale ? { stale: true } : {}), result: { ...result, quality: codeQuality(result, { graded }) } });
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

async function setDemo(enabled) {
  if (typeof enabled !== 'boolean') throw new Error('Demo mode must be a boolean.');
  if (enabled && !demoAvailable) throw new Error('Demo mode is available only in development builds.');
  if (switching) throw new Error('Demo workspace is changing. Please retry in a moment.');
  if (enabled === demo) return { enabled: demo };
  if (pendingRequests || activeRun || switching) throw new Error('Wait for the current save or run to finish, then change demo mode.');
  switching = true;
  try {
    if (enabled) {
      const previewRoot = await mkdtemp(path.join(paths.temp, 'pip-preview-'));
      const previewStore = new ProgressStore(previewRoot);
      await previewStore.patch(structuredClone(studentStore.data));
      root = previewRoot; store = previewStore;
    } else {
      const previewRoot = root;
      await rm(previewRoot, { recursive: true, force: true });
      root = studentRoot; store = studentStore;
    }
    demo = enabled; lastResult = undefined;
    broadcast('progress', store.data);
    return { enabled: demo };
  } finally { switching = false; }
}

export async function handle(method, params = {}) {
  if (method === 'demo.set') return setDemo(params.enabled);
  if (switching) throw new Error('Demo workspace is changing. Please retry in a moment.');
  // Background editor diagnostics only read; they must not block the preview switch.
  const writes = !['runtime.info', 'lesson.diagnose', 'lesson.complete', 'settings.get', 'progress.load', 'demo.get'].includes(method);
  if (writes) pendingRequests++;
  try { return await handleRequest(method, params); }
  finally { if (writes) pendingRequests--; }
}

async function handleRequest(method, params) {
  switch (method) {
    case 'demo.get': return { enabled: demo, available: demoAvailable };
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
    case 'lesson.solution': return insertSolution({ lessonId: params.lessonId });
    case 'lesson.diagnose': return diagnose(target(params), params.source);
    case 'lesson.complete': return complete(target(params), params.source, params.offset);
    case 'lesson.run':
      if (params.input !== undefined && (typeof params.input !== 'string' || params.input.length > 10000)) throw new Error('Custom input must be text of at most 10,000 characters.');
      if (params.mode !== undefined && !['graded', 'public'].includes(params.mode)) throw new Error('Unsupported lesson run mode.');
      if (params.mode === 'public' && (!getLesson(params.lessonId).independent || params.input !== undefined)) throw new Error('Public cases are available for challenges.');
      return run(params.lessonId, params.controlHz ?? 20, params.input, params.source, params.mode);
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
    case 'game.solution': return insertSolution({ gameId: params.gameId });
    case 'game.example': return playExample(params.gameId);
    case 'run.stop': activeRun?.abort(); return true;
    case 'course.open':
      return navigate(['projects','assignments'].includes(params.collection) ? '/projects' : params.moduleId ? `/module/${modules.find(m => m.id === params.moduleId)?.id || ''}` : '/');
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
