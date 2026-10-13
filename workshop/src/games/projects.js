const duration = '2–3 sessions · 45–60 minutes each';
const basics = ['hello-java', 'java-declare', 'java-types', 'java-variables', 'java-expressions', 'java-strings'];
const repetition = [...basics, 'java-for', 'debug-loop-boundary', 'java-nested', 'java-accumulator', 'debug-reset-total', 'java-constants'];
const atFinish = (end, world) => ['x', 'y', 'dir'].every(key => end.robot[key] === world.finish[key]);
const verdict = (passed, message) => ({ passed, message });
const program = body => `public class Student {\n    public static void main(String[] args) {\n${body.split('\n').map(line => `        ${line}`).join('\n')}\n    }\n}\n`;

function relayWorld(gap = 2, energy = 50, costPerTile = 2) {
  return {
    width: gap + 3, height: 5,
    robot: { x: 1, y: 3, dir: 'E' }, finish: { x: gap + 1, y: 2, dir: 'N' },
    walls: [], hurdles: [], hoops: [],
    items: [{ id: 'supply-1', kind: 'part', x: gap + 1, y: 3 }],
    characters: [{ id: 'depot', kind: 'customer', x: gap + 1, y: 1, accepts: ['part'], reply: 'Supply received.' }],
    signs: [{ x: 1, y: 4, text: 'Start →' }],
    variables: { gap, energy, costPerTile },
    data: { gap, supplies: 1, energy, costPerTile, travel: gap + 1, remaining: energy - (gap + 1) * costPerTile },
  };
}

const relaySolution = program(`final int gap = 2;
final int energy = 50;
final int costPerTile = 2;
int travel = gap + 1;
int remaining = energy - travel * costPerTile;
System.out.println("move " + gap);
System.out.println("pick up");
System.out.println("turn left");
System.out.println("move");
System.out.println("drop");
System.out.println("Delivered 1 part; energy " + remaining);`);

function staircaseWorld(size) {
  const baseline = size + 1;
  return {
    width: size + 3, height: size + 3,
    robot: { x: 1, y: baseline, dir: 'E' }, finish: { x: 1, y: 1, dir: 'E' },
    walls: [], hurdles: [], items: [], characters: [], hoops: [],
    targets: Array.from({ length: size }, (_, row) => Array.from({ length: row + 1 }, (_, col) => ({ x: col + 1, y: baseline - row, color: 'blue' }))).flat(),
    signs: [{ x: 0, y: baseline, text: 'Start →' }, { x: 0, y: 1, text: 'Finish →' }],
    constants: { SIZE: size }, data: { size, total: size * (size + 1) / 2 },
  };
}

const staircaseSolution = `public class Student {
    public static final int SIZE = 4;

    public static void main(String[] args) {
        int total = 0;
        for (int row = 1; row <= SIZE; row++) {
            for (int col = 1; col <= row; col++) {
                System.out.println("paint blue");
                System.out.println("move");
                total++;
            }
            System.out.println("turn right");
            System.out.println("turn right");
            System.out.println("move " + row);
            System.out.println("turn right");
            System.out.println("move");
            System.out.println("turn right");
        }
        System.out.println("Painted " + total + " tiles");
    }
}
`;

function towerWorld(towers) {
  const baseline = towers + 1;
  return {
    width: towers * 2 + 3, height: towers + 3,
    robot: { x: 0, y: baseline, dir: 'E' }, finish: { x: 0, y: baseline, dir: 'E' },
    walls: [], hurdles: [], hoops: [],
    items: Array.from({ length: towers }, (_, tower) => Array.from({ length: tower + 1 }, (_, level) => ({ id: `tower-${tower + 1}-${level + 1}`, kind: 'part', x: 2 * (tower + 1), y: baseline - level - 1 }))).flat(),
    characters: [{ id: 'depot', kind: 'customer', x: towers * 2 + 2, y: baseline, accepts: ['part'], reply: 'Rescue cargo received.' }],
    signs: [{ x: 0, y: baseline + 1, text: 'Home →' }],
    constants: { TOWERS: towers }, data: { towers, total: towers * (towers + 1) / 2 },
  };
}

