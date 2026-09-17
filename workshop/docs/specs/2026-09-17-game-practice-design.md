# Game practice and topic structure — design

Date: 2026-09-17. Target release: Pip 0.7.0. Status: reviewed and revised; product decisions in section 6 require confirmation before implementation.

Delivery arrangement: the current OpenCode agent owns UI implementation and subsequent UI modifications in a dedicated worktree. Claude and Codex handle separate engine, data, and content worktrees. Section 5 defines the proposed worker assignments and exclusive file ownership; model choice can change without moving those boundaries.

## Goal

Add a large volume of gamified practice where Java drives a robot in a changing 3D world, and reorganize the course as **unit → subtopic → lessons and games**, following the CSE 121 topic order. Add a concepts-only Git & GitHub side unit.

## Decisions

| Question | Decision |
|---|---|
| Practice style | Every drill is a robot game. Each graded run uses fresh seeds; subtopic 1.1 has fixed introductory worlds, and random worlds may repeat by chance. |
| Student Java | Plain CSE 121 Java only. `System.out.println` controls the robot; `Scanner` reads the world. No custom robot class. |
| Volume | 5 games per Java subtopic (the fifth is a boss), each with 2 world difficulties and 3 cumulative star awards: 55 games, 165 available stars. Two new projects add 2 stars, for 167 total. |
| Engine | One JavaScript simulator; each game is a data file with a world generator and goal check. |
| Existing motor-control missions | Unchanged: `Robot.java`, `Runner.java`, mission numbers, and `update(robot)` stay as they are. |
| Git | Concepts only: no git commands, apps, or accounts. |
| Meta-game | Stars, plus unlocks at star totals. No XP, streaks, or leaderboards. |

## 1. Course structure

Existing lesson IDs, multipart child IDs, and assessment versions are kept, so saved lesson progress carries over. Newly required games can make a previously completed unit incomplete without removing any lesson passes. The order follows the intended CSE 121 topic sequence, except variables come one step earlier because the existing lessons depend on declarations; this is not a claim of official course equivalence.

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

Each unit page has subtopic sections, linked as `/unit/:unitId#subtopic-1-1` (using the corresponding dotted ID with dots replaced by hyphens). Each section lists its lessons, then its 5 games in order, the boss last. Projects and assignments follow the subtopics. Git has one vocabulary section and no games.

`src/curriculum.js` exports `units` with `{ id, title, subtopics: [{ id, title, lessonIds }], projectIds, assignmentIds }`. Game membership comes from the game registry. It also exports a single ordered activity list with tagged `{ kind: 'lesson' | 'game', id }` entries, including unit projects and assignments exactly once. Home, progress, and “Continue learning” use this list and the shared completion predicates. Keep the existing `modules`/flat `ids` compatibility export until all consumers have migrated; preserve `orderedLessons` as a lesson-only list. Resolve multipart children to their parent for unit membership.

**Completion:**
- **Lesson:** unchanged (`hasPassedLesson`).
- **Game:** at least ★.
- **Subtopic:** every lesson passed and every game at ★ or better.
- **Unit:** every subtopic complete, plus its projects and assignments.
- **Concept lesson (Git):** its prediction quiz answered correctly for the current assessment version; warehouse exploration is optional. Persist the pass so a later incorrect attempt does not revoke it.
- **Course:** proposed default is all five Java units; show Git completion separately (confirm in section 6). Stars beyond the first are optional for completion. The boss label does not introduce a prerequisite lock.

**Routes:**
- `/unit/:unitId` shows a unit page.
- `/game/:gameId` opens the shared coding workspace.
- `/module/:moduleId` redirects to `/unit/:moduleId`, or to `/` for the removed `finish` module.
- Unknown unit/game IDs show a not-found state with a course link. Host-originated navigation uses the same validation and legacy redirect rules.
- All existing Lesson, Quiz, Practice, Project, and Assignment routes stay.
- `/projects` and `/assignments` stay. `/projects` also lists `talent-show` and `free-draw`, linking to `/game/:id`.
- Concept lesson Learn/Quiz routes work normally. Route helpers, shared navigation, workspace guards, and host open/run handlers must all exclude concepts from coding. A direct concept Practice URL redirects to Learn without creating a Java file.

**Unlocks:** sum saved stars for registered games and the two new projects only (maximum 167). Existing motor-control projects do not award stars. Unlock 5 robot skins at 10, 30, 60, 100, and 150 stars. The Garden arena unlocks at 20 stars and the Moon arena at 60. Workshop and the default skin are always available. Locked options appear disabled, with `max(0, threshold - totalStars)` stars still needed. Cosmetics never affect simulation or grading. Skin names/IDs and the treatment of existing arena selections require confirmation in section 6.

## 2. Game engine

### Student program

A normal `Student` class with `main`, including ordinary imports and the supplied Scanner setup where applicable. Printing helpers may be `static` methods from Unit 3 onward; return-value exercises must actually return and use a computed value. The following is a snippet inside `main`:

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
| 1.1 | Fixed worlds. `world()` ignores the random generator and level, and there is no input. Both difficulty rounds use the same world; ★★ confirms the same solution and ★★★ adds the par target. |
| 1.2 through 4.1 | The starter supplies imports, `Scanner input = new Scanner(System.in);`, and the reading lines. The student uses the variables. Supplied scaffolding is explained but not assessed as a student-written construct. |
| 4.2 onward | The student writes all `Scanner` code, including input-driven games where input is a command list such as `F F R SHOOT` ending in a sentinel. |

