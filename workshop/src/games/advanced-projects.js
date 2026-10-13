import { projects as foundations } from './projects.js';

const duration = '2–3 sessions · 45–60 minutes each';
const decisions = [...foundations[2].prerequisites, 'java-conditionals', 'java-while', 'java-scanner'];
const atFinish = (end, world) => ['x', 'y', 'dir'].every(key => end.robot[key] === world.finish[key]);
const verdict = (passed, message) => ({ passed, message });
const matchesPaint = (end, world) => end.painted.length === world.targets.length && world.targets.every(target => end.painted.some(tile => tile.x === target.x && tile.y === target.y && tile.color === target.color));

function patrolWorld(signals) {
  return {
    width: signals.length + 3, height: 5,
    robot: { x: 1, y: 2, dir: 'E' }, finish: { x: 1, y: 2, dir: 'E' },
    walls: [], hoops: [],
    hurdles: signals.flatMap((signal, i) => signal === 2 ? [[i + 2, 2]] : []),
    items: signals.flatMap((signal, i) => signal === 1 ? [{ id: `part-${i}`, kind: 'part', x: i + 2, y: 2 }] : []),
    characters: [{ id: 'depot', kind: 'customer', x: 1, y: 1, accepts: ['part'], reply: 'Patrol cargo received.' }],
    signs: [{ x: 1, y: 4, text: 'Clear return lane' }],
    input: `${signals.join(' ')} -1\n`,
    data: { signals, length: signals.length, parts: signals.filter(signal => signal === 1).length },
  };
}

const patrolSolution = `import java.util.Scanner;

public class Student {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int signal = input.nextInt();
        int distance = 0;
        int collected = 0;
        while (signal != -1) {
            collected += handleTile(signal);
            distance++;
            signal = input.nextInt();
        }
        System.out.println("turn right");
        System.out.println("move");
        System.out.println("turn right");
        for (int step = 0; step < distance; step++) {
            System.out.println("move");
        }
        System.out.println("turn right");
        System.out.println("move");
        for (int item = 0; item < collected; item++) {
            System.out.println("drop");
        }
        System.out.println("turn right");
        System.out.println("Patrol " + distance + " tiles; delivered " + collected + " parts");
    }

    public static int handleTile(int signal) {
        if (signal == 2) {
            System.out.println("jump");
        } else {
            System.out.println("move");
        }
        if (signal == 1) {
            System.out.println("pick up");
            return 1;
        }
        return 0;
    }
}
`;

function mosaicWorld(rows) {
  const height = rows.length, width = rows[0].length;
  return {
    width: width + 3, height: height + 3,
    robot: { x: 1, y: height + 1, dir: 'E' }, finish: { x: 1, y: 1, dir: 'E' },
    walls: [], hurdles: [], items: [], characters: [], hoops: [], signs: [],
    targets: rows.flatMap((row, r) => row.map((value, c) => ({ x: c + 1, y: height + 1 - r, color: value === 1 ? 'blue' : 'yellow' }))),
    input: `${height} ${width}\n${rows.map(row => row.join(' ')).join('\n')}\n`,
    data: { rows, height, width, blue: rows.flat().filter(value => value === 1).length },
  };
}

const mosaicSolution = `import java.util.Scanner;

public class Student {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int rows = input.nextInt();
        int columns = input.nextInt();
        int[][] mosaic = new int[rows][columns];
        for (int row = 0; row < mosaic.length; row++) {
            for (int col = 0; col < mosaic[row].length; col++) {
                mosaic[row][col] = input.nextInt();
            }
        }
        int blue = 0;
        for (int row = 0; row < mosaic.length; row++) {
            blue += paintRow(mosaic[row]);
            System.out.println("turn left");
            System.out.println("move");
            System.out.println("turn right");
        }
        int yellow = rows * columns - blue;
        System.out.println("Blue " + blue + "; yellow " + yellow);
    }

    public static int paintRow(int[] row) {
        int blue = 0;
        for (int col = 0; col < row.length; col++) {
            if (row[col] == 1) {
                System.out.println("paint blue");
                blue++;
            } else {
                System.out.println("paint yellow");
            }
            System.out.println("move");
        }
        System.out.println("turn left");
        System.out.println("turn left");
        for (int step = 0; step < row.length; step++) {
            System.out.println("move");
        }
        System.out.println("turn left");
        System.out.println("turn left");
        return blue;
    }
}
`;

