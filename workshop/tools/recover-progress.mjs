// Explicit, one-time recovery from a selected older workspace. Never scans or
// automatically imports demonstration profiles. The default is read-only.
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lessons } from '../src/curriculum.js';
import { games } from '../src/games/index.js';
import { normalizeProgress, mergeProgress } from '../shared/progress.js';

const exec = promisify(execFile);
const dictionaries = ['drafts', 'steps', 'answers', 'reflections', 'assessments', 'activities'];
const optionalRead = file => readFile(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });

async function nativeAppIsRunning() {
  if (process.platform === 'win32') {
    const { stdout } = await exec('tasklist', ['/FO', 'CSV', '/NH']);
    return /^"pip-workshop\.exe"/mi.test(stdout);
  }
  const { stdout } = await exec('ps', ['-axo', 'comm=']);
  return stdout.split('\n').some(command => /(?:^|\/)pip-workshop$/i.test(command.trim()));
}

function mergeRecovery(currentRaw, earlierRaw) {
  const current = normalizeProgress(currentRaw), earlier = normalizeProgress(earlierRaw);
  // Desktop values are authoritative. Empty text does not erase an older draft
  // or note; completion and game records remain monotonic in mergeProgress.
  for (const field of dictionaries) current[field] = Object.fromEntries(Object.entries(current[field]).filter(([, value]) => value !== ''));
  return { ...currentRaw, ...mergeProgress(earlier, current) };
}

async function javaPlan(workspace, target) {
  const plan = [], seen = new Set();
  for (const [kind, entries] of [['lessons', lessons], ['games', games]]) {
    for (const entry of entries) {
      const folder = entry.id.replaceAll('-', '_'), relative = `src/pip/${kind}/${folder}`;
      if (seen.has(relative)) continue;
      seen.add(relative);
      const sourceDir = path.join(workspace, relative);
      let files;
      try {
        if (!(await lstat(sourceDir)).isDirectory()) continue;
        files = await readdir(sourceDir, { withFileTypes: true });
      } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      for (const file of files) {
        if (!file.isFile() || !/^[A-Za-z_$][\w$]*\.java$/.test(file.name)) continue;
        const rel = `${relative}/${file.name}`, content = await readFile(path.join(workspace, rel));
        const current = await optionalRead(path.join(target, rel));
        if (current !== null) { plan.push({ rel, keep: true, conflict: !current.equals(content) }); continue; }
        const namespace = `pip.${kind}.${folder}`, source = content.toString('utf8');
        const existingPackage = source.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
        if (existingPackage && existingPackage !== namespace) throw new Error(`Package mismatch in ${rel}: expected ${namespace}. Review this source before recovery.`);
        plan.push({ rel, content: existingPackage ? content : Buffer.concat([Buffer.from(`package ${namespace};\n\n`), content]), packageAdded: !existingPackage });
      }
    }
  }
  return plan.sort((a, b) => a.rel.localeCompare(b.rel));
}

export async function recoverProgress({ workspace, progressFile, target, apply = false, isAppRunning = nativeAppIsRunning }) {
  if (!workspace || !progressFile || !target) throw new Error('Specify --workspace, --progress and --target explicitly.');
  [workspace, progressFile, target] = await Promise.all([workspace, progressFile, target].map(file => realpath(file)));
  if (workspace === target) throw new Error('The earlier workspace and desktop workspace must be different folders.');
  const currentFile = path.join(target, 'progress.json'), currentBytes = await optionalRead(currentFile);
  const currentRaw = currentBytes ? JSON.parse(currentBytes) : {}, earlierRaw = JSON.parse(await readFile(progressFile, 'utf8'));
  const current = normalizeProgress(currentRaw), earlier = normalizeProgress(earlierRaw), merged = mergeRecovery(currentRaw, earlierRaw);
  const plan = await javaPlan(workspace, target);
  const report = {
    applied: false, workspace, progressFile, target,
    previousCompletionCount: current.completed.length,
    earlierCompletionCount: earlier.completed.length,
    addedCompletionIds: earlier.completed.filter(id => !current.completed.includes(id)),
    resultingCompletionCount: merged.completed.length,
    missingJava: plan.filter(file => !file.keep).map(file => file.rel),
    keptJava: plan.filter(file => file.keep).map(file => file.rel),
    conflictingJava: plan.filter(file => file.conflict).map(file => file.rel),
    packageAdded: plan.filter(file => file.packageAdded).map(file => file.rel),
    keptDraftConflicts: Object.keys(current.drafts).filter(id => current.drafts[id] && earlier.drafts[id] && current.drafts[id] !== earlier.drafts[id]),
  };
  if (!apply) return report;
  const assertClosed = async () => { if (await isAppRunning()) throw new Error('Quit Pip Workshop before applying recovery. Its open window can overwrite recovered progress.'); };
  const assertUnchanged = async () => {
    const latest = await optionalRead(currentFile);
    if (!(latest === null && currentBytes === null) && !(latest && currentBytes && latest.equals(currentBytes))) throw new Error('Desktop progress changed during recovery. Close Pip Workshop, then preview again.');
  };
  await assertClosed();
  await assertUnchanged();
  const backupRoot = await mkdtemp(path.join(path.dirname(target), `${path.basename(target)}-backup-`));
  report.backup = path.join(backupRoot, 'workspace');
  report.reportFile = path.join(backupRoot, 'recovery.json');
  await cp(target, report.backup, { recursive: true, force: false, errorOnExist: true });
  await writeFile(report.reportFile, JSON.stringify(report, null, 2), { flag: 'wx' });
  for (const file of plan.filter(file => !file.keep)) {
    const destination = path.join(target, file.rel);
    await mkdir(path.dirname(destination), { recursive: true });
    // A file created since preview also wins; never replace current work.
    try { await writeFile(destination, file.content, { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  await assertClosed();
  await assertUnchanged();
  const temp = `${currentFile}.recovery-${randomUUID()}`;
  try {
    await writeFile(temp, `${JSON.stringify(merged, null, 2)}\n`, { flag: 'wx' });
    await rename(temp, currentFile);
  } finally { await rm(temp, { force: true }); }
  report.applied = true;
  await writeFile(report.reportFile, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), options = {};
    while (args.length) {
      const flag = args.shift();
      if (flag === '--apply') options.apply = true;
      else if (['--workspace', '--progress', '--target'].includes(flag) && args[0] && !args[0].startsWith('--')) options[flag === '--progress' ? 'progressFile' : flag.slice(2)] = args.shift();
      else throw new Error('Usage: node tools/recover-progress.mjs --workspace PATH --progress FILE --target PATH [--apply]');
    }
    console.log(JSON.stringify(await recoverProgress(options), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
