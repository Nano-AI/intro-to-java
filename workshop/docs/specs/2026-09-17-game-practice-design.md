# Game practice and topic structure — design

Date: 2026-09-17. Target release: Pip 0.7.0. Status: approved in brainstorming, pending spec review.

## Goal

Add a large volume of gamified practice where Java drives a robot in a changing 3D world, and reorganize the course as **unit → subtopic → lessons and games**, following the CSE 121 topic order. Add a concepts-only Git & GitHub side unit.

## Decisions

| Question | Decision |
|---|---|
| Practice style | Every drill is a robot game with a new random world on every run. |
| Student Java | Plain CSE 121 Java only. `System.out.println` controls the robot; `Scanner` reads the world. No custom robot class. |
| Volume | 5 games per subtopic (the fifth is a boss level), 3 star levels each: 55 games, 165 levels. |
| Engine | One JavaScript simulator; each game is a data file with a world generator and goal check. |
| Existing motor-control missions | Unchanged: `Robot.java`, `Runner.java`, mission numbers, and `update(robot)` stay as they are. |
| Git | Concepts only: no git commands, apps, or accounts. |
| Meta-game | Stars, plus unlocks at star totals. No XP, streaks, or leaderboards. |

## 1. Course structure

Existing lesson IDs are kept, so saved progress carries over. The order follows CSE 121, except variables come one step earlier because the existing lessons depend on declarations.

| Unit (`id`) | Subtopic | Existing lessons | Unit projects and assignments |
|---|---|---|---|
| 1 Java basics (`basics`) | 1.1 Printing & program structure | `hello-java`, `first-movement` | Project `talent-show` (new) |
| | 1.2 Variables & types | `java-declare`, `debug-semicolon` (5 parts), `java-types`, `debug-types`, `java-variables` | |
| | 1.3 Expressions & Strings | `java-expressions`, `java-strings`, `precision-parking` | |
| 2 Repetition (`loops`) | 2.1 `for` loops | `java-for`, `debug-loop-boundary`, `java-accumulator`, `debug-reset-total` | Project `free-draw` (new) |
| | 2.2 Nested loops, Random, constants | `java-nested`, `java-random-math`, `java-constants` | |
| 3 Methods (`methods`) | 3.1 Methods & parameters | `java-methods` | Assignment `autonomous-docking` |
| | 3.2 Math & returns | `java-returns` | |
| 4 Decisions & input (`decisions`) | 4.1 Conditionals | `java-conditionals`, `make-a-turn`, `sense-and-stop`, `collect-a-part` | Projects `robot-detour`, `robot-cargo` |
| | 4.2 `while` loops & `Scanner` | `java-while`, `java-scanner` | |
| 5 Arrays (`arrays`) | 5.1 Arrays & references | `java-arrays`, `debug-array-bounds`, `java-references`, `java-array-patterns` | Assignment `java-final-report`, project `robot-hoop` |
| | 5.2 2D arrays | `java-2d-arrays` | |
| Side: Git & GitHub (`git`) | Git vocabulary | 8 concept lessons (section 4) | none |

Each subtopic page lists its lessons, then its 5 games in order, the boss last.

**Completion:**
- **Lesson:** unchanged (`hasPassedLesson`).
- **Game:** at least ★.
- **Subtopic:** every lesson passed and every game at ★ or better.
- **Unit:** every subtopic complete, plus its projects and assignments.
- **Concept lesson (Git):** its quiz answered correctly.

**Routes:**
- `/unit/:unitId` shows a unit page.
- `/game/:gameId` opens the shared coding workspace.
- `/module/:moduleId` redirects to `/unit/:moduleId`, or to `/` for the removed `finish` module.
- All existing Lesson, Quiz, Practice, Project, and Assignment routes stay.
- `/projects` and `/assignments` stay. `/projects` also lists `talent-show` and `free-draw`, linking to `/game/:id`.

**Unlocks:** total stars (maximum 165, plus projects) unlock 5 robot skins at 10, 30, 60, 100, and 150 stars. The Garden arena unlocks at 20 stars and the Moon arena at 60. Workshop is always available. Locked options appear disabled, with the number of stars still needed.

## 2. Game engine

### Student program

A normal `Student` class with `main`. Methods from Unit 3 onward print commands inside `static` helpers.

```java
Scanner input = new Scanner(System.in);
int baskets = input.nextInt();                          // sign: "Score 5"
System.out.println("move 3");
System.out.println("Can I have " + baskets + " balls?"); // shopkeeper hands them over
for (int i = 0; i < baskets; i++) {
    System.out.println("shoot");
}
```

