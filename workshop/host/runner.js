import { runProcess } from './process.js';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { assessmentCases, checkStructure, constantProblem, variableProblem, lockedInputProblem, replaceInputs, inputDiagnosticLocation } from './assessment.js';
import { gradeWorlds, publicGameWorld, simulate, worldRng } from '../src/games/engine.js';
import {
  DEFAULT_SEEDS, PUBLIC_GAME_CASES, SUBMIT_GAME_CASES, LIMITS, ROBOT_REPLIES, RUN_MODES,
  gameResult, validateWorld, worldResult,
} from '../shared/game-contract.js';

import { codeQuality } from '../shared/code-quality.js';

export { runProcess };
const lintFlags = ['-J-Duser.language=en', '-proc:none', '-Xlint:all,-path'];
const addDiagnostics = (existing, added) => {
  for (const diagnostic of added) if (!existing.some(d => JSON.stringify(d) === JSON.stringify(diagnostic))) existing.push(diagnostic);
};
// Keep compiler memory bounded. Each child retains its own timeout, output cap
// and cancellation signal; wait for every started child before removing files.
async function compileTogether(items, compile) {
  let next = 0;
  const workers = Array.from({ length: Math.min(3, items.length) }, async () => {
    while (next < items.length) await compile(items[next++]);
  });
  const settled = await Promise.allSettled(workers);
  const failed = settled.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
}

export async function findJdk(configured = []) {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const candidates = [...configured, process.env.JAVA_HOME].filter(v => typeof v === 'string' && v);
  if (process.platform === 'darwin') {
    try { const result = await runProcess('/usr/libexec/java_home', [], { timeout: 4000 }); if (result.code === 0) candidates.push(result.stdout.trim()); } catch {}
  }
  for (const home of [...new Set(candidates)]) {
    const java = path.join(home, 'bin', `java${suffix}`), javac = path.join(home, 'bin', `javac${suffix}`);
    try {
      await access(java); await access(javac);
      const version = await runProcess(javac, ['-version'], { timeout: 4000 });
      if (version.code === 0) return { home, java, javac, version: (version.stdout || version.stderr).trim() };
    } catch {}
  }
  try {
    const result = await runProcess(`javac${suffix}`, ['-version'], { timeout: 4000 });
    const runtime = await runProcess(`java${suffix}`, ['-XshowSettings:properties','-version'], { timeout: 4000 });
    if (!result.code && !runtime.code) {
      const javaHome=(runtime.stdout+runtime.stderr).match(/java\.home\s*=\s*([^\r\n]+)/)?.[1].trim();
      return { home: javaHome?(path.basename(javaHome)==='jre'?path.dirname(javaHome):javaHome):'PATH', java: `java${suffix}`, javac: `javac${suffix}`, version: (result.stdout || result.stderr).trim() };
    }
  } catch {}
  throw new Error('A JDK with java and javac is required. Set Java home in Pip Settings, or install a JDK and restart Pip Workshop.');
}

export function parseDiagnostics(output) {
  output = output.replaceAll('\r', '');
  return [...output.matchAll(/Student\.java:(\d+): (error|warning): ([^\n]+)\n([^\n]*)\n([^\n]*)/g)].map(match => {
    const extra = output.slice(match.index + match[0].length).match(/^\n\s*symbol:\s*([^\n]+)/);
    return { line: Number(match[1]), column: Math.max(0, match[5].indexOf('^')), severity: match[2], message: match[3] + (extra ? ': ' + extra[1] : '') };
  });
}

export const lessonPackage = id => `pip.lessons.${id.replaceAll('-', '_')}`;
export const withPackage = (source, name) => /^\s*package\s+[\w.]+\s*;/m.test(source) ? source : `package ${name};\n\n${source}`;

