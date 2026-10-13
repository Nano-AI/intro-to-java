import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPipRobot } from '../web/pip-model.js';
import { simulate } from '../src/games/engine.js';
import { replayBoard } from '../src/game-board.js';

test('each pickup adds a visible box; drops and replay rewind remove the right amount', () => {
  const world = { width: 4, height: 3, robot: { x: 0, y: 1, dir: 'E' }, items: Array.from({ length: 3 }, (_, i) => ({ id: `part-${i}`, kind: 'part', x: 0, y: 1 })), characters: [{ id: 'depot', kind: 'customer', accepts: ['part'], x: 2, y: 1 }] };
  const before = structuredClone(world);
  const { events } = simulate(world, 'pick up\npick up\npick up\nmove\ndrop\ndrop\ndrop');
  const pip = createPipRobot(color => new THREE.MeshStandardMaterial({ color }));
  const cargo = pip.group.getObjectByName('carried-boxes');
  const visible = () => cargo.children.filter(box => box.visible);
  for (const [step, count] of [[0, 0], [1, 1], [2, 2], [3, 3], [4, 3], [5, 2], [6, 1], [7, 0], [3, 3], [1, 1], [0, 0]]) {
    const state = replayBoard(world, events, step);
    const height = pip.setCargo(state.held.part || 0);
    assert.equal(visible().length, count);
    let previousTop = .40;
    for (const box of visible()) {
      const bounds = new THREE.Box3().setFromObject(box);
      assert.ok(bounds.min.y >= previousTop, 'individual boxes stack without intersecting');
      assert.ok(bounds.max.y <= height, 'camera headroom contains the load');
      previousTop = bounds.max.y;
    }
  }
  pip.setCargo(3);
  pip.group.position.set(2, .65, 1);
  pip.group.rotation.y = Math.PI / 2;
  pip.group.updateMatrixWorld(true);
  const position = new THREE.Vector3();
  visible()[0].getWorldPosition(position);
  assert.ok(Math.abs(position.x - 2.15) < 1e-6, 'the cargo turns with Pip');
  assert.ok(position.y > 1, 'the load follows Pip during jumps');
  assert.deepEqual(world, before, 'rendering does not mutate the simulated world');
});

test('large loads retain every box and fit the reported height', () => {
  const pip = createPipRobot(color => new THREE.MeshStandardMaterial({ color }));
  const height = pip.setCargo(91);
  const cargo = pip.group.getObjectByName('carried-boxes');
  assert.equal(cargo.children.filter(box => box.visible).length, 91);
  assert.ok(new THREE.Box3().setFromObject(cargo).max.y <= height);
  assert.ok(height < 8, 'large loads use compact stacks instead of shrinking the board around one tall column');
  const bounds = cargo.children.map(box => new THREE.Box3().setFromObject(box));
  for (const [index, box] of bounds.entries()) {
    for (const other of bounds.slice(index + 1)) assert.ok(!box.intersectsBox(other), 'each box remains distinct');
    assert.ok(Math.hypot(box.max.x, box.max.z) < .435, 'the load stays on Pip');
  }
  pip.setCargo(0);
  assert.equal(cargo.children.filter(box => box.visible).length, 0);
});
