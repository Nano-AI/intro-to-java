const main = body => `public class Student {\n    public static void main(String[] args) {\n${body.split('\n').map(s=>'        '+s).join('\n')}\n    }\n}\n`;
export function improveLessons(existing) {
  const core = existing.map(lesson=>({...lesson,assessmentVersion:2}));
  const get = id => core.find(l=>l.id===id);
  const add = (from, update) => core.push({...get(from),...update,assessmentVersion:2});
  add('java-variables', {
    id:'java-declare',title:'Build a first variable',topic:'Declaring an `int`',
    intro:'Create a named place for four bolts. The declaration is written from scratch.',
    concept:'A declaration has a type, a name, an equals sign, an initial value, and a semicolon. Build those pieces in the model below.',
    example:'int bolts = 4;',prediction:['Which part is the variable name?',['`int`','`bolts`','`4`'],1],
    task:'Inside `main`, declare an `int` named `bolts` with an initial value of `4`. Then print `bolts` without quotation marks.',
    hint:'Use the pattern `type name = value;`. The name in `println` must match the declared name.',
    reflection:'Point to the type, name, and value in the declaration. What changes when a new value is assigned?',
    starter:main('// Declare bolts here.\n\n// Print the variable here.'),solution:main('int bolts = 4;\nSystem.out.println(bolts);'),
    cases:[{input:'',expected:'4'}],requirements:{variables:{bolts:'int'},prints:['bolts']},visual:{kind:'declaration',name:'bolts',type:'int',value:'4'},
  });
  add('java-declare', {
    id:'java-types',title:'Choose a box for a decimal',topic:'`int` and `double`',
    intro:'Store a motor power of `0.5`. Pick a type that can hold the fraction.',
    concept:'An `int` stores a whole number. A `double` can store a fractional number. In the model, try to put `0.5` into each type.',
    example:'double power = 0.5;',prediction:['Which type can store `0.5`?',['`int`','`double`'],1],
    task:'Declare a `double` named `power`, set it to `0.5`, and print `power`.',hint:'The structure is the same as the first declaration; only the type and value change.',
    reflection:'Why does `int power = 0.5;` fail? Explain why casting it to `int` would lose information.',
    starter:main('// Store 0.5 in a variable named power.\n\n// Print power.'),solution:main('double power = 0.5;\nSystem.out.println(power);'),
    cases:[{input:'',expected:'0.5'}],requirements:{variables:{power:'double'},prints:['power']},visual:{kind:'declaration',name:'power',type:'double',value:'0.5'},
  });
  Object.assign(get('java-variables'), {
    intro:'The workshop starts with 12 parts and uses 5. Update the stored count instead of printing a memorized answer.',
    task:'Declare `int parts = 12;` and `int used = 5;`. Subtract `used` from `parts`, store the new value in `parts`, and print `parts`.',
    hint:'Read the old value, calculate `parts - used`, and assign the result back: `parts = parts - used;`.',
    starter:main('// Declare parts and used.\n\n// Update parts, then print the variable.'),
    solution:main('int parts = 12;\nint used = 5;\nparts = parts - used;\nSystem.out.println(parts);'),
    requirements:{variables:{parts:'int',used:'int'},uses:['used'],prints:['parts']},visual:{kind:'assignment'},
  });
  const variables = {
    'java-expressions':{charged:'int',total:'int',fraction:'double'},
    'java-strings':{label:'String'},'java-arrays':{samples:'int[]'},
    'java-references':{readings:'int[]',backup:'int[]',replacement:'int'},
    'java-2d-arrays':{map:'int[][]',available:'int'},'java-array-patterns':{values:'int[]'},
  };
  for(const [id,fields] of Object.entries(variables)) get(id).requirements={variables:fields};
  get('java-expressions').requirements.prints=['fraction'];
  for(const id of ['java-for','java-accumulator','java-arrays','java-array-patterns']) get(id).requirements={...get(id).requirements,loops:{for:1}};
  get('java-nested').requirements={loops:{for:2}};
  get('java-constants').requirements={constants:{SHELVES:'int'},loops:{for:1}};
  get('java-2d-arrays').requirements.loops={for:2};
  get('java-2d-arrays').requirements.prints=['available'];
  get('java-while').requirements={loops:{while:1}};
  get('java-methods').requirements={methods:[{name:'announce',returns:'void',parameters:['String']}]};
  get('java-returns').requirements={methods:[{name:'distance',returns:'double',parameters:['double','double']}]};
  get('java-scanner').requirements={calls:['next','nextInt']};
  get('java-random-math').requirements={calls:['abs','min']};
  Object.assign(get('java-references'), {
    task:'Make `backup` refer to `readings`. Set `backup[0]` to `replacement`, then print `readings[0]` and `readings[1]`.',
    starter:main('int[] readings = {10, 20};\nint replacement = 99;\nint[] backup = new int[2];\nbackup[0] = replacement;\nSystem.out.println(readings[0]);\nSystem.out.println(readings[1]);'),
    solution:main('int[] readings = {10, 20};\nint replacement = 99;\nint[] backup = readings;\nbackup[0] = replacement;\nSystem.out.println(readings[0]);\nSystem.out.println(readings[1]);'),
  });
  get('java-references').requirements.alias=['backup','readings'];
  get('java-final-report').requirements={methods:[{name:'countLow',returns:'int',parameters:['int[]']}],scope:'countLow',loops:{for:1}};
  add('java-declare', {
    id:'debug-semicolon',assessmentId:'java-declare',debug:true,title:'Repair a broken declaration',topic:'Debugging a syntax error',
    intro:'Pip cannot compile this file. Find the missing punctuation before changing any values.',
    task:'Read the compiler message, then repair the declaration so it compiles and prints `bolts`.',
    hint:'A variable declaration is a statement. What ends a Java statement?',
    starter:main('int bolts = 4\nSystem.out.println(bolts);'),
    reflection:'Which line caused the error, and where did the compiler notice it? Explain the one-character repair.',
  });
  add('java-types', {
    id:'debug-types',assessmentId:'java-types',debug:true,title:'Fix the wrong type',topic:'Debugging incompatible types',
    intro:'A whole-number variable is being asked to store a fraction. Keep `0.5` and fix the type.',
    task:'Repair the declaration without changing `0.5` to a whole number.',hint:'Choose the numeric type that keeps the fractional part.',
    starter:main('int power = 0.5;\nSystem.out.println(power);'),
    reflection:'Why would changing `0.5` to `0` silence the error but fail the real task?',
  });
  add('java-for', {
    id:'debug-loop-boundary',assessmentId:'java-for',debug:true,title:'Find the missing scan',topic:'Debugging an off-by-one error',
    intro:'The robot skips its final scan. Trace the loop boundary before editing it.',
    task:'Repair the comparison so Scan `count` is printed, including when `count` is `1`.',hint:'Test `count` equal to `1`. Does `i < count` let the first iteration run?',
    starter:get('java-for').solution.replace('i <= count','i < count'),
    reflection:'Why did the original code miss the final scan? Which smallest test exposes the bug?',
  });
  add('java-accumulator', {
    id:'debug-reset-total',assessmentId:'java-accumulator',debug:true,title:'Stop losing the total',topic:'Debugging accumulator state',
    intro:'The robot forgets previous charging increments on each loop iteration.',
    task:'Remove the unwanted reset while keeping the total initialized before the loop.',hint:'A value assigned inside the loop is assigned again each time the loop runs.',
    starter:get('java-accumulator').solution.replace('total += i;','total = 0; total += i;'),
    reflection:'For `count = 4`, trace `total` before and after each iteration of the broken and repaired versions.',
  });
  add('java-arrays', {
    id:'debug-array-bounds',debug:true,title:'Keep the scanner in bounds',topic:'Debugging an array index',
    intro:'The scan steps past the final array element. Repair the loop and try an empty buffer too.',
    task:'Change the loop condition so every valid element is visited exactly once.',hint:'The last valid index is `values.length - 1`.',
    starter:main('int[] values = {2, 4, 6};\nint total = 0;\nfor (int i = 0; i <= values.length; i++) {\n    total += values[i];\n}\nSystem.out.println(total);'),
    solution:main('int[] values = {2, 4, 6};\nint total = 0;\nfor (int i = 0; i < values.length; i++) {\n    total += values[i];\n}\nSystem.out.println(total);'),
    cases:[{input:'',expected:'12'}],requirements:{variables:{values:'int[]'},loops:{for:1}},visual:{kind:'array',mode:'bounds'},
    reflection:'Why does using `<=` fail even when the array is empty?',
  });
  add('java-declare', {
    id:'debug-declaration-type',parentId:'debug-semicolon',assessmentId:'java-declare',debug:true,partTitle:'Unknown type',
    title:'Declaration repair · unknown type',topic:'Recognizing a Java type',
    intro:'This program uses a type name that Java does not recognize.',
    concept:'A type name must exist. The whole-number primitive is spelled `int`, not `integer`.',
    task:'Repair the unknown type `integer` while keeping the name `bolts`, its initial value `4`, and the variable print.',
    hint:'Look at the first word of the declaration. Use Java’s whole-number primitive type.',
    starter:main('integer bolts = 4;\nSystem.out.println(bolts);'),
  });
  add('java-variables', {
    id:'debug-redeclaration',parentId:'debug-semicolon',assessmentId:'java-variables',debug:true,partTitle:'Redeclaration',
    title:'Declaration repair · declare once',topic:'Declaration versus reassignment',
    intro:'The same variable is declared twice in one scope.',
    concept:'Use the type when creating a variable. To replace its value later, write the variable name without declaring it again.',
    task:'Keep the first `int parts = 12;` declaration. Repair the second declaration so it updates the existing `parts` value using `used`.',
    hint:'Remove the repeated type from the update, not from the first declaration.',
    starter:main('int parts = 12;\nint used = 5;\nint parts = parts - used;\nSystem.out.println(parts);'),
  });
  add('java-variables', {
    id:'debug-new-variable',parentId:'debug-semicolon',assessmentId:'java-variables',debug:true,partTitle:'New variable',
    title:'Declaration repair · create a new name',topic:'Declaring an expression result',
    intro:'The program assigns a value to a name it never declared.',
    concept:'A new variable needs a type. Its initial value can come from an expression involving variables that already exist.',
    task:'Declare a new `int` named `remaining`, initialized from `parts - used`. Print `remaining` without changing `parts` or `used`.',
    hint:'Add the type to the first assignment to `remaining`.',
    starter:main('int parts = 12;\nint used = 5;\nremaining = parts - used;\nSystem.out.println(remaining);'),
    solution:main('int parts = 12;\nint used = 5;\nint remaining = parts - used;\nSystem.out.println(remaining);'),
    requirements:{variables:{parts:'int',used:'int',remaining:'int'},uses:['parts','used'],prints:['remaining'],unchanged:['parts','used']},
    visual:{kind:'assignment',targetName:'remaining'},
  });
  add('java-variables', {
    id:'debug-copy-value',parentId:'debug-semicolon',debug:true,partTitle:'Copied value',
    title:'Declaration repair · keep the old value',topic:'Primitive value copying',
    intro:'Save the original count in another variable before updating it.',
    concept:'For an `int`, `int backup = parts;` copies the current number. Later changing `parts` does not change `backup`.',
    task:'Keep `backup` initialized from `parts`. After subtracting `used` from `parts`, print the new `parts` value and then the original `backup` value.',
    hint:'The second output statement should read the saved variable, not the updated one.',
    starter:main('int parts = 12;\nint used = 5;\nint backup = parts;\nparts = parts - used;\nSystem.out.println(parts);\nSystem.out.println(parts);'),
    solution:main('int parts = 12;\nint used = 5;\nint backup = parts;\nparts = parts - used;\nSystem.out.println(parts);\nSystem.out.println(backup);'),
    cases:[{input:'',expected:'7\n12'}],requirements:{variables:{parts:'int',used:'int',backup:'int'},uses:['used'],prints:['parts','backup']},visual:{kind:'copy'},
  });
  Object.assign(get('debug-semicolon'),{
    assessmentVersion:3,
    parts:['debug-semicolon','debug-declaration-type','debug-redeclaration','debug-new-variable','debug-copy-value'],partTitle:'Missing semicolon',
    intro:'Repair five small programs. Each part has its own Java file, so every fix is kept.',
    concept:'Build a declaration, update an existing variable, then copy a value into another variable. Use the three models to see how these actions differ.',
    prediction:['After `int backup = parts;`, changing `parts` also changes `backup`. Is that true?',['No — the `int` value was copied','Yes — the names stay linked'],0],
    reflection:'Explain declaration versus assignment. Why did the redeclaration fail, and why did the copied `int` value stay unchanged?',
    visual:{kind:'variable-series',name:'bolts',type:'int',value:'4'},
  });
  const kinds={
    'hello-java':'output','java-expressions':'fraction','java-strings':'string','java-for':'loop','java-nested':'grid',
    'java-random-math':'math','java-accumulator':'loop','java-constants':'loop','java-methods':'function','java-returns':'function',
    'java-conditionals':'branch','java-while':'loop','java-scanner':'tokens','java-arrays':'array',
    'java-references':'references','java-2d-arrays':'grid','java-array-patterns':'array','java-final-report':'array',
  };
  for(const lesson of core) lesson.visual ||= {kind:kinds[lesson.assessmentId||lesson.id]};
  return core;
}
