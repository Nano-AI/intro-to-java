// Focused regression for replacing a playing replay with shorter/empty worlds.
// Exercise the Tauri frontend and desktop host with an isolated filesystem/IPC bridge.
// Native process/daemon behavior is covered separately by cargo test.
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { runProcess, withPackage } from '../host/runner.js';
import { games } from '../src/games/index.js';
const projects = games.filter(game => game.project);
import { lessons, stepsFor } from '../src/curriculum.js';
import { gamePackage, gameSourcePath } from '../shared/game-contract.js';
import { normalizeProgress } from '../shared/progress.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'pip-desktop-ui-'));
const resources = path.join(fixture, 'resources'), student = path.join(fixture, '.pip-java');
await fs.mkdir(resources); await fs.mkdir(student);
await fs.symlink(path.join(root, 'src-tauri/jre'), path.join(resources, 'jre'));
for (const file of ['Robot.java', 'Runner.java', 'InspectSource.java']) await fs.copyFile(path.join(root, file), path.join(resources, file));
const java = path.join(resources, 'jre/bin/java'), javac = path.join(resources, 'jre/bin/javac');
const compiled = await runProcess(javac, ['-d', resources, path.join(root, 'desktop/DiagD.java')]);
assert.equal(compiled.code, 0, compiled.error);
const progressFile = path.join(student, 'progress.json');
const savedFile = path.join(student, gameSourcePath(projects[0].id));
const oldSource = withPackage('// Saved before the homework update.\n' + projects[0].starter, gamePackage(projects[0].id));
await fs.mkdir(path.dirname(savedFile), { recursive: true }); await fs.writeFile(savedFile, oldSource);
await fs.writeFile(progressFile, JSON.stringify(normalizeProgress({ games: { [projects[0].id]: { stars: 1, best: null, updatedAt: null } } })));
const invoke = async (command, args = {}) => {
  switch (command) {
    case 'paths': return { home: fixture, resources, temp: fixture, platform: process.platform, development: true };
    case 'fs_read': return fs.readFile(args.path, 'utf8');
    case 'fs_write': return fs.writeFile(args.path, args.contents, { flag: args.createNew ? 'wx' : 'w' });
    case 'fs_mkdir': return fs.mkdir(args.path, { recursive: true });
    case 'fs_remove': return fs.rm(args.path, { recursive: true, force: true });
    case 'fs_rename': return fs.rename(args.from, args.to);
    case 'fs_exists': return fs.access(args.path).then(() => true, () => false);
    case 'fs_mkdtemp': return fs.mkdtemp(args.prefix);
    case 'run_process': return runProcess(args.command, args.args, { cwd: args.cwd || undefined, input: args.input, timeout: args.timeoutMs, maxOutput: args.maxOutput });
    case 'complete': case 'diagnose': {
      const kind = command === 'complete' ? 'C' : 'D';
      const input = `${kind}\n${args.sourceRoot}\n${args.relPath}\n${Buffer.byteLength(args.source)}\n${kind === 'C' ? args.offset + '\n' : ''}${args.source}`;
      const result = await runProcess(java, ['-cp', resources, 'DiagD'], { input });
      assert.equal(result.code, 0, result.error);
      return JSON.parse(result.stdout.trim());
    }
    case 'kill_process': return;
    default: throw new Error(`Unexpected desktop command: ${command}`);
  }
};

