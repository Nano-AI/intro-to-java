import { COLORS, VERBS } from './game-contract.js';

export function isJavaCodePosition(source, offset) {
  // Match unfinished literals too: completion runs while the closing quote is still missing.
  const nonCode = /\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\r\n]*|"""(?:\\(?:[\s\S]|$)|(?!""")[^\\])*(?:"""|$)|"(?:\\(?:[^\r\n]|$)|[^"\\\r\n])*(?:"|(?=\r|\n|$))|'(?:\\(?:[^\r\n]|$)|[^'\\\r\n])*(?:'|(?=\r|\n|$))/g;
  for (const token of source.matchAll(nonCode)) {
    if (token.index >= offset) break;
    if (offset <= token.index + token[0].length) return false;
  }
  return true;
}

export function isJavaMemberPosition(source, offset) {
  const member = /\.\s*[\w$]*$/.exec(source.slice(0, offset));
  // A period in a preceding comment is not a Java member access.
  return Boolean(member && isJavaCodePosition(source, member.index + 1));
}

export const isGameCommandPosition = (source, offset) => !isJavaMemberPosition(source, offset) && isJavaCodePosition(source, offset);

const commands = [
  ['move', 'pipMove', 'move 3', 'Move forward by a positive whole number of tiles. A wall, obstacle or character stops the run.'],
  ['turn', 'pipTurnLeft', 'turn left', 'Turn left by 90 degrees without moving.'],
  ['turn', 'pipTurnRight', 'turn right', 'Turn right by 90 degrees without moving.'],
  ['jump', 'pipJump', 'jump', 'Move forward one tile, clearing a hurdle. Walls still block the way.'],
  ['pick', 'pipPickUp', 'pick up', 'Pick up one item on the tile where Pip is standing.'],
  ['drop', 'pipDrop', 'drop', 'Place the most recently collected item on the tile directly ahead, or give it to a customer there who accepts it.'],
  ['paint', 'pipPaint', 'paint blue', `Paint the tile where Pip is standing. Choose ${COLORS.join(', ')}.`],
  ['shoot', 'pipShoot', 'shoot', 'Use one held ball. Face a hoop within five tiles in a straight line, with no wall or closed gate between Pip and the hoop.'],
];

const entry = (label, text, description) => ({
  label,
  code: `System.out.println(${JSON.stringify(text)});`,
  description,
  insertText: `System.out.println(${JSON.stringify(text)});`,
});

// These are editor shortcuts for real print statements, not methods on a hidden robot API.
export function gameCommands(game) {
  const allowed = game.commands ?? VERBS;
  const entries = commands.filter(([verb]) => allowed.includes(verb)).map(([, ...args]) => entry(...args));
  entries.push(entry('pipSay', 'Hello, Arena!', 'Say the printed text. A character responds only when standing on the tile directly ahead. Match a greeting or password exactly.'));
  if (allowed.includes('shoot')) entries.push(entry('pipRequestBalls', 'Can I have 3 balls?', 'Face a shopkeeper on the tile directly ahead and ask for a positive whole number of balls. The shop gives at most its remaining stock.'));
  return entries;
}
