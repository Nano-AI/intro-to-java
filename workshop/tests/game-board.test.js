import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/games/engine.js';
import { replayBoard } from '../src/game-board.js';

test('the tile replay follows movement, collection, delivery and paint without changing the world', () => {
  const world = { width: 5, height: 3, robot: { x: 0, y: 1, dir: 'E' }, items: [{ kind: 'part', x: 1, y: 1 }], characters: [{ id: 'depot', kind: 'customer', accepts: ['part'], x: 2, y: 1 }] };
  const { events, end } = simulate(world, 'move\npick up\npaint blue\ndrop\nturn left');
  assert.equal(replayBoard(world, events, 0).items.length, 1);
  assert.equal(replayBoard(world, events, 1).items.length, 1);
  assert.equal(replayBoard(world, events, 2).items.length, 0);
  const last = replayBoard(world, events, events.length);
  assert.deepEqual(last.robot, end.robot);
  assert.deepEqual(last.painted, end.painted);
  assert.deepEqual(last.held, end.held);
  assert.equal(last.delivered, 1);
  assert.equal(world.items.length, 1);
  assert.equal(world.robot.x, 0);
});

test('a dropped object reappears on the tile ahead and repaint replaces the color', () => {
  const world = { width: 3, height: 2, robot: { x: 0, y: 0, dir: 'E' }, items: [{ kind: 'part', x: 0, y: 0 }] };
  const { events } = simulate(world, 'pick up\ndrop\npaint red\npaint blue');
  const last = replayBoard(world, events, events.length);
  assert.deepEqual(last.items.map(({ kind, x, y }) => ({ kind, x, y })), [{ kind: 'part', x: 1, y: 0 }]);
  assert.deepEqual(last.painted, [{ x: 0, y: 0, color: 'blue' }]);
});