const answers=Object.fromEntries(projects[0].refresher.map((q,i)=>[`${projects[0].id}:${i}`,q.answer]));
await fs.writeFile(progressFile,JSON.stringify(normalizeProgress({completed:lessons.map(l=>l.id),answers})));
const server=await createServer({root,cacheDir:path.join(fixture,'.vite'),server:{host:'127.0.0.1',port:4324,strictPort:true,watch:null,hmr:false}});
let browser;
try {
 await server.listen();browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:900,height:600}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.exposeFunction('__pipInvoke',invoke);
 await page.addInitScript(()=>{window.__TAURI__={core:{invoke:(name,args)=>window.__pipInvoke(name,args)}};window.__PIP_INITIAL_ROUTE__='/game/supply-relay';});
 await page.goto('http://127.0.0.1:4324/#/game/supply-relay');
 await page.locator('.monaco-editor .view-line').first().waitFor();
 const progressBeforeExample=await fs.readFile(progressFile,'utf8');
 for(const appearance of ['light','dark']) {
  await page.evaluate(value=>localStorage.setItem('pip.appearance',value),appearance);await page.reload();
  await page.locator('.monaco-editor .view-line').first().waitFor();
  for(const name of ['Description','World','Submission','Testcase','Test Result']) assert.equal(await page.getByRole('tab',{name,exact:true}).locator('.rt-TabsTriggerInner>.icon').count(),1);
  await page.getByRole('tab',{name:'Description',exact:true}).click();
  const input=await page.locator('.game-example .case-input').innerText();
  assert.equal(await page.getByRole('button',{name:'Insert solution',exact:true}).count(),0);
  await page.getByRole('button',{name:'Play demo',exact:true}).click();
  await page.locator('.game-example-output pre').waitFor({timeout:60000});
  assert.equal(await page.locator('.game-example .case-input').innerText(),input);
  assert.ok((await page.locator('.game-example-output pre').innerText()).includes('Delivered 1 part; energy'));
  await page.locator('.game-example-stage .playback-tools select').selectOption('4');
  await page.locator('.game-example-stage .replay-transcript li').first().waitFor();
  assert.equal(await fs.readFile(savedFile,'utf8'),oldSource,'example preserves student source');
  assert.equal(await fs.readFile(progressFile,'utf8'),progressBeforeExample,'example preserves progress and checklist');
  await page.locator('.game-example-stage').scrollIntoViewIfNeeded();
  assert.ok((await page.locator('.game-example-stage .world-panel').boundingBox()).height>=180,'example scene has readable space at the minimum window');
  await page.screenshot({path:path.join(fixture,`example-${appearance}-900-world.png`)});
  await page.locator('.game-example-output').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(fixture,`example-${appearance}-900-values.png`)});
  await page.setViewportSize({width:1280,height:800});
  await page.locator('.game-example-stage').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(fixture,`example-${appearance}-1280.png`)});
  await page.getByRole('button',{name:'Restart replay',exact:true}).click();
  assert.equal(await page.locator('.replay-transcript li').count(),0,'restarting clears prior speech');
  await page.getByRole('tab',{name:'Submission',exact:true}).click();
  assert.equal(await page.locator('.game-submission h2').count(),0,'example never sets student submission');
  await page.getByRole('tab',{name:'World',exact:true}).click();
  assert.equal(await page.locator('.replay-transcript li').count(),0,'student world does not inherit example speech');
  await page.setViewportSize({width:900,height:600});
 }
 const packet=await page.evaluate(async source=>{
  const {request}=await import('/src/platform.js');
  return request('game.run',{gameId:'supply-relay',source,mode:'graded'});
 },withPackage(projects[0].solution,gamePackage(projects[0].id)));
 assert.equal(packet.result.stage,null);
 assert.ok(packet.result.worlds.length>1);
 await page.getByRole('tab',{name:'World',exact:true}).click();
 await page.locator('.playback-tools select').selectOption('4');
 // Use the host's actual results while alternating graded, trial and idle snapshots.
 // A new run clears the replay to a single initial frame while the old cursor is >0.
 await page.evaluate(async packet=>{
  const post=(event,data)=>window.postMessage({event,data},'*');
  const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  for(let i=0;i<32;i++) {
   const runId=`stress-${i}`,mode=i%2?'custom':'graded';
   post('run.finished',{...packet,runId,mode});
   await nextFrame();document.querySelector('[role="tab"][data-pane="world"]').click();await nextFrame();
   await delay(240);
   post('run.started',{gameId:packet.gameId,runId:`empty-${i}`,mode});
   await nextFrame();await nextFrame();
   post('run.finished',{...packet,runId:`short-${i}`,mode,result:{...packet.result,worlds:[{...packet.result.worlds[i%packet.result.worlds.length],events:[]}]}});
   await nextFrame();await nextFrame();
  }
  post('run.finished',{...packet,runId:'world-switch-final',mode:'graded'});
 },packet);
 await page.getByRole('tab',{name:'World',exact:true}).click();
 for(let i=0;i<8;i++) {
  await page.getByRole('combobox',{name:'Choose a world to replay'}).click();
  assert.equal(await page.getByRole('option',{selected:true}).locator('svg').count(),1,'selected world has one check');
  const options=page.getByRole('option');await options.nth(i%await options.count()).click();
  await page.waitForTimeout(130);
 }
 await page.getByRole('button',{name:'Map',exact:true}).click();
 await page.locator('.tile-board').waitFor();
 assert.equal(await page.getByRole('region',{name:'Speech transcript',exact:true}).count(),1,'transcript remains visible in Map view');
 await page.screenshot({path:path.join(fixture,'replay-lifecycle-final.png')});
 assert.deepEqual(errors,[]);
 console.log(`Replay lifecycle passed: 32 long/empty/short graded+trial replacements, 8 world switches. Screenshot: ${fixture}`);
}finally{await browser?.close();await server.close();}