function rowProbe(values) {
  return {
    width: values.length + 3, height: 3,
    robot: { x: 1, y: 1, dir: 'E' }, finish: { x: 1, y: 1, dir: 'E' },
    walls: [], hurdles: [], items: [], characters: [], hoops: [], signs: [],
    targets: values.map((value, i) => ({ x: i + 1, y: 1, color: value === 1 ? 'blue' : 'yellow' })),
    data: { blue: values.filter(value => value === 1).length },
  };
}

export const projects = [
  {
    id: 'signal-patrol', title: 'Signal Patrol', project: true, unit: 'decisions', duration, estimatedMinutes: [90, 180],
    summary: 'Read a trail of signals, choose safe actions, and return the `collected` cargo.',
    prerequisites: decisions,
    topics: ['Scanner input', 'While loops and sentinels', 'If/else decisions', 'Methods and return values', 'Accumulators'],
    commands: ['move', 'turn', 'jump', 'pick', 'drop'],
    brief: 'A list of numbers describes the next tiles on the path. Pip starts at (1, 2), facing east. Each signal describes one tile directly ahead: 0 means clear floor, 1 means a part, and 2 means a hurdle. The final -1 is a stop marker, not a tile. Read a signal, handle that tile, and repeat until -1.\n\nUse `System.out.println("move");` for a clear tile or a part tile. Use `System.out.println("jump");` to advance one tile onto a hurdle safely. After entering a part tile, use `System.out.println("pick up");`. A jump advances exactly one tile; it does not skip the next cell. Track the number of processed tiles and the number of parts picked up.\n\nAt the end of the lane, turn right, move one tile south to row 3, and turn right again. This entire return row is clear. Travel west by the counted distance, turn north, and move back to (1, 2). The depot at (1, 1) is now directly ahead. Drop each part, then face east to finish.\n\nThe sample message is `1 0 2 1 0 2 -1`: collect two parts across six tiles. Run uses three examples; case 1 has the sample message. Submit checks 20 matching messages and boards. You do not type live console responses. No sensor methods or arrays are needed.',
    task: 'Use a `while` loop to stop at -1 and `if`/`else` decisions inside handleTile(int signal) to choose actions. Deliver every part, return home facing east, and print `Patrol D tiles; delivered P parts` using the actual distance and cargo count.',
    inputHelp: 'Space-separated tile codes ending in -1. Codes: 0 = clear, 1 = part, 2 = hurdle. Only -1 ends the message. Generated lanes contain 4–15 tiles. Sample: 1 0 2 1 0 2 -1. Run supplies the message automatically. Choose case 1 to see this sample. Submit uses 20 matching messages and boards.',
    hint: 'Read the first signal before the while loop and the next signal at the end of every iteration. Call handleTile only for real tile codes. Return via row 3 so there is no need to remember hurdle positions.',
    methods: [{ signature: 'public static int handleTile(int signal)', description: 'Handle one tile directly ahead. For 2, jump; otherwise move. For 1, pick up the part and return 1. For 0 or 2, return 0. Keep the same direction. This method receives only 0, 1, or 2; `main` handles `-1`.' }],
    milestones: [
      { title: 'Decode the message', text: 'Trace the sample codes against the six lane tiles. Mark which actions need a decision and identify the stop marker.', check: 'The sample represents six tiles, two parts, and two hurdles. -1 adds neither movement nor cargo.' },
      { title: 'Handle one tile', text: 'Implement handleTile. From the sample start, call handleTile(1) to enter the first tile and collect its part. Use Run, then choose case 1 to view this sample checkpoint. The other examples may fail until the full route is finished.', check: 'Pip is at (2, 2), facing east, with one part. The method returns 1.' },
      { title: 'Read until the stop marker', text: 'Read with Scanner.nextInt. Use a `while` loop to handle each real signal and count distance and `collected` parts.', check: 'The sample ends at (7, 2), facing east, holding two parts. A new signal is read each iteration.' },
      { title: 'Return through the clear lane', text: 'Move to row 3, return west by the counted distance, and approach the depot from its south tile. Drop the counted cargo.', check: 'All parts reach the depot and no hurdle is crossed by an ordinary move.' },
      { title: 'Verify both outcomes', text: 'Face east, print the distance and cargo report, and run checks on changed messages. Explain why a clear tile returns 0 but still increases distance.', check: 'The sample reports `Patrol 6 tiles; delivered 2 parts`. Changed messages produce their own correct reports.' },
    ],
    refresher: [
      { title: 'What happens for signal 2?', code: 'if (signal == 2) {\n    System.out.println("jump");\n} else {\n    System.out.println("move");\n}', choices: ['Only jump is printed', 'Both commands are printed', 'Only move is printed'], answer: 0, response: 'An if/else selects one branch. When `signal` equals `2`, only jump is printed.' },
      { title: 'What prevents this loop from repeating the same signal?', code: 'int signal = input.nextInt();\nwhile (signal != -1) {\n    System.out.println(signal);\n    // Missing line\n}', choices: ['`signal = -1` before the loop', '`signal = input.nextInt();` inside the loop', 'Print `signal` again'], answer: 1, response: 'Reading the next integer inside the loop advances through the message. Eventually -1 makes the condition false.' },
      { title: 'What is the final total?', code: '// Supplied input: 2 0 3 -1\nint total = 0;\nint value = input.nextInt();\nwhile (value != -1) {\n    total += value;\n    value = input.nextInt();\n}\nSystem.out.println(total);', choices: ['4', '-1', '5'], answer: 2, response: 'Only 2, 0, and 3 are added. The stop marker `-1` ends the loop and is not added, giving 5.' },
    ],
    sources: [{ title: 'Stanford: If Statements', url: 'https://compedu.stanford.edu/karel-reader/docs/java/en/chapter7.html', adaptation: 'Original dispatch-and-delivery puzzle using the chapter’s idea of choosing robot actions from conditions. Scanner messages replace Karel sensors, and a clear return lane makes arrays unnecessary.' }],
    starter: 'import java.util.Scanner;\n\npublic class Student {\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        int signal = input.nextInt();\n        int distance = 0;\n        int collected = 0;\n        // Process real signals with a while loop. Do not process -1.\n        // Return via row 3, deliver the cargo, then face east.\n        System.out.println("Patrol " + distance + " tiles; delivered " + collected + " parts");\n    }\n\n    public static int handleTile(int signal) {\n        // Move or jump; pick up a part only for signal 1.\n        // Return 1 for a collected part, otherwise 0.\n        return 0;\n    }\n}\n',
    solution: patrolSolution,
    requirements: { variables: { signal: 'int', distance: 'int', collected: 'int' }, loops: { while: 1 }, calls: ['nextInt'], prints: ['distance', 'collected'], methods: [{ name: 'handleTile', returns: 'int', parameters: ['int'], used: true }] },
    sampleWorld: patrolWorld([1, 0, 2, 1, 0, 2]),
    world(rng) {
      const length = 4 + Math.floor(rng() * 12);
      const signals = Array.from({ length }, () => Math.floor(rng() * 3));
      signals[0] = 1; signals[1] = 0; signals[length - 1] = 2;
      return patrolWorld(signals);
    },
    goal(end, world) {
      if (end.ground.length || (end.delivered.depot?.part || 0) !== world.data.parts || (end.held.part || 0)) return verdict(false, `Deliver all ${world.data.parts} parts from the signal lane. Pick up only after entering a tile marked 1.`);
      if (!atFinish(end, world)) return verdict(false, 'Return via clear row 3 and finish at (1, 2), facing east.');
      if (!end.said.includes(`Patrol ${world.data.length} tiles; delivered ${world.data.parts} parts`)) return verdict(false, 'Report the count of real tile codes and collected parts. Do not count the -1 stop marker.');
      return verdict(true, `${world.data.parts} parts delivered after a ${world.data.length}-tile patrol.`);
    },
    methodCases: [0, 1, 2].map(signal => ({
      label: `handleTile(${signal}) chooses the action and returns the cargo gained`, invocation: `System.out.println("Gained " + Student.handleTile(${signal}));`,
      world: patrolWorld([signal]),
      goal: end => verdict(end.robot.x === 2 && end.robot.y === 2 && end.robot.dir === 'E' && (end.held.part || 0) === (signal === 1 ? 1 : 0) && end.said.includes(`Gained ${signal === 1 ? 1 : 0}`), 'Advance one tile correctly and return 1 only when a part is collected.'),
    })),
    rejects: [
      { label: 'walks into hurdles instead of jumping', source: patrolSolution.replace('System.out.println("jump");', 'System.out.println("move");') },
      { label: 'skips pickup but still reports a part', source: patrolSolution.replace('System.out.println("pick up");', '') },
      { label: 'counts the stop marker as an extra tile', source: patrolSolution.replace('System.out.println("Patrol " + distance', 'System.out.println("Patrol " + (distance + 1)') },
      { label: 'ignores each signal and treats every tile as clear floor', source: patrolSolution.replace('collected += handleTile(signal);\n            distance++;', 'collected += 0 * handleTile(0);') },
    ],
  },
  {
    id: 'mosaic-survey', title: 'Mosaic Survey', project: true, unit: 'arrays', duration, estimatedMinutes: [90, 180],
    summary: 'Read a tile map into a 2D array and paint its rows with reusable methods.',
    prerequisites: [...decisions, 'java-arrays', 'debug-array-bounds', 'java-references', 'java-2d-arrays'],
    topics: ['2D arrays', 'Array traversal and bounds', 'Arrays as method arguments', 'Nested loops', 'Conditions and returned totals'],
    commands: ['move', 'turn', 'paint'],
    brief: 'Paint the board to match the input. Input begins with `rows` and `columns`, then one 0 or 1 for every cell. Store the full map in `int[][] mosaic` before painting. A 1 means blue and a 0 means yellow. Every cell is painted, including zeros.\n\nArray row 0 is the bottom row on the board; each following row is one tile north. Column 0 is the leftmost painted tile, at board column 1. Pip starts at the first cell of array row 0, facing east. A row’s values are read left to right.\n\nBuild paintRow(int[] row): paint each current tile from its array value, move east after each tile, return to the row’s first tile, and face east. Return the number of blue cells. The caller moves one row north between calls, including after the final row, to reach the finish at (1, 1). Leave the supplied `row` unchanged.\n\nUse `System.out.println("paint blue");` or `System.out.println("paint yellow");`, then `System.out.println("move");`. Turns are printed as `turn left` or `turn right`. After painting all rows, print the counts in `blue` and `yellow`. The sample has 3 rows, 4 columns, 7 blue cells, and 5 yellow cells.\n\nRun uses three examples with matching input and boards; case 1 is the sample. Submit checks 20 boards. There are no files to open, sensor APIs, collections, or extra drawing libraries.',
    task: 'Read the full input into `int[][] mosaic` using nested loops. Implement and call paintRow(int[] row), match every target color, finish at (1, 1) facing east, and print `Blue B; yellow Y` with the actual totals. Support 1–7 rows and 1–10 columns.',
    inputHelp: 'First two whole numbers: `rows`, `columns`. Then `rows * columns` values (0 yellow, 1 blue), grouped from bottom row to top row. Sample: 3 4 / 1 0 1 1 / 0 1 0 0 / 1 1 1 0 (slashes mean line breaks). Run supplies the input automatically. Case 1 is this sample; the other two cases have their own input and boards.',
    hint: 'Use `mosaic`.length for the number of rows and `mosaic`[row].length for that row’s width. Pass `mosaic`[row] to paintRow. Count blue cells from each returned value; yellow is total cells minus blue.',
    methods: [{ signature: 'public static int paintRow(int[] row)', description: 'Start at the row’s leftmost tile, facing east. Paint 1 as blue and 0 as yellow, then return to that same tile facing east. Return the number of blue cells. Leave the array unchanged. An empty array paints nothing and returns 0.' }],
    milestones: [
      { title: 'Read the map', text: 'Read rows and columns, allocate `mosaic`, and use nested loops to store each value. Trace the sample’s array indices alongside its board coordinates.', check: '`mosaic`[0][0] is the bottom-left blue cell; `mosaic`[1][0] is yellow. The 3 × 4 sample contains 12 values.' },
      { title: 'Paint one array row', text: 'Implement paintRow. Pass the first stored row to it, then use Run and choose case 1 to view that row on the sample board. The complete project may still fail at this checkpoint.', check: 'The bottom row is blue, yellow, blue, blue. Pip returns to its first tile, facing east, and the method returns 3.' },
      { title: 'Compose all rows', text: 'Traverse `mosaic`. Call paintRow once per row, then move one tile north and face east for the next row.', check: 'All target tiles match their colors, and the final northward move reaches (1, 1).' },
      { title: 'Report the survey', text: 'Add the returned blue counts. Calculate yellow as rows * columns - blue. Confirm that reading or painting did not overwrite the array values.', check: 'The sample report is `Blue 7; yellow 5`; the two totals add up to 12.' },
      { title: 'Test boundary maps', text: 'Run checks on changing widths, heights, and patterns. Explain why the bounds use < rather than <=. Independent helper checks include empty, all-yellow, and mixed rows.', check: 'The same program handles a 1 × 1 map, the largest 7 × 10 map, and rows that return zero blue cells.' },
    ],
    refresher: [
      { title: 'Which index reads the last cell?', code: 'int[] row = {1, 0, 1, 1};', choices: ['`row[row.length]`', '`row[row.length - 1]`', '`row[0]`'], answer: 1, response: 'An array of length 4 has indices 0 through 3. `row.length - 1` is the last valid index.' },
      { title: 'How many blue cells does this count?', code: 'int[][] map = {{1, 0, 1}, {0, 1, 0}};\nint blue = 0;\nfor (int r = 0; r < map.length; r++) {\n    for (int c = 0; c < map[r].length; c++) {\n        if (map[r][c] == 1) blue++;\n    }\n}', choices: ['2', '6', '3'], answer: 2, response: 'The first row has two ones and the second has one. The nested loops count three blue cells.' },
      { title: 'Does changing the alias change the original row?', code: 'int[] row = {1, 0};\nint[] sameRow = row;\nsameRow[0] = 0;\nSystem.out.println(row[0]);', choices: ['Yes; it prints 0', 'No; it prints 1', 'It does not compile'], answer: 0, response: 'Both variables refer to the same array. Changing `sameRow[0]` changes `row[0]`. The method `paintRow` must read its array without changing any values.' },
    ],
    sources: [{ title: 'University of Washington: Array Histogram', url: 'https://courses.cs.washington.edu/courses/cse142/22sp/lectures/Histogram.java', adaptation: 'Original robot mosaic that adapts the separation between storing array data and traversing it to draw a result. A 2D binary tile map replaces score frequencies; Scanner input replaces file input, and print commands replace graphics-library calls.' }],
    starter: 'import java.util.Scanner;\n\npublic class Student {\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        int rows = input.nextInt();\n        int columns = input.nextInt();\n        int[][] mosaic = new int[rows][columns];\n        // Read every cell before painting.\n        int blue = 0;\n        // Call paintRow for each stored row, then move north.\n        int yellow = rows * columns - blue;\n        System.out.println("Blue " + blue + "; yellow " + yellow);\n    }\n\n    public static int paintRow(int[] row) {\n        // Paint the row and return to its first tile, facing east.\n        // Return its blue count and leave the array unchanged.\n        return 0;\n    }\n}\n',
    solution: mosaicSolution,
    requirements: { variables: { mosaic: 'int[][]', blue: 'int', yellow: 'int' }, calls: ['nextInt'], nested: { for: 2 }, prints: ['blue', 'yellow'], methods: [{ name: 'paintRow', returns: 'int', parameters: ['int[]'], used: true }] },
    sampleWorld: mosaicWorld([[1, 0, 1, 1], [0, 1, 0, 0], [1, 1, 1, 0]]),
    world(rng) {
      const height = 1 + Math.floor(rng() * 7), width = 1 + Math.floor(rng() * 10);
      return mosaicWorld(Array.from({ length: height }, () => Array.from({ length: width }, () => Math.floor(rng() * 2))));
    },
    goal(end, world) {
      if (!matchesPaint(end, world)) return verdict(false, 'Match every target cell: 1 is blue and 0 is yellow. Read rows from the bottom upward and columns from left to right.');
      if (!atFinish(end, world)) return verdict(false, 'Finish at (1, 1), facing east, after the final northward move.');
      const yellow = world.data.height * world.data.width - world.data.blue;
      if (!end.said.includes(`Blue ${world.data.blue}; yellow ${yellow}`)) return verdict(false, `This map has ${world.data.blue} blue and ${yellow} yellow cells. Add the counts returned by paintRow.`);
      return verdict(true, `${world.data.height} rows restored: ${world.data.blue} blue and ${yellow} yellow cells.`);
    },
    methodCases: [[], [0], [1], [1, 0, 1], [0, 0, 0, 0]].map(values => ({
      label: `paintRow({${values.join(', ')}}) paints, returns its count, and preserves its array`,
      invocation: `int[] row = {${values.join(', ')}}; System.out.println("Blue " + Student.paintRow(row)); System.out.println("Row " + java.util.Arrays.toString(row));`,
      world: rowProbe(values),
      goal: (end, world) => verdict(atFinish(end, world) && matchesPaint(end, world) && end.said.includes(`Blue ${world.data.blue}`) && end.said.includes(`Row [${values.join(', ')}]`), 'Paint the supplied row, return its blue count, restore the pose, and leave the input array unchanged.'),
    })),
    rejects: [
      { label: 'paints every cell blue', source: mosaicSolution.replace('System.out.println("paint yellow");', 'System.out.println("paint blue");') },
      { label: 'returns the row length instead of its blue count', source: mosaicSolution.replace('return blue;', 'return row.length;') },
      { label: 'misses the final input column', source: mosaicSolution.replace('col < mosaic[row].length', 'col < mosaic[row].length - 1') },
      { label: 'mutates the array after painting', source: mosaicSolution.replace('return blue;', 'for (int i = 0; i < row.length; i++) row[i] = 0;\n        return blue;') },
    ],
  },
];
