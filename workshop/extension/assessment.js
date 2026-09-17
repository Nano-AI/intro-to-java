import { randomBytes } from 'node:crypto';

const double = value => Number.isInteger(value) ? value.toFixed(1) : String(value);
const literal = value => Array.isArray(value) ? `{${value.map(literal).join(', ')}}` : JSON.stringify(value);
export function replaceInputs(source, analysis, inputs) {
  const edits = Object.entries(inputs).map(([name, value]) => {
    const matches = analysis.variables.filter(v => ['main','class'].includes(v.scope) && v.name === name && v.start >= 0);
    if (matches.length !== 1) throw new Error(`Declare ${name} once with an initial value so the checks can vary the starting data.`);
    return { ...matches[0], text: literal(value) };
  }).sort((a,b) => b.start - a.start);
  for (const edit of edits) source = source.slice(0,edit.start) + edit.text + source.slice(edit.end);
  return source;
}
const javaType = value => Number.isInteger(value) ? 'int' : typeof value === 'number' ? 'double' : typeof value === 'string' ? 'String' : typeof value === 'boolean' ? 'boolean' : null;
// `replaceInputs` throws rather than failing a check when a name does not
// resolve to exactly one initialised variable, so a world's `constants` are
// verified for name, scope, finality, and declared type before replacement.
export function constantProblem(analysis, constants) {
  for (const [name, value] of Object.entries(constants || {})) {
    const type = javaType(value);
    if (!type) return `${name} must be a number, string, or boolean.`;
    const found = (analysis.variables || []).filter(v => v.scope === 'class' && v.name === name && v.final && v.start >= 0);
    if (found.length !== 1) return `Declare \`public static final ${type} ${name}\` once, with a starting value, outside \`main\`.`;
    if (found[0].type.replace(/^java\.lang\./, '') !== type) return `Declare \`${name}\` as \`${type}\`.`;
  }
  return null;
}
// Longest chain of `kind` loops nested directly inside one another. A flat loop
// list cannot show this, which is why InspectSource now reports each loop's
// parent index (contracts doc section 3, "Nesting cannot be proved today").
const nestedRun = (loops, kind, scope) => {
  let deepest = 0;
  for (const loop of loops) {
    if (loop.kind !== kind || (scope && loop.scope !== scope)) continue;
    let run = 1, parent = loop.parent;
    while (parent >= 0 && loops[parent]?.kind === kind && (!scope || loops[parent].scope === scope)) { run++; parent = loops[parent].parent; }
    deepest = Math.max(deepest, run);
  }
  return deepest;
};
export function checkStructure(lesson, analysis) {
  const checks = [], rules = lesson.requirements || {};
  for (const [name, type] of Object.entries(rules.variables || {})) {
    const found = analysis.variables.filter(v => v.scope === 'main' && v.name === name && v.type.replace(/^java\.lang\./,'') === type && v.start >= 0);
    checks.push({ passed: found.length === 1, message: `Declare \`${type} ${name}\` with an initial value inside \`main\`.` });
  }
  for (const [name, type] of Object.entries(rules.constants || {})) checks.push({ passed: analysis.variables.some(v => v.scope === 'class' && v.name === name && v.type === type && v.final), message: `Declare \`public static final ${type} ${name}\` inside the class, outside \`main\`.` });
  for (const name of rules.prints || []) checks.push({ passed: analysis.calls.some(c => /(?:^|\.)(?:println|print|printf)$/.test(c.name) && c.scope === 'main' && c.identifiers.includes(name)), message: `Print the variable \`${name}\`, rather than a fixed answer or its name in quotes.` });
  for (const name of rules.uses || []) checks.push({ passed: (analysis.identifiers[name] || 0) > 0, message: `Use \`${name}\` in your calculation.` });
  for (const name of rules.unchanged || []) checks.push({passed:!analysis.assignments.some(a=>a.scope==='main'&&a.name===name),message:`Leave the original \`${name}\` value unchanged; store the result in the new variable.`});
  for (const [kind, minimum] of Object.entries(rules.loops || {})) checks.push({ passed: analysis.loops.filter(l=>l.kind===kind && l.scope===(rules.scope || 'main')).length>=minimum, message: `Use ${minimum > 1 ? `${minimum} nested or separate ${kind} loops` : `a ${kind} loop`} in ${rules.scope || 'main'}.` });
  for (const [kind, minimum] of Object.entries(rules.nested || {})) checks.push({ passed: nestedRun(analysis.loops || [], kind, rules.scope) >= minimum, message: `Put ${minimum} ${kind} loops inside one another in ${rules.scope || 'this program'}; separate loops do not count.` });
  for (const method of rules.methods || []) {
    checks.push({ passed: analysis.methods.some(m => m.name === method.name && m.returns === method.returns && JSON.stringify(m.parameters) === JSON.stringify(method.parameters)), message: `Define \`${method.returns} ${method.name}(${method.parameters.join(', ')})\`.` });
    // A declared helper can sit unused, so a required signature is paired with
    // a call from somewhere other than the helper itself.
    if (method.used) checks.push({ passed: analysis.calls.some(c => (c.name === method.name || c.name.endsWith('.' + method.name)) && c.scope !== method.name), message: `Call \`${method.name}\` from \`main\` instead of only defining it.` });
  }
  for (const name of rules.calls || []) checks.push({ passed: analysis.calls.some(c => c.name === name || c.name.endsWith('.'+name)), message: `Use \`${name}\` in this exercise.` });
  if (rules.alias) checks.push({ passed: analysis.variables.some(v=>v.name===rules.alias[0]&&v.initializer===rules.alias[1]), message: `Make \`${rules.alias[0]}\` refer to \`${rules.alias[1]}\`, rather than creating another array.` });
  return checks;
}
export function assessmentCases(lesson, suppliedSeed) {
  const seed = suppliedSeed ?? randomBytes(4).readUInt32LE(); let state = seed || 1;
  const int = (min,max) => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return min + ((state >>> 0) % (max-min+1)); };
  const id = lesson.assessmentId || lesson.id;
  let cases = [...lesson.cases].map((c,i)=>({...c,label:c.label || `Example ${i+1}`}));
  const add = (input, expected, label='New data') => cases.push({input:String(input),expected:String(expected),label});
  const variants = (values, expected) => { cases=values.map((inputs,i)=>({input:'', inputs, mutate:i!==0, expected:expected(inputs), label:i===0?'Original program':`Changed data ${i}`})); };
  switch(id) {
    case 'java-declare': variants([{bolts:4},{bolts:1},{bolts:9},{bolts:int(20,90)}],v=>String(v.bolts));break;
    case 'java-types': variants([{power:.5},{power:.25},{power:1},{power:int(1,7)/8}],v=>double(v.power));break;
    case 'java-variables': variants([{parts:12,used:5},{parts:20,used:3},{parts:8,used:8},{parts:int(30,90),used:int(1,20)}],v=>String(v.parts-v.used));break;
    case 'debug-copy-value': variants([{parts:12,used:5},{parts:20,used:3},{parts:8,used:8},{parts:int(30,90),used:int(1,20)}],v=>`${v.parts-v.used}\n${v.parts}`);break;
    case 'java-expressions': variants([{charged:3,total:4},{charged:0,total:4},{charged:4,total:4},{charged:5,total:2},{charged:int(1,15),total:8}],v=>double(v.charged/v.total));break;
    case 'java-strings': variants([{label:'PIP-07'},{label:'Bolt'},{label:'A'},{label:`ROVER-${int(10,999)}`}],v=>`${v.label.length}\n${v.label[0]}`);break;
    case 'java-constants': variants([{SHELVES:3},{SHELVES:1},{SHELVES:5},{SHELVES:int(6,9)}],v=>[...Array.from({length:v.SHELVES},(_,i)=>`Shelf ${i+1}`),`Scanned ${v.SHELVES} shelves`].join('\n'));break;
    case 'java-for': for(const count of [6,int(7,12)])add(count,Array.from({length:count},(_,i)=>`Scan ${i+1}`).join('\n'));break;
    case 'java-nested': for(const [rows,columns] of [[0,3],[3,1],[int(2,5),int(2,5)]])add(`${rows} ${columns}`,Array.from({length:rows},()=> '#'.repeat(columns)).join('\n'));break;
    case 'java-random-math': for(const raw of [-100,99,100,-int(101,999),int(-90,90)])add(raw,Math.min(100,Math.abs(raw)));break;
    case 'java-accumulator': for(const count of [1,2,int(8,30)])add(count,count*(count+1)/2);break;
    case 'java-methods': cases=[['Pip','Bolt'],['Rover'],[`Unit${int(100,999)}`,'Luma']].map((names,i)=>({input:'',invocation:names.map(n=>`Student.announce(${JSON.stringify(n)});`).join('\n'),expected:names.map(n=>`Ready: ${n}`).join('\n'),label:i===0?'Example calls':'Different method arguments'}));break;
    case 'java-returns': cases=[[2.5,4],[0,8],[1.5,3],[int(1,8)/2,int(1,9)]].map(([speed,seconds])=>({input:`${speed} ${seconds}`,invocation:`System.out.println(Student.distance(${double(speed)}, ${double(seconds)}));`,expected:double(speed*seconds),label:'Direct method call'}));break;
    case 'java-conditionals': for(const battery of [0,21,100,int(1,18),int(22,99)])add(battery,battery<20?'CHARGE':'READY');break;
    case 'java-while': for(const count of [1,8,int(4,12)])add(count,[...Array.from({length:count},(_,i)=>String(count-i)),'GO'].join('\n'));break;
    case 'java-scanner': for(const [name,load] of [['Nova',0],['Rover',13],[`Unit${int(1,999)}`,int(2,50)]])add(`${name} ${load}`,`${name}:${load*2}`);break;
    case 'java-arrays': for(const values of [[0,0,0,0],[-9,-3,-7,-1],Array.from({length:4},()=>int(-20,100))])add(values.join(' '),values.reduce((a,b)=>a+b,0));break;
    case 'java-references': variants([{readings:[10,20],replacement:99},{readings:[3,7],replacement:42},{readings:[0,-5],replacement:0},{readings:[int(1,50),int(51,99)],replacement:int(100,500)}],v=>`${v.replacement}\n${v.readings[1]}`);break;
    case 'java-2d-arrays': variants([{map:[[1,0,1],[0,1,1]]},{map:[[0,0],[0,0]]},{map:[[1],[0,1,1]]},{map:[[]]},{map:Array.from({length:3},()=>Array.from({length:4},()=>int(0,1)))}],v=>String(v.map.flat().filter(x=>x===1).length));break;
    case 'java-array-patterns': for(const values of [[0,0,0,0],[99,2,3,1],Array.from({length:4},()=>int(-100,-1)),Array.from({length:4},()=>int(-50,100))])add(values.join(' '),Math.max(...values));break;
    case 'debug-array-bounds': variants([{values:[2,4,6]},{values:[8]},{values:[]},{values:Array.from({length:5},()=>int(-9,20))}],v=>String(v.values.reduce((a,b)=>a+b,0)));break;
    case 'java-final-report': cases=[[19,20,0,80,7],[],[20,21,100],[0,19,20,21],Array.from({length:8},()=>int(0,100))].map(values=>({input:`${values.length} ${values.join(' ')}`.trim(),invocation:`System.out.println(Student.countLow(new int[]${literal(values)}));`,expected:String(values.filter(v=>v<20).length),label:'Direct method / boundary check'}));break;
  }
  return {cases,seed};
}