### Where world data comes from

| Subtopics | Source |
|---|---|
| 1.1 | Fixed worlds. `world()` ignores the random generator, and there is no input. |
| 1.2 through 3.2 | The starter supplies `Scanner input = new Scanner(System.in);` and the reading lines. The student uses the variables. |
| 4.2 onward | The student writes all `Scanner` code, including input-driven games where input is a command list such as `F F R SHOOT` ending in a sentinel. |

### Output lines

Each trimmed stdout line is one **action**. Command matching ignores case, and extra spaces between words collapse to one. Speech keeps its original text.

| Line | Effect |
|---|---|
| `move` or `move N` (N ≥ 1) | Move N tiles forward, one tile at a time. |
| `turn left`, `turn right` | Rotate 90°. |
| `jump` | Move one tile forward. It may cross a hurdle tile; `move` into a hurdle is a bump. |
| `shoot` | Uses one held ball. Scores if a hoop lies straight ahead within 5 tiles with no wall between. Without a ball, the robot says "No ball!". |
| `pick up` | Take one item from the robot's tile. |
| `drop` | Place one item of the most recently acquired kind on the tile ahead; a customer character there receives it. |
| `paint COLOR` | Paint the robot's tile. Colors: `red`, `blue`, `green`, `yellow`, `white`. |
| anything else | Speech: a chat bubble above the robot. |

**Game-specific rules:**
- **Allowed verbs:** each game lists them in `commands`. A verb outside that list is treated as speech, and the feedback names it ("`shoot` is not used in this game").
- **Typos:** speech whose first word is one edit away from an allowed verb gets the hint "Did you mean `move`?".

**Speech to characters.** Only the character on the tile directly ahead reacts:
- **Shopkeeper:** reads the first integer and an item name, singular or plural. It gives `min(n, stock)` and replies "Here are 3 balls.", "Only 2 left.", or "Sold out."
- **Greeter / gate:** reacts when the line exactly matches the expected phrase, case-sensitive after trimming. A gate then opens.
- **Other characters:** replies are defined by the game.

**The run for a world ends when:**
- **Bump:** moving into a wall, the board edge, a character, or a hurdle via `move`. The robot says "Ouch, wall ahead" and the world fails.
- **Action limit:** more than 1,000 actions. The world fails with "Too many actions. Check for an infinite loop."
- **End of output:** the program finishes, and the goal check runs.

The existing process limits still apply: 12 s per process, 64 KiB output, 64 MiB heap.

### Game definition

One object per game in `src/games/unit-N.js`:

```js
{
  id: 'hoop-streak',          // unique kebab-case, never reused
  subtopic: '2.1',            // or project: true with unit: 'loops'
  title: 'Hoop Streak',
  boss: false,
  commands: ['move', 'turn', 'shoot'],
  brief: '…', task: '…', hint: '…',
  starter: '…', solution: '…',
  requirements: { loops: { for: 1 } },   // optional; existing checkStructure rules
  world(rng, level) {                    // level 1 or 2; rng() returns [0, 1)
    return {
      width, height, robot: { x, y, dir },           // dir: 'N' | 'E' | 'S' | 'W'
      walls: [[x, y]], hurdles: [[x, y]],
      items: [{ kind: 'ball', x, y }],
      characters: [{ kind: 'shop', x, y, stock: { ball: 20 } }],
      hoops: [{ x, y }], signs: [{ x, y, text: 'Score 5' }],
      input: '5\n', par: 13,
      constants: { SHELVES: 4 },                     // optional: replaces these initializers in a temp copy (existing replaceInputs)
      data: { baskets: 5 },                          // private values for goal()
    };
  },
  goal(end, world) { return { passed: end.scored === world.data.baskets, message: '…' }; },
}
```

- **Randomness:** `rng` is a seeded mulberry32 generator from the engine. Worlds must be deterministic for a given seed and level.
- **Par:** the reference solution's action count, plus up to 2 actions of slack.
- **`end`:** the final simulator state: robot position and direction, `held` items by kind, `scored`, `painted` tiles, `said` lines, `delivered` counts, character stock, and `actions`.

### Save & run for a game

