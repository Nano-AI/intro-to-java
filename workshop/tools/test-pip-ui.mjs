// Inspect the real offline renderer without touching a student's workspace.
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = await mkdtemp(path.join(os.tmpdir(), 'pip-robot-ui-'));
const server = await createServer({ root, server: { host: '127.0.0.1', port: 4325, strictPort: true, hmr: false }, plugins: [{
  name: 'robot-visual-fixture',
  resolveId(id) { if (id === '/__pip-three.js') return id; },
  load(id) { if (id === '/__pip-three.js') return "export * from 'three';"; },
  configureServer(server) {
    server.middlewares.use('/__pip-model-test', (_req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><html><body style="margin:0"><div id="world" style="height:100vh;width:100vw"></div></body></html>');
    });
  },
}] });
let browser;
try {
  await server.listen(); browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 700, height: 480 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4325/__pip-model-test');
  await page.evaluate(async () => {
    const THREE = await import('/__pip-three.js');
    THREE.Mesh.prototype.onBeforeRender = function (_renderer, scene, camera) {
      if (this.parent?.name === 'Pip') window.robotPose = this.parent.position.toArray();
      if (this.parent?.parent?.name !== 'scoreboard') return;
      const bounds = new THREE.Box3().setFromObject(this.parent.parent);
      window.worldView = {
        scoreboard: this.parent.parent.matrixWorld.toArray(),
        display: this.parent.matrixWorld.toArray(),
        camera: camera.matrixWorld.toArray(),
        projection: camera.projectionMatrix.toArray(),
      };
      window.scoreboardBounds = [];
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).project(camera);
        window.scoreboardBounds.push([point.x, point.y]);
      }
    };
    const { createWorld } = await import('/web/world.js');
    const { simulate } = await import('/src/games/engine.js');
    const { replayBoard } = await import('/src/game-board.js');
    const world = { width: 4, height: 3, robot: { x: 0, y: 1, dir: 'E' }, items: Array.from({ length: 3 }, (_, i) => ({ id: `part-${i}`, kind: 'part', x: 0, y: 1 })), characters: [{ id: 'depot', kind: 'customer', accepts: ['part'], x: 2, y: 1 }] };
    const { events } = simulate(world, 'pick up\npick up\npick up\nmove\ndrop\ndrop\ndrop');
    const model = createWorld(document.getElementById('world'), { grid: true });
    model.setLevel({ grid: world });
    window.showStep = step => {
      const state = replayBoard(world, events, step);
      model.setBoardState(state);
      model.draw({ x: (state.robot.x - 1.5) * 50, y: -(state.robot.y - 1) * 50, heading: 90 });
      return state.held.part || 0;
    };
    window.robotFixture = { model, createWorld };
    window.loadGame = async id => {
      const { games } = await import('/src/games/index.js');
      const game = games.find(game => game.id === id), world = game.sampleWorld || game.world(() => .5, 1);
      model.setLevel({ grid: world }); model.setBoardState(replayBoard(world));
      model.draw({ x: (world.robot.x - (world.width - 1) / 2) * 50, y: -(world.robot.y - (world.height - 1) / 2) * 50, heading: { N: 0, E: 90, S: 180, W: 270 }[world.robot.dir] });
    };
  });
  let anchoredView;
  for (const [step, count] of [[0, 0], [1, 1], [2, 2], [3, 3], [4, 3], [5, 2], [6, 1], [7, 0], [0, 0]]) {
    assert.equal(await page.evaluate(step => window.showStep(step), step), count);
    await page.screenshot({ path: path.join(artifacts, `pickup-${step}-boxes-${count}.png`) });
    const view = await page.evaluate(() => window.worldView);
    if (anchoredView) assert.deepEqual(view, anchoredView, 'pickup, drop and rewind do not move the camera or scoreboard');
    anchoredView = view;
  }
  await page.evaluate(async () => {
    const { games } = await import('/src/games/index.js');
    const world = games.find(game => game.id === 'tower-rescue').world(() => .999);
    const model = window.robotFixture.model;
    model.setLevel({ grid: world });
    model.setBoardState({ items: [], painted: [], delivered: 0, held: { part: world.items.length } });
    model.draw({ x: (world.robot.x - (world.width - 1) / 2) * 50, y: -(world.robot.y - (world.height - 1) / 2) * 50, heading: 90 });
  });
  await page.screenshot({ path: path.join(artifacts, 'tower-full-load.png') });
  for (const id of ['supply-relay', 'hoop-streak', 'staircase-arena', 'signal-patrol']) {
    await page.evaluate(id => window.loadGame(id), id);
    await page.screenshot({ path: path.join(artifacts, `${id}-scene.png`) });
    await page.setViewportSize({ width: 420, height: 300 });
    await page.screenshot({ path: path.join(artifacts, `${id}-compact.png`) });
    await page.setViewportSize({ width: 700, height: 480 });
  }
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const beforeOrbit = await page.evaluate(() => window.worldView);
  await page.evaluate(() => window.robotFixture.model.rotateCamera(Math.PI / 2));
  await page.screenshot({ path: path.join(artifacts, 'rotated-scene.png') });
  const afterOrbit = await page.evaluate(() => window.worldView);
  assert.deepEqual(afterOrbit.scoreboard, beforeOrbit.scoreboard, 'camera orbit does not move the scoreboard');
  assert.deepEqual(afterOrbit.display, beforeOrbit.display, 'camera orbit does not turn the scoreboard face');
  assert.deepEqual(afterOrbit.projection, beforeOrbit.projection, 'camera orbit does not automatically zoom or shift the projection');
  assert.notDeepEqual(afterOrbit.camera, beforeOrbit.camera, 'explicit camera rotation still works');
  await page.setViewportSize({ width: 420, height: 300 });
  await page.screenshot({ path: path.join(artifacts, 'rotated-compact.png') });
  assert.deepEqual((await page.evaluate(() => window.worldView)).scoreboard, beforeOrbit.scoreboard, 'resizing does not relocate the scoreboard');
  await page.setViewportSize({ width: 700, height: 480 });
  await page.evaluate(() => window.robotFixture.model.topCamera());
  await page.screenshot({ path: path.join(artifacts, 'top-scene.png') });
  assert.ok(await page.evaluate(() => window.scoreboardBounds.every(([x, y]) => Math.abs(x) < 1 && Math.abs(y) < 1)), 'top view keeps the whole scoreboard in frame');
  await page.evaluate(async () => {
    const { simulate } = await import('/src/games/engine.js');
    const { replayBoard } = await import('/src/game-board.js');
    const { replayFrame, replayFrames, hurdleLayout } = await import('/web/tile-replay.js');
    window.showJump = (dir, fraction, fresh = false) => {
      const [dx, dy] = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] }[dir];
      const world = { width: 5, height: 5, robot: { x: 2, y: 2, dir }, hurdles: [[2 + dx, 2 + dy]], finish: { x: 2 + dx, y: 2 + dy } };
      const { events } = simulate(world, 'jump');
      const model = window.robotFixture.model;
      if (fresh) { model.setLevel({ grid: world, events }); model.setBoardState(replayBoard(world, events)); }
      model.draw(replayFrame(world, replayFrames({ world, events }), events, 0, fraction));
      return hurdleLayout(world, { x: 2 + dx, y: 2 + dy }, events);
    };
  });
  for (const direction of ['E', 'W', 'N', 'S']) {
    await page.evaluate(dir => window.showJump(dir, 0, true), direction);
    await page.screenshot({ path: path.join(artifacts, `jump-${direction}-start.png`) });
    const start = await page.evaluate(() => window.robotPose);
    assert.ok(start.every(value => Math.abs(value) === 0));
    const bar = await page.evaluate(dir => window.showJump(dir, .5), direction);
    const middle = await page.evaluate(() => window.robotPose);
    assert.ok(Math.abs(middle[0] - bar.x) < 1e-10 && Math.abs(middle[2] - bar.z) < 1e-10 && middle[1] > .44, 'rendered robot is above the crossing point');
    await page.screenshot({ path: path.join(artifacts, `jump-${direction}-mid.png`) });
    await page.evaluate(dir => window.showJump(dir, 1), direction);
    const end = await page.evaluate(() => window.robotPose);
    assert.equal(end[1], 0); assert.equal(Math.abs(end[0]) + Math.abs(end[2]), 1, 'rendered landing stays exactly one tile away');
    await page.screenshot({ path: path.join(artifacts, `jump-${direction}-land.png`) });
  }
  await page.evaluate(() => {
    const { model, createWorld } = window.robotFixture;
    model.destroy();
    const lesson = createWorld(document.getElementById('world'));
    lesson.draw({ x: 0, y: 0, heading: 90, distance: 100, carrying: true });
    window.robotFixture.model = lesson;
  });
  await page.screenshot({ path: path.join(artifacts, 'lesson-pip.png') });
  await page.evaluate(() => window.robotFixture.model.destroy());
  assert.equal(await page.locator('canvas').count(), 0, 'both renderer types clean up their canvas');
  assert.deepEqual(errors, []);
  console.log(`Pip renderer passed: pickup/drop/rewind, 91-box world, four-direction hurdle jumps, shared lesson model and cleanup. Screenshots: ${artifacts}`);
} finally { await browser?.close(); await server.close(); }
