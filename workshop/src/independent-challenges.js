// Optional independent work. These IDs do not replace or extend the guided lesson order.
const main = body => `public class Student {\n    public static void main(String[] args) {\n${body.split('\n').map(line => `        ${line}`).join('\n')}\n    }\n}\n`;
const inputMain = body => 'import java.util.Scanner;\n\n' + main('Scanner input = new Scanner(System.in);\n' + body);
const program = (body, methods) => main(body).replace(/}\n$/, `${methods}\n}\n`);
const variableCases = (values, expected) => values.map((inputs, i) => ({ input: '', inputs, mutate: i !== 0, expected: String(expected(inputs)), label: Object.entries(inputs).map(([name, value]) => `${name} = ${value}`).join(', ') }));
const call = (expression, expected, label = expression) => ({ input: '', invocation: `System.out.println(Student.${expression});`, expected: String(expected), label });
const inputCase = (input, expected) => ({ input, expected: String(expected), label: input ? `Input: ${input}` : 'Starting example' });
const arrayCases = (method, values, args, expected) => {
  const array = `[${values.join(', ')}]`, suffix = args.length ? `, ${args.join(', ')}` : '';
  const label = `${method}(${array}${suffix})`;
  return [
    call(`${method}(new int[] {${values.join(', ')}}${suffix})`, expected, label),
    { input: '', invocation: `int[] values = {${values.join(', ')}}; Student.${method}(values${suffix}); System.out.println(java.util.Arrays.toString(values));`, expected: array, label: `${label}: array unchanged` },
  ];
};
const base = { independent: true, kind: 'console', steps: [], assessmentVersion: 2 };
const warmupSource = { title: 'CodingBat Java warmups — short function practice', url: 'https://codingbat.com/java/Warmup-1' };
const arraySource = { title: 'CodingBat Array-2 — loop-based array practice', url: 'https://codingbat.com/java/Array-2' };
const positiveSource = { title: 'Codewars: Sum of positive (8 kyu)', url: 'https://www.codewars.com/kata/5715eaedb436cf5606000381' };

