// Catch blank or clipped editors in Chromium and WebKit using disposable Java files.
// Run after `npx playwright install chromium webkit`; --production checks dist with Tauri CSP.
// This is browser-engine coverage, not a native WKWebView sign-off.
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { createServer, preview } from 'vite';
import { runProcess, withPackage } from '../host/runner.js';
import { games } from '../src/games/index.js';
const projects = games.filter(game => game.project);
import { lessons } from '../src/curriculum.js';
import { gamePackage, gameSourcePath } from '../shared/game-contract.js';
import { normalizeProgress } from '../shared/progress.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'pip-editor-ui-'));
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
await fs.writeFile(progressFile, JSON.stringify(normalizeProgress({ completed: lessons.map(lesson => lesson.id),
  answers: Object.fromEntries(projects.flatMap(project => (project.refresher || []).map((question, i) => [`${project.id}:${i}`, question.answer])))
})));
const production = process.argv.includes('--production');
const csp = JSON.parse(await fs.readFile(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8')).app.security.csp;
const server = production ? await preview({ root, preview: { host: '127.0.0.1', port: 4321, strictPort: true, headers: { 'Content-Security-Policy': csp } } }) : await createServer({ root, cacheDir: path.join(fixture, '.vite'), server: { host: '127.0.0.1', port: 4321, strictPort: true, watch: null, hmr: false } });
if (!production) await server.listen();
try {
  for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
    const browser = await launcher.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.stack));
      await page.exposeFunction('__pipInvoke', invoke);
      await page.addInitScript(() => {
        window.__TAURI__ = { core: { invoke: (name, args) => window.__pipInvoke(name, args) } };
        window.__PIP_INITIAL_ROUTE__ = location.hash.slice(1);
        localStorage.setItem('pip.appearance', 'system');
      });
      for (const route of ['/practice/hello-java', '/game/supply-relay', '/challenge/challenge-battery-budget']) {
        await page.goto(`http://127.0.0.1:4321/#${route}`);
        await page.locator('.monaco-editor .view-line').first().waitFor();
        for (const appearance of ['light', 'dark']) {
          await page.emulateMedia({ colorScheme: appearance });
          await page.waitForFunction(mode => document.querySelector('.monaco-editor')?.classList.contains(mode === 'dark' ? 'vs-dark' : 'vs'), appearance);
          for (const viewport of [{ width: 1280, height: 800 }, { width: 900, height: 600 }]) {
            await page.setViewportSize(viewport);
            await page.waitForFunction(() => {
              const host = document.querySelector('.java-editor')?.getBoundingClientRect();
              const editor = document.querySelector('.monaco-editor')?.getBoundingClientRect();
              return host && editor && Math.abs(host.height - editor.height) < 2 && Math.abs(host.width - editor.width) < 2;
            });
            const dimensions = await page.locator('.monaco-editor').boundingBox();
            assert.ok(dimensions.height > 200 && dimensions.width > 250, 'editor must have usable dimensions');
            assert.match(await page.locator('.monaco-editor .view-lines').innerText(), /package|class/, 'Java source must be visible');
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'editor page must not overflow horizontally');
            if (route.startsWith('/challenge/')) {
              const code = page.locator('.challenge-description code.java-inline').first();
              const presentation = await code.evaluate(element => {
                const css = getComputedStyle(element), prose = getComputedStyle(element.parentElement);
                return { codeSelection: css.userSelect || css.webkitUserSelect, proseSelection: prose.userSelect || prose.webkitUserSelect, border: css.borderTopWidth, background: css.backgroundColor, proseBackground: prose.backgroundColor };
              });
              assert.equal(presentation.codeSelection, 'text', 'code remains selectable');
              assert.equal(presentation.proseSelection, 'none', 'ordinary UI text is not selectable');
              assert.notEqual(presentation.border, '0px', 'inline code has a visible boundary');
              assert.notEqual(presentation.background, presentation.proseBackground, 'inline code is distinct from prose');
              assert.ok(await page.locator('.challenge-example .tok-variable').count() > 0, 'Java example inputs are highlighted');
              assert.equal(await page.locator('.challenge-console').evaluate(element => { const css = getComputedStyle(element); return css.userSelect || css.webkitUserSelect; }), 'none');
            }
            if (viewport.width === 900 && !route.startsWith('/practice/')) {
              const tablist = page.getByRole('tablist').first();
              const active = await tablist.getByRole('tab', { selected: true }).getAttribute('data-state');
              const activeName = await tablist.getByRole('tab', { selected: true }).innerText();
              const first = tablist.getByRole('tab').first();
              await first.click();
              await page.keyboard.press('ArrowRight');
              const focused = tablist.locator('[role=tab]:focus');
              await page.screenshot({ path:path.join(fixture, `${engine}-${route.split('/').pop()}-${appearance}-tab-focus.png`) });
              const focus = await focused.evaluate(element => ({ outer:getComputedStyle(element).outlineStyle, inner:getComputedStyle(element.querySelector('.rt-BaseTabListTriggerInner')).outlineStyle }));
              assert.equal(focus.outer, 'none', 'tabs must not stack a clipped outer outline on the library focus ring');
              assert.notEqual(focus.inner, 'none', 'keyboard tab focus remains visible');
              await page.evaluate(() => getSelection().removeAllRanges());
              const bounds = await tablist.boundingBox();
              await page.mouse.move(bounds.x + 5, bounds.y + bounds.height / 2); await page.mouse.down();
              await page.mouse.move(bounds.x + bounds.width - 5, bounds.y + bounds.height / 2, { steps:12 }); await page.mouse.up();
              assert.equal(await page.evaluate(() => getSelection().toString()), '', 'dragging tabs cannot select interface labels');
              await tablist.getByRole('tab', { name:activeName, exact:true }).click();
              assert.equal(await tablist.getByRole('tab', { name:activeName, exact:true }).getAttribute('data-state'), active);
            }
            await page.screenshot({ path: path.join(fixture, `${engine}-${route.split('/').pop()}-${appearance}-${viewport.width}.png`), fullPage: true });
          }
        }
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.emulateMedia({ colorScheme: 'light' });
      }
      await page.goto('http://127.0.0.1:4321/#/module/loops');
      const sections = page.getByRole('navigation', { name: 'Module sections', exact: true });
      await sections.waitFor();
      for (const appearance of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: appearance });
        await page.waitForFunction(mode => document.documentElement.dataset.appearance === mode, appearance);
        for (const width of [1280, 900]) {
          await page.setViewportSize({ width, height: width === 900 ? 600 : 800 });
          await sections.getByRole('button', { name: 'Lessons', exact: true }).click();
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          await page.screenshot({ path: path.join(fixture, `${engine}-module-lessons-${appearance}-${width}.png`) });
          await sections.getByRole('button', { name: 'Challenges', exact: true }).click();
          const heading = await page.locator('#module-challenges-heading').boundingBox();
          assert.ok(heading.y >= 56 && heading.y < 600, 'sidebar target is visible below application navigation');
          await page.screenshot({ path: path.join(fixture, `${engine}-module-challenges-${appearance}-${width}.png`) });
        }
      }
      assert.equal(await fs.readFile(savedFile, 'utf8'), oldSource, 'viewing editors never replaces saved Java');
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  }
  console.log(`Editor UI passed in Chromium and WebKit: visible Java, usable layout at 1280/900px, live light/dark themes, preserved source. Screenshots: ${fixture}`);
} finally { if (production) await new Promise(resolve => server.httpServer.close(resolve)); else await server.close(); }