const towerSolution = `public class Student {
    public static final int TOWERS = 4;

    public static void main(String[] args) {
        int parts = supplyCount(TOWERS);
        for (int tower = 1; tower <= TOWERS; tower++) {
            System.out.println("move 2");
            collectTower(tower);
        }
        System.out.println("move");
        deliver(parts);
        turnAround();
        System.out.println("move " + (2 * TOWERS + 1));
        turnAround();
        System.out.println("Recovered " + parts + " parts");
    }

    public static void turnAround() {
        System.out.println("turn left");
        System.out.println("turn left");
    }

    public static void collectTower(int height) {
        System.out.println("turn left");
        for (int step = 0; step < height; step++) {
            System.out.println("move");
            System.out.println("pick up");
        }
        turnAround();
        for (int step = 0; step < height; step++) {
            System.out.println("move");
        }
        System.out.println("turn left");
    }

    public static int supplyCount(int towers) {
        int total = 0;
        for (int tower = 1; tower <= towers; tower++) {
            total += tower;
        }
        return total;
    }

    public static void deliver(int count) {
        for (int item = 0; item < count; item++) {
            System.out.println("drop");
        }
    }
}
`;

function towerProbe(height) {
  return {
    width: 5, height: height + 3,
    robot: { x: 2, y: height + 1, dir: 'E' }, finish: { x: 2, y: height + 1, dir: 'E' },
    walls: [], hurdles: [], hoops: [], characters: [], signs: [],
    items: Array.from({ length: height }, (_, i) => ({ id: `probe-${i}`, kind: 'part', x: 2, y: height - i })),
    data: { height },
  };
}

const towerBody = towerSolution.slice(towerSolution.indexOf('        System.out.println("turn left");', towerSolution.indexOf('public static void collectTower')), towerSolution.indexOf('\n    }', towerSolution.indexOf('public static void collectTower')));
const emptyTowerWithInlineWork = towerSolution
  .replace('            collectTower(tower);', `            collectTower(tower);\n${towerBody.replaceAll('height', 'tower')}`)
  .replace(towerBody, '');