1. Compile once; run the existing structure checks from `requirements`.
2. **★:** generate 3 level-1 worlds from fresh seeds. Run `java` once per world with `world.input` on stdin, simulate the output, and apply `goal`. All 3 must pass.
3. **★★:** only if ★ passed. Generate 3 fresh level-2 worlds (the twist); all must pass.
4. **★★★:** ★★ passed, and every level-2 world used at most `par` actions. Speech and debug prints count as actions.
5. Save `progress.games[gameId] = { stars, best, updatedAt }`, where `stars` never decreases and `best` is the fewest actions in a ★★★-eligible run.
6. Return per world: `{ level, seed, world, events, end, passed, message }`.

**Simulator events:**
- Robot actions: `move`, `turn`, `jump`, `bump`, `shoot {hit}`, `pick`, `drop`, `paint`.
- Talk: `say {text}`, `reply {character, text}`.
- Exchanges: `give {item, count}`.
- Run end: `limit`.

**Try own input:** runs the saved program once with the typed stdin in a fresh level-1 world, and replays it. It is ungraded and saves nothing.

### 3D replay

- **Board:** a tile board inside the existing Three.js scene (`web/world.js`), with low-poly walls, hurdles, balls, crates, hoops, signs, painted tiles, and characters (shopkeeper, greeter, gate, customer).
- **Chat bubbles:** HTML overlays positioned by projecting each speaker's 3D position every frame. They stay 2 s of replay time and stack if lines are rapid. A transcript lists every `say` and `reply` under the scene.
- **Controls:** tabs choose which of the (up to) 6 worlds to replay. Existing Replay, Step, speed, camera, confetti, and reduced-motion controls apply. A bump reuses the existing crash debris.

## 3. Games

Level 2 of each game uses bigger random values plus one extra rule (an obstacle, a second item, or limited stock). A game that cannot be graded reliably may be swapped for another on the same subtopic; the count stays 5.

