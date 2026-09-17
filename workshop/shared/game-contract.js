// Frozen contract for Pip 0.7.0 game practice.
//
// Every shape that crosses a worktree boundary lives here: engine <-> host,
// host <-> webview, content <-> engine, engine <-> structure. No owner keeps a
// private copy of any of it (design spec section 5, "Contract changes").
//
// Node-pure on purpose: no imports, no React, no vscode, no fs. Content tests,
// the simulator, the host, and the webview all import this same file.

// ---------------------------------------------------------------- versions

export const PROGRESS_VERSION = 6;
export const COURSE_ID = 'cse121-2026';

// ---------------------------------------------------------------- catalogue

// The eleven Java subtopics that carry games. Git has none.
export const SUBTOPICS = ['1.1', '1.2', '1.3', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2'];
export const UNIT_IDS = ['basics', 'loops', 'methods', 'decisions', 'arrays'];
export const GIT_UNIT_ID = 'git';

export const GAMES_PER_SUBTOPIC = 5;
export const PROJECT_IDS = ['talent-show', 'free-draw'];
export const PROJECT_UNITS = { 'talent-show': 'basics', 'free-draw': 'loops' };

// 11 subtopics x 5 games = 55 regular games, plus 2 projects.
export const REGULAR_GAME_COUNT = SUBTOPICS.length * GAMES_PER_SUBTOPIC;
export const CATALOG_ENTRY_COUNT = REGULAR_GAME_COUNT + PROJECT_IDS.length; // 57
export const MAX_STARS = REGULAR_GAME_COUNT * 3 + PROJECT_IDS.length;       // 167

export const subtopicUnit = subtopic => UNIT_IDS[Number(subtopic.split('.')[0]) - 1];

// ---------------------------------------------------------------- unlocks

export const SKIN_THRESHOLDS = [10, 30, 60, 100, 150];
export const ARENA_THRESHOLDS = { garden: 20, moon: 60 };
export const starsNeeded = (threshold, totalStars) => Math.max(0, threshold - totalStars);

// ---------------------------------------------------------------- limits

export const LIMITS = {
  actions: 1000,        // exactly 1000 allowed; reject the 1001st before applying
  boardSide: 32,        // worlds are at most 32 x 32 tiles
  par: 1000,
  inputBytes: 65536,
  sourceChars: 40000,   // matches shared/progress.js drafts cap
  processMs: 12000,
  outputBytes: 65536,
  heapMb: 64,
  speechMs: 2000,       // chat bubble lifetime in replay time
  parSlack: 2,          // reference actions + slack = authored par ceiling
};

// ---------------------------------------------------------------- vocabulary

export const VERBS = ['move', 'turn', 'jump', 'shoot', 'pick', 'drop', 'paint'];
export const COLORS = ['red', 'blue', 'green', 'yellow', 'white'];
export const DIRECTIONS = ['N', 'E', 'S', 'W'];
export const CHARACTER_KINDS = ['shop', 'greeter', 'gate', 'customer'];
export const BLOCKING_CHARACTER_KINDS = ['shop', 'greeter', 'customer']; // a gate blocks only while closed

export const EVENT_KINDS = [
  'move', 'turn', 'jump', 'bump', 'shoot', 'pick', 'drop', 'paint',
  'say', 'reply', 'give', 'limit',
];

export const BUMP_REASONS = ['wall', 'edge', 'character', 'hurdle', 'gate'];
export const RUN_STAGES = ['compile', 'checks', 'runtime', 'simulate'];

// Robot speech the simulator emits itself. These are transcript lines, never
// student actions, and never satisfy a goal that checks `end.said`.
export const ROBOT_REPLIES = {
  bump: 'Ouch, wall ahead',
  noBall: 'No ball!',
  limit: 'Too many actions. Check for an infinite loop.',
};

// ---------------------------------------------------------------- file paths

// Games live beside lessons under the Java source root so the package resolves.
// Lessons: src/pip/lessons/<id_>/Student.java   Games: src/pip/games/<id_>/Student.java
export const javaDirName = id => id.replaceAll('-', '_');
export const gamePackage = id => `pip.games.${javaDirName(id)}`;
export const gameSourcePath = id => `src/pip/games/${javaDirName(id)}/Student.java`;
export const GAME_PATH_SEGMENT = '/pip/games/';

// ---------------------------------------------------------------- randomness

// Seeded mulberry32. Accepts any unsigned 32-bit seed, including 0. Shared so
// that a content author's local run and the host's run agree bit for bit.
// src/games/engine.js re-exports this; nobody reimplements it.
export const mulberry32 = seed => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// The harness always uses explicit reproducible seeds 1..N per level.
export const seedsFor = count => Array.from({ length: count }, (_, i) => i + 1);
export const DEFAULT_SEEDS = 3;

// ---------------------------------------------------------------- host wiring

export const GAME_REQUESTS = {
  open: 'game.open',
  run: 'game.run',
  focus: 'game.focus',
  restore: 'game.restore',
  stop: 'run.stop', // shared with lessons; the existing stop mechanism is reused
};

// `game.run` distinguishes the two modes explicitly rather than by the presence
// of an `input` key, so a graded run can never be mistaken for an experiment.
export const RUN_MODES = { graded: 'graded', custom: 'custom' };

export const gameRoute = id => `/game/${id}`;
export const unitRoute = id => `/unit/${id}`;
export const subtopicAnchor = subtopic => `subtopic-${subtopic.replaceAll('.', '-')}`;

// ---------------------------------------------------------------- progress

export const emptyGameRecord = () => ({ stars: 0, best: null, updatedAt: null });

const isStars = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
const isBest = value => value === null || (Number.isInteger(value) && value >= 0);
const isStamp = value => value === null || (typeof value === 'string' && !Number.isNaN(Date.parse(value)));

export const maxStarsFor = gameId => (PROJECT_IDS.includes(gameId) ? 1 : 3);

export const isGameRecord = (record, gameId) =>
  Boolean(record) && typeof record === 'object' && !Array.isArray(record) &&
  isStars(record.stars, maxStarsFor(gameId)) && isBest(record.best) && isStamp(record.updatedAt);

// Merge is monotonic in every field, so neither a stale host patch nor an old
// backup import can take a star away. Used by the host on every graded run and
// by backup import; structure owns the surrounding normalization.
export const mergeGameRecord = (saved, incoming, gameId) => {
  const a = isGameRecord(saved, gameId) ? saved : emptyGameRecord();
  const b = isGameRecord(incoming, gameId) ? incoming : emptyGameRecord();
  const best = a.best === null ? b.best : b.best === null ? a.best : Math.min(a.best, b.best);
  const stamps = [a.updatedAt, b.updatedAt].filter(Boolean).sort();
  return {
    stars: Math.max(a.stars, b.stars),
    best: PROJECT_IDS.includes(gameId) ? null : best,
    updatedAt: stamps.length ? stamps[stamps.length - 1] : null,
  };
};

// Only registered ids count toward unlocks; unknown ids may survive in a backup
// but must never inflate the total (design spec section 2, progress schema).
export const totalStars = (games = {}, registeredIds) => {
  const known = registeredIds instanceof Set ? registeredIds : new Set(registeredIds || []);
  let sum = 0;
  for (const [id, record] of Object.entries(games)) {
    if (known.has(id) && isGameRecord(record, id)) sum += record.stars;
  }
  return Math.min(sum, MAX_STARS);
};

// ---------------------------------------------------------------- run results

// What `game.run` resolves with, and what `run.finished` carries as `result`.
// A runtime failure sets `stage` + `error` and can never report `passed`.
export const gameResult = ({
  gameId, runId, earnedStars = 0, savedStars = 0,
  sourceChecks = [], diagnostics = [], worlds = [], stage = null, error = null, mode = RUN_MODES.graded,
}) => ({ kind: 'game', gameId, runId, mode, earnedStars, savedStars, sourceChecks, diagnostics, worlds, stage, error });

// One entry per simulated world.
export const worldResult = ({ level, seed, world, events = [], end = null, passed = false, message = '' }) =>
  ({ level, seed, world, events, end, passed, message });

export const emptyEnd = () => ({
  robot: { x: 0, y: 0, dir: 'N' },
  held: {}, acquired: [], ground: [],
  scored: 0, painted: [], said: [], delivered: {}, stock: {}, gates: {},
  actions: 0, bumped: false, limited: false,
});

// ---------------------------------------------------------------- world schema

const isInt = value => Number.isInteger(value);
// TextEncoder, not Buffer: this file is bundled into the webview too.
const utf8Bytes = text => new TextEncoder().encode(text).length;
const inBoard = (world, x, y) => isInt(x) && isInt(y) && x >= 0 && x < world.width && y >= 0 && y < world.height;
const key = (x, y) => `${x},${y}`;

// Returns a list of human-readable problems; empty means the world is valid.
// Invalid authored data is an engine error, never a student failure, so both
// the engine and every content author's test call this before running Java.
export const validateWorld = (world, { id = 'game' } = {}) => {
  const problems = [];
  const fail = message => problems.push(`${id}: ${message}`);
  if (!world || typeof world !== 'object' || Array.isArray(world)) return [`${id}: world() must return an object`];

  const { width, height } = world;
  if (!isInt(width) || width < 1 || width > LIMITS.boardSide) fail(`width must be an integer 1..${LIMITS.boardSide}`);
  if (!isInt(height) || height < 1 || height > LIMITS.boardSide) fail(`height must be an integer 1..${LIMITS.boardSide}`);
  if (problems.length) return problems;

  const robot = world.robot;
  if (!robot || !inBoard(world, robot.x, robot.y)) fail('robot must start on the board');
  else if (!DIRECTIONS.includes(robot.dir)) fail(`robot.dir must be one of ${DIRECTIONS.join(', ')}`);

  const blocked = new Map();
  const claim = (x, y, what) => {
    if (blocked.has(key(x, y))) fail(`${what} overlaps ${blocked.get(key(x, y))} at (${x}, ${y})`);
    blocked.set(key(x, y), what);
  };

  for (const name of ['walls', 'hurdles']) {
    const tiles = world[name] || [];
    if (!Array.isArray(tiles)) { fail(`${name} must be an array`); continue; }
    for (const tile of tiles) {
      if (!Array.isArray(tile) || tile.length !== 2 || !inBoard(world, tile[0], tile[1])) {
        fail(`${name} entries must be [x, y] on the board, got ${JSON.stringify(tile)}`);
        continue;
      }
      claim(tile[0], tile[1], name === 'walls' ? 'a wall' : 'a hurdle');
      if (robot && tile[0] === robot.x && tile[1] === robot.y) fail(`${name} cannot cover the robot's start`);
    }
  }

  const ids = new Set();
  for (const character of world.characters || []) {
    if (!character || !CHARACTER_KINDS.includes(character.kind)) { fail(`character kind must be one of ${CHARACTER_KINDS.join(', ')}`); continue; }
    if (typeof character.id !== 'string' || !character.id) fail('every character needs a string id');
    else if (ids.has(character.id)) fail(`duplicate character id ${character.id}`);
    else ids.add(character.id);
    if (!inBoard(world, character.x, character.y)) fail(`character ${character.id} is off the board`);
    else if (BLOCKING_CHARACTER_KINDS.includes(character.kind) || character.open !== true) claim(character.x, character.y, `character ${character.id}`);
    for (const [kind, count] of Object.entries(character.stock || {})) {
      if (!isInt(count) || count < 0) fail(`character ${character.id} stock.${kind} must be a nonnegative integer`);
    }
    if (character.accepts && !Array.isArray(character.accepts)) fail(`character ${character.id} accepts must be an array of item kinds`);
  }

  for (const item of world.items || []) {
    if (!item || typeof item.kind !== 'string' || !item.kind) fail('every item needs a kind');
    else if (!inBoard(world, item.x, item.y)) fail(`item ${item.kind} is off the board`);
  }
  for (const name of ['hoops', 'signs']) {
    for (const entity of world[name] || []) {
      if (!inBoard(world, entity.x, entity.y)) fail(`${name} entry is off the board`);
    }
  }
  for (const sign of world.signs || []) {
    if (typeof sign.text !== 'string') fail('every sign needs text');
  }

  if (world.input !== undefined) {
    if (typeof world.input !== 'string') fail('input must be a string');
    else if (utf8Bytes(world.input) > LIMITS.inputBytes) fail(`input exceeds ${LIMITS.inputBytes} bytes`);
  }
  if (world.par !== undefined && (!isInt(world.par) || world.par < 0 || world.par > LIMITS.par)) {
    fail(`par must be an integer 0..${LIMITS.par}`);
  }
  try { JSON.stringify(world); } catch { fail('world must be JSON-serializable'); }

  return problems;
};

// A registry entry is well formed. Content tests run this on every game.
export const validateGame = game => {
  const problems = [];
  const fail = message => problems.push(`${game?.id || '(no id)'}: ${message}`);
  if (!game || typeof game !== 'object') return ['registry entry must be an object'];
  if (typeof game.id !== 'string' || !/^[a-z][a-z0-9-]{0,80}$/.test(game.id)) fail('id must be kebab-case');
  if (typeof game.title !== 'string' || !game.title) fail('needs a title');
  if (!Array.isArray(game.commands) || game.commands.some(verb => !VERBS.includes(verb))) {
    fail(`commands must be a subset of ${VERBS.join(', ')}`);
  }
  for (const field of ['brief', 'task', 'starter', 'solution']) {
    if (typeof game[field] !== 'string' || !game[field]) fail(`needs ${field}`);
  }
  if (typeof game.world !== 'function') fail('needs a world(rng, level) function');
  if (typeof game.goal !== 'function') fail('needs a goal(end, world) function');

  if (game.project) {
    if (!UNIT_IDS.includes(game.unit)) fail(`project unit must be one of ${UNIT_IDS.join(', ')}`);
    if (!PROJECT_IDS.includes(game.id)) fail('projects are exactly talent-show and free-draw');
  } else if (!SUBTOPICS.includes(game.subtopic)) {
    fail(`subtopic must be one of ${SUBTOPICS.join(', ')}`);
  }
  return problems;
};
