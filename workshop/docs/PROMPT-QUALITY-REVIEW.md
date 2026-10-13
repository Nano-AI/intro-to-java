# Student prompt quality review

Reviewed 2026-10-12 by an independent model reviewer. The findings below retain the original diagnosis and proposed changes; the final verification section records their resolution. This is a source-content and rendering-path review, not a claim that a five-year-old has usability-tested the app. The programming tasks still require the taught reading, number, decimal, coordinate, and Java skills. No student files, lesson IDs, answers, prerequisites, or progress were changed by this review.

## Coverage

The inventory below was read in full, including inherited/overridden lesson fields after `improveLessons`. Counts describe activity records, not unique wording; inherited quizzes occur more than once.

| Source | Coverage |
|---|---|
| `src/curriculum.js` + `src/lesson-content.js` | 30 console lesson records: 21 ordinary lessons, 5 primary repairs, 4 child repair parts. Reviewed intros, concepts, examples, prediction questions/options/answer keys, tasks, hints, reflections, starters, solutions and authored cases. |
| `web/missions.js` + `web/course.js` | 6 robot lessons, 30 Explore steps and 6 prediction questions; tasks, targets, starter/solution and explanations. |
| `src/challenges.js` | 3 guided robot capstones: detour, cargo, hoop; all goal, task, hint, question, example, reflection and world specifications. These are distinct from independent challenges. |
| `src/independent-challenges.js` | All 10 independent challenges: battery budget, prize tokens, round points, square total, trip cost, match score, battery signal, charge time, positive gains, count matches. All tasks, constraints, 20 examples, 30 public cases and 230 submission expectations. |
| `src/games/unit-1.js`, `unit-2.js` | Both short games: Hello Arena and Hoop Streak; all briefs, tasks, optional hints, starter/solution and goals. Units 3–5 contain no short games. |
| `src/games/projects.js`, `advanced-projects.js` | All 5 projects: Supply Relay, Staircase Arena, Tower Rescue, Signal Patrol, Mosaic Survey; all briefs, tasks, input descriptions, 25 milestones, 15 refresher questions/options/answers/explanations, 6 documented helper methods and their probes. Supply Relay reviewed after the one-supply revision. |
| `src/project-steps.js` | All 29 rendered checklist steps across 7 games/projects, plus all 7 short goals. Checked against underlying milestones and world rules. |
| `src/git-unit.js`, `git-scenarios.js` | All 8 side-unit concepts and questions, all 8 scenario goals, 27 state captions, 19 actions/feedback texts and 8 reset messages. Git is included because “all prompts” includes this side unit. |
| `shared/game-commands.js` | All 8 movement/action command entries, speech and ball-request documentation. |
| Rendering paths | `quiz.jsx`, `workspace.jsx`, `challenge-panel.jsx`, `project-guide.jsx`, `code-text.jsx`; all 16 interactive lesson models in `visual-lab.jsx`, including the composite variable model. |

Inventory discovers 57 lesson/challenge records (30 console + 9 robot + 10 independent + 8 Git) and 7 game/project records. The 4 child repairs do not add course lessons or totals. This report does not cover archived specs or claim that source review substitutes for native visual QA.

## Correctness and specification findings

**P1 — Quiz question context disappeared in rendering. Fixed during this review by the main agent; retain a regression check.** `src/quiz.jsx` originally rendered the question title, code and choices but omitted `step.text`. In `web/course.js`, precision-parking asks “How many seconds?” while the essential statement is “At power `0.25`, Pip moves 25 cm each second. How long does it take to travel 100 cm?” Render that statement using `CodeText`. The same fix restores context for the other robot questions. Expected answer remains 4 seconds.

**P1 — Several practice tasks do not state the problem on the practice screen.** `workspace.jsx` renders `lesson.task`, not `lesson.intro`. The following replacements make the visible task complete without adding hints or new concepts. Exact source fields are the corresponding `make(...)` task argument in `src/curriculum.js`, except the override explicitly named below.

