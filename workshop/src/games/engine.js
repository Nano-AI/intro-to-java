// The game simulator and grading core.
//
// Pure, deterministic, side-effect-free: the same world and the same stdout
// always produce the same events, the same `end`, and the same stars. Nothing
// here touches the filesystem, a process, or the clock. Java execution lives in
// extension/runner.js; this file only reads the text it produced.
//
// Every shape crossing a boundary comes from shared/game-contract.js. Nothing
// is redefined locally, including mulberry32, which is re-exported so content
// authors receive the seeded generator "from the engine".

import {
  BLOCKING_CHARACTER_KINDS, COLORS, LIMITS, ROBOT_REPLIES, VERBS,
  emptyEnd, mulberry32,
} from '../../shared/game-contract.js';

export { mulberry32 };

// The generator handed to `world(rng, level)`. Harness seeds are the small
// integers 1..N; this mixes the seed and the level into the state so level 1 and
// level 2 of one seed do not draw the same stream. Same seed and level, same
// world, always.
//
// This does NOT give a game world variety, and nothing here can. mulberry32's
// draws are already well spread for adjacent small seeds (seeds 1..6 produce
// 0.63, 0.73, 0.72, 0.92, 0.69, 0.53). How many distinct worlds exist is decided
// entirely by the range the generator maps those draws onto.
export const worldRng = (seed, level) => mulberry32((Math.imul(seed >>> 0, 0x9e3779b1) + Math.imul(level, 0x85ebca6b)) >>> 0);

// AUTHORING NOTE — world variety, and what actually stops a memorised answer.
//
// Variety is the generator's job. A graded tier runs three worlds, so if
// `world()` maps its draws onto a narrow range those three repeat:
// `3 + Math.floor(rng() * 4)` has four possible values, and a three-seed graded
// run then draws only two distinct worlds. Make the parameter space wide enough
// that repeats are rare; `extension/games.test.js` measures this and fails a
// range that is too narrow.
//
// But world variety is NOT the defence against a memorised answer, and must not
// be treated as one. The design spec is explicit: "Random worlds reduce
// memorized-answer success but cannot prove concept use." A wider range only
// makes a fixed answer lose more often; it never proves the student wrote the
// construct. The real defences, in order:
//
//   1. `requirements` — source checks over the parsed AST. A `for` loop, a
//      genuinely nested loop, a helper that is actually called, a constant of
//      the declared type. This is evidence about the program itself.
//   2. `rejects` — authored wrong solutions the harness runs and requires to
//      score zero: fixed outputs, empty or dead constructs, off-by-one goals,
//      wrong recipients.
//
// Every construct-focused game needs both. A game whose only defence is a random
// world is not graded, it is gambling.

const STEP = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const LEFT = { N: 'W', W: 'S', S: 'E', E: 'N' };
const RIGHT = { N: 'E', E: 'S', S: 'W', W: 'N' };
const SHOOT_RANGE = 5;
const key = (x, y) => `${x},${y}`;

// Shop vocabulary is registered, never guessed by adding or removing a final
// "s" (design spec section 2, "Speech to characters"). A shop may extend or
// override this with its own `aliases` map.
export const ITEM_ALIASES = {
  ball: ['ball', 'balls'],
  crate: ['crate', 'crates'],
  coin: ['coin', 'coins'],
  part: ['part', 'parts'],
  box: ['box', 'boxes'],
};

// ---------------------------------------------------------------- parsing

// Each nonempty trimmed stdout line is one action. LF or CRLF, a final
// unterminated line counts, blank lines are ignored.
export const parseLines = stdout =>
  String(stdout ?? '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);

// One insertion, deletion, or substitution apart. Identical words are not typos.
const oneEdit = (a, b) => {
  if (a === b) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.length - short.length > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (short.length === long.length) i++;
    j++;
  }
  return true;
};

const SYNTAX_HINTS = {
  move: 'Write `move` on its own, or `move 3` with a whole number of tiles.',
  turn: 'Write `turn left` or `turn right`.',
  jump: 'Write `jump` on its own.',
  shoot: 'Write `shoot` on its own.',
  pick: 'Write `pick up`.',
  drop: 'Write `drop` on its own.',
  paint: `Write \`paint\` with one of ${COLORS.join(', ')}.`,
};

