import { DEFAULT_SEEDS, RUN_MODES } from './game-contract.js';

// Indices match project-steps.js and the existing gameId:(10 + index) answer keys.
// Planning, explaining, and deliberately breaking a solution remain self-checked.
const automatic = {
  'supply-relay': [1, 2, 3],
  'staircase-arena': [1, 2, 3, 4],
  'tower-rescue': [0, 1, 2, 3, 4],
  'signal-patrol': [1, 2, 3, 4],
  'mosaic-survey': [0, 1, 2, 3, 4],
};
export const automaticProjectSteps = game => [...(automatic[game.id] || [])];

const pose = (actual, expected) => Boolean(actual && expected && ['x', 'y', 'dir'].every(key => actual[key] === expected[key]));
const paintMatches = (painted, targets) => painted?.length === targets?.length && targets.every(target => painted.some(tile => tile.x === target.x && tile.y === target.y && tile.color === target.color));
const clean = entry => entry.world && entry.end && !entry.end.bumped && !entry.end.limited;
const passedCheck = (result, message) => result.sourceChecks?.some(check => check.passed === true && check.message === message);
const structurePassed = result => result.sourceChecks?.length > 0 && result.sourceChecks.every(check => check.passed === true);
const collected = entry => entry.world.items?.length > 0 && entry.world.items.every(item => entry.events?.some(event => event.kind === 'pick' && event.item.id === item.id));
const delivered = entry => (entry.end.delivered?.depot?.part || 0) === entry.world.items?.length && entry.end.ground?.length === 0 && !(entry.end.held?.part || 0);

function methodPassed(game, result, name) {
  const method = game.requirements?.methods?.find(item => item.name === name);
  if (!method || !passedCheck(result, `Define \`${method.returns} ${name}(${method.parameters.join(', ')})\`.`)) return false;
  // Accept the earlier wording too when replaying an older result.
  if (method.used && !passedCheck(result, `Call \`${name}\` from another method instead of only defining it.`) && !passedCheck(result, `Call \`${name}\` from \`main\` instead of only defining it.`)) return false;
  // Match authored probe labels, never Java source text or a method declaration alone.
  const probes = game.methodCases?.filter(probe => probe.label.startsWith(`${name}(`)) || [];
  return probes.length > 0 && probes.every(probe => result.sourceChecks.some(check => check.passed === true && (check.message === probe.label || check.message.startsWith(`${probe.label}: `))));
}

function onePaintedRow(entry) {
  const { world, events } = entry, robot = { ...world.robot }, painted = new Map();
  const row = world.targets?.filter(tile => tile.y === world.robot.y);
  if (!row?.length) return false;
  for (const event of events || []) {
    if (event.kind === 'move' || event.kind === 'jump') Object.assign(robot, event.to);
    if (event.kind === 'turn') robot.dir = event.to;
    if (event.kind === 'paint') painted.set(`${event.at.x},${event.at.y}`, { ...event.at, color: event.color });
    if (pose(robot, { x: world.robot.x, y: world.robot.y - 1, dir: 'E' }) && paintMatches([...painted.values()], row)) return true;
  }
  return false;
}

// Monotonic evidence: a failed later attempt does not remove an earlier check.
// Trials prove visible actions only. Changed-data reports and helper behavior need
// graded worlds / independent probes; a plausible sample output is insufficient.
export function verifiedProjectSteps(game, result) {
  if (!automatic[game.id] || !result || ['setup', 'compile', 'runtime', 'simulate'].includes(result.stage)) return [];
  const worlds = (result.worlds || []).filter(clean), verified = new Set();
  const graded = result.mode === RUN_MODES.graded && !result.stage && (result.worlds?.length || 0) >= DEFAULT_SEEDS && structurePassed(result);
  const fullPass = graded && result.worlds.every(entry => clean(entry) && entry.passed === true);
  const check = (index, proven) => { if (proven) verified.add(index); };
  switch (game.id) {
    case 'supply-relay': {
      check(1, worlds.some(collected));
      check(2, worlds.some(entry => delivered(entry) && pose(entry.end.robot, entry.world.finish)));
      const settings = new Set(worlds.map(entry => `${entry.world.data.gap}:${entry.world.data.energy}:${entry.world.data.costPerTile}`));
      check(3, graded && worlds.length === result.worlds.length && settings.size >= 2 && worlds.every(entry => entry.end.said.includes(`Delivered 1 part; energy ${entry.world.data.remaining}`)));
      break;
    }
    case 'staircase-arena': {
      const varied = graded && worlds.length === result.worlds.length && new Set(worlds.map(entry => entry.world.constants.SIZE)).size >= 2;
      check(1, worlds.some(onePaintedRow));
      check(2, varied && worlds.every(entry => paintMatches(entry.end.painted, entry.world.targets) && entry.end.said.includes(`Painted ${entry.world.data.total} tiles`)));
      check(3, varied && worlds.every(entry => paintMatches(entry.end.painted, entry.world.targets) && pose(entry.end.robot, entry.world.finish)));
      check(4, fullPass);
      break;
    }
    case 'tower-rescue': {
      const turn = methodPassed(game, result, 'turnAround'), collect = methodPassed(game, result, 'collectTower'), count = methodPassed(game, result, 'supplyCount');
      check(0, turn); check(1, collect); check(2, count);
      check(3, collect && count && methodPassed(game, result, 'deliver') && passedCheck(result, 'Use a for loop in main.') && worlds.some(delivered));
      check(4, fullPass && turn && collect && count && methodPassed(game, result, 'deliver'));
      break;
    }
    case 'signal-patrol': {
      const tile = methodPassed(game, result, 'handleTile');
      check(1, tile);
      check(2, fullPass && tile && passedCheck(result, 'Use a while loop in main.'));
      check(3, worlds.some(entry => delivered(entry) && pose(entry.end.robot, entry.world.finish) &&
        entry.events?.some(event => ['move', 'jump'].includes(event.kind) && event.to.x === entry.world.robot.x + entry.world.data.length && event.to.y === entry.world.robot.y) &&
        entry.events?.some(event => event.kind === 'move' && event.to.y === entry.world.robot.y + 1)));
      check(4, fullPass && tile);
      break;
    }
    case 'mosaic-survey': {
      const row = methodPassed(game, result, 'paintRow');
      check(0, fullPass && row); // Stored cells cannot be inferred from one painted sample.
      check(1, row);
      check(2, row && worlds.some(entry => paintMatches(entry.end.painted, entry.world.targets) && pose(entry.end.robot, entry.world.finish)));
      check(3, fullPass && row);
      check(4, fullPass && row);
      break;
    }
  }
  return [...verified].sort((a, b) => a - b);
}