export const independentChallenges = [
  {
    ...base, id: 'challenge-battery-budget', unit: 'basics', title: 'Battery budget', topic: 'Arithmetic', estimatedMinutes: '10–15',
    prerequisites: ['hello-java', 'java-declare', 'java-types', 'java-variables', 'java-expressions'],
    task: 'Pip starts with `energy` units. Each of `moves` moves costs `costPerMove` units. Calculate both the energy spent and the energy left. Print line 1: `spent`. Print line 2: `remaining`. Keep all three starting variables unchanged.',
    inputLimits: ['`energy`: 0–200; `moves`: 0–20; `costPerMove`: 0–10.', 'The total cost never exceeds `energy`. Keep the variable names and starting values. Checks supply different values.'],
    examples: [{ input: 'energy = 50, moves = 6, costPerMove = 3', output: '18\n32' }, { input: 'energy = 24, moves = 8, costPerMove = 3', output: '24\n0' }],
    starter: main('int energy = 50;\nint moves = 6;\nint costPerMove = 3;\nint spent = 0;\nint remaining = 0;\n\nSystem.out.println(spent);\nSystem.out.println(remaining);'),
    solution: main('int energy = 50;\nint moves = 6;\nint costPerMove = 3;\nint spent = moves * costPerMove;\nint remaining = energy - spent;\nSystem.out.println(spent);\nSystem.out.println(remaining);'),
    cases: variableCases([{ energy: 50, moves: 6, costPerMove: 3 }, { energy: 24, moves: 8, costPerMove: 3 }, { energy: 0, moves: 0, costPerMove: 0 }, { energy: 43, moves: 0, costPerMove: 7 }, { energy: 200, moves: 20, costPerMove: 10 }, { energy: 79, moves: 7, costPerMove: 4 }, { energy: 12, moves: 9, costPerMove: 0 }], v => `${v.moves * v.costPerMove}\n${v.energy - v.moves * v.costPerMove}`),
    requirements: { variables: { energy: 'int', moves: 'int', costPerMove: 'int', spent: 'int', remaining: 'int' }, prints: ['spent', 'remaining'], unchanged: ['energy', 'moves', 'costPerMove'] },
    sources: [warmupSource],
  },
  {
    ...base, id: 'challenge-prize-tokens', unit: 'basics', title: 'Prize tokens', topic: 'Integer division', estimatedMinutes: '10–15',
    prerequisites: ['hello-java', 'java-declare', 'java-types', 'java-variables', 'java-expressions'],
    task: 'A token costs `pointsPerToken` points. Buy as many whole tokens as `score` allows, then calculate the unused points. Print line 1: `tokens`. Print line 2: `leftover`. Partial tokens cannot be bought. Keep both starting variables unchanged.',
    inputLimits: ['`score`: 0–500; `pointsPerToken`: 1–50.', 'Keep the variable names and starting values. Checks supply different values.'],
    examples: [{ input: 'score = 29, pointsPerToken = 6', output: '4\n5' }, { input: 'score = 5, pointsPerToken = 8', output: '0\n5' }],
    starter: main('int score = 29;\nint pointsPerToken = 6;\nint tokens = 0;\nint leftover = 0;\n\nSystem.out.println(tokens);\nSystem.out.println(leftover);'),
    solution: main('int score = 29;\nint pointsPerToken = 6;\nint tokens = score / pointsPerToken;\nint leftover = score - tokens * pointsPerToken;\nSystem.out.println(tokens);\nSystem.out.println(leftover);'),
    cases: variableCases([{ score: 29, pointsPerToken: 6 }, { score: 5, pointsPerToken: 8 }, { score: 0, pointsPerToken: 1 }, { score: 30, pointsPerToken: 6 }, { score: 500, pointsPerToken: 1 }, { score: 499, pointsPerToken: 50 }, { score: 83, pointsPerToken: 7 }], v => `${Math.floor(v.score / v.pointsPerToken)}\n${v.score % v.pointsPerToken}`),
    requirements: { variables: { score: 'int', pointsPerToken: 'int', tokens: 'int', leftover: 'int' }, prints: ['tokens', 'leftover'], unchanged: ['score', 'pointsPerToken'] },
    sources: [warmupSource],
  },
  {
    ...base, id: 'challenge-round-points', unit: 'loops', title: 'Round points', topic: 'For loops and running totals', estimatedMinutes: '15–20',
    prerequisites: ['java-declare', 'java-variables', 'java-expressions', 'java-for', 'java-accumulator'],
    task: 'Round 1 earns 1 point, round 2 earns 2 points, and so on through `rounds`. The scoreboard shows all points earned so far after each round. Use a `for` loop to calculate both results. Print line 1: final score in `total`. Print line 2: total of the scores shown after every round in `readingSum`. Zero rounds gives two zeros. Keep `rounds` unchanged.',
    inputLimits: ['`rounds`: 0–30.', 'Keep the variable name and starting value. Checks supply different values.'],
    examples: [{ input: 'rounds = 4', output: '10\n20' }, { input: 'rounds = 2', output: '3\n4' }],
    starter: main('int rounds = 4;\nint total = 0;\nint readingSum = 0;\n\nSystem.out.println(total);\nSystem.out.println(readingSum);'),
    solution: main('int rounds = 4;\nint total = 0;\nint readingSum = 0;\nfor (int round = 1; round <= rounds; round++) {\n    total += round;\n    readingSum += total;\n}\nSystem.out.println(total);\nSystem.out.println(readingSum);'),
    cases: variableCases([4, 2, 0, 1, 9, 17, 30].map(rounds => ({ rounds })), v => `${v.rounds * (v.rounds + 1) / 2}\n${v.rounds * (v.rounds + 1) * (v.rounds + 2) / 6}`),
    requirements: { variables: { rounds: 'int', total: 'int', readingSum: 'int' }, prints: ['total', 'readingSum'], loops: { for: 1 }, unchanged: ['rounds'] },
    sources: [warmupSource],
  },
  {
    ...base, id: 'challenge-square-total', unit: 'loops', title: 'Square total', topic: 'For loops and arithmetic', estimatedMinutes: '15–20',
    prerequisites: ['java-declare', 'java-variables', 'java-expressions', 'java-for', 'java-accumulator'],
    task: 'Round `i` earns `i * i` points and costs `i` points to enter. Play rounds 1 through `rounds`. Use a `for` loop to calculate both results. Print line 1: all earned points in `total`. Print line 2: points left after all entry costs in `net`. Zero rounds gives two zeros. Keep `rounds` unchanged.',
    inputLimits: ['`rounds`: 0–20.', 'Keep the variable name and starting value. Checks supply different values.'],
    examples: [{ input: 'rounds = 3', output: '14\n8' }, { input: 'rounds = 5', output: '55\n40' }],
    starter: main('int rounds = 3;\nint total = 0;\nint net = 0;\n\nSystem.out.println(total);\nSystem.out.println(net);'),
    solution: main('int rounds = 3;\nint total = 0;\nint net = 0;\nfor (int i = 1; i <= rounds; i++) {\n    total += i * i;\n    net += i * i - i;\n}\nSystem.out.println(total);\nSystem.out.println(net);'),
    cases: variableCases([3, 5, 0, 1, 2, 8, 20].map(rounds => ({ rounds })), v => `${v.rounds * (v.rounds + 1) * (2 * v.rounds + 1) / 6}\n${v.rounds * (v.rounds + 1) * (2 * v.rounds + 1) / 6 - v.rounds * (v.rounds + 1) / 2}`),
    requirements: { variables: { rounds: 'int', total: 'int', net: 'int' }, prints: ['total', 'net'], loops: { for: 1 }, unchanged: ['rounds'] },
    sources: [warmupSource],
  },
  {
    ...base, id: 'challenge-trip-cost', unit: 'methods', title: 'Trip cost', topic: 'Parameters and method reuse', estimatedMinutes: '10–20',
    prerequisites: ['java-expressions', 'java-methods', 'java-returns'],
    task: 'Complete both methods. A trip covers `tiles` tiles, and each tile costs `costPerTile` energy. `tripCost(tiles, costPerTile)` returns the energy for that trip. `roundTripCost(outboundTiles, returnTiles, costPerTile)` calls `tripCost` once for the trip out and once for the trip back and returns their combined cost. Both return `int` values without printing. Keep `main`: line 1 prints the one-way example; line 2 prints the round-trip example.',
    inputLimits: ['`tiles`, `outboundTiles`, and `returnTiles`: 0–100; `costPerTile`: 0–10.', 'Keep each method’s name, return type, and parameters as shown in the starter. Checks call both methods separately.'],
    examples: [{ input: 'tripCost(4, 3)\nroundTripCost(4, 6, 3)', output: '12\n30' }, { input: 'tripCost(0, 8)\nroundTripCost(0, 5, 8)', output: '0\n40' }],
    starter: program('System.out.println(tripCost(4, 3));\nSystem.out.println(roundTripCost(4, 6, 3));', '    public static int tripCost(int tiles, int costPerTile) {\n        return 0;\n    }\n\n    public static int roundTripCost(int outboundTiles, int returnTiles, int costPerTile) {\n        return 0;\n    }'),
    solution: program('System.out.println(tripCost(4, 3));\nSystem.out.println(roundTripCost(4, 6, 3));', '    public static int tripCost(int tiles, int costPerTile) {\n        return tiles * costPerTile;\n    }\n\n    public static int roundTripCost(int outboundTiles, int returnTiles, int costPerTile) {\n        return tripCost(outboundTiles, costPerTile) + tripCost(returnTiles, costPerTile);\n    }'),
    cases: [inputCase('', '12\n30'), ...[[4, 3], [0, 8], [8, 0], [1, 1], [100, 10], [17, 6]].map(([tiles, cost]) => call(`tripCost(${tiles}, ${cost})`, tiles * cost)), ...[[4, 6, 3], [0, 5, 8], [5, 0, 8], [0, 0, 0], [100, 100, 10], [17, 2, 6]].map(([outbound, returning, cost]) => call(`roundTripCost(${outbound}, ${returning}, ${cost})`, (outbound + returning) * cost))],
    requirements: { methods: [{ name: 'tripCost', returns: 'int', parameters: ['int', 'int'], used: true }, { name: 'roundTripCost', returns: 'int', parameters: ['int', 'int', 'int'], used: true }] },
    sources: [warmupSource],
  },
  {
    ...base, id: 'challenge-match-score', unit: 'methods', title: 'Match score', topic: 'Methods and loops', estimatedMinutes: '15–20',
    prerequisites: ['java-expressions', 'java-for', 'java-accumulator', 'java-methods', 'java-returns'],
    task: '`roundPoints(round)` returns 3 times `round`. `matchScore(rounds, bonus)` uses a `for` loop and `roundPoints` to total rounds 1 through `rounds`, then adds `bonus` once. Add `rematchScore(rounds, bonus)`: use `matchScore` to combine that match with a second match of `rounds + 1` rounds and no bonus. Methods return without printing. Keep `main`: line 1 prints the match; line 2 prints the combined score.',
    inputLimits: ['For `roundPoints`, `round` is 0–21. For `matchScore`, `rounds` is 0–21.', 'For `rematchScore`, `rounds` is 0–20. `bonus` is 0–100. Zero rounds in one match earns only its bonus.', 'Keep each method’s name, return type, and parameters as shown in the starter. Checks call all three methods separately.'],
    examples: [{ input: 'matchScore(3, 5)\nrematchScore(3, 5)', output: '23\n53' }, { input: 'matchScore(0, 7)\nrematchScore(0, 7)', output: '7\n10' }],
    starter: program('System.out.println(matchScore(3, 5));\nSystem.out.println(rematchScore(3, 5));', '    public static int roundPoints(int round) {\n        return 0;\n    }\n\n    public static int matchScore(int rounds, int bonus) {\n        return 0;\n    }\n\n    public static int rematchScore(int rounds, int bonus) {\n        return 0;\n    }'),
    solution: program('System.out.println(matchScore(3, 5));\nSystem.out.println(rematchScore(3, 5));', '    public static int roundPoints(int round) {\n        return 3 * round;\n    }\n\n    public static int matchScore(int rounds, int bonus) {\n        int total = 0;\n        for (int round = 1; round <= rounds; round++) {\n            total += roundPoints(round);\n        }\n        return total + bonus;\n    }\n\n    public static int rematchScore(int rounds, int bonus) {\n        return matchScore(rounds, bonus) + matchScore(rounds + 1, 0);\n    }'),
    cases: [inputCase('', '23\n53'), ...[0, 1, 7, 21].map(round => call(`roundPoints(${round})`, 3 * round)), ...[[3, 5], [0, 7], [0, 0], [1, 0], [21, 100], [6, 13]].map(([rounds, bonus]) => call(`matchScore(${rounds}, ${bonus})`, 3 * rounds * (rounds + 1) / 2 + bonus)), ...[[3, 5], [0, 7], [0, 0], [1, 0], [20, 100], [6, 13]].map(([rounds, bonus]) => call(`rematchScore(${rounds}, ${bonus})`, 3 * (rounds + 1) * (rounds + 1) + bonus))],
    requirements: { methods: [{ name: 'roundPoints', returns: 'int', parameters: ['int'], used: true }, { name: 'matchScore', returns: 'int', parameters: ['int', 'int'], used: true }, { name: 'rematchScore', returns: 'int', parameters: ['int', 'int'], used: true }], loops: { for: 1 }, scope: 'matchScore' },
    sources: [warmupSource],
  },
  {
    ...base, id: 'challenge-battery-signal', unit: 'decisions', title: 'Battery signal', topic: 'Conditions and arithmetic', estimatedMinutes: '10–15',
    prerequisites: ['java-variables', 'java-expressions', 'java-conditionals', 'java-scanner'],
    task: 'Read one battery percentage. Print line 1: `CHARGE` below 20, `READY` from 20 through 79, or `FULL` from 80 through 100. Print line 2: how many percentage points are needed to reach 80. If the battery is already at 80 or more, print 0 on line 2.',
    inputLimits: ['One integer from 0 through 100.'],
    examples: [{ input: '19', output: 'CHARGE\n61' }, { input: '80', output: 'FULL\n0' }],
    starter: inputMain('int battery = input.nextInt();\nint needed = 0;\n\nSystem.out.println("CHARGE");\nSystem.out.println(needed);'),
    solution: inputMain('int battery = input.nextInt();\nint needed = 0;\nif (battery < 20) {\n    System.out.println("CHARGE");\n} else if (battery < 80) {\n    System.out.println("READY");\n} else {\n    System.out.println("FULL");\n}\nif (battery < 80) {\n    needed = 80 - battery;\n}\nSystem.out.println(needed);'),
    cases: [19, 80, 0, 20, 79, 100, 1, 54, 99].map(value => inputCase(String(value), `${value < 20 ? 'CHARGE' : value < 80 ? 'READY' : 'FULL'}\n${Math.max(0, 80 - value)}`)),
    requirements: { variables: { battery: 'int', needed: 'int' }, calls: ['nextInt'], prints: ['needed'] },
    sources: [warmupSource],
  },
  {
    ...base, id: 'challenge-charge-time', unit: 'decisions', title: 'Charge time', topic: 'While loops and state', estimatedMinutes: '10–20',
    prerequisites: ['java-variables', 'java-conditionals', 'java-while', 'java-scanner'],
    task: 'Read `charge`, `target`, and `perMinute`, in that order. Each full minute adds `perMinute` to the charge. Use a `while` loop to charge until the target is reached or passed. Print line 1: `minutes`. Print line 2: the final `charge`. If the target is already reached, no charging takes place. Do not reduce a charge that passes the target.',
    inputLimits: ['`charge` and `target`: 0–100; `perMinute`: 1–20.', 'Input contains three integers separated by spaces. The final charge may exceed 100.'],
    examples: [{ input: '10 25 6', output: '3\n28' }, { input: '80 60 4', output: '0\n80' }],
    starter: inputMain('int charge = input.nextInt();\nint target = input.nextInt();\nint perMinute = input.nextInt();\nint minutes = 0;\n\nSystem.out.println(minutes);\nSystem.out.println(charge);'),
    solution: inputMain('int charge = input.nextInt();\nint target = input.nextInt();\nint perMinute = input.nextInt();\nint minutes = 0;\nwhile (charge < target) {\n    charge += perMinute;\n    minutes++;\n}\nSystem.out.println(minutes);\nSystem.out.println(charge);'),
    cases: [[10, 25, 6], [80, 60, 4], [0, 0, 1], [0, 100, 1], [19, 20, 20], [20, 80, 10], [4, 100, 13], [99, 100, 20]].map(([charge, target, rate]) => { const minutes = Math.max(0, Math.ceil((target - charge) / rate)); return inputCase(`${charge} ${target} ${rate}`, `${minutes}\n${charge + minutes * rate}`); }),
    requirements: { variables: { charge: 'int', target: 'int', perMinute: 'int', minutes: 'int' }, loops: { while: 1 }, calls: ['nextInt'], prints: ['minutes', 'charge'] },
    sources: [warmupSource],
  },
  {
    ...base, id: 'challenge-positive-gains', unit: 'arrays', title: 'Positive gains', topic: 'Array totals and counts', estimatedMinutes: '15–20',
    prerequisites: ['java-for', 'java-accumulator', 'java-methods', 'java-returns', 'java-conditionals', 'java-arrays'],
    task: 'Complete two methods using `for` loops. `positiveTotal(int[] gains)` returns the sum of values greater than 0. `positiveCount(int[] gains)` returns how many values are greater than 0. Ignore zero and negative values; both return 0 for an empty array. Leave the array unchanged and do not print inside either method. Keep `main`: line 1 prints the total; line 2 prints the count.',
    inputLimits: ['`gains` contains 0–8 whole numbers. Each value is from -20 through 20.', 'Keep each method’s name, return type, and parameters as shown in the starter. Checks call both methods directly.'],
    examples: [{ input: 'gains = {4, -2, 0, 7}', output: '11\n2' }, { input: 'gains = {-5, -1}', output: '0\n0' }],
    starter: program('int[] gains = {4, -2, 0, 7};\nSystem.out.println(positiveTotal(gains));\nSystem.out.println(positiveCount(gains));', '    public static int positiveTotal(int[] gains) {\n        return 0;\n    }\n\n    public static int positiveCount(int[] gains) {\n        return 0;\n    }'),
    solution: program('int[] gains = {4, -2, 0, 7};\nSystem.out.println(positiveTotal(gains));\nSystem.out.println(positiveCount(gains));', '    public static int positiveTotal(int[] gains) {\n        int total = 0;\n        for (int i = 0; i < gains.length; i++) {\n            if (gains[i] > 0) {\n                total += gains[i];\n            }\n        }\n        return total;\n    }\n\n    public static int positiveCount(int[] gains) {\n        int count = 0;\n        for (int i = 0; i < gains.length; i++) {\n            if (gains[i] > 0) {\n                count++;\n            }\n        }\n        return count;\n    }'),
    cases: [inputCase('', '11\n2'), ...[[4, -2, 0, 7], [-5, -1], [], [0], [20], [-20], [20, 20, 20, 20, 20, 20, 20, 20], [-8, 3, 1, -2, 9]].flatMap(values => [...arrayCases('positiveTotal', values, [], values.filter(value => value > 0).reduce((sum, value) => sum + value, 0)), ...arrayCases('positiveCount', values, [], values.filter(value => value > 0).length)])],
    requirements: { methods: [{ name: 'positiveTotal', returns: 'int', parameters: ['int[]'], used: true }, { name: 'positiveCount', returns: 'int', parameters: ['int[]'], used: true }], loops: { for: 1 }, scope: 'positiveTotal' },
    sources: [positiveSource],
  },
  {
    ...base, id: 'challenge-count-matches', unit: 'arrays', title: 'Count matches', topic: 'Array traversal and positions', estimatedMinutes: '15–20',
    prerequisites: ['java-for', 'java-accumulator', 'java-methods', 'java-returns', 'java-conditionals', 'java-arrays'],
    task: 'Complete two methods using `for` loops. `countMatches(int[] readings, int target)` returns how many values equal `target`. `firstMatch(int[] readings, int target)` returns the first matching index, or -1 when there is no match. Indexes start at 0. An empty array has count 0 and first index -1. Leave the array unchanged and do not print inside either method. Keep `main`: line 1 prints the count; line 2 prints the first index.',
    inputLimits: ['`readings` contains 0–8 whole numbers. Every value and `target` are from -10 through 10.', 'Keep each method’s name, return type, and parameters as shown in the starter. Checks call both methods directly.'],
    examples: [{ input: 'readings = {3, 1, 3, 3}, target = 3', output: '3\n0' }, { input: 'readings = {2, 4, 6}, target = 5', output: '0\n-1' }],
    starter: program('int[] readings = {3, 1, 3, 3};\nSystem.out.println(countMatches(readings, 3));\nSystem.out.println(firstMatch(readings, 3));', '    public static int countMatches(int[] readings, int target) {\n        return 0;\n    }\n\n    public static int firstMatch(int[] readings, int target) {\n        return -1;\n    }'),
    solution: program('int[] readings = {3, 1, 3, 3};\nSystem.out.println(countMatches(readings, 3));\nSystem.out.println(firstMatch(readings, 3));', '    public static int countMatches(int[] readings, int target) {\n        int count = 0;\n        for (int i = 0; i < readings.length; i++) {\n            if (readings[i] == target) {\n                count++;\n            }\n        }\n        return count;\n    }\n\n    public static int firstMatch(int[] readings, int target) {\n        int first = -1;\n        for (int i = 0; i < readings.length; i++) {\n            if (readings[i] == target && first == -1) {\n                first = i;\n            }\n        }\n        return first;\n    }'),
    cases: [inputCase('', '3\n0'), ...[[[3, 1, 3, 3], 3], [[2, 4, 6], 5], [[], 0], [[0], 0], [[-10, 0, -10], -10], [[10, 10, 10, 10, 10, 10, 10, 10], 10], [[1, 2, 3, 4], 4], [[2, 3, 3, 4], 3]].flatMap(([values, target]) => [...arrayCases('countMatches', values, [target], values.filter(value => value === target).length), ...arrayCases('firstMatch', values, [target], values.indexOf(target))])],
    requirements: { methods: [{ name: 'countMatches', returns: 'int', parameters: ['int[]', 'int'], used: true }, { name: 'firstMatch', returns: 'int', parameters: ['int[]', 'int'], used: true }], loops: { for: 1 }, scope: 'countMatches' },
    sources: [arraySource],
  },
];

