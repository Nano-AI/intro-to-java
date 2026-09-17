import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { assessmentCases, checkStructure, constantProblem, replaceInputs } from './assessment.js';
import { gradeWorlds, simulate, worldRng } from '../src/games/engine.js';
import {
  DEFAULT_SEEDS, LIMITS, ROBOT_REPLIES, RUN_MODES,
  gameResult, validateWorld, worldResult,
} from '../shared/game-contract.js';

export function runProcess(command, args, { cwd, input = '', signal, timeout = 12000, maxOutput = 65536 } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Run cancelled.'));
    const child = spawn(command, args, { cwd, shell: false, detached: process.platform !== 'win32', env: { ...process.env, LC_ALL: 'C' } });
    let stdout = '', stderr = '', bytes = 0, reason = '';
    const stop = message => {
      reason ||= message;
      try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch { child.kill('SIGKILL'); }
    };
    const cancel = () => stop('Run cancelled.');
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => stop('Time limit reached. Check for an infinite loop.'), timeout);
    const capture = which => chunk => {
      const room = Math.max(0, maxOutput - bytes); bytes += chunk.length;
      if (which === 'stdout') stdout += chunk.subarray(0, room).toString(); else stderr += chunk.subarray(0, room).toString();
      if (bytes > maxOutput) stop('Output limit reached. Check for an accidental printing loop.');
    };
    child.stdout.on('data', capture('stdout')); child.stderr.on('data', capture('stderr'));
    child.stdin.on('error', () => {}); child.stdin.end(input);
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); };
    child.on('error', error => { cleanup(); reject(error); });
    child.on('close', code => { cleanup(); resolve({ code: reason ? -1 : code, stdout, stderr, error: reason || stderr }); });
  });
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
  throw new Error('A JDK with java and javac is required. Set Pip: Java Home in VS Code Settings, or install a JDK and restart VS Code.');
}

export function parseDiagnostics(output) {
  return [...output.matchAll(/Student\.java:(\d+): (error|warning): ([^\n]+)\n([^\n]*)\n([^\n]*)/g)].map(match => {
    const extra = output.slice(match.index + match[0].length).match(/^\n\s*symbol:\s*([^\n]+)/);
    return { line: Number(match[1]), column: Math.max(0, match[5].indexOf('^')), severity: match[2], message: match[3] + (extra ? ': ' + extra[1] : '') };
  });
}

export const lessonPackage = id => `pip.lessons.${id.replaceAll('-', '_')}`;
export const withPackage = (source, name) => /^\s*package\s+[\w.]+\s*;/m.test(source) ? source : `package ${name};\n\n${source}`;