export async function runLesson({ lesson, source, jdk, resourceRoot, cacheRoot = path.join(os.tmpdir(), 'pip-workshop-runs'), controlHz = 20, signal, assessmentSeed, customInput, mode = 'graded' }) {
  if (typeof source !== 'string' || source.length > 40000) throw new Error('Program is too large (40,000 characters maximum).');
  if (!['console','robot'].includes(lesson.kind) || ![1,20,60].includes(controlHz)) throw new Error('Invalid exercise or decision rate.');
  if (!['graded', 'public'].includes(mode) || (mode === 'public' && (!lesson.independent || customInput !== undefined))) throw new Error('Unsupported lesson run mode.');
  let diagnostics = [], lint = 'unavailable';
  const done = result => ({ ...result, quality: codeQuality(result, { graded: mode === 'graded' && customInput === undefined, lint }) });
  await mkdir(cacheRoot, { recursive: true });
  const dir = await mkdtemp(path.join(cacheRoot, 'run-'));
  try {
    const namespace = source.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
    const qualify = name => namespace ? `${namespace}.${name}` : name;
    const prefix = namespace ? `package ${namespace};\n\n` : '';
    await writeFile(path.join(dir, 'Student.java'), source);
    await writeFile(path.join(dir,'InspectSource.java'),await readFile(path.join(resourceRoot,'InspectSource.java')));
    const files = ['Student.java','InspectSource.java'];
    if (lesson.kind === 'robot') {
      for (const name of ['Robot.java','Runner.java']) { await writeFile(path.join(dir, name), prefix + await readFile(path.join(resourceRoot, name), 'utf8')); files.push(name); }
    }
    const inspectionClasspath=[dir,jdk.home!=='PATH'?path.join(jdk.home,'lib/tools.jar'):''].filter(Boolean).join(path.delimiter);
    const compiled = await runProcess(jdk.javac, [...lintFlags, '-encoding', 'UTF-8', '-cp',inspectionClasspath,'-d', dir, ...files], { cwd: dir, signal });
    diagnostics = parseDiagnostics(compiled.stderr);
    lint = compiled.code === 0 ? 'complete' : 'failed';
    if (compiled.code !== 0) return done({ error: compiled.error || compiled.stdout, stage: 'compile', diagnostics });
    const args = ['-Xmx64m', '-Duser.language=en', '-Dfile.encoding=UTF-8', '-cp', dir];
    // Custom input is exploration only: no checks, no completion.
    if (typeof customInput === 'string' && lesson.kind === 'console') {
      const tried = await runProcess(jdk.java, [...args, qualify('Student')], { cwd: dir, input: customInput, signal });
      return done({ kind: 'custom', input: customInput, output: tried.stdout, error: tried.code === 0 ? '' : tried.error || 'Program exited unsuccessfully.', stage: tried.code === 0 ? undefined : 'runtime', diagnostics });
    }
    const inspectionFile=path.join(dir,'inspection.json');
    const inspected=await runProcess(jdk.java,['-Xmx64m','-cp',inspectionClasspath,'InspectSource',path.join(dir,'Student.java'),inspectionFile],{cwd:dir,signal});
    if(inspected.code!==0)return done({stage:'checks',error:'The Java source checker could not run. Configure a full JDK in Pip settings.\n'+inspected.error,diagnostics});
    const analysis=JSON.parse(await readFile(inspectionFile,'utf8'));
    const sourceChecks=checkStructure(lesson,analysis);
    if(sourceChecks.some(check=>!check.passed))return done({stage:'checks',error:sourceChecks.filter(c=>!c.passed).map(c=>c.message).join('\n'),sourceChecks,diagnostics,passed:false});
    if (lesson.kind === 'console') {
      const checks = [];
      const assessment=mode === 'public' ? { cases: lesson.publicCases, seed: null } : assessmentCases(lesson,assessmentSeed);
      const variants = new Map();
      const prepared = assessment.cases.map((example, index) => {
        const changed = example.inputs && example.mutate !== false ? replaceInputs(source, analysis, example.inputs) : source;
        if (changed !== source && !variants.has(changed)) variants.set(changed, { source: changed, inputs: example.inputs, dir: path.join(dir, `variant-${variants.size + 1}`) });
        return { example, variant: variants.get(changed), entry: example.invocation ? `PipCase${index}` : 'Student' };
      });
      const probes = prepared.filter(item => item.example.invocation);
      // Different method inputs need different launchers, not another Student
      // compilation. Each launcher still runs in a fresh JVM with fresh statics.
      if (probes.length) {
        for (const { example, entry } of probes) await writeFile(path.join(dir, `${entry}.java`), prefix + `public class ${entry} { public static void main(String[] args) { ${example.invocation} } }`);
        const compilation = await runProcess(jdk.javac, [...lintFlags, '-encoding', 'UTF-8', '-cp', dir, '-d', dir, ...probes.map(item => `${item.entry}.java`)], { cwd: dir, signal });
        addDiagnostics(diagnostics, parseDiagnostics(compilation.stderr));
        if (compilation.code !== 0) return done({ stage: 'checks', error: 'The checks could not call the method. Keep its required name, parameters, return type, and static modifier.\n' + compilation.error, sourceChecks, diagnostics, passed: false });
      }
      await compileTogether([...variants.values()], async variant => {
        if (signal?.aborted) throw new Error('Run cancelled.');
        await mkdir(variant.dir, { recursive: true });
        await writeFile(path.join(variant.dir, 'Student.java'), variant.source);
        variant.compilation = await runProcess(jdk.javac, [...lintFlags, '-encoding', 'UTF-8', '-cp', variant.dir, '-d', variant.dir, 'Student.java'], { cwd: variant.dir, signal });
      });
      for (const { example, variant, entry } of prepared) {
        if (variant) {
          const compilation = variant.compilation;
          addDiagnostics(diagnostics, parseDiagnostics(compilation.stderr).map(d => inputDiagnosticLocation(d, source, analysis, variant.inputs)));
          if (compilation.code !== 0) { lint = 'failed'; checks.push({ ...example, passed: false, output: compilation.error, error: 'This changed starting data no longer compiles.' }); continue; }
        }
        const classpath = variant ? [variant.dir, dir].join(path.delimiter) : dir;
        const result = await runProcess(jdk.java, [...args.slice(0, -1), classpath, qualify(entry)], { cwd: dir, input: example.input, signal });
        if (result.code !== 0) {
          checks.push({ ...example, output: result.stdout, passed: false, error: result.error || 'Program exited unsuccessfully.' });
          return done({ kind: mode === 'public' ? 'public' : 'console', checks, total: assessment.cases.length, passed: false, error: result.error || 'Program exited unsuccessfully.', stage: 'runtime', diagnostics });
        }
        checks.push({ ...example, output: result.stdout, stderr: result.stderr, passed: result.stdout.replaceAll('\r', '').trim() === example.expected.replaceAll('\r', '').trim() });
      }
      return done({ kind: mode === 'public' ? 'public' : 'console', checks, total: assessment.cases.length, passed: checks.every(c => c.passed), diagnostics,sourceChecks,seed:assessment.seed });
    }
    const trials = []; let output = '';
    for (const variant of lesson.mission >= 3 ? [0,1,2] : [0]) {
      const trace = path.join(dir, 'trace.json');
      const result = await runProcess(jdk.java, [...args, qualify('Runner'), String(lesson.mission), String(variant), trace, String(controlHz)], { cwd: dir, signal });
      output += result.stdout;
      if (result.code !== 0) return done({ error: result.error || 'Program exited before the simulation completed.', stage: 'runtime', diagnostics });
      trials.push({ ...JSON.parse(await readFile(trace, 'utf8')), variant });
    }
    return done({ kind: 'robot', trials, output, passed: trials.every(t => t.passed), diagnostics,sourceChecks, frameStep: 1 / 60, controlHz });
  } finally { await rm(dir, { recursive: true, force: true }); }
}


