import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { lessons, orderedLessons, modules } from '../src/curriculum.js';
import { findJdk, lessonPackage, runLesson, runProcess, withPackage } from './runner.js';
import { normalizeProgress, mergeProgress } from '../shared/progress.js';
import { ProgressStore } from './state.js';
import { burstParticles } from '../web/explosion.js';
import { practicePath } from '../src/routes.js';

const resourceRoot = fileURLToPath(new URL('../', import.meta.url));
const jdk = await findJdk([path.join(resourceRoot, 'runtime', 'jdk')]);
test('all 39 coding parts in 35 learning units execute real Java and pass', async () => {
  assert.equal(orderedLessons.length, 35); assert.equal(modules.length, 6);
  assert.equal(new Set(orderedLessons.map(l => l.id)).size, 35);
  assert.equal(lessons.length,39);
  for (const lesson of lessons) {
    const result = await runLesson({ lesson, source: withPackage(lesson.solution, lessonPackage(lesson.id)), jdk, resourceRoot, controlHz: lesson.mission < 2 ? 1 : 20 });
    assert.equal(result.passed, true, `${lesson.id}: ${JSON.stringify(result)}`);
    assert.ok(lesson.visual?.kind,`${lesson.id} has an interactive model`);
  }
});
test('the declaration repair is a five-part exercise with distinct failing starters',async()=>{
  const parent=lessons.find(l=>l.id==='debug-semicolon');assert.equal(parent.parts.length,5);
  for(const id of parent.parts){const lesson=lessons.find(l=>l.id===id);const result=await runLesson({lesson,source:lesson.starter,jdk,resourceRoot,assessmentSeed:123});assert.notEqual(result.passed,true,`${id} must start broken`);}
  assert.equal(practicePath(lessons.find(l=>l.id==='robot-hoop')),'/project/robot-hoop');
  assert.equal(practicePath(lessons.find(l=>l.id==='java-final-report')),'/assignment/java-final-report');
  assert.equal(practicePath(parent),'/practice/debug-semicolon');
});
test('explosion particles use independent randomized launch properties',()=>{
  const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const a=burstParticles(seeded(1)),b=burstParticles(seeded(2));
  assert.equal(a.length,64);assert.notDeepEqual(a,b);
  assert.ok(a.some(p=>p.velocity[0]<0)&&a.some(p=>p.velocity[0]>0));
  assert.ok(a.some(p=>p.velocity[2]<0)&&a.some(p=>p.velocity[2]>0));
  assert.ok(a.every(p=>p.velocity.every(Number.isFinite)&&p.scale.every(n=>n>0)));
});
test('literal answers, comment tricks, and unused methods do not pass the target exercises',async()=>{
  const declaration=lessons.find(l=>l.id==='java-declare');
  const literal='public class Student {public static void main(String[] args){int bolts=4;/* System.out.println(bolts); */System.out.println(4);}}';
  const declared=await runLesson({lesson:declaration,source:literal,jdk,resourceRoot,assessmentSeed:123});
  assert.equal(declared.passed,false);assert.equal(declared.stage,'checks');
  const changedValue=await runLesson({lesson:lessons.find(l=>l.id==='debug-types'),source:'public class Student {public static void main(String[] args){double power=0;System.out.println(power);}}',jdk,resourceRoot,assessmentSeed:123});
  assert.equal(changedValue.checks[0].passed,false,'repair must preserve the original requested value');
  const variables=lessons.find(l=>l.id==='java-variables');
  const memorized='public class Student {public static void main(String[] args){int parts=12;int used=5;int dummy=used;parts=7;System.out.println(parts);}}';
  const result=await runLesson({lesson:variables,source:memorized,jdk,resourceRoot,assessmentSeed:123});
  assert.equal(result.checks[0].passed,true);assert.equal(result.passed,false);
  const methods=lessons.find(l=>l.id==='java-methods');
  const bypass='public class Student {public static void main(String[] args){System.out.println("Ready: Pip\\nReady: Bolt");}public static void announce(String name){}}';
  assert.equal((await runLesson({lesson:methods,source:bypass,jdk,resourceRoot,assessmentSeed:123})).passed,false);
  const docking=lessons.find(l=>l.id==='autonomous-docking');
  const ignoresParameter=docking.solution.replace('robot.distance() > targetDistance','robot.distance() > 30');
  const dockingResult=await runLesson({lesson:docking,source:ignoresParameter,jdk,resourceRoot});
  assert.equal(dockingResult.trials[0].passed,true);assert.equal(dockingResult.passed,false,'docking must use the requested target distance');
  const newVariable=lessons.find(l=>l.id==='debug-new-variable');
  const changesOriginal='public class Student {public static void main(String[] args){int parts=12;int used=5;parts-=used;int remaining=parts;System.out.println(remaining);}}';
  const changed=await runLesson({lesson:newVariable,source:changesOriginal,jdk,resourceRoot});assert.equal(changed.stage,'checks');assert.equal(changed.passed,false);
});
test('obstacles reject a straight drive and interaction goals require their objects',async()=>{
  const source='public class Student {public static void update(Robot r){if(r.seconds()<6)r.setPower(.5,.5);else r.stop();}}';
  const result=await runLesson({lesson:lessons.find(l=>l.id==='robot-detour'),source,jdk,resourceRoot});
  assert.equal(result.passed,false);assert.equal(result.trials[0].frames.at(-1).collision,true);
  for(const id of ['robot-cargo','robot-hoop']) {
    const empty=await runLesson({lesson:lessons.find(l=>l.id===id),source:'public class Student {public static void update(Robot r){r.deliver();r.shoot(.6);r.stop();}}',jdk,resourceRoot});
    assert.equal(empty.passed,false);
  }
});
test('incorrect code fails with diagnostics matching the real source lines', async () => {
  const lesson = lessons.find(l => l.id === 'first-movement');
  const source = withPackage('public class Student {\n public static void update(Robot robot) { robot.stopp(); }\n}', lessonPackage(lesson.id));
  const result = await runLesson({ lesson, source, jdk, resourceRoot });
  assert.equal(result.stage, 'compile'); assert.equal(result.diagnostics[0].line, 4); assert.match(result.error, /stopp/);
  const bad = await runLesson({ lesson, source: withPackage('public class Student { public static void update(Robot r) { r.setPower(1.2,1.0); } }',lessonPackage(lesson.id)), jdk, resourceRoot });
  assert.equal(bad.stage, 'runtime'); assert.match(bad.error, /between -1.0 and 1.0/);
});
test('robot feedback handles varied starts and control rates', async () => {
  const lesson = lessons.find(l=>l.id==='sense-and-stop');
  const timed = 'public class Student { public static void update(Robot r) { if(r.seconds()<7.3)r.setPower(.35,.35);else r.stop(); } }';
  const result = await runLesson({lesson,source:timed,jdk,resourceRoot});
  assert.equal(result.trials[0].passed,true); assert.equal(result.passed,false);
  const moving=lessons.find(l=>l.id==='first-movement');
  for(const controlHz of [1,20,60]) {
    const result=await runLesson({lesson:moving,source:moving.solution,jdk,resourceRoot,controlHz});
    assert.equal(result.trials[0].frames.at(-1).y,-30);
  }
});
test('process timeouts and cancellation stop execution', async () => {
  const timed = await runProcess(process.execPath, ['-e','setInterval(()=>{},1000)'], {timeout:100});
  assert.equal(timed.code,-1); assert.match(timed.error,/Time limit/);
  const controller=new AbortController();
  const pending=runProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{signal:controller.signal});
  controller.abort(); assert.match((await pending).error,/cancelled/);
});
test('legacy saves migrate, concurrent updates merge, and corrupt files are preserved', async () => {
  const migrated=normalizeProgress({completed:[0,'hello-java'],drafts:{0:'old Java'},reflections:{'hello-java':'My explanation'},view:{environment:'moon'}});
  assert.deepEqual(migrated.completed,['first-movement','hello-java']); assert.equal(migrated.drafts['first-movement'],'old Java');
  assert.equal(normalizeProgress({reflections:{'hello-java':42}}).reflections['hello-java'],undefined);
  const merged=mergeProgress(migrated,{completed:['java-for'],drafts:{'java-for':'new Java'}});
  assert.equal(merged.drafts['first-movement'],'old Java');
  const directory=await mkdtemp(path.join(os.tmpdir(),'pip-progress-test-'));
  try {
    const store=new ProgressStore(directory);await store.load();
    await Promise.all([store.patch({steps:{'hello-java':1}}),store.patch({reflections:{'hello-java':'A saved explanation'}})]);
    const saved=JSON.parse(await readFile(store.file,'utf8'));assert.equal(saved.steps['hello-java'],1);assert.equal(saved.reflections['hello-java'],'A saved explanation');
    await writeFile(store.file,'invalid-json');await assert.rejects(new ProgressStore(directory).load(),/preserved/);assert.equal(await readFile(store.file,'utf8'),'invalid-json');
  } finally { await rm(directory,{recursive:true,force:true}); }
});
test('class constants must be final class fields, and custom input never grades',async()=>{
  const lesson=lessons.find(l=>l.id==='java-constants');
  assert.equal((await runLesson({lesson,source:lesson.starter,jdk,resourceRoot})).stage,'compile','the starter demonstrates the loop-variable scope error');
  const hardcoded=await runLesson({lesson,source:lesson.solution.replace('"Scanned " + SHELVES','"Scanned " + 3'),jdk,resourceRoot,assessmentSeed:123});
  assert.equal(hardcoded.checks[0].passed,true);assert.equal(hardcoded.passed,false);
  assert.equal((await runLesson({lesson,source:lesson.solution.replace('static final','static'),jdk,resourceRoot})).stage,'checks');
  const scanner=lessons.find(l=>l.id==='java-scanner');
  const custom=await runLesson({lesson:scanner,source:scanner.solution,jdk,resourceRoot,customInput:'Nova 21'});
  assert.equal(custom.kind,'custom');assert.equal(custom.output.trim(),'Nova:42');assert.equal(custom.passed,undefined);
  assert.match((await runLesson({lesson:scanner,source:scanner.solution,jdk,resourceRoot,customInput:'Nova'})).error,/NoSuchElementException/);
});
