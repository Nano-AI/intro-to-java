// Lightweight, lossless highlighting for read-only Java fragments. The editor
// remains responsible for parsing and diagnostics.
const keywords = new Set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while record var yield'.split(' '));
const literals = new Set(['true', 'false', 'null']);
const token = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])')|\b(0[xX][\da-fA-F_]+[lL]?|0[bB][01_]+[lL]?|\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?[\d_]+)?[dDfFlL]?)\b|([A-Za-z_$][\w$]*)|(>>>=|>>=|<<=|>>>|>>|<<|\+\+|--|==|!=|<=|>=|&&|\|\||\+=|-=|\*=|\/=|%=|&=|\|=|\^=|->|[+\-*/%=<>!&|^~?:])|([{}()[\].,;])/g;

export function tokenizeJava(value) {
  const source = String(value ?? ''), parts = [];
  let last = 0;
  for (const match of source.matchAll(token)) {
    if (match.index > last) parts.push({ text: source.slice(last, match.index), kind: null });
    const [text, comment, string, number, identifier, operator] = match;
    let kind = comment ? 'comment' : string ? 'string' : number ? 'literal' : operator ? 'operator' : 'punctuation';
    if (identifier) {
      kind = keywords.has(identifier) ? 'keyword'
        : literals.has(identifier) || /^[A-Z][A-Z0-9_]*$/.test(identifier) ? 'literal'
        : /^\s*\(/.test(source.slice(match.index + text.length)) ? 'function'
        : /^[A-Z]/.test(identifier) ? 'type' : 'variable';
    }
    parts.push({ text, kind });
    last = match.index + text.length;
  }
  if (last < source.length) parts.push({ text: source.slice(last), kind: null });
  return parts;
}
