// Render the real desktop frontend with isolated storage. Java execution is not
// under test here; editor diagnostics/completions return empty results.
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { createServer } from 'vite';
import { runProcess, withPackage } from '../host/runner.js';
import { lessons, independentChallenges } from '../src/curriculum.js';
import { games } from '../src/games/index.js';
import { gamePackage, gameSourcePath } from '../shared/game-contract.js';
import { normalizeProgress } from '../shared/progress.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const engine = process.env.DISPLAY_ENGINE === 'webkit' ? webkit : chromium;
const port = engine === webkit ? 4326 : 4324;
const fixture = await fs.mkdtemp(path.join(os.tmpdir(), `pip-display-${engine.name()}-`));
const student = path.join(fixture, '.pip-java'), game = games.find(item => item.id === 'supply-relay');
const savedFile = path.join(student, gameSourcePath(game.id));
const savedSource = withPackage('// Existing work must survive display changes.\n' + game.starter, gamePackage(game.id));
await fs.mkdir(path.dirname(savedFile), { recursive: true });
await fs.writeFile(savedFile, savedSource);
await fs.writeFile(path.join(student, 'progress.json'), JSON.stringify(normalizeProgress({
  completed: lessons.filter(item => !item.independent).map(item => item.id),
  answers: Object.fromEntries(game.refresher.map((question, index) => [`${game.id}:${index}`, question.answer])),
})));
let development = true;
const invoke = async (command, args = {}) => {
  switch (command) {
    case 'paths':
      await new Promise(resolve => setTimeout(resolve, 75));
      return { home: fixture, resources: path.join(root, 'src-tauri'), temp: fixture, platform: process.platform, development };
    case 'fs_read': return fs.readFile(args.path, 'utf8');
    case 'fs_write': return fs.writeFile(args.path, args.contents, { flag: args.createNew ? 'wx' : 'w' });
    case 'fs_mkdir': return fs.mkdir(args.path, { recursive: true });
    case 'fs_remove': return fs.rm(args.path, { recursive: true, force: true });
    case 'fs_rename': return fs.rename(args.from, args.to);
    case 'fs_exists': return fs.access(args.path).then(() => true, () => false);
    case 'fs_mkdtemp': return fs.mkdtemp(args.prefix);
    case 'run_process': return runProcess(args.command, args.args, { cwd: args.cwd || undefined, input: args.input, timeout: args.timeoutMs, maxOutput: args.maxOutput });
    case 'diagnose': return { diagnostics: [] };
    case 'complete': return { items: [] };
    default: throw Error(`Unexpected desktop command: ${command}`);
  }
};
const server = await createServer({ root, cacheDir: path.join(fixture, '.vite'), server: { host: '127.0.0.1', port, strictPort: true, watch: null, hmr: false } });
let browser, page;
try {
  await server.listen();
  browser = await engine.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.exposeFunction('__pipInvoke', invoke);
  await page.addInitScript(() => {
    window.__TAURI__ = { core: { invoke: (name, args) => window.__pipInvoke(name, args) } };
    window.__PIP_INITIAL_ROUTE__ = location.hash.slice(1) || '/settings';
    if (!localStorage.getItem('display.fixture')) { localStorage.setItem('pip.editorSize', '19'); localStorage.setItem('display.fixture', 'true'); }
  });
  const open = route => page.goto(`http://127.0.0.1:${port}/#${route}`);
  const choose = async (id, label) => { await page.locator(id).click(); await page.getByRole('option', { name: label, exact: true }).click(); };
  const inWindow = async (locator, label) => {
    await locator.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))));
    const box = await locator.boundingBox();
    const viewport = page.viewportSize();
    assert.ok(box && box.x >= -2 && box.y >= -2 && box.x + box.width <= viewport.width + 2 && box.y + box.height <= viewport.height + 2, `${label} fits: ${JSON.stringify(box)}`);
    return box;
  };
  const editor = async () => {
    await page.locator('.monaco-editor').waitFor();
    await page.waitForFunction(() => document.querySelector('.monaco-editor .view-lines'));
  };
  await open('/settings');
  await page.getByRole('heading', { name: 'Demo mode', exact: true }).waitFor();
  development = false;
  await page.reload();
  await page.getByRole('heading', { name: 'Java setup', exact: true }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Demo mode', exact: true }).count(), 0, 'release builds do not expose Demo mode');
  development = true;
  await page.reload();
  await page.getByRole('heading', { name: 'Demo mode', exact: true }).waitFor();
  assert.match(await page.locator('#editor-font-size').innerText(), /19 px/);
  await page.getByRole('button', { name: 'Increase code font size', exact: true }).click();
  for (const theme of ['light', 'dark']) for (const width of [900, 1280]) for (const scale of [90, 100, 110, 125]) {
    const label = `${theme}-${width}-${scale}`, height = width === 900 ? 600 : 800;
    await page.setViewportSize({ width, height });
    await open('/settings');
    await page.getByRole('radio', { name: theme === 'light' ? 'Light' : 'Dark', exact: true }).click();
    await choose('#interface-scale', `${scale}%${scale === 100 ? ' (default)' : ''}`);
    await page.waitForFunction(value => document.documentElement.dataset.interfaceScale === String(value), scale);
    await page.locator('#interface-scale').click();
    await inWindow(page.getByRole('listbox'), `Settings popup ${label}`);
    await page.keyboard.press('Escape');
    await page.locator('#default-arena').click();
    await inWindow(page.getByRole('listbox'), `Scenery popup ${label}`);
    await page.keyboard.press('Escape');
    if (scale === 125) {
      await page.evaluate(() => window.scrollTo(0,0));
      await page.screenshot({ path: path.join(fixture, `settings-${label}.png`), fullPage: true });
    }
    await open(`/challenge/${independentChallenges[0].id}`);
    await editor();
    await inWindow(page.locator('.challenge-workspace'), `Challenge ${label}`);
    const challengeEditor = await inWindow(page.locator('.monaco-editor'), `Challenge editor ${label}`);
    assert.ok(challengeEditor.height >= 140 && challengeEditor.width >= 220, `Challenge editor stays usable ${label}`);
    assert.equal(await page.locator('.monaco-editor .view-lines').evaluate(el => parseFloat(getComputedStyle(el).fontSize)), 20);
    if (scale === 125) await page.screenshot({ path: path.join(fixture, `challenge-${label}.png`), fullPage: true });
    await open('/game/supply-relay');
    await editor();
    await inWindow(page.locator('.desktop-shell'), `Project ${label}`);
    const gameEditor = await inWindow(page.locator('.monaco-editor'), `Project editor ${label}`);
    assert.ok(gameEditor.height >= 140 && gameEditor.width >= 220, `Project editor stays usable ${label}`);
    await page.getByRole('tab', { name: 'World', exact: true }).click();
    await inWindow(page.locator('.world-stage'), `Project world ${label}`);
    if (scale === 125) await page.screenshot({ path: path.join(fixture, `project-${label}.png`), fullPage: true });
    if (scale === 125) {
      await page.getByRole('button', { name: 'Commands', exact: true }).click();
      await inWindow(page.getByRole('dialog'), `Commands dialog ${label}`);
      await page.screenshot({ path: path.join(fixture, `commands-${label}.png`) });
      await page.keyboard.press('Escape');
    }
    await open('/practice/hello-java');
    await editor();
    await inWindow(page.locator('.desktop-shell'), `Lesson ${label}`);
    await inWindow(page.locator('.monaco-editor'), `Lesson editor ${label}`);
  }
  await page.locator('.view-line').first().click();
  const editorSource = () => page.evaluate(async () => {
    const source = await (await fetch('/src/editor.jsx')).text();
    const url = source.match(/import \* as monaco from ["']([^"']+)["']/)?.[1];
    const monaco = await import(url);
    return monaco.editor.getEditors()[0].getValue();
  });
  const beforeTyping = await editorSource();
  await page.keyboard.type('x');
  assert.notEqual(await editorSource(), beforeTyping, 'clicking code accepts real typed input at125%');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+KeyZ' : 'Control+KeyZ');
  assert.equal(await editorSource(), beforeTyping, 'undo restores the exact source');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Equal' : 'Control+Equal');
  await page.waitForFunction(() => localStorage.getItem('pip.editorSize') === '21');
  assert.equal(await page.locator('.monaco-editor .view-lines').evaluate(el => parseFloat(getComputedStyle(el).fontSize)), 21, 'editor shortcut changes the live font');
  assert.equal(await page.evaluate(() => localStorage.getItem('pip.interfaceScale')), '125', 'font shortcut leaves interface scale unchanged');
  await open('/settings');
  assert.match(await page.locator('#editor-font-size').innerText(), /21 px/);
  assert.match(await page.locator('#interface-scale').innerText(), /125%/);
  await page.reload();
  assert.match(await page.locator('#editor-font-size').innerText(), /21 px/);
  assert.match(await page.locator('#interface-scale').innerText(), /125%/);
  const increase = page.getByRole('button', { name:'Increase code font size', exact:true });
  const decrease = page.getByRole('button', { name:'Decrease code font size', exact:true });
  for (let size=21;size<28;size++) await increase.click();
  assert.equal(await increase.isDisabled(),true);
  for (let size=28;size>10;size--) await decrease.click();
  assert.equal(await decrease.isDisabled(),true);
  assert.equal(await fs.readFile(savedFile, 'utf8'), savedSource);
  assert.deepEqual(errors, []);
  console.log(`Display UI passed (${engine.name()}): both themes,900/1280 widths,90/100/110/125% scales,Radix popup bounds,pointer typing,live editor shortcuts,persistence,and preserved Java. Screenshots: ${fixture}`);
} catch (error) {
  if (page) {
    await page.screenshot({ path: path.join(fixture, 'failure.png'), fullPage: true }).catch(() => {});
    console.error(await page.getByRole('listbox').evaluateAll(elements => elements.map(el => ({
      html: el.outerHTML.slice(0,200), available:getComputedStyle(el).getPropertyValue('--radix-select-content-available-height'),
      maxHeight:getComputedStyle(el).maxHeight,parents:Array.from((function*(){for(let n=el.parentElement;n&&n!==document.body;n=n.parentElement)yield n;})()).map(n=>({tag:n.tagName,class:n.className,style:n.getAttribute('style')})),
    }))));
    console.error((await page.locator('body').innerText()).slice(-1800));
  }
  console.error(`Display UI failure artifacts: ${fixture}`);
  throw error;
} finally { await browser?.close(); await server.close(); }
