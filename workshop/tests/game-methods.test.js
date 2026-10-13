import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { findJdk, runGame } from '../host/runner.js';

const resourceRoot = fileURLToPath(new URL('../', import.meta.url));
const jdk = await findJdk([`${resourceRoot}/runtime/jdk`]);
const world = { width: 3, height: 2, robot: { x: 0, y: 0, dir: 'E' } };
const game = { id: 'helper-probe', project: true, commands: ['turn'], world: () => world, goal: () => ({ passed: true }), methodCases: [
  { label: 'count(4) returns 8', invocation: 'System.out.println(Student.count(4));', expected: '8' },
  { label: 'turnAround reverses direction', invocation: 'Student.turnAround();', world, goal: end => ({ passed: end.robot.dir === 'W', message: 'Finish facing west.' }) },
] };
const source = (count, turn) => `public class Student { public static void main(String[] args) {} public static int count(int n) { return ${count}; } public static void turnAround() { ${turn} } }`;

test('method probes reject unused behavior even when the main-world goal passes', async () => {
  const result = await runGame({ game, source: source('8', ''), jdk, resourceRoot, seeds: [1] });
  assert.equal(result.earnedStars, 0);
  assert.equal(result.stage, 'checks');
  assert.ok(result.sourceChecks.some(check => !check.passed && /turnAround/.test(check.message)));
});

test('method probes accept correct return and robot helper behavior', async () => {
  const result = await runGame({ game, source: source('n * 2', 'System.out.println("turn left"); System.out.println("turn left");'), jdk, resourceRoot, seeds: [1] });
  assert.equal(result.stage, null, result.error);
  assert.equal(result.earnedStars, 1);
  assert.equal(result.sourceChecks.length, 2);
});