Every brief documents the exact stdin field order, types, ranges, whitespace rules, and sentinel/EOF behavior. All data needed to solve the world is available before execution. Level 2 keeps the same input schema and must be solvable by the same source using only the current and earlier subtopics. Random visual details cannot conceal required information. For 1.1, a different level-2 puzzle would require branching before it is taught, so the fixed-world exception applies to both levels.

### Output lines

Each nonempty, trimmed stdout line is one **action**, including malformed commands and speech. Split LF or CRLF output; a final unterminated line counts, and blank lines are ignored. Command matching ignores case, and internal whitespace collapses to one space for parsing only. Speech preserves case and internal whitespace after trimming. Only stdout drives the robot; stderr is diagnostic output.

`move N` counts as one action but emits one movement event per attempted tile. It stops at the first bump, so a huge N cannot cause an unbounded loop on a finite board. Par uses output actions, not replay events or distance. Exactly 1,000 actions are allowed; reject the 1,001st before applying it. Replies and automatic robot messages do not count as student actions.

| Line | Effect |
|---|---|
| `move` or `move N` (N ≥ 1) | Move N tiles forward, one tile at a time. N is a decimal safe integer; signs, decimals, and extra arguments are invalid. |
| `turn left`, `turn right` | Rotate 90°. |
| `jump` | Land on the adjacent tile ahead, including a hurdle tile. It never skips two tiles. Walls, blocking characters, and board edges still cause a bump. Moving off a hurdle is allowed. |
| `shoot` | Uses one held ball. Scores if a hoop lies straight ahead within 5 tiles with no wall between. Without a ball, the robot says "No ball!". |
| `pick up` | Take one item from the robot's tile. |
| `drop` | Place one item of the most recently acquired kind on the tile ahead; a customer character there receives it. |
| `paint COLOR` | Paint the robot's tile. Colors: `red`, `blue`, `green`, `yellow`, `white`. |
| anything else | Speech: a chat bubble above the robot. |

**Game-specific rules:**
- **Allowed verbs:** each game lists them in `commands`. A verb outside that list is treated as speech, and the feedback names it ("`shoot` is not used in this game").
- **Typos:** speech whose first word is one edit away from an allowed verb gets the hint "Did you mean `move`?".
- Canonical verbs are `move`, `turn`, `jump`, `shoot`, `pick`, `drop`, and `paint`; speech is always available. Malformed syntax falls back to speech with a syntax hint. Hints do not fail a world or add actions. Typo distance is one insertion, deletion, or substitution after lowercasing; choose the first match in `commands` order.

**State and tile rules:** coordinates are integer `(x, y)` with origin at the northwest corner, east `+x`, south `+y`. Bounds are `0 <= x < width`, `0 <= y < height`. Walls and closed gates block movement and shots; other characters block movement only. Hurdles do not block shots. Hoops, signs, items, and paint are passable. A shot hits the nearest hoop 1–5 tiles directly ahead if no wall or closed gate intervenes, consumes one ball even on a miss, and increments `scored` by one on a hit. Hoops are reusable.

`pick up` takes the first item on the current tile in world-array order; empty tiles produce a no-op reply. Track acquired items in a stack as well as `held` counts; shooting removes the most recently acquired ball and dropping removes the newest remaining item. Shops append each granted item to that stack. A drop onto an ordinary in-bounds tile appends the item there. A customer accepts the kinds listed in its `accepts` array; record deliveries by character ID and item kind. Drops outside the board, into walls/hurdles, or onto other/rejecting characters leave inventory unchanged and produce a reply. Empty-handed drops are also no-ops. Painting replaces the tile's previous color; distinct painted tiles count once. Invalid colors use speech fallback.

**Speech to characters.** Only the character on the tile directly ahead reacts:
- **Shopkeeper:** recognizes the first integer token and exactly one supported item kind (case-insensitive whole-word singular or plural). For positive safe integers it gives `min(n, stock)`, decrements stock, and replies "Here are 3 balls.", "Only 2 left.", or "Sold out." Use singular grammar for one item. Zero, negative, unsafe, missing, unknown, or ambiguous orders transfer nothing and receive a clarification reply. Item aliases are explicitly registered, not guessed by removing a final `s`.
- **Greeter / gate:** reacts when the line exactly matches the expected phrase, case-sensitive after trimming. A gate then opens.
- **Other characters:** replies are defined by serializable character data (`id`, `kind`, position, and `expectedPhrase`/`reply` or `accepts`, as applicable). A gate's successful response sets `open: true`; an open gate no longer blocks movement or shots. Ordinary successful commands never also trigger speech reactions.

**The run for a world ends when:**
- **Bump:** moving into a wall, the board edge, a blocking character, or a hurdle via `move`. The robot says "Ouch, wall ahead" and the world fails.
- **Action limit:** more than 1,000 actions. The world fails with "Too many actions. Check for an infinite loop."
- **End of output:** the program finishes, and the goal check runs.

The existing process limits still apply: 12 s per process, 64 KiB output, 64 MiB heap.

