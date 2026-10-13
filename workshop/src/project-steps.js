// Presentation only: milestone order matches the existing saved answer keys.
const steps = {
  'hello-arena': [
    { title: 'Say hello', text: 'Print exactly "Hello, Arena!". Keep the capitals, comma, and exclamation mark.', check: 'Pip says the greeting to the character ahead.' },
  ],
  'hoop-streak': [
    { title: 'Get the balls', summary: 'Ask for the number of balls stored in `baskets`.', text: 'The starter reads `baskets` and moves 3 tiles to the shop. Ask for that many balls.', code: 'System.out.println(\n    "Can I have " + baskets + " balls?"\n);', check: 'The number of held balls equals `baskets`. The shopkeeper must be directly ahead.' },
    { title: 'Aim and repeat', text: 'Turn left. Use a for loop to print "shoot" once per basket.', check: 'Shots = `baskets`. Each shot uses one ball.' },
    { title: 'Check the score', text: 'Run the checks. Each world supplies `baskets` from 4 to 31.', check: 'Score exactly `baskets`; keep the loop. For the third star, use at most `baskets + 4` printed lines.' },
  ],
  'supply-relay': [
    { title: 'Plan the route', summary: 'Pick up one supply, then deliver it one tile north.', text: 'Start at (1, 3), facing east. The supply is `gap` tiles east. The delivery tile is one tile north of the supply; face the depot ahead.', check: 'Sample: 3 travelled tiles. Finish at (3, 2), facing north.' },
    { title: 'Pick up the supply', text: 'Move `gap` tiles, then pick up the one part.', code: 'System.out.println("move " + gap);\nSystem.out.println("pick up");', check: 'The pickup tile is empty. Pip holds 1 part.' },
    { title: 'Deliver the supply', text: 'Turn left, move one tile, then drop the part. Finish on that tile facing north.', check: 'The depot has 1 part. Pip holds nothing.' },
    { title: 'Calculate energy', text: 'Calculate `travel` using `gap`. Calculate `remaining` as `energy` minus `travel` times `costPerTile`. Print `remaining` in the report. The supplied input lines stay locked.', check: 'Sample: Delivered 1 part; energy 44. With `gap = 4`, `energy = 60`, and `costPerTile = 3`, 45 remains.' },
    { title: 'Check different routes', text: 'Run the three examples, then Submit. Submit changes `gap` (1–6), `energy` (60–140), and `costPerTile` (1–3) automatically. Explain how your commands and calculations use those values.', check: 'Every board passes with the supplied input lines unchanged.' },
  ],
  'staircase-arena': [
    { title: 'Find the pattern', summary: 'Count the targets in each row and track the running total.', text: 'The bottom row has 1 target. The next has 2. Continue up to `SIZE`. Write the running painted total for each row.', check: '`SIZE = 4`: totals 1, 3, 6, 10. `SIZE = 2`: totals 1, 3.' },
    { title: 'Paint one row', summary: 'Paint every target in this row, then return to the first column.', text: 'Paint each target blue and move east. Return to column 1, move one tile north, then face east.', check: 'Only target tiles are painted; Pip is ready for the next row.' },
    { title: 'Repeat the rows', text: 'Use nested for loops: one for rows, one for tiles in that row. Increase `total` once per painted tile.', check: '`SIZE = 4` paints exactly 10 blue tiles.' },
    { title: 'Use `SIZE`', summary: 'Use `SIZE` to control the outer loop; support sizes 2–13.', text: 'Keep `SIZE` as the supplied class constant. Use it to control the outer loop. Checks supply sizes 2–13.', check: 'Finish at (1, 1), facing east, for every size.' },
    { title: 'Report the total', text: 'Print "Painted N tiles" with `total` in place of `N` after both loops. Run the examples, then Submit.', check: '`SIZE = 13` reports Painted 91 tiles. Set `total` to zero once, before the loops.' },
  ],
  'tower-rescue': [
    { title: 'Turn around', text: 'Implement turnAround() with two turns. Call it twice from main so Pip faces east before moving.', check: 'One call reverses direction without moving. Two calls restore it.' },
    { title: 'Collect one tower', summary: 'Write collectTower(height): collect its parts and return to its base.', text: 'Implement collectTower(height). Move north, collecting one part per tile, then return to the base facing east. Use loops for `height`.', check: 'Try move 2, then collectTower(1). Collect 1 part and return to the same tile. Height 0 collects nothing and restores the starting pose.' },
    { title: 'Count the supplies', text: 'Implement supplyCount(towers). Add 1 through `towers` in a loop and return the total. Do not print or move here.', check: 'Arguments 0, 1, 4, 8 return 0, 1, 10, 36.' },
    { title: 'Connect the towers', summary: 'Loop through `TOWERS`, collect each tower, then deliver the parts.', text: 'Keep the supplied `TOWERS` constant (2–13). In main, loop from 1 through `TOWERS`. Move 2 tiles and call `collectTower` with that tower’s height. Move 1 more tile to face the depot; call deliver(parts).', check: 'deliver(count) drops `count` held parts without moving. Count 0 prints nothing. No cargo remains.' },
    { title: 'Return home', text: 'Return to the starting tile, facing east. Print "Recovered N parts" with the returned supply count. Run the examples, then Submit.', check: 'Every tower is empty, all parts are delivered, and each helper passes its own checks.' },
  ],
  'signal-patrol': [
    { title: 'Read the signals', summary: 'Trace 1 0 2 1 0 2 -1: count the travelled tiles and the parts picked up.', text: 'Each number describes the next tile: 0 = clear, 1 = part, 2 = hurdle. Stop at -1.', check: '1 0 2 1 0 2 -1 means 6 tiles, 2 parts. Do not move for -1.' },
    { title: 'Handle one tile', text: 'Implement handleTile(signal): jump for 2; otherwise move. Pick up for 1 and return 1. Return 0 for the other signals.', check: 'handleTile(1) reaches (2, 2), faces east, holds 1 part, and returns 1.' },
    { title: 'Repeat until -1', text: 'Use Scanner and a while loop. Call `handleTile` for each real signal. Add its return value to `collected`; increase `distance`; read the next signal.', check: 'Sample: `distance = 6`, `collected = 2`, Pip at (7, 2).' },
    { title: 'Return and deliver', text: 'Move south to row 3, then west by `distance`. Turn north and move to (1, 2). Drop each part to the depot ahead.', check: 'Use the clear return lane. Finish facing east with no parts held.' },
    { title: 'Report the patrol', text: 'Print `distance` and `collected`. Run the examples, then Submit. Generated lanes have 4–15 tiles.', check: 'Sample: Patrol 6 tiles; delivered 2 parts.' },
  ],
  'mosaic-survey': [
    { title: 'Read the map', summary: 'Read the grid into `int[][] mosaic` using nested loops.', text: 'Read `rows` and `columns`, then store every cell in `int[][] mosaic` using nested loops. 1 = blue; 0 = yellow. Array row 0 is the bottom board row.', check: 'Sample: 3 × 4 = 12 cells. `mosaic[0][0]` is blue; `mosaic[1][0]` is yellow.' },
    { title: 'Paint one row', summary: 'Paint every target in this row, then return to the first column.', text: 'Implement paintRow(int[] row). Paint each cell and move east. Return to the first tile facing east; return the blue count. Leave `row` unchanged.', check: 'First row: blue, yellow, blue, blue; returns 3. An empty row paints nothing and returns 0.' },
    { title: 'Paint every row', text: 'Call `paintRow` for each row of `mosaic`. After each call, move one tile north and face east, including after the last row.', check: 'Every target matches. Pip finishes at (1, 1), facing east.' },
    { title: 'Count the colors', text: 'Add the returned counts into `blue`. Calculate `yellow = rows * columns - blue`. Print both totals.', check: 'Sample: Blue 7; yellow 5. The totals add up to 12.' },
    { title: 'Check different maps', text: 'Run the examples, then Submit. Support 1–7 rows and 1–10 columns. Use array lengths for bounds and keep the stored values unchanged.', check: 'All checks pass, including rows with zero blue cells.' },
  ],
};

export const projectSteps = game => steps[game.id] || game.milestones || [{ title: 'Your task', text: game.task }];
export const projectGoal = game => ({
  'hello-arena': 'Make Pip say "Hello, Arena!".',
  'hoop-streak': 'Get balls from the shop. Score baskets with a for loop.',
  'supply-relay': 'Deliver one supply. Calculate the energy left.',
  'staircase-arena': 'Paint the staircase using nested loops.',
  'tower-rescue': 'Use methods to collect every tower and return home.',
  'signal-patrol': 'Read signals to collect parts and avoid hurdles.',
  'mosaic-survey': 'Read a 2D array and paint the matching colors.',
}[game.id] || game.summary || game.task);
