import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { assessmentCases, checkStructure, replaceInputs } from './assessment.js';

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