Compilation failure, source-check failure, runtime nonzero exit, timeout, output overflow, or simulator failure cannot pass by matching a goal on partial output. Engine errors are reported separately from student failures. Stop/cancellation kills the active child process and skips remaining worlds without updating progress. The UI shows per-world progress because a six-world run can take substantially longer than 12 s. A newer run supersedes the old run by run ID; late results cannot overwrite it. Replay never executes Java again.

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
  inputHelp: 'One integer: the number of baskets to score.',
  starter: '…', solution: '…',
  requirements: { loops: { for: 1 } },   // required for construct-focused games
  world(rng, level) {                    // level 1 or 2; rng() returns [0, 1)
    return {
      width, height, robot: { x, y, dir },           // dir: 'N' | 'E' | 'S' | 'W'
      walls: [[x, y]], hurdles: [[x, y]],
      items: [{ kind: 'ball', x, y }],
      characters: [{ id: 'shop-1', kind: 'shop', x, y, stock: { ball: 20 } }],
      hoops: [{ x, y }], signs: [{ x, y, text: 'Score 5' }],
      input: '5\n', par: 13,
      constants: { SHELVES: 4 },                     // optional: replaces these initializers in a temp copy (existing replaceInputs)
      data: { baskets: 5 },                          // private values for goal()
    };
  },
  goal(end, world) { return { passed: end.scored === world.data.baskets, message: '…' }; },
}
```

- **Randomness:** `rng` is a seeded mulberry32 generator from the engine, accepting unsigned 32-bit seeds including zero. Worlds must be deterministic for a given seed and level; no `Math.random()`, time, or external state inside generators or goals. Host-generated seeds are returned for reproduction. Student `Random` is separate: Dice Dash supplies a seed and requires `new Random(seed)` so its reference run and par are reproducible.
- **Par:** the reference solution's action count, plus up to 2 actions of slack.
- **`end`:** the final simulator state: robot position and direction, `held` items by kind, `scored`, `painted` tiles, `said` lines, `delivered` counts, character stock, and `actions`.
- **Validation:** registry IDs are unique across lessons and games. Each regular game belongs to exactly one known subtopic; projects have `project: true` and a known `unit`. Worlds are JSON-serializable, at most 32 × 32 tiles, with valid coordinates, unique character IDs, nonnegative integer stock, and a nonnegative integer par at most 1,000. Walls/hurdles/blocking characters cannot overlap each other or the starting robot. Input is at most 64 KiB UTF-8. Missing entity arrays default to empty. Invalid authored data is an engine error.
- **Pure simulator:** clone the initial world; never mutate the registry object or `world` passed to `goal`. Goals are deterministic and side-effect-free. All replay-visible entities need stable IDs (assigned from array position when omitted). `data` is private from the Java stdin contract, not secret from the local application. Do not rely on hidden client data for grading integrity.
- **Transport contract:** before engine handoff, freeze concrete JSON shapes for `end`, events, and run results in a shared contract module. Maps/sets must serialize as arrays or objects. Include remaining ground items, acquisition order, gate state, and per-character deliveries so goals can check swaps and exchanges without reconstructing output text.

### Save & run for a game

1. Save and snapshot source; compile and inspect the original source, then run structure checks from `requirements`. Normal games reuse one compiled program. If a world supplies `constants`, apply `replaceInputs` to a fresh temporary copy of the original source and recompile that variant before execution (cache identical variants within the run). Never rewrite the student's file or reuse stale variant bytecode after a compilation error. The checker must verify the named class constant and its type before replacement.
2. **★:** generate 3 level-1 worlds from fresh seeds. Run `java` once per world with `world.input` on stdin, simulate the output, and apply `goal`. All 3 must pass.
3. **★★:** only if ★ passed. Generate 3 fresh level-2 worlds (the twist); all must pass.
4. **★★★:** ★★ passed, and every level-2 world used at most `par` actions. Speech and debug prints count as actions.
5. Award the highest completed tier from this attempt. A level-2 failure still earns ★ if all level-1 worlds passed. Projects run only the three level-1 worlds and award at most ★; par is informational for projects.
6. Save `progress.games[gameId] = { stars, best, updatedAt }`. `stars` is the maximum of saved and newly earned stars. `best` is null until a three-star attempt, then the minimum saved sum of actions across that attempt's three level-2 worlds. It is an informational score across randomly differing worlds, not a leaderboard. Projects keep `best: null`. `updatedAt` is the host's ISO timestamp for the latest finished graded attempt; cancellation and infrastructure errors leave the record untouched.
7. Return `{ kind: 'game', gameId, runId, earnedStars, savedStars, sourceChecks, diagnostics, worlds }`; each world is `{ level, seed, world, events, end, passed, message }`. Runtime failures include a stage/error and cannot count as passed. Execute all three worlds of an entered tier for feedback unless cancelled or an infrastructure error occurs; skip level 2 when level 1 fails.

Progress schema advances from version 5 to 6. Normalization supplies an empty `games` map for old saves and validates integer stars 0–3 (projects 0–1), null/nonnegative integer `best`, and timestamps. Both host patching and backup import merge per game using maximum stars, minimum non-null best, and latest valid timestamp; absent entries cannot erase existing records. Unknown valid IDs may be preserved for backup compatibility but never count toward unlocks. Earned stars are host-owned, excluded from ordinary webview progress patches. Preserve all existing progress dictionaries. Reset behavior, if invoked explicitly, remains separate from merging.

**Simulator events:**
- Robot actions: `move`, `turn`, `jump`, `bump`, `shoot {hit}`, `pick`, `drop`, `paint`.
- Talk: `say {text}`, `reply {character, text}`.
- Exchanges: `give {item, count}`.
- Run end: `limit`.

Each event includes an increasing sequence number and its originating action index. Movement has `from`/`to`; turns have old/new direction; entity changes identify the entity and resulting counts/state; talk identifies the speaker. This payload must support both full replay and stepping without rerunning goals. Automatic robot replies such as “No ball!” and bump feedback appear in the transcript too. Diagnostics/hints are separate from scored speech.

**Try own input:** runs the saved program once with the typed stdin in a fresh level-1 world, and replays it. It is ungraded and saves no progress. The typed text replaces stdin only; it does not regenerate matching signs, stock, or goals. Label this as an input experiment and omit pass/fail/star claims. Display the generated world's original input for comparison. Fixed-input-free games hide this control. Process and simulator limits still apply.

### 3D replay

- **Board:** a tile board inside the existing Three.js scene (`web/world.js`), with low-poly walls, hurdles, balls, crates, hoops, signs, painted tiles, and characters (shopkeeper, greeter, gate, customer).
- **Chat bubbles:** HTML overlays positioned by projecting each speaker's 3D position every frame. They stay 2 s of replay time and stack if lines are rapid. A transcript lists every `say` and `reply` under the scene.
- **Controls:** tabs choose which of the (up to) 6 worlds to replay. Existing Replay, Step, speed, camera, confetti, and reduced-motion controls apply. A bump reuses the existing crash debris.
- Switching worlds or restarting clears replay state, bubbles, and debris. Pause freezes bubble lifetimes; Step advances one simulator event. The transcript remains available without animation, is keyboard-accessible, and renders student text as text nodes. Reduced motion uses immediate state changes and suppresses debris/confetti. Show earned stars separately from a higher saved best. “No worlds yet,” running, stopped, and failed-check states must have explicit feedback.

### UI implementation scope

The OpenCode UI worktree owns the course reorganization, game workspace, replay presentation, Git warehouse interaction, and all changes to existing UI surfaces needed to connect them. This includes Home/Continue, unit sections, project and assignment collections, Learn/Quiz navigation, progress, settings/unlocks, route guards, responsive layout, and feedback states. Claude and Codex supply data and host behavior through the contracts in section 5.

Create a distinctive, polished robot-playground identity that appeals to kids and makes them want to explore, build, and try again. The existing visuals are a starting point and may be substantially redesigned based on product research. Preserve the VS Code editor workflow: the student edits the native `Student.java` file; the webview provides instructions, controls, results, and replay. The UI owner audits the existing screens before implementation and records deliberate layout changes in its handoff. A single shared treatment for stars, completion, boss labels, errors, and locks must work across course pages and the coding workspace.

The game replay consumes simulator events through `src/game-view.jsx`. Keep the existing motor replay's frame semantics in `src/robot-view.jsx`; shared scene primitives may be extended in `web/world.js` without converting motor traces into tile events. Simulation, goal checking, and star awarding remain host/pure-engine responsibilities. Scene animations cannot change the outcome.

UI acceptance covers the narrow VS Code side panel as well as the wider course page, keyboard navigation and visible focus, readable instructions alongside the scene, and loading/empty/error states. Transcript and textual results remain usable if WebGL fails. Preserve camera and playback controls for existing missions. Validate real host integration after fixture-based development; mock results alone do not satisfy acceptance.

### Product research and visual direction (required UI work)

Before committing to the visual design, the UI owner researches current educational and play-focused products. Inspect actual learning/play screens and interactions where accessible; use official walkthroughs or videos when access is restricted, and record that limitation. Marketing pages alone are insufficient. The starting shortlist is:

| Reference to investigate | Questions for Pip |
|---|---|
| [Scratch](https://scratch.mit.edu/) | How do character personality, creative ownership, and the stage/editor relationship invite experimentation? |
| [Code.org](https://code.org/) | How are goals, hints, retry feedback, and course progression explained to young beginners? |
| [Duolingo ABC](https://abc.duolingo.com/) | How do illustration, readable controls, and short feedback sequences support a child-focused task? |
| [Brilliant](https://brilliant.org/) | How do interactive explanations and progressive disclosure keep the next thinking step clear? |
| [Minecraft Education](https://education.minecraft.net/) | How are exploration, building, and spatial landmarks balanced with an explicit learning objective? |
| [LEGO Education](https://education.lego.com/) | What makes the robot/building world feel tactile, coherent, and inviting while instructions remain legible? |

Study at least four relevant products, including two child-focused learning products and one building/spatial-play experience. The shortlist may change if more useful evidence is found. For each studied product, capture the source URL, access date, annotated screen references, and observations about hierarchy, palette, typography, character/world design, motion, feedback, and distraction. State what Pip should adopt, adapt, or leave out and why. Treat observations as design hypotheses; a popular product is not evidence that a pattern improves attention or learning.

Deliver the research in UI-owned `docs/design/2026-09-17-game-ui-research.md`. Record the intended learner age/reading range with the user or course owner rather than assuming all kids need the same treatment. Research can proceed while that is clarified. The direction should feel playful and capable, with readable Java and ordinary programming terminology.

Explore two distinct visual directions with screen-level compositions, then select and document the strongest fit in UI-owned `docs/design/2026-09-17-game-ui-direction.md`. The direction includes a reference board, rationale, semantic color/type/spacing tokens, component states, robot/character shapes and expressions, arena materials/lighting, iconography, and a motion guide. Use original or appropriately licensed assets; references inform Pip's own identity. Existing React/Three.js/CSS infrastructure remains the implementation starting point.

Show high-fidelity treatments of the unit page and game workspace before broad styling implementation, including a narrow VS Code panel. The selected direction also covers success/retry feedback and the Git warehouse so the course feels like one product. Attractive world art, expressive robots, and tactile controls should create the appeal; instructions and code retain a calm, readable surface.

### Attention and engagement requirements

- Keep the current goal, next useful action, and run state easy to locate. Give each state one visually dominant action: start/continue on course pages, Save & run while editing, and a clear retry or next-step action after feedback.
- Let the world and robot carry the personality. Use color to identify locations, objects, and state consistently, with labels/shapes as additional cues. Make unit and boss artwork recognizable without requiring students to decode decorative graphics.
- Keep the editing/reading state visually quiet. Reserve larger movement for the requested replay and brief earned celebrations. Decorative loops pause while the student works; bubbles and rewards must not obscure code, the goal, or run controls. Celebration never delays retry or navigation.
- Reveal hints, detailed diagnostics, and the full transcript on demand while keeping the immediate goal and actionable failure explanation visible. Preserve access to the exact compiler output for students who need it.
- Make the sequence **read goal → edit Java → run → observe → understand → retry/continue** visually consistent. Celebrate a concrete achievement such as a solved world or earned star. Show a clear stopping point and a clear way to resume; retain the agreed stars/unlocks model.
- Validate focus through tasks: can a learner find what to do, predict what Run will do, explain a bump or failed check, and find the next edit/retry step? Review the visuals with intended-age learners when available and record observed confusion. If learner sessions are unavailable, label the walkthrough as an internal review and keep claims about attention improvement unverified. Longer session time alone is not an acceptance measure.

UI completion requires the research/direction artifacts, implemented screens compared against the selected direction, and screenshot/interaction evidence for these attention requirements in both narrow and wide layouts. Check supported VS Code themes, contrast, reduced motion, and focus visibility. Record visual or usability gaps as fixes owned by the UI worktree.

## 3. Games

Except for fixed subtopic 1.1, level 2 uses bigger random values plus one extra rule (an obstacle, a second item, or limited stock). Both levels use the same student source. A twist must not require an untaught construct: early games can use varied distances in a fixed route, but cannot demand general maze navigation. Each game file documents its twist, input schema, goal invariants, and allowed solution constructs. A game that cannot be graded reliably may be swapped for another on the same subtopic; the count stays 5 and IDs are frozen before release.

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
- **`talent-show`** (Unit 1, open arena): passes with at least 6 actions including at least 2 speech lines and 2 successful `move` command lines, with no bump or limit failure. `move 2` is one move command. Its route is fixed so Unit 1 students need no branching.
- **`free-draw`** (Unit 2, open canvas): passes with at least 10 painted tiles and a nested `for` loop.

Projects award ★ only.

**Reference solutions and requirements:** construct-focused games declare the target in `requirements`, including conditionals and Scanner where those are taught. Random worlds reduce memorized-answer success but cannot prove concept use. Existing `checkStructure` checks syntactic presence; two loops can be separate, and a declared helper can be unused. Extend the AST inspection/checker for nested loops and other missing requirements before authoring dependent games. Required helper signatures must be paired with call checks and direct helper tests where practical, especially for returns. Array/reference games must vary values and test observable alias behavior. Reject representative incorrect solutions containing empty/dead constructs or fixed outputs; do not claim a general proof against every deliberately adversarial program.

Goal checks use exact target state and relevant invariants: intended recipients, distinct destinations, expected inventory/stock, and required computed speech. They must reject a no-op when generated targets could be zero. Every generator must yield a solvable world within process/action limits. “Keep Shooting” uses deterministic hits with all needed data up front; it cannot read live shot results. Dice Dash checks the seeded roll, range, and resulting movement, plus use of `Random.nextInt`; merely printing a fixed in-range number is insufficient.

## 4. Git & GitHub side unit

8 concept lessons in `src/git-unit.js`, with `kind: 'concept'`:
1. Working folder and repository (`git-repository`)
2. Stage (`git-stage`)
3. Commit (`git-commit`)
4. Push (`git-push`)
5. Pull (`git-pull`)
6. Branch (`git-branch`)
7. Merge (`git-merge`)
8. Merge conflict (`git-conflict`)

Each entry has `id`, `kind: 'concept'`, `title`, `assessmentVersion`, the existing lesson-content fields/steps needed by Learn, and one `prediction` in the existing question format (step index 2). `GitLab` receives the lesson ID and exposes local scenario/reset state; it never writes coding completion. A correct quiz records the concept assessment version through a kind-aware completion helper shared by all course pages.

**Lesson page:** an interactive warehouse scene (`src/git-lab.jsx`) that the student drives with buttons:
- **Workbench:** the working folder.
- **Crate:** staging area. Stage loads a part into it.
- **Shelf:** local history. Commit seals the crate with a label and shelves it.
- **GitHub warehouse:** the remote. Push trucks crates there; pull brings new crates back.
- **Branch:** a side track. Merge joins the tracks.
- **Merge conflict:** two different crates for the same slot. The student chooses one.

The analogy must preserve Git semantics: staging copies a selected version without removing the working part; committing records a snapshot locally; pushing copies history while keeping the local copy. Pull includes integrating fetched changes. Branches share earlier history, and a merge keeps both histories. Resolving a conflict edits the resulting content and is followed by a commit; it does not erase one branch's history. Mention that real resolutions can combine both changes even though this exercise offers two choices. These constraints follow the [Pro Git description of snapshots and the three states](https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F) (reviewed 2026-09-17).

**Quiz page:** one prediction question. Concept lessons have no coding route and no "Start practice" link.

## 5. Build plan

### Working agreement

Use one branch and one worktree per row below, all created from an agreed baseline. Branch names use `pip-070/<name>`; sibling worktree directories may use `pip-070-<name>`. One worker owns a worktree at a time. The main checkout is the coordinator's integration checkout. Never run two agents in the same checkout, and never have workers merge into the integration branch themselves.

The current OpenCode agent is the UI owner. Claude/Codex assignments below are suggested defaults, not dependencies on a particular model tier. The user or designated coordinator launches those workers and performs merges. If the UI owner is also coordinating, integration work happens sequentially in the integration checkout, with its UI edits kept in the UI worktree.

Workers edit only their listed files and explicitly assigned new files. A required change in another owner's area becomes a handoff request with the file, interface change, and failing case. The owner applies it; workers must not make competing “temporary fixes.” Any ownership transfer is recorded before editing. UI fixes found during engine/content review return to the UI owner through the release.

### Step 0: baseline and contracts, by the coordinator with owner review

1. Inspect the checkout and agree on baseline contents before committing; preserve unrelated work. Ignore generated `screenshots/` output. Ensure implementation files needed by worktrees are tracked. Creating worktrees, committing, and launching workers belong to implementation, not this spec edit.
2. Resolve the decisions in section 6 before the affected settings/completion UI is implemented. Other work may proceed against the documented proposed defaults.
3. Add the five `src/games/unit-N.js` files, each exporting `games = []`, the concatenating `src/games/index.js`, and `src/git-unit.js` exporting `gitLessons = []`. Add import-safe scaffolds for the shared contracts/helpers required by parallel work. Do not present placeholders as functioning gameplay.
4. Freeze exported names, data shapes, and representative fixtures with the engine, structure, Git-content, and UI owners. Store the game transport contract in `shared/game-contract.js` and implementation notes in `docs/specs/2026-09-17-game-practice-contracts.md`. This follow-up contract document is a Step 0 deliverable. Include a success, a failed world, a compile error, a stopped run, and an ungraded input experiment. Engine and UI must use the same fixtures.
5. Reserve game files as `pip/games/<id>/Student.java`, package `pip.games.<id_with_underscores>`. Include game paths in host dispatch, editor commands, and keybindings while retaining existing lesson paths.
6. Workers may link `node_modules` and the bundled `runtime/` JDK read-only from the main checkout. Dependency changes go through the coordinator. Keep tracked `InspectSource.java`, builds, temporary runs, screenshots, and Java outputs local to each worktree. Use distinct dev-server ports and VS Code test profiles; serialize extension tests if the existing test runner cannot isolate profiles.

### Phase 1: foundations and UI in parallel

| Worktree | Worker | Exclusive ownership and deliverable |
|---|---|---|
| `engine` | Claude | `src/games/engine.js`, `extension/runner.js`, `extension/assessment.js`, `InspectSource.java`, `extension/extension.js`, `extension/engine.test.js`, `extension/games.test.js`, game result fixtures. Simulator, Java execution, grading, host game lifecycle, concept host guards. Sample Hello Arena in `unit-1.js` and Hoop Streak in `unit-2.js` until the Phase 2 transfer. |
| `structure` | Codex | `src/curriculum.js`, new `shared/completion.js`, `shared/progress.js`, `extension/state.js`, `extension/completion.test.js`, new progress/data tests. Unit/activity models, pure completion/unlock predicates, progress normalization/import/patch merging, persisted concept passes. |
| `git-content` | Claude | `src/git-unit.js`, new `src/git-scenarios.js`, and new concept-content/scenario tests. Eight lessons, predictions, and serializable warehouse scenarios with valid actions, state transitions, and reset behavior. No JSX or styles. |
| `ui` | OpenCode — current agent | `src/pages.jsx`, `src/main.jsx`, `src/routes.js`, `src/context.js`, `src/progress.js`, `src/platform.js`, `src/workspace.jsx`, `src/game-view.jsx`, `src/robot-view.jsx`, `src/git-lab.jsx`, `src/learn.jsx`, `src/quiz.jsx`, `src/visual-lab.jsx`, `src/style.css`, `src/extension.css`, `src/icon.jsx`, `src/code-text.jsx`, `web/world.js`, `web/effects.js`, the research/direction documents under `docs/design/`, and new UI components/assets/tests. Product research, visual direction, all course/workspace/scene UI, Git interaction, navigation, frontend host wiring, and subsequent UI modifications. |
| `integration` | Coordinator | `src/games/index.js`, `shared/game-contract.js`, the contract document, `extension/test/suite.js`, `extension/runner.test.js`, package/lock/version metadata, build/test configuration. Shared contract changes, merges, integration tests, and release packaging. |

Shared files remain single-owner: for example, the engine supplies host behavior in `extension/extension.js`, structure supplies persistence in `extension/state.js`, and UI supplies the request wiring in `src/platform.js`. The coordinator applies owner-reviewed changes to integration-owned files. UI proposes the visual assertions/selectors for `extension/test/suite.js`; engine supplies any required host test API.

### Handoff contracts

- **Curriculum → UI/host:** structure supplies the unit/activity/membership exports from section 1 and reads games through `src/games/index.js`. Keep legacy exports import-compatible during staged merges. `shared/completion.js` exposes pure predicates for coding, concepts, games, subtopics, units, total stars, and unlocks. `src/context.js` re-exports/adapts these for React; the UI does not duplicate completion rules. Shared predicates must be usable from Node without React/browser imports.
- **Host → UI:** freeze `game.open`, `game.run`, `game.focus`, and `game.restore` requests, plus the existing stop mechanism. `game.run` distinguishes graded and custom-input modes explicitly. Packets carry `gameId` and `runId`; existing lesson packets retain `lessonId`. Agree on started/progress/finished event payloads, cancellation status, restored results, document-change notifications, and error shape before separate implementations. `/game/:gameId` renders `<Workspace />`; the UI owner reads `useParams().gameId` and chooses the game panel.
- **Grading → progress:** engine computes earned stars and submits a host-owned game update through the structure-owned merge helper. The host persists it and broadcasts the normalized progress snapshot using the existing progress channel. UI displays earned/saved stars and sends only allowed preferences or concept quiz submissions. Correct concept submissions are validated against the current prediction/version before recording a permanent pass. Record the submission message and persisted field in the Step 0 contract.
- **Simulator → replay:** engine supplies JSON world/events/end data; UI consumes it without importing Node/JDK code. Agree on event positions, actor/entity IDs, action indices, inventory/gate changes, and terminal outcomes. Replay timing and bubble placement belong to UI. Engine owns semantic fixtures; UI may add visual fixtures without changing expected simulator results.
- **Git content → Git UI:** freeze the scenario state/action schema before parallel work. `src/git-scenarios.js` contains pure data; the UI interprets the transitions and renders the workbench/crate/shelf/remote/branch states. All eight scenarios require initial state, named button actions, instructional feedback, terminal state, and reset. Warehouse progress does not gate the prediction quiz.
- **Contract changes:** propose once in the contract document, get affected owners' acknowledgement, and land through the coordinator. Update shared fixtures in the same integration batch. Avoid private copies of schemas or a second production simulator in the UI.

The UI owner can begin the existing-screen audit and external product research while Step 0 contracts are prepared. After Step 0, prototype against the shared fixtures, select the visual direction, and implement the shared visual system before expanding across screens. Fixture mode is development/test-only and cannot persist earned stars. Before Phase 1 acceptance, replace fixture transport with the real host and run both sample games end-to-end.

Phase 1 is complete when both reference solutions run from the native editor, stars survive reopening/import, a Git quiz completes without a coding file, unit navigation works, and legacy mission regression tests pass. Engine hands content authors a working single-unit test command, supported requirements, and example generators/goals. Exact release catalogue counts are enforced in Phase 2; the two-game Phase 1 build is intentionally incomplete.

### Phase 2: game content and UI integration

After Phase 1 merges, create content worktrees from the new integration HEAD. Engine explicitly transfers `unit-1.js` and `unit-2.js` ownership to their content authors. Each content author owns only its unit file, including authored grading cases. Complete the sample games in place. Backend fixes go to engine, data fixes to structure, and all visual/interaction changes go to UI.

| Worktree | Suggested worker | Deliverable |
|---|---|---|
| `games-unit-1` | Claude | 15 regular games + `talent-show`: 16 entries |
| `games-unit-2` | Codex | 10 regular games + `free-draw`: 11 entries |
| `games-unit-3` | Claude | 10 regular games |
| `games-unit-4` | Codex | 10 regular games |
| `games-unit-5` | Claude | 10 regular games |

Total: 57 entries, 55 regular games, 11 bosses, 2 projects. The allocation may be rebalanced before a worker starts; file ownership stays exclusive. Each author runs `PIP_GAME_SEEDS=20` with the agreed unit-filtered test command and supplies seed-specific failures or a passing report. Unsupported constructs are resolved with the engine owner before handoff.

The UI owner continues in the `ui` worktree (after synchronizing it to the accepted Phase 1 base), integrates representative content as it lands, checks long briefs/input/transcripts and varied boards, and finishes the complete course/progress/unlock states. Content merging must not wait until final review to expose rendering problems.

### Phase 3: review, UI completion, and documentation

| Worktree/role | Worker | Task |
|---|---|---|
| `review` | Claude/Codex, cross-review | Claude reviews Codex-authored logic/content and Codex reviews Claude-authored logic/content. Review grading holes, source-check bypasses, migration, and host contracts. Report findings with reproductions; route fixes to the file owner. Both may review UI, with fixes owned by OpenCode. |
| `ui` | OpenCode — current agent | Complete visual and interaction QA against real host runs and the research-backed direction; evaluate the attention tasks, fix review findings in UI-owned files, and verify keyboard/reduced-motion/WebGL-fallback behavior and legacy mission rendering. Supply before/after evidence for changed screens and identify any learner-validation gaps. |
| `docs` | Codex | Update workshop READMEs, `ARCHITECTURE.md`, `CURRICULUM.md`, and `ROADMAP.md` against the merged implementation. Root-level documentation with existing user edits requires coordinator review. |
| Cleanup report | Coordinator or delegated worker | List stale VSIX files, screenshots, and the Tauri experiment with reasons. Delete only after user approval. |

Every worker handoff includes its branch/base and commit IDs, changed files, tests and exact commands, sample IDs/seeds for reproduction, outstanding issues, and requested changes outside its ownership. UI handoff additionally includes the cited product research, selected direction, screenshots, states/view widths checked, and attention-task findings. A worker cannot report completion based only on mocks or skipped JDK tests.

### Integration and release

1. Land Step 0 contracts/scaffolds, then merge Phase 1 in this order: **engine → structure → git-content → ui**. These are independently verifiable branches; the full end-to-end Phase 1 gate runs after UI lands. Structure must tolerate an empty Git registry; consumers must tolerate a partial game catalogue. Apply the coordinator-owned coding-test filter before concept registration so Java tests never attempt to compile concepts.
2. After each merge, run `npm test` and `npm run build`. Resolve regressions through the relevant owner before merging dependent work. After UI or host integration changes, run the affected extension smoke tests. Only the coordinator resolves cross-owner conflicts, consulting the owners where behavior changes.
3. Merge Phase 2 units in numeric order, synchronizing and merging UI follow-ups as needed. Phase 3 reviews the actual merged branch; substantive fixes receive their relevant checks again.
4. Run `PIP_GAME_CATALOG=complete PIP_GAME_SEEDS=20 npm test` to require the full 57-entry catalogue and the full seed check, then `npm run test:extension`. Engine implements the catalogue-completeness switch in its test harness; the coordinator uses it for the release gate. Regular `npm test` validates every present game during partial development.
5. Set version 0.7.0 and run `npm run package` to produce `pip-workshop-0.7.0.vsix`. Confirm the VSIX includes the new content and inspector. Record the tested integration commit, command results, and screenshot paths. Keep branches/worktrees until the release is accepted; cleanup is an explicit follow-up.

## Testing

- **`extension/engine.test.js`:**
  - line parsing, case, and spacing
  - speech fallback and typo hints
  - bumps, hurdles, and the action limit
  - shop orders (singular, plural, stock)
  - shooting line of sight and range
  - painting and delivery
  - star computation and par
  - action vs. event counts; blank lines, malformed numeric arguments, and terminal newline handling
  - inventory order, rejected drops, opened gates, and simulator immutability
  - constant recompilation, partial-tier failures, process failures, cancellation, and stale run results
- **`extension/games.test.js`, for every registered game:**
  - `world()` is deterministic per seed and level.
  - The reference solution earns ★★★ (projects: ★).
  - The starter earns no star on seed 1.
  - Always validate unique IDs, valid membership, and each present game's schema. With `PIP_GAME_CATALOG=complete`, require exactly 57 entries, five regular games per Java subtopic, one last-position boss per subtopic, and exactly two one-star projects. Empty/partial scaffolds are allowed only without that release-completeness flag.
  - Representative incorrect solutions fail: fixed-output solutions on varied worlds, missing/unused target constructs, separate loops where nesting is required, incorrect recipients, and off-by-one goals. Include authored boundary fixtures beyond random seeds; fixed 1.1 command solutions are intentionally valid.
  - Both levels compile and pass using the same source; no untaught construct is required. Validate reachability through reference simulation and validate world bounds/data before invoking Java.
  - Seeds per level: 3 by default; `PIP_GAME_SEEDS=20` for the full check each Phase 2 agent runs before handing back.
  - The harness uses explicit reproducible seeds `1..N` per level. Full checks require a working JDK and fail if execution is skipped. Report game/level/seed/source on failure. A unit filter allows authors to run only their file; the coordinator runs all units after merging.
- **Progress/course tests:** old v5 saves, multipart passes, partial host patches, imports in both directions, monotonic stars/best, unknown IDs, project-inclusive unit completion, Git completion, direct concept coding-route guards, and legacy `finish` redirects. Test unlock boundaries and the agreed selection migration.
- **`npm run test:extension`:** open one game, edit/save/run its reference solution, and assert that the stars and a chat bubble render. Verify persistence after reopening, world switching, Step/Replay, cancellation, and ungraded custom input. Keep existing motor mission smoke tests. The game screenshot is saved as `screenshots/vscode-game.png`.

## 6. Review outcome and decisions to confirm

The shared simulator and data-driven games fit the existing host-run Java architecture. The initial design was precise about content and navigation but left grading, persistence, and cross-worktree contracts incomplete. This revision resolves the count mismatch, missing 4.1 input scaffolding, fixed-world exception, constant recompilation, and action/replay ambiguity.

Code evidence from the 0.6.0 checkout, reviewed 2026-09-17 (line references describe the pre-implementation files):

| Finding | Evidence | Required resolution |
|---|---|---|
| Varying constants conflicts with compiling once | `extension/runner.js:103–106`; `extension/assessment.js:5–11` | Recompile temporary variants; preserve the saved source. |
| Loop counts do not prove nesting or use of a helper | `extension/assessment.js:24–27` | Extend inspection/checks and test representative incorrect solutions. |
| New progress maps would be dropped or replaced | `shared/progress.js:11–29`; `extension/state.js:12–15` | Versioned normalization and per-game host/import merging. |
| Concepts can enter coding paths and fail completion | `src/routes.js:1–2`; `src/workspace.jsx:16–19`; `src/context.js:5–8` | Kind-aware navigation, host guards, and quiz completion. |
| Curriculum consumers depend on flat module IDs | `src/curriculum.js:152–168`; `src/learn.jsx:20`; `extension/extension.js:188` | Transitional exports and one shared activity/membership model. |
| Game editor paths are outside current run bindings | `package.json:32–35` | Include game paths in host dispatch and editor bindings. |

Product decisions still requiring confirmation:

1. **Existing arena access.** Garden and Moon are currently unrestricted. Proposed default: apply new arena locks to game replay only and preserve existing motor-mission preferences/access. Store game arena/skin selection separately; an unavailable game selection falls back to Workshop/default. Confirm this scope before changing the shared scene/settings UI.
2. **Git in course completion.** Proposed default: Git is an optional side unit with its own completion indicator and no stars. Confirm whether the overall course-complete badge should require it.
3. **Skin catalogue.** Choose five names, stable IDs, and visual treatments before implementing unlock controls. Thresholds are already fixed. A base skin is additional to these five.

Rollout and recovery: export a progress backup before migration; use additive game/concept records and preserve existing coding IDs/versions. If the release must be withdrawn, retain the version-6 backup: the older normalizer drops unknown fields when it saves, so downgrading alone cannot preserve new game stars. A defective authored game is corrected under its existing ID; already earned stars remain intact.

## Out of scope

- Reading character replies mid-run. The whole world is given as input up front; streaming Java output and input through the simulator is the upgrade path if a game needs it.
- Running Java in the webview, or live execution.
- Real git operations or GitHub accounts.
- XP, streaks, and leaderboards.
- Changes to the existing motor-control missions.