| ID | Current task | Replacement task |
|---|---|---|
| `java-for` | “Write a loop that prints one numbered line for each scan. Zero scans should produce no output.” | “The starter reads `count`. Use a `for` loop to print `Scan 1`, `Scan 2`, and so on through `Scan count`, with the number in place of `count`. Print each scan on a new line. If `count` is 0, print nothing.” |
| `java-conditionals` | “Replace the fixed message with an `if`/`else` based on `battery`.” | “The starter reads `battery`. Use `if`/`else` to print `CHARGE` when `battery` is below 20. Otherwise print `READY`. Print only that word.” |
| `java-while` | “Add the countdown loop before the `GO` message.” | “The starter reads a whole number `count`, which is 0 or more. Use a `while` loop to print `count`, then each smaller number down to 1, one per line. Print `GO` last. If `count` is 0, print only `GO`.” |
| `java-scanner` | “Read both values, then print `name + ":" + (load * 2)`.” | “Read a one-word robot name, then a whole-number load. They are separated by a space. Print the name, a colon, and twice the load, with no spaces. For input `Pip 4`, print `Pip:8`.” |
| `java-arrays` | “Fill `samples` using `input.nextInt()`, then loop over the array to calculate `total`.” | “Read four whole numbers into `samples` using `input.nextInt()`. Use a `for` loop to add the array values into `total`. Print `total`.” |
| `java-2d-arrays` | “Use nested loops and a condition to count all the `1` values.” | “In `map`, `1` means a free station and `0` means a busy station. Use nested `for` loops and a condition to count the `1` values in `available`. Print `available`.” |
| `java-final-report` | “Complete `countLow`. Add a comment describing its behavior. Test an empty array, boundary values, and several low readings.” | “Complete `countLow(int[] readings)`. Use a `for` loop to count readings below 20 and return that count. A reading of 20 does not count. An empty array returns 0. Add one comment saying what the method returns. The starter reads the values and prints the result.” |
| `java-strings` | “Print the label’s length, then its first character on a new line.” | “Use `label` to print its number of characters on line 1 and its first character on line 2.” |
| `java-references` override in `lesson-content.js` | “Make `backup` refer to `readings`. Set `backup[0]` to `replacement`, then print `readings[0]` and `readings[1]`.” | “Make `backup` refer to the same array as `readings`. Set `backup[0]` to `replacement`. Print `readings[0]` on line 1 and `readings[1]` on line 2.” |
| `debug-array-bounds` in `lesson-content.js` | “Change the loop condition so every valid element is visited exactly once.” | “Repair the loop condition so it reads each value in `values` once and stops at the end of the array. Keep the values unchanged. Print their total. The sample prints `12`; an empty array prints `0`.” |

**P2 — Git lessons teach two inaccurate general rules.** These are outside Java practice but inside the reviewed side unit.