// Run uses three visible cases; Submit also checks the larger boundary set.
for (const challenge of independentChallenges) {
  const cases = challenge.cases;
  if (!cases[0].input && !cases[0].inputs && !cases[0].invocation) cases[0].label = challenge.examples[0].input;
  if (challenge.id === 'challenge-battery-budget') cases.push(...variableCases(Array.from({ length: 13 }, (_, i) => ({ energy: 40 + i * 7, moves: i + 1, costPerMove: i % 5 + 1 })), v => `${v.moves * v.costPerMove}\n${v.energy - v.moves * v.costPerMove}`).map(c => ({ ...c, mutate: true })));
  if (challenge.id === 'challenge-prize-tokens') cases.push(...variableCases(Array.from({ length: 13 }, (_, i) => ({ score: 17 + i * 31, pointsPerToken: i + 2 })), v => `${Math.floor(v.score / v.pointsPerToken)}\n${v.score % v.pointsPerToken}`).map(c => ({ ...c, mutate: true })));
  if (challenge.id === 'challenge-round-points' || challenge.id === 'challenge-square-total') {
    for (let rounds = 0; cases.length < 20; rounds++) if (!cases.some(c => c.inputs.rounds === rounds)) {
      const sum = rounds * (rounds + 1) / 2, squares = rounds * (rounds + 1) * (2 * rounds + 1) / 6;
      cases.push({ input: '', inputs: { rounds }, mutate: true, label: `rounds = ${rounds}`, expected: challenge.id === 'challenge-round-points' ? `${sum}\n${rounds * (rounds + 1) * (rounds + 2) / 6}` : `${squares}\n${squares - sum}` });
    }
  }
  if (challenge.id === 'challenge-trip-cost') for (const [out, back, cost] of [[1, 9, 2], [11, 7, 0], [100, 100, 10], [38, 17, 4]]) {
    cases.push(call(`tripCost(${out}, ${cost})`, out * cost), call(`roundTripCost(${out}, ${back}, ${cost})`, (out + back) * cost));
  }
  if (challenge.id === 'challenge-match-score') for (const [rounds, bonus] of [[2, 11], [8, 0], [17, 30]]) {
    cases.push(call(`matchScore(${rounds}, ${bonus})`, 3 * rounds * (rounds + 1) / 2 + bonus), call(`rematchScore(${rounds}, ${bonus})`, 3 * (rounds + 1) ** 2 + bonus));
  }
  if (challenge.id === 'challenge-battery-signal') for (const value of [2, 10, 18, 21, 30, 40, 60, 70, 78, 81, 90]) cases.push(inputCase(String(value), `${value < 20 ? 'CHARGE' : value < 80 ? 'READY' : 'FULL'}\n${Math.max(0, 80 - value)}`));
  if (challenge.id === 'challenge-charge-time') for (let i = 0; i < 12; i++) {
    const charge = i * 7, target = 100 - i * 3, rate = i + 1, minutes = Math.max(0, Math.ceil((target - charge) / rate));
    cases.push(inputCase(`${charge} ${target} ${rate}`, `${minutes}\n${charge + minutes * rate}`));
  }
  challenge.publicCases = cases.slice(0, 3);
}