export const projects = [
  {
    id: 'supply-relay', title: 'Supply Relay', project: true, unit: 'basics', duration: '1 session · 30–60 minutes',
    summary: 'Pick up one supply, deliver it, and calculate the energy left.', estimatedMinutes: [30, 60],
    prerequisites: basics,
    topics: ['Variables and assignment', 'Arithmetic and precedence', 'Strings and concatenation', 'Ordered instructions'],
    commands: ['move', 'turn', 'pick', 'drop'],
    lockedInputs: { gap: 2, energy: 50, costPerTile: 2 },
    brief: 'Pip starts at (1, 3), facing east. One supply is `gap` tiles east. Pick it up, turn north, and move one tile. The depot is directly ahead: drop the supply there and finish facing north. Coordinates start at zero; north decreases the row number.\n\nPrint commands to control Pip. `System.out.println("move " + gap);` moves `gap` tiles. `System.out.println("pick up");` collects the supply on the current tile. `System.out.println("turn left");` faces north from east. `System.out.println("move");` moves one tile. `System.out.println("drop");` delivers the held supply to the depot directly ahead. Other printed text is speech.\n\nThe supplied lines for `gap`, `energy`, and `costPerTile` stay locked. Use their values in your commands and calculations. The supplied `final` keyword keeps each input unchanged while the program runs. Create `travel` and `remaining` for your results. Turns, pickup, delivery, and speech cost zero energy.\n\nExample 1 uses `gap = 2`, `energy = 50`, and `costPerTile = 2`: travel is 3 tiles, so 44 energy remains. Submit supplies `gap` from 1 to 6, `energy` from 60 to 140, and `costPerTile` from 1 to 3, with a matching board. Those values change automatically in temporary copies; the saved Java stays unchanged.',
    task: 'Deliver the one supply and finish at the delivery tile facing north. Calculate `travel` from `gap` and remaining energy from the supplied values. Print `Delivered 1 part; energy N` with `remaining` in place of `N`. Use ordinary statements.',
    hint: 'Count the eastward tiles and the one northward tile. Multiplication happens before subtraction in `energy - travel * costPerTile`.',
    milestones: [
      { title: 'Plan the route', text: 'Trace the route from Pip to the supply, then one tile north to the delivery tile.', check: 'The sample travels 3 tiles and finishes at (3, 2), facing north.' },
      { title: 'Pick up the supply', text: 'Move `gap` tiles east, then pick up the one part.', check: 'The pickup tile is empty and Pip holds 1 part.' },
      { title: 'Deliver the supply', text: 'Turn left, move one tile, and drop the part to the depot ahead. Finish there.', check: 'The depot has 1 part. Pip faces north and holds nothing.' },
      { title: 'Calculate energy', text: 'Calculate `travel` using `gap`. Calculate `remaining` by subtracting `travel` times `costPerTile` from `energy`. Print `remaining` in the report.', check: 'Sample: Delivered 1 part; energy 44. With `gap = 4`, `energy = 60`, and `costPerTile = 3`, 45 remains.' },
      { title: 'Check different routes', text: 'Run the three examples, then Submit. Compare the changed `gap` and `energy` values with each result. Explain how the same movement line reaches the supply on every board.', check: 'Every board passes with the supplied input lines unchanged.' },
    ],
    refresher: [
      { title: 'What does this print?', code: 'int supplies = 8;\nint delivered = 3;\nsupplies = supplies - delivered;\nSystem.out.println("Left: " + supplies);', choices: ['Left: 5', 'Left: 8', 'Left: supplies'], answer: 0, response: 'Assignment replaces `supplies` with `8 - 3`. Concatenation includes its current value, so the output is Left: 5.' },
      { title: 'How much energy remains?', code: 'int energy = 30;\nint tiles = 4;\nint cost = 3;\nint remaining = energy - tiles * cost;\nSystem.out.println(remaining);', choices: ['78', '18', '26'], answer: 1, response: 'Multiplication is first: 4 * 3 costs 12 energy. Subtracting 12 from 30 leaves 18.' },
      { title: 'Which command line reaches the robot?', code: 'int gap = 2;\nSystem.out.println("move " + gap);', choices: ['move gap', 'move + 2', 'move 2'], answer: 2, response: 'The space belongs to the string. Java concatenates the value 2 to produce move 2, which moves two tiles in the current direction.' },
    ],
    sources: [{ title: 'Stanford: Collect Newspaper Karel', url: 'https://web.stanford.edu/class/archive/cs/cs106a/cs106a.1226/handouts/05-assignment1.html', adaptation: 'Original one-supply delivery puzzle inspired by the assignment’s short pickup route. Adds supplied variables and an energy calculation; method decomposition starts in Module 3.' }],
    starter: program('final int gap = 2;\nfinal int energy = 50;\nfinal int costPerTile = 2;\n\nint travel = 0; // Calculate the travelled tiles using gap.\nint remaining = 0; // Calculate the energy left.\n\n// Print commands to pick up and deliver the supply.\nSystem.out.println("Delivered 1 part; energy " + remaining);'),
    solution: relaySolution,
    requirements: { variables: { gap: 'int', energy: 'int', costPerTile: 'int', travel: 'int', remaining: 'int' }, uses: ['gap', 'energy', 'travel', 'costPerTile'], prints: ['remaining'], unchanged: ['gap', 'energy', 'costPerTile'] },
    sampleWorld: relayWorld(),
    world: (rng, _level, checkIndex) => checkIndex === 0 ? relayWorld(1, 60, 1) : checkIndex === 1 ? relayWorld(6, 140, 3) : relayWorld(1 + Math.floor(rng() * 6), 60 + Math.floor(rng() * 81), 1 + Math.floor(rng() * 3)),
    goal(end, world) {
      if ((end.delivered.depot?.part || 0) !== 1 || end.ground.length || (end.held.part || 0)) return verdict(false, `Delivered ${end.delivered.depot?.part || 0} of 1 part.`);
      if (!atFinish(end, world)) return verdict(false, 'The final position or direction does not match the delivery tile.');
      if (!end.said.includes(`Delivered 1 part; energy ${world.data.remaining}`)) return verdict(false, `Expected report: Delivered 1 part; energy ${world.data.remaining}`);
      return verdict(true, `One supply delivered; ${world.data.remaining} energy remaining.`);
    },
    rejects: [
      { label: 'turns away from the depot', source: relaySolution.replace('System.out.println("turn left");', 'System.out.println("turn right");') },
      { label: 'skips the supply', source: relaySolution.replace('System.out.println("pick up");', '') },
      { label: 'reports starting energy without paying for travel', source: relaySolution.replace('energy - travel * costPerTile', 'energy - 0 * travel * costPerTile') },
      { label: 'hardcodes 44 with decorative variables', source: relaySolution.replace('energy - travel * costPerTile', '44 + 0 * energy * travel * costPerTile') },
      { label: 'hardcodes the sample movement distance', source: relaySolution.replace('System.out.println("move " + gap);', 'System.out.println("move 2");') },
      { label: 'hardcodes three travelled tiles', source: relaySolution.replace('int travel = gap + 1;', 'int travel = 3 + 0 * gap;') },
      { label: 'changes a supplied input declaration', source: relaySolution.replace('final int gap = 2;', 'final int gap = 4;') },
    ],
  },
  {
    id: 'staircase-arena', title: 'Staircase Arena', project: true, unit: 'loops', duration,
    summary: 'Use nested loops to paint a staircase that scales to different sizes.', estimatedMinutes: [90, 180],
    prerequisites: repetition,
    topics: ['Nested for loops', 'Changing loop bounds', 'Accumulators', 'Class constants', 'Route planning'],
    commands: ['move', 'turn', 'paint'],
    brief: 'Restore a blue staircase on the arena floor. The outlined tiles are the exact target. The bottom row has 1 tile, the next row 2, and the top row `SIZE`. Pip begins at the left end of the bottom row, facing east. All rows begin in column 1.\n\nFor each row, paint its tiles and return to column 1, one row north, facing east. After the final row, that position is the finish tile at (1, 1). Paint only the target tiles. Empty travel tiles remain unpainted.\n\n`System.out.println("paint blue");` paints the current tile. `System.out.println("move");` advances one tile. `System.out.println("move " + row);` advances `row` tiles. Use `turn left` or `turn right` to change direction. Printing the command strings is the entire robot interface.\n\nThe sample uses `SIZE = 4`, with rows of 1, 2, 3, and 4 tiles: 10 tiles total. Checks change the supplied class constant `SIZE` from 2 through 13 and build a matching board. Use `SIZE` everywhere the overall size matters. There is no input to read.',
    task: 'Use nested for loops to paint exactly the blue target, return to the finish facing east, and say `Painted N tiles`, replacing `N` with the running total. Declare the supplied `SIZE` class constant and support every size from 2 through 13.',
    hint: 'For row r, the inner loop runs r times. Painting then moving each time ends one tile beyond that row. Turn around, move r tiles back, then move one row north and face east. Initialize total before both loops.',
    milestones: [
      { title: 'Find the pattern', text: 'For `SIZE = 4`, make a table of row number, tiles painted, and cumulative total. Repeat the table for `SIZE = 2`.', check: 'The totals are 1, 3, 6, 10 for size 4 and 1, 3 for size 2.' },
      { title: 'Build one row', text: 'Paint and advance across one row. Work out how to return to column 1 and move one row north, facing east.', check: 'The row has the expected number of blue tiles and the next row begins from a predictable pose.' },
      { title: 'Nest the repetition', text: 'Use an outer loop for rows and an inner loop whose bound depends on the row. Count each painted tile with `total`.', check: '`SIZE = 4` forms a complete staircase with no extra painted tiles.' },
      { title: 'Scale the arena', text: 'Use the `SIZE` class constant to control the pattern. Run the checks on changed sizes and compare each board with its target.', check: 'The same source solves small and large boards and finishes at (1, 1), facing east.' },
      { title: 'Test the count', text: 'Print `total` after both loops. Explain what changes if `total` is reset at the start of every row, then verify the correct version.', check: 'Every size reports the exact painted count; size 13 reports 91 tiles.' },
    ],
    refresher: [
      { title: 'How many times does `total` increase?', code: 'int total = 0;\nfor (int row = 1; row <= 3; row++) {\n    for (int col = 1; col <= row; col++) {\n        total++;\n    }\n}', choices: ['3', '6', '9'], answer: 1, response: 'The inner loop runs 1, then 2, then 3 times. Together these add 6 to `total`.' },
      { title: 'What is printed after this reset?', code: 'int total = 0;\nfor (int row = 1; row <= 3; row++) {\n    total = 0;\n    total += row;\n}\nSystem.out.println(total);', choices: ['3', '6', '0'], answer: 0, response: 'Each iteration erases the previous total. The final iteration assigns 0 and adds 3. An accumulator must be initialized once, before the loop.' },
      { title: 'What changes when `SIZE` becomes 5?', code: 'public static final int SIZE = 3;\n\n// Inside main:\nfor (int row = 1; row <= SIZE; row++) {\n    System.out.println("Row " + row);\n}', choices: ['Nothing; final prevents using the value', 'Only Row 5 prints', 'Five numbered lines print instead of three'], answer: 2, response: 'Changing the declaration before running changes the loop bound. `final` prevents reassignment while the program runs; it does not prevent editing the starting constant.' },
    ],
    sources: [{ title: 'University of Washington: Space Needle', url: 'https://courses.cs.washington.edu/courses/cse142/21su/assessments/a2/', adaptation: 'Original robot painting puzzle based on the assignment’s growing row patterns, nested loops, size constant, and staged testing. It uses a staircase rather than the published artwork, and does not require methods before they are taught.' }],
    starter: 'public class Student {\n    public static final int SIZE = 4;\n\n    public static void main(String[] args) {\n        int total = 0;\n        // Row 1 has 1 tile; row 2 has 2; continue through SIZE.\n        // Paint the current tile with System.out.println("paint blue");\n        // Add nested loops, movement, and an accumulator.\n        System.out.println("Painted " + total + " tiles");\n    }\n}\n',
    solution: staircaseSolution,
    requirements: { constants: { SIZE: 'int' }, variables: { total: 'int' }, nested: { for: 2 }, uses: ['SIZE'], prints: ['total'] },
    sampleWorld: staircaseWorld(4), world: rng => staircaseWorld(2 + Math.floor(rng() * 12)),
    goal(end, world) {
      const painted = new Map(end.painted.map(tile => [`${tile.x},${tile.y}`, tile.color]));
      if (painted.size !== world.targets.length || world.targets.some(tile => painted.get(`${tile.x},${tile.y}`) !== tile.color)) return verdict(false, `Paint exactly the outlined staircase blue: ${world.data.total} tiles for SIZE = ${world.data.size}. Check the inner loop’s row-dependent bound.`);
      if (!atFinish(end, world)) return verdict(false, 'The staircase is painted. Finish at (1, 1), facing east, without painting that finish tile.');
      if (!end.said.includes(`Painted ${world.data.total} tiles`)) return verdict(false, `The final report should be Painted ${world.data.total} tiles. Keep the accumulator outside both loops.`);
      return verdict(true, `All ${world.data.total} staircase tiles are blue, and Pip reached the finish.`);
    },
    rejects: [
      { label: 'empty inner loop with no painted tiles', source: staircaseSolution.replace('System.out.println("paint blue");', '').replace('System.out.println("move");\n                total++;', '') },
      { label: 'fixed sample total', source: staircaseSolution.replace('"Painted " + total', '"Painted " + (10 + total * 0)') },
      { label: 'resets the accumulator every row', source: staircaseSolution.replace('for (int col = 1;', 'total = 0;\n            for (int col = 1;') },
      { label: 'paints a rectangle rather than the staircase', source: staircaseSolution.replace('col <= row', 'col <= SIZE') },
    ],
  },
  {
    id: 'tower-rescue', title: 'Tower Rescue', project: true, unit: 'methods', duration,
    summary: 'Build reusable methods to collect towers of supplies and deliver the total.', estimatedMinutes: [90, 180],
    prerequisites: [...repetition, 'java-methods', 'java-returns'],
    topics: ['Method decomposition', 'Parameters and arguments', 'Return values', 'For loops', 'Cumulative totals'],
    commands: ['move', 'turn', 'pick', 'drop'],
    brief: 'Recover every part from the towers and deliver the cargo to the depot. Pip starts at column 0 on the bottom travel row, facing east. Tower t is at column 2 * t and contains t parts, one per tile north of its base. The first tower is 2 tiles east; the next base is always 2 tiles farther east.\n\nFrom a tower base, face north, move and pick up once per part, return to that same base, then face east. After the last tower, move one tile east to face the depot and drop all the parts. The depot is one tile ahead. Return to column 0 on the travel row, facing east.\n\nUse printed commands: `System.out.println("move");`, `System.out.println("move 2");`, `System.out.println("turn left");`, `System.out.println("pick up");`, and `System.out.println("drop");`. Picking uses the current tile; dropping uses the tile ahead. Your own Java methods group these commands. They are not built-in robot methods.\n\nThe sample has `TOWERS = 4`, with heights 1, 2, 3, and 4: 10 parts. Checks change the supplied `TOWERS` class constant from 2 through 13. Dimensions are known, so no sensors, conditions, while loops, arrays, or Scanner are needed. Start with one method before combining the whole route.',
    task: 'Implement and use the four documented methods. Rescue every part, deliver the exact total, return home facing east, and say `Recovered N parts`. Methods are also checked independently with different arguments, so they must use their parameters rather than the sample’s values.',
    hint: 'A helper’s ending position and direction matter to its next caller. Make collectTower(height) return to its starting tile facing east. Calculate the sum 1 through towers in supplyCount and return it; do not only print it. Reuse the returned count in deliver.',
    methods: [
      { signature: 'public static void turnAround()', description: 'Turn 180 degrees without moving. This must work from any facing direction.' },
      { signature: 'public static void collectTower(int height)', description: 'Start at a tower base facing east. Collect its `height` parts, one tile northward at a time. Finish at the same base facing east. Height may be zero.' },
      { signature: 'public static int supplyCount(int towers)', description: 'Return the sum of 1 through `towers`, using a loop and a running total. Zero towers returns 0. Do not print or move here.' },
      { signature: 'public static void deliver(int count)', description: 'With a customer directly ahead and `count` parts already held, drop `count` parts. Keep the same position and direction. Zero drops prints no commands.' },
    ],
    milestones: [
      { title: 'Name a simple action', text: 'Implement `turnAround` with two turns. Call it twice and trace the direction after each call.', check: 'One call reverses direction without moving; two calls restore the original direction.' },
      { title: 'Solve one tower', text: 'Implement collectTower(height) for height 1, then add counted loops for other heights. Use Run with only the test statements in `main`, then select case 1 to view the sample. The other two cases may fail while this checkpoint is unfinished. For height 1, write `System.out.println("move 2");` then `collectTower(1);`. For height 4, move 8 tiles from home to column 8, facing east, then call `collectTower(4);`. For height 0, call `collectTower(0);` at home without moving. Each case starts with a fresh board. Restore the full main route when combining the project.', check: 'Every call finishes at its starting tile facing east, with exactly `height` more parts held. The zero-height call collects nothing.' },
      { title: 'Return a useful count', text: 'Write supplyCount(towers). Build the total from 1 through `towers` and return it to `main`. Test 0, 1, 4, and 8.', check: 'The return values are 0, 1, 10, and 36. No robot commands or messages are printed by this method.' },
      { title: 'Combine the route', text: 'Use a loop to visit every tower and call `collectTower` with its height. Use the returned total when calling `deliver` at the depot.', check: 'All towers are empty, the depot has the full total, and Pip holds no leftover parts.' },
      { title: 'Return and verify', text: 'Return home, print the recovered total, and test multiple tower counts. Explain how the loop, method parameter, and return value play different roles.', check: 'The full route and the independent method checks pass, including zero-height and zero-count calls.' },
    ],
    refresher: [
      { title: 'What does a second call change?', code: 'public static void announce(String name) {\n    System.out.println("Ready: " + name);\n}\n\n// Inside main:\nannounce("Pip");\nannounce("Bolt");', choices: ['The method is defined twice', 'The same method receives a different argument', 'The first name stays in the parameter forever'], answer: 1, response: 'Each call supplies a value for `name`. The first call prints Ready: Pip; the second prints Ready: Bolt.' },
      { title: 'Which value is printed?', code: 'public static int twice(int value) {\n    return value * 2;\n}\n\n// Inside main:\nint result = twice(3);\nSystem.out.println(result + 1);', choices: ['6', '3', '7'], answer: 2, response: '`twice` returns 6 to its caller. `main` adds 1 and prints 7. Returning a value does not print it.' },
      { title: 'What is returned when `towers` is 4?', code: 'public static int supplyCount(int towers) {\n    int total = 0;\n    for (int i = 1; i <= towers; i++) {\n        total += i;\n    }\n    return total;\n}', choices: ['10', '4', '0'], answer: 0, response: 'The loop adds 1 + 2 + 3 + 4. `total` becomes 10 and is returned after the loop completes.' },
    ],
    sources: [{ title: 'Stanford: Stepwise Refinement', url: 'https://compedu.stanford.edu/karel-reader/docs/java/en/chapter8.html', adaptation: 'Original rescue game using tower collection, decomposition, and method pre/postconditions. Tower counts and heights are explicit; counted loops replace the original sensor-driven while loops so only previously taught topics are required.' }],
    starter: 'public class Student {\n    public static final int TOWERS = 4;\n\n    public static void main(String[] args) {\n        // Start by testing turnAround twice. Then build one tower before the full route.\n        // Tower t has height t; bases are two tiles apart.\n        int parts = supplyCount(TOWERS);\n        // Visit the towers, deliver parts, and return home.\n        System.out.println("Recovered " + parts + " parts");\n    }\n\n    public static void turnAround() {\n        // Turn 180 degrees without moving.\n    }\n\n    public static void collectTower(int height) {\n        // Start and finish at the same tower base, facing east.\n    }\n\n    public static int supplyCount(int towers) {\n        // Return the sum 1 through towers.\n        return 0;\n    }\n\n    public static void deliver(int count) {\n        // Drop count parts into the customer directly ahead.\n    }\n}\n',
    solution: towerSolution,
    requirements: { constants: { TOWERS: 'int' }, loops: { for: 1 }, methods: [
      { name: 'turnAround', returns: 'void', parameters: [], used: true },
      { name: 'collectTower', returns: 'void', parameters: ['int'], used: true },
      { name: 'supplyCount', returns: 'int', parameters: ['int'], used: true },
      { name: 'deliver', returns: 'void', parameters: ['int'], used: true },
    ] },
    sampleWorld: towerWorld(4), world: rng => towerWorld(2 + Math.floor(rng() * 12)),
    goal(end, world) {
      if (end.ground.length) return verdict(false, `${end.ground.length} parts remain on the board. Check every tower, including the last, and use its height parameter.`);
      if ((end.delivered.depot?.part || 0) !== world.data.total || (end.held.part || 0)) return verdict(false, `Deliver all ${world.data.total} parts to the depot. Face it from the tile immediately west and call deliver with the returned total.`);
      if (!atFinish(end, world)) return verdict(false, 'Return to column 0 on the bottom travel row and face east.');
      if (!end.said.includes(`Recovered ${world.data.total} parts`)) return verdict(false, `Use the returned total to say Recovered ${world.data.total} parts.`);
      return verdict(true, `${world.data.total} parts rescued and delivered. Pip is home.`);
    },
    methodCases: [
      ...[0, 1, 4, 8].map(count => ({ label: `supplyCount(${count}) returns the total without printing`, invocation: `System.out.println(Student.supplyCount(${count}));`, expected: String(count * (count + 1) / 2) })),
      ...['E', 'N'].map(dir => ({
        label: `turnAround() reverses ${dir} without moving`, invocation: 'Student.turnAround();',
        world: { ...towerProbe(0), robot: { x: 2, y: 1, dir } },
        goal: end => verdict(end.robot.x === 2 && end.robot.y === 1 && end.robot.dir === (dir === 'E' ? 'W' : 'S'), 'turnAround must reverse direction without moving.'),
      })),
      ...[0, 1, 4].map(height => ({
        label: `collectTower(${height}) collects exactly that tower and restores its pose`, invocation: `Student.collectTower(${height});`, world: towerProbe(height),
        goal: (end, world) => verdict(atFinish(end, world) && end.ground.length === 0 && (end.held.part || 0) === height, 'collectTower must collect the supplied height and return to its base facing east.'),
      })),
      ...[2, 5].map(count => ({
        label: `deliver(${count}) drops exactly the held cargo without moving`,
        invocation: `${Array.from({ length: count }, () => 'System.out.println("pick up");').join('\n')}\nStudent.deliver(${count});`,
        world: {
          ...towerProbe(0),
          items: Array.from({ length: count }, (_, i) => ({ id: `cargo-${i}`, kind: 'part', x: 2, y: 1 })),
          characters: [{ id: 'depot', kind: 'customer', x: 3, y: 1, accepts: ['part'] }],
        },
        goal: (end, world) => verdict(atFinish(end, world) && (end.delivered.depot?.part || 0) === count && (end.held.part || 0) === 0, 'deliver must drop the supplied count into the customer ahead without moving.'),
      })),
      { label: 'deliver(0) emits no commands', invocation: 'Student.deliver(0);', expected: '' },
    ],
    rejects: [
      { label: 'defines a helper but never calls it', source: towerSolution.replace('            collectTower(tower);', '            // Tower helper is never used.') },
      { label: 'uses an empty helper but copies its work into main', source: emptyTowerWithInlineWork },
      { label: 'hardcodes the sample total', source: towerSolution.replace('return total;', 'return 10;') },
      { label: 'misses the final tower', source: towerSolution.replace('tower <= TOWERS', 'tower < TOWERS') },
    ],
  },
];