| Subtopic | Games (boss last) |
|---|---|
| 1.1 | Hello Arena (say the greeter's phrase), Hallway Dash (reach the flag), First Order ("3 balls please"), First Basket (face the hoop and shoot), **Opening Ceremony** |
| 1.2 | Distance Runner (read distance, move it), Name Tag (read a name, introduce), Ball Budget (order the signed count), Crate Swap (two crates to swapped spots), **Supply Run** |
| 1.3 | Coin Counter (coins ÷ price), Fair Split (even share, say the `%` remainder), Echo Door (password length and first letter), Shout Across (name in capitals), **Scoreboard** (say the shooting percentage) |
| 2.1 | Hoop Streak (N baskets), Hurdle Run (N hurdles), Roll Call (greet N robots), Coin Collector (running total), **Relay Race** |
| 2.2 | Tile Painter (rows × columns), Crate Staircase (1, 2, 3… per column), Dice Dash (`Random` roll; goal checks consistency and range), Warehouse Rows (class constant varied through initializer replacement), **Checkerboard** |
| 3.1 | Square Patrol (`side(length)`), Delivery Route (`deliver(balls, steps)`), Dance Routine (a method per move), Row Painter (`paintRow(color, length)`), **Tournament Day** |
| 3.2 | Shot Distance (`Math.abs`), Ball Math (`Math.ceil`), Closest Hoop (`Math.min`), Budget Shop (return the affordable count), **Tournament Planner** |
| 4.1 | Traffic Light (go or wait), Sold Out (order stock or say "sold out"), Gate Guard (`equals`), Near or Far (choose by distance), **Referee** (`&&`, `\|\|`) |
| 4.2 | Remote Control (commands until `STOP`), Keep Shooting (until N makes), Countdown Launch, Maze Runner (`hasNext()`), **Arcade Marathon** (reject unknown commands) |
| 5.1 | Scoreboard Lanes (maximum, go to that lane), Delivery List (array of orders), Rewind (replay stored moves in reverse), Shared Locker (two names for one array), **Dance Battle** |
| 5.2 | Treasure Map, Paint by Numbers, Hazard Count, Ragged Garden (rows of different lengths), **Arena Sweep** |

**Unit projects:**
- **`talent-show`** (Unit 1, open arena): passes with at least 6 actions including at least 2 speech lines and 2 moves.
- **`free-draw`** (Unit 2, open canvas): passes with at least 10 painted tiles and a nested `for` loop.

Projects award ★ only.

**Reference solutions and requirements:** games whose topic is a construct (loops, methods, returns, arrays) must declare it in `requirements`, so printing a memorized command list fails. Hardcoding also fails because worlds change on every run.

## 4. Git & GitHub side unit

8 concept lessons in `src/git-unit.js`, with `kind: 'concept'`:
1. Working folder and repository
2. Stage
3. Commit
4. Push
5. Pull
6. Branch
7. Merge
8. Merge conflict

**Lesson page:** an interactive warehouse scene (`src/git-lab.jsx`) that the student drives with buttons:
- **Workbench:** the working folder.
- **Crate:** staging area. Stage loads a part into it.
- **Shelf:** local history. Commit seals the crate with a label and shelves it.
- **GitHub warehouse:** the remote. Push trucks crates there; pull brings new crates back.
- **Branch:** a side track. Merge joins the tracks.
- **Merge conflict:** two different crates for the same slot. The student chooses one.

**Quiz page:** one prediction question. Concept lessons have no coding route and no "Start practice" link.

## 5. Build plan

### Step 0: main checkout, by the coordinator

1. Commit `workshop/` as the baseline, with `screenshots/` ignored as test output.
2. Add contract files:
   - `src/games/unit-1.js` … `unit-5.js`, each `export const games = [];`
   - `src/games/index.js`, which concatenates them.
   - `src/git-unit.js` with `export const gitLessons = [];`
3. Each worktree links `node_modules` and `runtime/` from the main checkout.

### Phase 1: parallel worktrees

| Worktree | Model | Owns |
|---|---|---|
| `engine` | Opus | `src/games/engine.js`, `extension/runner.js`, `extension/extension.js`, `src/workspace.jsx`, `src/game-view.jsx`, `src/robot-view.jsx`, `web/world.js`, `extension/engine.test.js`, `extension/games.test.js`; sample games Hello Arena in `unit-1.js` and Hoop Streak in `unit-2.js` |
| `structure` | Sonnet | `src/curriculum.js`, `src/pages.jsx`, `src/main.jsx`, `src/routes.js`, `src/context.js`, `src/progress.js`, `shared/progress.js` |
| `git-concepts` | Sonnet | `src/git-unit.js`, `src/git-lab.jsx`, and the concept-kind branches in `src/learn.jsx`, `src/quiz.jsx`, `src/visual-lab.jsx` |

**Interfaces between worktrees:**
- `structure` reads games only through `src/games/index.js`, by `subtopic`, `project`, and `unit`, and reads `progress.games`.
- `/game/:gameId` renders `<Workspace />`; `engine` reads `useParams().gameId`.
- `engine` writes `progress.games` from the host; `structure` normalizes a missing map to `{}`.

### Phase 2: parallel worktrees, after Phase 1 merges

`games-unit-1` … `games-unit-5` (Sonnet each). Each owns only `src/games/unit-N.js` and writes its 10 games, plus `talent-show` or `free-draw` for Units 1 and 2.

### Phase 3

| Agent | Model | Task |
|---|---|---|
| Reviewer | Opus | Review the merged branch for bugs, grading holes, and games passable without the target concept. |
| Docs | Haiku | Update the READMEs, `ARCHITECTURE.md`, `CURRICULUM.md`, and `ROADMAP.md` for the structure and counts, in neutral voice. |
| Cleanup | Haiku | List stale local files (0.4.0–0.5.1 VSIX files, before/after screenshots, the Tauri experiment). Delete only after user approval. |

### Merging

- **Order:** engine → structure → git-concepts → units 1–5.
- **After each merge:** `npm test`.
- **At the end:** `npm run test:extension`, then package `pip-workshop-0.7.0.vsix`.
- **Coordinator-owned files:** `extension/test/suite.js` and `package.json`.

## Testing

- **`extension/engine.test.js`:**
  - line parsing, case, and spacing
  - speech fallback and typo hints
  - bumps, hurdles, and the action limit
  - shop orders (singular, plural, stock)
  - shooting line of sight and range
  - painting and delivery
  - star computation and par
- **`extension/games.test.js`, for every registered game:**
  - `world()` is deterministic per seed and level.
  - The reference solution earns ★★★ (projects: ★).
  - The starter earns no star on seed 1.
  - Seeds per level: 3 by default; `PIP_GAME_SEEDS=20` for the full check each Phase 2 agent runs before handing back.
- **`npm run test:extension`:** open one game, run its reference solution, and assert that the stars and a chat bubble render. The screenshot is saved as `screenshots/vscode-game.png`.

## Out of scope

- Reading character replies mid-run. The whole world is given as input up front; streaming Java output and input through the simulator is the upgrade path if a game needs it.
- Running Java in the webview, or live execution.
- Real git operations or GitHub accounts.
- XP, streaks, and leaderboards.
- Changes to the existing motor-control missions.