const publicMethods = {
  'challenge-trip-cost': [['tripCost(4, 3)', 'roundTripCost(4, 6, 3)', '12\n30'], ['tripCost(0, 8)', 'roundTripCost(0, 5, 8)', '0\n40'], ['tripCost(7, 2)', 'roundTripCost(7, 3, 2)', '14\n20']],
  'challenge-match-score': [['matchScore(3, 5)', 'rematchScore(3, 5)', '23\n53'], ['matchScore(0, 7)', 'rematchScore(0, 7)', '7\n10'], ['matchScore(4, 2)', 'rematchScore(4, 2)', '32\n77']],
};
for (const challenge of independentChallenges) {
  if (publicMethods[challenge.id]) challenge.publicCases = publicMethods[challenge.id].map(([first, second, expected]) => ({ input: '', invocation: `System.out.println(Student.${first}); System.out.println(Student.${second});`, label: `${first}\n${second}`, expected }));
  if (challenge.id === 'challenge-positive-gains') challenge.publicCases = [[4, -2, 0, 7], [-5, -1], []].map(values => ({
    input: '', label: `gains = {${values.join(', ')}}`, invocation: `int[] gains = {${values.join(', ')}}; System.out.println(Student.positiveTotal(gains)); System.out.println(Student.positiveCount(gains));`,
    expected: `${values.filter(v => v > 0).reduce((sum, v) => sum + v, 0)}\n${values.filter(v => v > 0).length}`,
  }));
  if (challenge.id === 'challenge-count-matches') challenge.publicCases = [[[3, 1, 3, 3], 3], [[2, 4, 6], 5], [[], 0]].map(([values, target]) => ({
    input: '', label: `readings = {${values.join(', ')}}; target = ${target}`, invocation: `int[] readings = {${values.join(', ')}}; System.out.println(Student.countMatches(readings, ${target})); System.out.println(Student.firstMatch(readings, ${target}));`,
    expected: `${values.filter(v => v === target).length}\n${values.indexOf(target)}`,
  }));
}
