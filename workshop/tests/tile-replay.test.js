import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/games/engine.js';
import { hurdleLayout, replayEventSeconds, replayFrame, replayFrames, replaySpeech } from '../web/tile-replay.js';

test('one-tile jumps cross a perpendicular hurdle and land at the actual destination in all directions', () => {
  for (const [dir, dx, dy] of [['E', 1, 0], ['W', -1, 0], ['N', 0, -1], ['S', 0, 1]]) {
    const world = { width: 7, height: 7, robot: { x: 3, y: 3, dir }, hurdles: [[3 + dx, 3 + dy]] };
    const { events, end } = simulate(world, 'jump\nmove 1');
    const frames = replayFrames({ world, events });
    const bar = hurdleLayout(world, { x: 3 + dx, y: 3 + dy }, events);
    const start = replayFrame(world, frames, events, 0, 0);
    const middle = replayFrame(world, frames, events, 0, .5);
    const finish = replayFrame(world, frames, events, 0, 1);
    assert.deepEqual(events[0].to, { x: 3 + dx, y: 3 + dy }, `${dir}: engine still jumps one tile`);
    assert.equal(start.x, 0); assert.equal(Math.abs(start.y), 0); assert.equal(start.lift, 0);
    assert.ok(Math.abs(middle.x / 50 - bar.x) < 1e-10); assert.ok(Math.abs(-middle.y / 50 - bar.z) < 1e-10);
    assert.ok(middle.lift > .44, `${dir}: robot clears the whole hurdle`);
    for (let hundredth = 1; hundredth < 100; hundredth++) {
      const pose = replayFrame(world, frames, events, 0, hundredth / 100);
      const distanceToBar = Math.abs((pose.x / 50 - bar.x) * dx + (-pose.y / 50 - bar.z) * dy);
      if (distanceToBar < .485) assert.ok(pose.lift + .075 > .44, `${dir}: wheels stay above the bar while crossing`);
    }
    // The bar's local X axis is perpendicular to travel in world X/Z.
    assert.ok(Math.abs(Math.cos(bar.rotation) * dx - Math.sin(bar.rotation) * dy) < 1e-10);
    assert.ok(Math.abs(finish.x - dx * 50) < 1e-10); assert.ok(Math.abs(finish.y + dy * 50) < 1e-10); assert.equal(finish.lift, 0);
    assert.equal(replayFrame(world, frames, events, 1, .5).lift, 0, 'walking does not retain jump height');
    assert.deepEqual(end.robot, { x: 3 + 2 * dx, y: 3 + 2 * dy, dir });
  }
});

test('actual jump approach overrides initial heading, while an unrun preview uses that heading', () => {
  const world = { width: 7, height: 7, robot: { x: 3, y: 3, dir: 'N' }, hurdles: [[4, 3]] };
  const { events } = simulate(world, 'turn right\njump');
  assert.deepEqual(hurdleLayout(world, { x: 4, y: 3 }, events), { x: .5, z: 0, rotation: -Math.PI / 2 });
  const preview = hurdleLayout(world, { x: 4, y: 3 });
  assert.equal(preview.x, 1); assert.equal(preview.z, .5);
  assert.ok(replayEventSeconds(events[1]) > replayEventSeconds(events[0]), 'jumps have enough time to show takeoff and landing');
});

test('speech follows replay progress and reset without revealing future replies', () => {
  const events = [{ kind: 'move' }, { kind: 'say', text: 'Hello' }, { kind: 'reply', text: 'Hi' }, { kind: 'turn' }];
  assert.deepEqual(replaySpeech(events, 0), []);
  assert.deepEqual(replaySpeech(events, 1), []);
  assert.deepEqual(replaySpeech(events, 2).map(event => event.text), ['Hello']);
  assert.deepEqual(replaySpeech(events, events.length).map(event => event.text), ['Hello', 'Hi']);
  assert.deepEqual(replaySpeech(events, 0), []);
});
