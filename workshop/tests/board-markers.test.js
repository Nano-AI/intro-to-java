import test from 'node:test';
import assert from 'node:assert/strict';
import { boardScore, depotApproaches, replayBoard } from '../src/game-board.js';
import { simulate } from '../src/games/engine.js';
import { games } from '../src/games/index.js';

test('every marked delivery tile can deliver when facing its depot', () => {
  for (const game of games) {
    const world = game.sampleWorld || game.world(() => .5, 1);
    for (const depot of (world.characters || []).filter(character => character.kind === 'customer')) {
      const approaches = depotApproaches(world, depot);
      assert.ok(approaches.length, `${game.id} has an accessible depot`);
      for (const tile of approaches) {
        const dir = tile.dx === 1 ? 'E' : tile.dx === -1 ? 'W' : tile.dy === 1 ? 'S' : 'N';
        const fixture = { ...world, robot: { x: tile.x, y: tile.y, dir }, items: [{ id: 'test-part', kind: depot.accepts[0], x: tile.x, y: tile.y }] };
        const result = simulate(fixture, 'pick up\ndrop');
        assert.equal(replayBoard(fixture, result.events, result.events.length).delivered, 1, `${game.id}: (${tile.x}, ${tile.y}) faces the receiving tile`);
      }
    }
  }
});

test('delivery markers exclude blocked and off-board tiles', () => {
  const depot = { x: 0, y: 1, kind: 'customer' };
  assert.deepEqual(depotApproaches({ width: 3, height: 3, characters: [depot], walls: [[0, 0]], hurdles: [[1, 1]] }, depot), [{ x: 0, y: 2, dx: -0, dy: -1 }]);
});

test('scoreboard counts follow actual replay, including reset and zero targets', () => {
  const world = { width: 3, height: 3, robot: { x: 1, y: 1, dir: 'N' }, items: [{ id: 'ball', kind: 'ball', x: 1, y: 1 }], hoops: [{ x: 1, y: 0 }], data: { baskets: 2 } };
  const { events } = simulate(world, 'pick up\nshoot');
  assert.deepEqual(boardScore(world, replayBoard(world, events, events.length)), { label: 'Baskets', value: 1, target: 2 });
  assert.equal(boardScore(world, replayBoard(world, events, 0)).value, 0);
  assert.deepEqual(boardScore({ characters: [{ kind: 'customer', accepts: ['part'] }], items: [] }, { delivered: 0 }), { label: 'Delivered', value: 0, target: 0 });
  assert.deepEqual(boardScore({ targets: [{ x: 0, y: 0 }] }, { painted: [{ x: 0, y: 0 }] }), { label: 'Painted', value: 1, target: 1 });
  assert.equal(boardScore({}, {}), null);
});