// Returns a command, or a speech fallback carrying the hint that explains why,
// or null when the line was never a command at all. Case is ignored and
// internal whitespace collapses for parsing only.
export const parseCommand = (line, commands = VERBS) => {
  const parts = line.replace(/\s+/g, ' ').toLowerCase().split(' ');
  const verb = parts[0];
  if (!VERBS.includes(verb)) return null;
  if (!commands.includes(verb)) return { speech: true, hint: `\`${verb}\` is not used in this game.` };
  const args = parts.slice(1);
  const bad = { speech: true, hint: SYNTAX_HINTS[verb] };
  switch (verb) {
    case 'move': {
      if (args.length > 1) return bad;
      if (!args.length) return { verb, tiles: 1 };
      if (!/^\d+$/.test(args[0])) return bad;
      const tiles = Number(args[0]);
      return Number.isSafeInteger(tiles) && tiles >= 1 ? { verb, tiles } : bad;
    }
    case 'turn':
      return args.length === 1 && ['left', 'right'].includes(args[0]) ? { verb, side: args[0] } : bad;
    case 'pick':
      return args.length === 1 && args[0] === 'up' ? { verb } : bad;
    case 'paint':
      return args.length === 1 && COLORS.includes(args[0]) ? { verb, color: args[0] } : bad;
    default:
      return args.length ? bad : { verb };
  }
};

const typoHint = (line, commands) => {
  const first = line.split(/\s+/)[0].toLowerCase();
  const match = commands.find(verb => oneEdit(first, verb));
  return match ? `Did you mean \`${match}\`?` : undefined;
};

// ---------------------------------------------------------------- simulator