- `git-unit.js`, `git-commit.concept`: “After a commit the staging area is empty” → “After a commit, there are no staged changes waiting to be committed. The working files stay the same.” The index still represents tracked files; it does not become empty. For the crate analogy in `example` and `git-scenarios.js` commit/stage captions, replace “empty crate” with “no new changes waiting in the crate,” or explicitly label the crate as *changes waiting to be committed*. Do not silently equate an empty change list with an empty index. See [Git commit documentation](https://git-scm.com/docs/git-commit).
- `git-unit.js`, `git-merge.concept`: “combines the changes into a new commit that records two parents” → “In this example, both branches have new work. Git combines it in a merge commit linked to both branches. The earlier commits stay in the history.” This is accurate for the pictured divergent branches without falsely teaching that every merge creates a commit. In `git-scenarios.js`, `git-merge.states.merged.actions[0].feedback`, change “A merge adds a crate; it removes none” to “This merge added a crate and kept both earlier tracks.” See [Git merge documentation](https://git-scm.com/docs/git-merge).

**P2 — Required algorithms are sometimes broader than the structural check.** In `independent-challenges.js`, Positive gains and Count matches ask for `for` loops in *both* methods, but `requirements.scope` checks the loop only in the first method. Trip cost asks `roundTripCost` to call `tripCost` for each leg; method existence/usage checks alone cannot establish that call relationship. Match score has the analogous reuse requirements. Keep the prompts; document that passing output and broad syntax tests do not prove every named technique or understanding. If this is meant to be enforced, test each required method’s structure rather than weakening the task. This is a grading limitation, not a reason to add solution hints.

**P2 — Model copy and shown expression disagree.** `visual-lab.jsx`, `Fraction`: selected mode is “double / int,” but the explanation renders `3 / 4.0` (int / double). Both yield 0.75, but the learner is comparing types. Show `(double) 3 / 4` in that mode to match the lesson and selected label. Whole-number results of a `double` example should be shown as `0.0`/`1.0` if presented as exact Java output; the current number formatter shows 0/1.

## Comprehension changes

**P2 — Replace unexplained vocabulary at its first use.** These edits preserve the concept and do not lower challenge requirements.

| Source / field | Current wording | Replacement |
|---|---|---|
| `curriculum.js`, `hello-java.intro` | “Send a two-line startup message from the robot’s diagnostic terminal.” | “Print two lines to say Pip is ready.” |
| `curriculum.js`, `java-expressions.concept` | “A `double` operand makes division keep its fractional part.” | “If either number is a `double`, division can keep the part after the decimal point.” |
| `curriculum.js`, `java-for.concept` | “A `for` loop has initialization, a condition, and an update.” | “A `for` loop has three parts: choose a starting value, check whether to keep going, and change the value after each turn.” Retain the sentence explaining the body and supplied Scanner. |
| `curriculum.js`, `java-accumulator.intro` | “Add the integers from 1 through the given count to total a sequence of charging increments.” | “Add the whole numbers from 1 through `count`. For `count = 4`, add 1, 2, 3, and 4.” |
| `curriculum.js`, `java-accumulator.concept` | “Create an accumulator before the loop so its value survives every iteration.” | “An accumulator is a variable that keeps a running total. Create it before the loop. Add to it each time the loop runs.” |
| `curriculum.js`, `java-random-math.intro` | “Turn a raw sensor value into a magnitude, then limit it to a maximum of 100.” | “Read a sensor number. Remove a minus sign if it has one. If the result is above 100, use 100.” |
| `curriculum.js`, `java-random-math.reflection` | “Why is a fixed seed useful when debugging random behavior?” | “Which numbers can the `die` expression produce? Why can it never produce 0 or 7?” Seeds are not explained by the lesson. |
| `curriculum.js`, `java-methods.concept` | “A method names a behavior. A parameter receives a value at the call site.” | “A method is a named set of instructions. A parameter is a name for a value sent into that method.” Retain the explanation of two calls. |
| `curriculum.js`, `java-returns.concept` | “A method declared `double` must return a `double`-compatible value.” | “A method with return type `double` must send back a number it can store as a `double`.” |
| `curriculum.js`, `java-scanner.concept` | “`Scanner.next` reads one text token; `nextInt` reads an integer token.” | “`input.next()` reads one word. `input.nextInt()` reads one whole number. Spaces and new lines separate the values.” Keep the separate explanation of `nextLine`. |
| `curriculum.js`, `java-array-patterns.reflection` | “Design tests for all-negative values, duplicate maxima, and a maximum at the last index.” | “Try three arrays: all numbers below zero; the largest number appearing twice; and the largest number at the end.” |
| `lesson-content.js`, `java-types.reflection` | “Explain why casting it to `int` would lose information.” | “Would a whole-number variable keep the `.5` part? Explain your answer.” Casting is introduced in the later expressions lesson. |
| `project-steps.js`, Hoop Streak step 1 | “Ask the shopkeeper for baskets balls.” / “Pip holds baskets balls.” | “Ask for the number of balls stored in `baskets`.” / “The number of held balls equals `baskets`.” |
| `independent-challenges.js`, `challenge-trip-cost.task` | “calls `tripCost` for each leg” | “calls `tripCost` once for the trip out and once for the trip back” |
| `independent-challenges.js`, `challenge-round-points.task` | “sum of all scoreboard readings” | “the total of the scores shown after every round” |
| `independent-challenges.js`, method challenge constraints | “Keep the public static method signatures.” / “Keep the public static int signatures.” | “Keep each method’s name, return type, and parameters as shown in the starter.” |
| `independent-challenges.js`, `challenge-battery-signal.task` | “Already FULL needs 0.” | “If the battery is already at 80 or more, print 0 on line 2.” |

For Git, concepts are longer and more abstract than Java tasks. The existing concrete scenes help, but phrases such as “fetching and integrating,” “reachable through the merge commit,” and “movable name for one line of commits” need the scene alongside the question. Avoid claiming independent five-year-old readability from sentence length alone. A child can read “stored copies,” “bring the new work into this branch,” and “follow the links back” before being asked to recall the technical names.

**P2 — Keep code-shaped names visually distinct in project instructions.** `CodeText` highlights backticks and selected syntax; it cannot recognize arbitrary bare variables. Add backticks around `gap`, `energy`, `costPerTile`, `travel`, `remaining`, `SIZE`, `TOWERS`, `baskets`, `total`, `distance`, `collected`, `mosaic`, `blue`, `yellow`, and `row` when used as Java names in `project-steps.js`, project briefs/checks, methods and refresher explanations. For example “Calculate travel using gap” → “Calculate `travel` using `gap`.” Also render refresher titles through `CodeText` when they contain code. Ordinary numbers, prose labels and topic tags remain plain text. Existing block examples correctly use `JavaCode`.

**P2 — Update references to removed controls in the same pass as Run/Submit.** This is an in-progress integration item, not a claim the main agent has finished it. In `project-steps.js`, Staircase “Run Check project,” Tower “Run Check project,” Signal “run Check project,” and Mosaic “Run Check project” should say “Run the examples, then Submit.” In `advanced-projects.js`, both briefs/inputHelp plus Signal milestone 2 and Mosaic milestone 2 still refer to “Save & run” or “Try sample board.” In `projects.js`, Tower milestone 2 uses “Try sample board.” Use the actual control names and identify public case 1 for a sample-only checkpoint. Do not tell the learner to type into a removed custom-input control.

## Arithmetic and specification pass

- Independently recalculated all **230 submission expectations and 30 public expectations** for the ten challenges using a separate assert-based Node oracle. For sums and charge time the oracle used iterative addition, rather than the production closed-form calculations. All 260 matched. All 20 printed examples were also checked against the stated rules. No wrong challenge answer was found.
- Manually traced all 15 refresher keys: Supply 5 / 18 / `move 2`; Staircase 6 / 3 / five rows; Tower changed argument / 7 / 10; Signal jump / next read / 5; Mosaic last index / 3 / shared value 0. All are correct.
- Checked the 30 console records’ authored examples and cases. The returns case `1.2 * 3` intentionally prints `3.5999999999999996` in Java. That expected string is correct; do not “fix” it to `3.6` without introducing a rounding requirement and changing the contract. A short lesson note that decimal calculations can have tiny rounding differences would avoid surprise.
- Checked project sample arithmetic and route contracts: revised Supply travels `gap + 1`, 3 tiles and 44 energy for 2/50/2; changed 4/60/3 leaves 45. Staircase size 4 gives 10 targets, size 13 gives 91. Tower count 4 gives 10 parts, count 8 gives 36. Signal sample has 6 tiles and 2 parts, excluding -1. Mosaic sample has 12 cells, 7 blue and 5 yellow. Coordinates and final directions agree with the authored worlds.
- Independent challenge prerequisites cover the required calculations, loops, methods, conditions and arrays. No modulo operator is required to solve Prize tokens: the reference uses subtraction of the cost of whole tokens. No new algorithm hints are recommended. The strengthened paired outputs/methods test related concepts rather than merely repeating identical statements.

## Limits and next checks

This reviewer wrote only this report. No native visual review or child comprehension study was performed. Rendering-path inspection establishes which components receive text, not legibility in the Tauri window. The main implementation must run the required app tests and inspect actual lesson/quiz/practice/project/challenge flows. Re-read this report against the final concurrent edits before treating an item as unresolved; the quiz-context fix and Supply rewrite happened during the audit.

## Final verification of applied changes — 2026-10-12

The independent reviewer re-read the applied copy and the relevant render paths. Original findings above are historical; this section is the current disposition.

| Finding | Final disposition |
|---|---|
| Missing robot quiz context | Resolved. `QuizPage` renders the authored `step.text` through `CodeText`; the generic instruction is omitted. Parking’s speed/distance question is complete. |
| Incomplete practice tasks | Resolved. All ten identified tasks now state the needed rule/output on the practice screen. The copy pass also clarified nested grids, accumulator zero cases, shelf summaries and maximum finding. Array bounds correctly labels 12 as the sample result and allows changed/empty arrays. |
| Git staging and merge claims | Resolved in both lesson prose and scenario captions. The crate represents new staged changes; the lesson explicitly says the staging area retains the saved files. Merge wording describes the pictured two-parent merge and allows a forward-only update. Quiz answer indexes are retained. |
| Unexplained vocabulary/prerequisite references | Resolved for the concrete replacements in the table: first-use method/accumulator/division language is simpler; untaught seed/cast questions were replaced; the decimal-output note explains the existing numeric case. |
| Fraction teaching model | Resolved. The double/int choice displays an explicit cast on the first number. Decimal-mode whole-number results are shown as `0.0` and `1.0`; 0.25/0.5/0.75 are unchanged. |
| Code formatting in revised prompts | Resolved for the reviewed changes. Variables/expressions use explicit markup. Refresher titles, checklist detail headings and checklist navigation titles use `CodeText`, avoiding literal backticks in the navigation. |
| Removed control names | Resolved. No game/project brief, task, inputHelp, milestone or rendered checklist contains “Check project,” “Save & run,” or “Try sample board.” Checkpoints identify Run case 1 and explain that an unfinished project may still fail the overall checks. |
| Independent challenge technique enforcement | Retained as a documented assessment limitation. Some required loop/call relationships are broader than the structural checks. Prompts and required concepts were not weakened, and no hints were added. This is not a remaining comprehension/specification error. |

A final import-and-assert inventory check passed: 57 lesson/challenge records, 7 games/projects, 29 rendered checklist steps, 15 refresher questions, and all 10 independent challenges still have exactly 3 public cases and at least 20 submission cases (230 total). No independent challenge gained a hint. The arithmetic review above remains applicable; copy corrections leave expected numeric answers unchanged.

The source review is complete for the inventory listed here. It establishes that goals, inputs, outputs, examples and task language were examined, and the identified copy/specification errors were corrected. It does **not** establish that every five-year-old can complete the course unaided. Native screenshots, app test results and observed child comprehension are separate evidence; they must not be attributed to this review.

The last three follow-up corrections were also verified directly: fraction practice now describes varying `charged / total` inputs and labels 0.75 as the sample; the parking task supplies 25 cm/second; Signal assignment choices and Mosaic array-index choices have explicit code markup. No unresolved prompt-correctness or comprehension blocker remains from this review. The assessment limitations and absence of child usability evidence remain as stated above.
