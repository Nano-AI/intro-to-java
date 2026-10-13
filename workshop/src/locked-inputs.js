import { parser } from '@lezer/java';

// Capture existing physical declaration lines, including legacy declarations.
// No migration, formatting, or source mutation happens here.
export function lockedInputLines(source, inputs) {
  if (!inputs || !Object.keys(inputs).length) return [];
  const lines = new Map();
  parser.parse(source).iterate({ enter(ref) {
    if (ref.name !== 'VariableDeclarator') return;
    const node = ref.node, definition = node.getChild('Definition');
    const name = definition && source.slice(definition.from, definition.to);
    if (!Object.hasOwn(inputs, name)) return;
    const declaration = node.parent;
    const start = source.lastIndexOf('\n', declaration.from - 1) + 1;
    const newline = source.indexOf('\n', declaration.to);
    const end = newline < 0 ? source.length : newline;
    const previousNewline = start > 1 && source[start - 2] === '\r' ? start - 2 : Math.max(0, start - 1);
    const item = lines.get(start) || { start, end, guardStart:previousNewline, guardEnd:newline < 0 ? end : end + 1, text:source.slice(start, end), names:[] };
    item.names.push(name);
    lines.set(start, item);
  } });
  return [...lines.values()].sort((a, b) => a.start - b.start);
}

export function touchesLockedInput(changes, lines) {
  return changes.some(change => lines.some(line => change.rangeLength
    ? change.rangeOffset < line.guardEnd && change.rangeOffset + change.rangeLength > line.guardStart
    : change.rangeOffset >= line.guardStart && change.rangeOffset < line.guardEnd));
}

export function moveLockedInputLines(lines, changes) {
  return lines.map(line => {
    const shift = changes.filter(change => change.rangeOffset + change.rangeLength <= line.start)
      .reduce((total, change) => total + change.text.length - change.rangeLength, 0);
    return { ...line, start:line.start + shift, end:line.end + shift, guardStart:line.guardStart + shift, guardEnd:line.guardEnd + shift };
  });
}

export function sameLockedInputLines(before, after) {
  return before.length === after.length && before.every((line, i) => line.text === after[i].text && line.names.join() === after[i].names.join());
}

// Only an explicitly authorized host replacement can reset old declarations.
// The runner independently validates the complete Java program before execution.
export function validLockedInputReset(source, inputs) {
  const found = [];
  parser.parse(source).iterate({ enter(ref) {
    if (ref.name !== 'VariableDeclarator') return;
    const node=ref.node, definition=node.getChild('Definition');
    const name=definition && source.slice(definition.from, definition.to);
    if (!Object.hasOwn(inputs || {}, name)) return;
    const declaration=node.parent, block=declaration.parent, method=block?.parent;
    const methodName=method?.getChild('Definition');
    const expected=`final int ${name} = ${inputs[name]};`;
    found.push({name, valid:declaration.name === 'LocalVariableDeclaration' && block?.name === 'Block' && method?.name === 'MethodDeclaration'
      && methodName && source.slice(methodName.from, methodName.to) === 'main'
      && source.slice(declaration.from, declaration.to).replace(/\s+/g,' ').trim() === expected});
  } });
  return Object.keys(inputs || {}).every(name => found.filter(item => item.name === name).length === 1 && found.find(item => item.name === name).valid);
}