export function simulate(source, stdout, { commands = VERBS } = {}) {
  if (!source || typeof source !== 'object' || !source.robot) throw new Error('simulate needs a world with a robot.');
  const world = structuredClone(source);
  const { width, height } = world;
  const walls = new Set((world.walls || []).map(([x, y]) => key(x, y)));
  const hurdles = new Set((world.hurdles || []).map(([x, y]) => key(x, y)));
  const characters = (world.characters || []).map((character, index) => ({ ...character, id: character.id ?? `character-${index}` }));
  const items = (world.items || []).map((item, index) => ({ id: item.id ?? `item-${index}`, kind: item.kind, x: item.x, y: item.y }));
  const hoops = world.hoops || [];
  const robot = { ...world.robot };

  const held = {}, acquired = [], painted = [], said = [], delivered = {}, stock = {}, gates = {};
  for (const character of characters) {
    if (character.stock) stock[character.id] = { ...character.stock };
    if (character.kind === 'gate') gates[character.id] = character.open === true;
  }

  const events = [];
  let seq = 0, actions = 0, index = -1, scored = 0, grants = 0;
  let stopped = false, bumped = false, limited = false;
  const emit = (kind, extra = {}) => { events.push({ seq: ++seq, action: index, kind, ...extra }); };
  const robotSays = text => emit('reply', { speaker: 'robot', text });

  const characterAt = (x, y) => characters.find(character => character.x === x && character.y === y);
  const outside = (x, y) => x < 0 || y < 0 || x >= width || y >= height;
  // Walls and closed gates block movement and shots; other characters block
  // movement only; hurdles block `move` but not `jump`.
  const solid = (x, y) => {
    if (outside(x, y)) return 'edge';
    if (walls.has(key(x, y))) return 'wall';
    const character = characterAt(x, y);
    if (character?.kind === 'gate') return gates[character.id] ? null : 'gate';
    if (character && BLOCKING_CHARACTER_KINDS.includes(character.kind)) return 'character';
    return null;
  };
  const ahead = (distance = 1) => {
    const [dx, dy] = STEP[robot.dir];
    return { x: robot.x + dx * distance, y: robot.y + dy * distance };
  };
  const bump = (into, reason) => {
    emit('bump', { at: { x: robot.x, y: robot.y }, into, reason });
    robotSays(ROBOT_REPLIES.bump);
    bumped = true; stopped = true;
  };

  // `move N` is one action but emits one movement event per attempted tile and
  // stops at the first bump, so a huge N cannot run away on a finite board.
  const doMove = tiles => {
    for (let step = 0; step < tiles; step++) {
      const to = ahead();
      const reason = solid(to.x, to.y) || (hurdles.has(key(to.x, to.y)) ? 'hurdle' : null);
      if (reason) return bump(to, reason);
      const from = { x: robot.x, y: robot.y };
      robot.x = to.x; robot.y = to.y;
      emit('move', { from, to: { ...to } });
    }
  };

  const doJump = () => {
    const to = ahead();
    const reason = solid(to.x, to.y);
    if (reason) return bump(to, reason);
    const from = { x: robot.x, y: robot.y };
    robot.x = to.x; robot.y = to.y;
    emit('jump', { from, to: { ...to } });
  };

  const takeNewest = kind => {
    for (let i = acquired.length - 1; i >= 0; i--) {
      if (!kind || acquired[i].kind === kind) return acquired.splice(i, 1)[0];
    }
    return null;
  };

  const doShoot = () => {
    if ((held.ball || 0) < 1) return robotSays(ROBOT_REPLIES.noBall);
    takeNewest('ball');
    held.ball -= 1;
    let hoop = null;
    for (let distance = 1; distance <= SHOOT_RANGE; distance++) {
      const { x, y } = ahead(distance);
      if (outside(x, y) || walls.has(key(x, y))) break;
      const character = characterAt(x, y);
      if (character?.kind === 'gate' && !gates[character.id]) break;
      const found = hoops.find(entry => entry.x === x && entry.y === y);
      if (found) { hoop = found; break; }
    }
    if (hoop) scored += 1;
    emit('shoot', { from: { x: robot.x, y: robot.y }, hit: Boolean(hoop), hoop: hoop ? { x: hoop.x, y: hoop.y } : null, held: { ...held } });
  };

  const doPick = () => {
    const at = items.findIndex(item => item.x === robot.x && item.y === robot.y);
    if (at < 0) return robotSays('Nothing to pick up here.');
    const [item] = items.splice(at, 1);
    held[item.kind] = (held[item.kind] || 0) + 1;
    acquired.push({ id: item.id, kind: item.kind });
    emit('pick', { item: { id: item.id, kind: item.kind }, at: { x: robot.x, y: robot.y }, held: { ...held } });
  };

  const doDrop = () => {
    if (!acquired.length) return robotSays('Nothing to drop.');
    const to = ahead();
    if (outside(to.x, to.y) || walls.has(key(to.x, to.y)) || hurdles.has(key(to.x, to.y))) return robotSays('There is no room to drop that.');
    const item = acquired[acquired.length - 1];
    const character = characterAt(to.x, to.y);
    if (character && !(character.kind === 'customer' && (character.accepts || []).includes(item.kind))) {
      return robotSays('That is not wanted here.');
    }
    acquired.pop();
    held[item.kind] = Math.max(0, (held[item.kind] || 0) - 1);
    if (character) {
      delivered[character.id] = { ...delivered[character.id] };
      delivered[character.id][item.kind] = (delivered[character.id][item.kind] || 0) + 1;
      emit('drop', { item, at: { ...to }, character: character.id, held: { ...held } });
      if (character.reply) emit('reply', { speaker: character.id, text: character.reply });
    } else {
      items.push({ ...item, x: to.x, y: to.y });
      emit('drop', { item, at: { ...to }, character: null, held: { ...held } });
    }
  };

  const doPaint = color => {
    const tile = painted.find(entry => entry.x === robot.x && entry.y === robot.y);
    if (tile) tile.color = color; else painted.push({ x: robot.x, y: robot.y, color });
    emit('paint', { at: { x: robot.x, y: robot.y }, color, painted: painted.length });
  };

  const shopOrder = (shop, text) => {
    const supply = stock[shop.id] || {};
    const aliases = { ...ITEM_ALIASES, ...shop.aliases };
    const tokens = text.split(/\s+/).map(token => token.replace(/^[^\w+-]+|[^\w]+$/g, '').toLowerCase()).filter(Boolean);
    const kinds = Object.keys(supply).filter(kind => (aliases[kind] || [kind]).some(alias => tokens.includes(alias)));
    const reply = message => emit('reply', { speaker: shop.id, text: message });
    if (kinds.length !== 1) return reply(`I stock ${Object.keys(supply).join(', ') || 'nothing today'}. What do you need?`);
    const kind = kinds[0];
    const asked = Number(tokens.find(token => /^[+-]?\d+$/.test(token)));
    if (!Number.isSafeInteger(asked) || asked <= 0) return reply(`How many do you need? Try \`3 ${(aliases[kind] || [kind])[1] || kind} please\`.`);
    const available = supply[kind] || 0;
    if (available <= 0) return reply('Sold out.');
    const given = Math.min(asked, available);
    supply[kind] = available - given;
    for (let i = 0; i < given; i++) acquired.push({ id: `${shop.id}-${kind}-${++grants}`, kind });
    held[kind] = (held[kind] || 0) + given;
    emit('give', { character: shop.id, item: kind, count: given, stock: supply[kind], held: { ...held } });
    reply(given < asked
      ? `Only ${given} left.`
      : `Here ${given === 1 ? 'is' : 'are'} ${given} ${(aliases[kind] || [kind])[given === 1 ? 0 : 1] || kind}.`);
  };

  // Only the character on the tile directly ahead reacts, and only to speech.
  const react = (character, text) => {
    if (character.kind === 'shop') return shopOrder(character, text);
    if (typeof character.expectedPhrase !== 'string' || text !== character.expectedPhrase) return;
    if (character.kind === 'gate') gates[character.id] = true;
    emit('reply', { speaker: character.id, text: character.reply || 'Thank you!' });
  };

  const doSay = (text, hint) => {
    said.push(text);
    emit('say', { speaker: 'robot', text, ...(hint ? { hint } : {}) });
    const to = ahead();
    const character = characterAt(to.x, to.y);
    if (character) react(character, text);
  };

  for (const line of parseLines(stdout)) {
    if (stopped) break;
    // Exactly LIMITS.actions are allowed: the next one is rejected before it
    // can change anything.
    if (actions >= LIMITS.actions) {
      index = actions;
      emit('limit');
      robotSays(ROBOT_REPLIES.limit);
      limited = true;
      break;
    }
    index = actions;
    actions += 1;
    const command = parseCommand(line, commands);
    if (!command || command.speech) { doSay(line, command?.hint ?? typoHint(line, commands)); continue; }
    switch (command.verb) {
      case 'move': doMove(command.tiles); break;
      case 'turn': {
        const from = robot.dir;
        robot.dir = command.side === 'left' ? LEFT[from] : RIGHT[from];
        emit('turn', { from, to: robot.dir });
        break;
      }
      case 'jump': doJump(); break;
      case 'shoot': doShoot(); break;
      case 'pick': doPick(); break;
      case 'drop': doDrop(); break;
      case 'paint': doPaint(command.color); break;
    }
  }

  return {
    events,
    end: {
      ...emptyEnd(),
      robot: { x: robot.x, y: robot.y, dir: robot.dir },
      held: { ...held },
      acquired: acquired.map(item => ({ ...item })),
      ground: items.map(item => ({ ...item })),
      scored,
      painted: painted.map(tile => ({ ...tile })),
      said: [...said],
      delivered,
      stock,
      gates,
      actions,
      bumped,
      limited,
    },
  };
}

// ---------------------------------------------------------------- grading

// Star tiers are cumulative and ordered: no star two without star one, and no
// star three without every level-2 world finishing within par. A level-2
// failure still earns the star already won at level 1.
export function gradeWorlds(worlds, { project = false } = {}) {
  const level1 = worlds.filter(world => world.level === 1);
  const level2 = worlds.filter(world => world.level === 2);
  const one = level1.length > 0 && level1.every(world => world.passed);
  if (project) return { stars: one ? 1 : 0, best: null };
  const two = one && level2.length > 0 && level2.every(world => world.passed);
  const three = two && level2.every(world => Number.isInteger(world.world?.par) && world.end.actions <= world.world.par);
  return {
    stars: three ? 3 : two ? 2 : one ? 1 : 0,
    best: three ? level2.reduce((sum, world) => sum + world.end.actions, 0) : null,
  };
}
