// Plain-language notes for the javac and JVM messages novices meet most. First match wins.
const a = word => /^[aeiou]/i.test(word) ? `an \`${word}\`` : `a \`${word}\``;
const notes = [
  [/';' expected/, () => 'A statement is missing its semicolon. Check the end of this line or the line above it.'],
  [/cannot find symbol[\s\S]*?symbol:\s+class (Scanner|Random)/, name => `\`${name}\` needs \`import java.util.${name};\` at the top of the file.`],
  [/cannot find symbol[\s\S]*?symbol:\s+variable (\w+)/, name => `Java does not recognize \`${name}\`. Check its spelling and capitalization, declare it before this line, and check that this line is inside the braces where it was declared.`],
  [/cannot find symbol[\s\S]*?symbol:\s+method (\w+)/, name => `No method named \`${name}\` matches this call. Check the spelling, capitalization, and number of arguments.`],
  [/cannot find symbol/, () => 'Java does not recognize a name on this line. Check spelling, capitalization, and where it was declared.'],
  [/possible lossy conversion from (\w+) to (\w+)/, (from, to) => `Storing ${a(from)} value in ${a(to)} variable loses information. Change the variable type, or cast on purpose with \`(${to})\`.`],
  [/incompatible types: (\S+) cannot be converted to (\S+)/, (from, to) => `This line gives ${a(from)} where Java needs ${a(to)}. Check the variable type and the value or method result assigned to it.`],
  [/missing return statement/, () => 'A method with a return type must return a value on every path, including after loops and `if` statements.'],
  [/variable (\w+) might not have been initialized/, name => `\`${name}\` is read before it has a value. Give it an initial value when declaring it.`],
  [/variable (\w+) is already defined/, name => `\`${name}\` is declared twice. To change an existing variable, assign without repeating the type: \`${name} = …;\``],
  [/unreachable statement/, () => 'This line can never run, usually because a `return` or `break` comes before it.'],
  [/reached end of file while parsing/, () => 'The file ends before a block is closed. Add the missing `}`; every `{` needs a partner.'],
  [/class, interface, enum, or record expected/, () => 'Code appears outside the class. An extra `}` above this line probably closed the class early.'],
  [/else' without 'if'/, () => 'This `else` has no matching `if`. Check for a stray semicolon after the `if (…)` or a missing `}`.'],
  [/not a statement/, () => 'This line is a value, not an action. Assign it to a variable, print it, or use it in a condition.'],
  [/unclosed string literal/, () => 'A `String` is missing its closing double quote.'],
  [/bad operand types for binary operator '([^']+)'/, op => `\`${op}\` cannot combine these types. Compare \`String\` values with \`.equals\`, and check the types on both sides.`],
  [/non-static (?:method|variable) (\w+)/, name => `\`${name}\` must be declared \`static\` to use it from \`main\`.`],
  [/method (\w+) in class \w+ cannot be applied to given types/, name => `The call to \`${name}\` passes the wrong number or types of arguments. Match the method's parameter list.`],
  [/illegal start of (?:expression|type)/, () => 'Java did not expect this here. Look for a missing `}` or `)` just above, or a method written inside another method.'],
  [/'[(){}\[\]]'(?: or '[^']+')? expected|<identifier> expected/, () => 'A bracket, parenthesis, or name is missing near this spot. Compare the line with the example syntax.'],
  [/ArrayIndexOutOfBoundsException: Index (-?\d+) out of bounds for length (\d+)/, (index, length) => Number(length) ? `Index ${index} does not exist. An array of length ${length} has indexes 0 through ${length - 1}. Check the loop condition: use \`<\` with \`.length\`.` : `Index ${index} does not exist because the array is empty.`],
  [/StringIndexOutOfBoundsException/, () => 'A `String` index is outside the text. Valid indexes run from 0 to `length() - 1`.'],
  [/InputMismatchException/, () => 'The program asked `Scanner` for one type, but the input held another, such as `nextInt` reading a word. Match the read calls to the input order.'],
  [/NoSuchElementException/, () => 'The program read more input than was provided. Count the `Scanner` read calls against the input values.'],
  [/ArithmeticException: \/ by zero/, () => 'An `int` was divided by zero. Check the divisor before dividing.'],
  [/NullPointerException/, () => 'A variable holds `null`, so it has no object to use. Give it a value before calling methods on it.'],
  [/StackOverflowError/, () => 'A method keeps calling itself without stopping.'],
  [/OutOfMemoryError/, () => 'The program used too much memory, often from a very large array or a loop that never ends.'],
];

export function explainError(text = '') {
  // Explain the first compiler error only; later errors often follow from it.
  const first = text.match(/Student\.java:\d+: error:[\s\S]*?(?=\n\S*\.java:\d+:|$)/)?.[0] ?? text;
  const line = first.match(/Student\.java:(\d+)/)?.[1];
  for (const [pattern, note] of notes) {
    const match = first.match(pattern);
    if (match) return `${line ? `Line ${line}: ` : ''}${note(...match.slice(1))}`;
  }
  return '';
}

// Mirrors the runner: whole output trimmed, carriage returns ignored.
export function compareOutput(expected = '', actual = '') {
  const want = expected.replaceAll('\r', '').trim().split('\n'), got = actual.replaceAll('\r', '').trim().split('\n');
  if (want.join('\n') === got.join('\n')) return null;
  const index = want.findIndex((line, i) => line !== got[i]), i = index < 0 ? want.length : index, n = i + 1;
  const different = got.map((line, j) => line !== want[j]), show = text => text ? `\`${text}\`` : 'a blank line';
  if (want.join('') === '') return { different, message: `Expected no output, but the program printed ${show(got[0])}${got.length > 1 ? ` and ${got.length - 1} more line(s)` : ''}.` };
  if (i >= got.length || got.join('') === '') return { different, message: `Output stops early. Line ${n} should be ${show(want[i])}.` };
  if (i >= want.length) return { different, message: `Line ${n} is extra: ${show(got[i])}. Expected output ends after line ${want.length}.` };
  if (want[i].replace(/\s/g, '') === got[i].replace(/\s/g, '')) return { different, message: `Line ${n} differs only in spaces. Expected \`${want[i].replaceAll(' ', '·')}\`, printed \`${got[i].replaceAll(' ', '·')}\` (· marks a space).` };
  if (want[i].toLowerCase() === got[i].toLowerCase()) return { different, message: `Line ${n} differs only in capitalization. Expected \`${want[i]}\`, printed \`${got[i]}\`.` };
  return { different, message: `Line ${n} differs. Expected ${show(want[i])}, printed ${show(got[i])}.` };
}