// ---------------------------------------------------------------- games

// Concept lessons have no Java at all. Every path that could create or compile
// a file routes through here, so the guard lives in one place.
export const CODING_KINDS = ['console', 'robot'];
export function assertCoding(lesson) {
  if (!CODING_KINDS.includes(lesson?.kind)) throw new Error('This is a concept lesson. It has no Java file: open Learn or the prediction quiz instead.');
  return lesson;
}

export const freshSeeds = (count = DEFAULT_SEEDS) => Array.from({ length: count }, () => randomBytes(4).readUInt32LE());

// The save-and-run sequence for one game (design spec section 2, "Save & run
// for a game"). Compilation, source checks, a nonzero exit, a timeout, an
// output overflow, and a simulator or authoring error all return a `stage` and
// can never report a passing world from partial output.
export async function runGame({
  game, source, jdk, resourceRoot, cacheRoot = path.join(os.tmpdir(), 'pip-workshop-runs'),
  signal, seeds, mode = RUN_MODES.graded, customInput, runId = null, onWorld,
}) {
  if (typeof source !== 'string' || source.length > LIMITS.sourceChars) throw new Error('Program is too large (40,000 characters maximum).');
  if (!Object.values(RUN_MODES).includes(mode)) throw new Error('Unsupported run mode.');
  const custom = mode === RUN_MODES.custom;
  const publicRun = mode === RUN_MODES.public;
  const graded = mode === RUN_MODES.graded;
  if (custom && typeof customInput !== 'string') throw new Error('Custom input must be text.');
  // Explicit seeds are a deterministic test harness override, never a UI input.
  const seedList = publicRun ? Array.from({ length: PUBLIC_GAME_CASES }, (_, index) => index + 1) : seeds?.length ? seeds : freshSeeds(custom ? 1 : SUBMIT_GAME_CASES);
  const worlds = [];
  let diagnostics = [], sourceChecks = [], compiles = 0, lint = 'unavailable';
  const done = extra => {
    const result = gameResult({ gameId: game.id, runId, mode, earnedStars: graded ? 0 : null, sourceChecks, diagnostics, worlds, ...extra });
    return { ...result, quality: codeQuality(result, { graded, lint }), best: null, compiles };
  };
  const cancelled = () => Boolean(signal?.aborted);

  await mkdir(cacheRoot, { recursive: true });
  const dir = await mkdtemp(path.join(cacheRoot, 'game-'));
  try {
    const namespace = source.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
    const entry = namespace ? `${namespace}.Student` : 'Student';
    await writeFile(path.join(dir, 'Student.java'), source);
    await writeFile(path.join(dir, 'InspectSource.java'), await readFile(path.join(resourceRoot, 'InspectSource.java')));
    const inspectionClasspath = [dir, jdk.home !== 'PATH' ? path.join(jdk.home, 'lib/tools.jar') : ''].filter(Boolean).join(path.delimiter);
    const compiled = await runProcess(jdk.javac, [...lintFlags, '-encoding', 'UTF-8', '-cp', inspectionClasspath, '-d', dir, 'Student.java', 'InspectSource.java'], { cwd: dir, signal });
    compiles += 1;
    diagnostics = parseDiagnostics(compiled.stderr);
    lint = compiled.code === 0 ? 'complete' : 'failed';
    if (cancelled()) return done({ stage: 'runtime', error: 'Run cancelled.' });
    if (compiled.code !== 0) return done({ stage: 'compile', error: compiled.error || compiled.stdout });

    const inspectionFile = path.join(dir, 'inspection.json');
    const inspected = await runProcess(jdk.java, ['-Xmx64m', '-cp', inspectionClasspath, 'InspectSource', path.join(dir, 'Student.java'), inspectionFile], { cwd: dir, signal });
    if (cancelled()) return done({ stage: 'runtime', error: 'Run cancelled.' });
    if (inspected.code !== 0) return done({ stage: 'checks', error: 'The Java source checker could not run. Configure a full JDK in Pip settings.\n' + inspected.error });
    const analysis = JSON.parse(await readFile(inspectionFile, 'utf8'));
    sourceChecks = checkStructure(game, analysis);
    const lockedProblem = lockedInputProblem(analysis, game.lockedInputs, source);
    if (lockedProblem) {
      sourceChecks.push({ passed: false, message: lockedProblem });
      return done({ stage: 'checks', error: lockedProblem });
    }
    // Trials allow unfinished work; supplied-input declarations remain protected.
    if (graded && sourceChecks.some(check => !check.passed)) {
      return done({ stage: 'checks', error: sourceChecks.filter(check => !check.passed).map(check => check.message).join('\n') });
    }

    // Call required helpers independently so copying all the work into main cannot pass.
    if (graded && game.methodCases?.length) {
      const probes = game.methodCases.map((probe, i) => ({ ...probe, entry: `PipProbe${i}` }));
      for (const probe of probes) {
        await writeFile(path.join(dir, `${probe.entry}.java`), `${namespace ? `package ${namespace};\n` : ''}public class ${probe.entry} { public static void main(String[] args) { ${probe.invocation} } }`);
      }
      const build = await runProcess(jdk.javac, [...lintFlags, '-encoding', 'UTF-8', '-cp', dir, '-d', dir, ...probes.map(probe => `${probe.entry}.java`)], { cwd: dir, signal });
      addDiagnostics(diagnostics, parseDiagnostics(build.stderr));
      if (cancelled()) return done({ stage: 'runtime', error: 'Run cancelled.' });
      if (build.code !== 0) return done({ stage: 'checks', error: 'The checks could not call a required method. Keep its public static signature, parameters and return type.\n' + build.error });
      for (const probe of probes) {
        const ran = await runProcess(jdk.java, ['-Xmx64m', '-Dfile.encoding=UTF-8', '-cp', dir, namespace ? `${namespace}.${probe.entry}` : probe.entry], { cwd: dir, signal });
        if (cancelled()) return done({ stage: 'runtime', error: 'Run cancelled.' });
        if (ran.code !== 0) return done({ stage: 'runtime', error: ran.error || `${probe.label}: the method stopped with an error.` });
        let outcome;
        if (probe.world) {
          const problems = validateWorld(probe.world, { id: probe.label });
          if (problems.length) return done({ stage: 'simulate', error: problems.join('\n') });
          const { end } = simulate(probe.world, ran.stdout, game);
          outcome = judge({ ...game, goal: probe.goal }, end, probe.world);
        } else outcome = { passed: ran.stdout.replaceAll('\r', '').trim() === probe.expected.trim() };
        sourceChecks.push({ passed: outcome.passed, message: `${probe.label}${outcome.message ? ': ' + outcome.message : ''}` });
      }
      if (sourceChecks.some(check => !check.passed)) return done({ stage: 'checks', error: sourceChecks.filter(check => !check.passed).map(check => check.message).join('\n') });
    }

    // One compiled program per distinct set of starting values, reused inside the
    // run. A variant that fails to compile never falls back to stale bytecode.
    const variants = new Map();
    const classpathFor = async (constants, variables) => {
      if (!constants && !variables) return dir;
      const cacheKey = JSON.stringify({ constants, variables });
      if (!variants.has(cacheKey)) {
        variants.set(cacheKey, (async () => {
          const problem = constantProblem(analysis, constants);
          if (problem) return { error: problem };
          const changed = replaceInputs(source, analysis, { ...constants, ...variables });
          if (changed === source) return { classpath: dir };
          const out = path.join(dir, `variant-${variants.size + 1}`);
          await mkdir(out, { recursive: true });
          await writeFile(path.join(out, 'Student.java'), changed);
          const build = await runProcess(jdk.javac, [...lintFlags, '-encoding', 'UTF-8', '-cp', out, '-d', out, 'Student.java'], { cwd: out, signal });
          compiles += 1;
          addDiagnostics(diagnostics, parseDiagnostics(build.stderr).map(d => inputDiagnosticLocation(d, source, analysis, { ...constants, ...variables })));
          if (build.code !== 0) lint = 'failed';
          return build.code === 0 ? { classpath: out } : { error: build.error || 'This changed starting data no longer compiles.' };
        })());
      }
      const variant = await variants.get(cacheKey);
      if (variant.error) throw new Error(variant.error);
      return variant.classpath;
    };

    const makeWorld = (level, seed, index = worlds.filter(world => world.level === level).length) => {
      if (publicRun) return publicGameWorld(game, index);
      if (custom) return structuredClone(game.sampleWorld || game.world(worldRng(1, 1), 1));
      return structuredClone(game.world(worldRng(seed, level), level, index));
    };
    const prepare = async (level, seed, index) => {
      let world;
      try { world = makeWorld(level, seed, index); }
      catch (error) { throw new Error(`${game.id}: world(seed ${seed}, level ${level}) failed: ${error.message}`); }
      const problems = validateWorld(world, { id: `${game.id} level ${level} seed ${seed}` });
      if (problems.length) throw new Error(problems.join('\n'));
      const problem = variableProblem(analysis, world.variables);
      if (problem) return { checks: problem };
      const classpath = await classpathFor(world.constants, world.variables);
      return { world, classpath };
    };
    const play = async (level, seed, prepared) => {
      const { world, classpath, checks, error } = prepared || await prepare(level, seed);
      if (error) throw error;
      if (checks) { sourceChecks.push({ passed: false, message: checks }); return { checks }; }
      const input = custom ? customInput : world.input ?? '';
      const ran = await runProcess(jdk.java, ['-Xmx64m', '-Duser.language=en', '-Dfile.encoding=UTF-8', '-cp', classpath, entry], { cwd: dir, input, signal });
      if (ran.code !== 0) return { runtime: ran.error || 'Program exited unsuccessfully.' };
      const { events, end } = simulate(world, ran.stdout, game);
      const outcome = custom ? { passed: false, message: 'Input experiment. Nothing was graded.' } : judge(game, end, world);
      const entryResult = worldResult({ level, seed, world, events, end, passed: outcome.passed, message: outcome.message,
        label: `${publicRun ? 'Example' : custom ? 'Trial' : 'Test'} ${worlds.length + 1}`, input, output: ran.stdout });
      worlds.push(entryResult);
      onWorld?.(entryResult);
      return {};
    };

    if (custom) {
      const seed = seedList[0];
      let generatedInput = '';
      try {
        const world = makeWorld(1, seed);
        generatedInput = world.input ?? '';
        const failure = await play(1, seed);
        if (failure.checks) return { ...done({ stage: 'checks', error: failure.checks }), input: customInput, generatedInput };
        if (failure.runtime) return { ...done({ stage: 'runtime', error: failure.runtime }), input: customInput, generatedInput };
      } catch (error) {
        return { ...done({ stage: cancelled() ? 'runtime' : 'simulate', error: cancelled() ? 'Run cancelled.' : error.message }), input: customInput, generatedInput };
      }
      return { ...done({}), input: customInput, generatedInput };
    }

    // Public cases stop after level 1. Submit retains the old second-tier rules.
    for (const level of game.project || publicRun ? [1] : [1, 2]) {
      // Compile distinct starting values together, but execute and publish each
      // case in the original order. Simulation and route judging stay headless.
      const prepared = [];
      await compileTogether(seedList.map((seed, index) => ({ seed, index })), async ({ seed, index }) => {
        if (cancelled()) return;
        try { prepared[index] = await prepare(level, seed, index); }
        catch (error) { prepared[index] = { error }; }
      });
      for (const [index, seed] of seedList.entries()) {
        if (cancelled()) return done({ stage: 'runtime', error: 'Run cancelled.' });
        let failure;
        try { failure = await play(level, seed, prepared[index]); }
        catch (error) { return done({ stage: cancelled() ? 'runtime' : 'simulate', error: cancelled() ? 'Run cancelled.' : error.message }); }
        if (failure.checks) return done({ stage: 'checks', error: failure.checks });
        if (failure.runtime) return done({ stage: 'runtime', error: failure.runtime });
      }
      if (!worlds.filter(world => world.level === level).every(world => world.passed)) break;
    }
    if (publicRun) return done({});
    const { stars, best } = gradeWorlds(worlds, { project: Boolean(game.project) });
    return { ...done({ earnedStars: stars }), best };
  } finally { await rm(dir, { recursive: true, force: true }); }
}

// A bump or the action limit fails the world before the goal is consulted.
function judge(game, end, world) {
  if (end.bumped) return { passed: false, message: `${ROBOT_REPLIES.bump}. Pip stopped there.` };
  if (end.limited) return { passed: false, message: ROBOT_REPLIES.limit };
  let verdict;
  try { verdict = game.goal(end, structuredClone(world)); }
  catch (error) { throw new Error(`${game.id}: goal() failed: ${error.message}`); }
  return { passed: verdict?.passed === true, message: verdict?.message || (verdict?.passed === true ? 'Solved.' : 'Not solved yet.') };
}