export async function runLesson({ lesson, source, jdk, resourceRoot, cacheRoot = path.join(os.tmpdir(), 'pip-workshop-runs'), controlHz = 20, signal, assessmentSeed, customInput }) {
  if (typeof source !== 'string' || source.length > 40000) throw new Error('Program is too large (40,000 characters maximum).');
  if (!['console','robot'].includes(lesson.kind) || ![1,20,60].includes(controlHz)) throw new Error('Invalid exercise or decision rate.');
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
    const compiled = await runProcess(jdk.javac, ['-J-Duser.language=en', '-proc:none', '-Xlint:all,-path', '-encoding', 'UTF-8', '-cp',inspectionClasspath,'-d', dir, ...files], { cwd: dir, signal });
    const diagnostics = parseDiagnostics(compiled.stderr);
    if (compiled.code !== 0) return { error: compiled.error || compiled.stdout, stage: 'compile', diagnostics };
    const args = ['-Xmx64m', '-Duser.language=en', '-Dfile.encoding=UTF-8', '-cp', dir];
    // Custom input is exploration only: no checks, no completion.
    if (typeof customInput === 'string' && lesson.kind === 'console') {
      const tried = await runProcess(jdk.java, [...args, qualify('Student')], { cwd: dir, input: customInput, signal });
      return { kind: 'custom', input: customInput, output: tried.stdout, error: tried.code === 0 ? '' : tried.error || 'Program exited unsuccessfully.', stage: tried.code === 0 ? undefined : 'runtime', diagnostics };
    }
    const inspectionFile=path.join(dir,'inspection.json');
    const inspected=await runProcess(jdk.java,['-Xmx64m','-cp',inspectionClasspath,'InspectSource',path.join(dir,'Student.java'),inspectionFile],{cwd:dir,signal});
    if(inspected.code!==0)return {stage:'checks',error:'The Java source checker could not run. Configure a full JDK in Pip settings.\n'+inspected.error,diagnostics};
    const analysis=JSON.parse(await readFile(inspectionFile,'utf8'));
    const sourceChecks=checkStructure(lesson,analysis);
    if(sourceChecks.some(check=>!check.passed))return {stage:'checks',error:sourceChecks.filter(c=>!c.passed).map(c=>c.message).join('\n'),sourceChecks,diagnostics,passed:false};
    if (lesson.kind === 'console') {
      const checks = [];
      const assessment=assessmentCases(lesson,assessmentSeed);
      for (const example of assessment.cases) {
        let entry=qualify('Student');
        if(example.inputs && example.mutate!==false) {
          await writeFile(path.join(dir,'Student.java'),replaceInputs(source,analysis,example.inputs));
          const compilation=await runProcess(jdk.javac,['-proc:none','-encoding','UTF-8','-cp',dir,'-d',dir,'Student.java'],{cwd:dir,signal});
          if(compilation.code!==0) {checks.push({...example,passed:false,output:compilation.error,error:'This changed starting data no longer compiles.'});continue;}
        }
        if(example.invocation) {
          await writeFile(path.join(dir,'PipCase.java'),prefix+`public class PipCase { public static void main(String[] args) { ${example.invocation} } }`);
          const compilation=await runProcess(jdk.javac,['-proc:none','-encoding','UTF-8','-cp',dir,'-d',dir,'PipCase.java'],{cwd:dir,signal});
          if(compilation.code!==0)return {stage:'checks',error:'The checks could not call the method. Keep its required name, parameters, return type, and static modifier.\n'+compilation.error,sourceChecks,diagnostics,passed:false};
          entry=qualify('PipCase');
        }
        const result = await runProcess(jdk.java, [...args, entry], { cwd: dir, input: example.input, signal });
        if (result.code !== 0) return { error: result.error || 'Program exited unsuccessfully.', stage: 'runtime', diagnostics };
        checks.push({ ...example, output: result.stdout, stderr: result.stderr, passed: result.stdout.replaceAll('\r', '').trim() === example.expected.replaceAll('\r', '').trim() });
      }
      return { kind: 'console', checks, passed: checks.every(c => c.passed), diagnostics,sourceChecks,seed:assessment.seed };
    }
    const trials = []; let output = '';
    for (const variant of lesson.mission >= 3 ? [0,1,2] : [0]) {
      const trace = path.join(dir, 'trace.json');
      const result = await runProcess(jdk.java, [...args, qualify('Runner'), String(lesson.mission), String(variant), trace, String(controlHz)], { cwd: dir, signal });
      output += result.stdout;
      if (result.code !== 0) return { error: result.error || 'Program exited before the simulation completed.', stage: 'runtime', diagnostics };
      trials.push({ ...JSON.parse(await readFile(trace, 'utf8')), variant });
    }
    return { kind: 'robot', trials, output, passed: trials.every(t => t.passed), diagnostics,sourceChecks, frameStep: 1 / 60, controlHz };
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
  if (custom && typeof customInput !== 'string') throw new Error('Custom input must be text.');
  const seedList = seeds?.length ? seeds : freshSeeds();
  const worlds = [];
  let diagnostics = [], sourceChecks = [], compiles = 0;
  const done = extra => ({
    ...gameResult({ gameId: game.id, runId, mode, earnedStars: custom ? null : 0, sourceChecks, diagnostics, worlds, ...extra }),
    best: null, compiles,
  });
  const cancelled = () => Boolean(signal?.aborted);

  await mkdir(cacheRoot, { recursive: true });
  const dir = await mkdtemp(path.join(cacheRoot, 'game-'));
  try {
    const namespace = source.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
    const entry = namespace ? `${namespace}.Student` : 'Student';
    await writeFile(path.join(dir, 'Student.java'), source);
    await writeFile(path.join(dir, 'InspectSource.java'), await readFile(path.join(resourceRoot, 'InspectSource.java')));
    const inspectionClasspath = [dir, jdk.home !== 'PATH' ? path.join(jdk.home, 'lib/tools.jar') : ''].filter(Boolean).join(path.delimiter);
    const compiled = await runProcess(jdk.javac, ['-J-Duser.language=en', '-proc:none', '-Xlint:all,-path', '-encoding', 'UTF-8', '-cp', inspectionClasspath, '-d', dir, 'Student.java', 'InspectSource.java'], { cwd: dir, signal });
    compiles += 1;
    diagnostics = parseDiagnostics(compiled.stderr);
    if (cancelled()) return done({ stage: 'runtime', error: 'Run cancelled.' });
    if (compiled.code !== 0) return done({ stage: 'compile', error: compiled.error || compiled.stdout });

    const inspectionFile = path.join(dir, 'inspection.json');
    const inspected = await runProcess(jdk.java, ['-Xmx64m', '-cp', inspectionClasspath, 'InspectSource', path.join(dir, 'Student.java'), inspectionFile], { cwd: dir, signal });
    if (cancelled()) return done({ stage: 'runtime', error: 'Run cancelled.' });
    if (inspected.code !== 0) return done({ stage: 'checks', error: 'The Java source checker could not run. Configure a full JDK in Pip settings.\n' + inspected.error });
    const analysis = JSON.parse(await readFile(inspectionFile, 'utf8'));
    sourceChecks = checkStructure(game, analysis);
    // An input experiment is exploration, so it is never blocked by a check.
    if (!custom && sourceChecks.some(check => !check.passed)) {
      return done({ stage: 'checks', error: sourceChecks.filter(check => !check.passed).map(check => check.message).join('\n') });
    }

    // One compiled program per distinct set of constants, reused inside the
    // run. A variant that fails to compile never falls back to stale bytecode.
    const variants = new Map();
    const classpathFor = async constants => {
      if (!constants) return dir;
      const cacheKey = JSON.stringify(constants);
      if (!variants.has(cacheKey)) {
        const problem = constantProblem(analysis, constants);
        if (problem) variants.set(cacheKey, { error: problem });
        else {
          const out = path.join(dir, `variant-${variants.size + 1}`);
          await mkdir(out, { recursive: true });
          await writeFile(path.join(out, 'Student.java'), replaceInputs(source, analysis, constants));
          const build = await runProcess(jdk.javac, ['-proc:none', '-encoding', 'UTF-8', '-cp', out, '-d', out, 'Student.java'], { cwd: out, signal });
          compiles += 1;
          variants.set(cacheKey, build.code === 0 ? { classpath: out } : { error: build.error || 'This changed starting data no longer compiles.' });
        }
      }
      const variant = variants.get(cacheKey);
      if (variant.error) throw new Error(variant.error);
      return variant.classpath;
    };

    const play = async (level, seed) => {
      let world;
      try { world = structuredClone(game.world(worldRng(seed, level), level)); }
      catch (error) { throw new Error(`${game.id}: world(seed ${seed}, level ${level}) failed: ${error.message}`); }
      const problems = validateWorld(world, { id: `${game.id} level ${level} seed ${seed}` });
      if (problems.length) throw new Error(problems.join('\n'));
      const classpath = await classpathFor(world.constants);
      const input = custom ? customInput : world.input ?? '';
      const ran = await runProcess(jdk.java, ['-Xmx64m', '-Duser.language=en', '-Dfile.encoding=UTF-8', '-cp', classpath, entry], { cwd: dir, input, signal });
      if (ran.code !== 0) return { runtime: ran.error || 'Program exited unsuccessfully.' };
      const { events, end } = simulate(world, ran.stdout, game);
      const outcome = custom ? { passed: false, message: 'Input experiment. Nothing was graded.' } : judge(game, end, world);
      const entryResult = worldResult({ level, seed, world, events, end, passed: outcome.passed, message: outcome.message });
      worlds.push(entryResult);
      onWorld?.(entryResult);
      return {};
    };

    if (custom) {
      const seed = seedList[0];
      let generatedInput = '';
      try {
        const world = structuredClone(game.world(worldRng(seed, 1), 1));
        generatedInput = world.input ?? '';
        const failure = await play(1, seed);
        if (failure.runtime) return { ...done({ stage: 'runtime', error: failure.runtime }), input: customInput, generatedInput };
      } catch (error) {
        return { ...done({ stage: cancelled() ? 'runtime' : 'simulate', error: cancelled() ? 'Run cancelled.' : error.message }), input: customInput, generatedInput };
      }
      return { ...done({}), input: customInput, generatedInput };
    }

    // Level 2 is skipped when level 1 fails; projects never run it at all.
    for (const level of game.project ? [1] : [1, 2]) {
      for (const seed of seedList) {
        if (cancelled()) return done({ stage: 'runtime', error: 'Run cancelled.' });
        let failure;
        try { failure = await play(level, seed); }
        catch (error) { return done({ stage: cancelled() ? 'runtime' : 'simulate', error: cancelled() ? 'Run cancelled.' : error.message }); }
        if (failure.runtime) return done({ stage: 'runtime', error: failure.runtime });
      }
      if (!worlds.filter(world => world.level === level).every(world => world.passed)) break;
    }
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
