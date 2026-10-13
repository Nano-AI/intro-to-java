# Curriculum — CSE 121 only

Reference: [UW CSE 121, Spring 2026](https://courses.cs.washington.edu/courses/cse121/26sp/) and its [syllabus](https://courses.cs.washington.edu/courses/cse121/26sp/syllabus/). The course explicitly teaches introductory procedural programming in Java and assumes no previous Java experience.

Pip is an original tutoring adaptation. **The core Java path has 35 top-level learning units and 39 executable coding parts/files: 30 console programs and nine robot programs**. Five cumulative game projects, two short games and ten independent challenges supplement that path without changing its saved lesson IDs or completion totals. The five-part declaration-repair group counts as one unit. The scope ends at CSE 121 fundamentals. Collections, inheritance, recursion, and later-course data structures are outside this project's current teaching scope.

## Modules

| Module | Top-level units | Main coverage |
|---|---:|---|
| Start with Java | 9 | Printing, declarations, syntax/type repair, assignment, casting, strings/characters, first robot motion |
| Make work repeat | 7 | `for` loops, boundary repair, nested loops, `Random`/`Math`, cumulative sums, reset repair, scope/class constants |
| Build reusable actions | 3 | Methods, parameters, return values, precision parking |
| Respond to the world | 6 | Conditions, `while` loops, `Scanner`, heading comparisons, feedback, booleans |
| Work with collections of data | 5 | Arrays, traversal, bounds repair, reference semantics, 2D arrays, maximum algorithms |
| Put it all together | 5 | Reusable docking, console report, obstacle detour, cargo delivery, hoop shooting |

Use [the lesson-by-lesson roadmap](ROADMAP.md) for prerequisites, visual actions, coding targets, debugging/test criteria, and optional teacher readiness guidance. `src/curriculum.js` assembles the module order; `src/lesson-content.js` adds declarations, debugging exercises, visual metadata, and structure requirements. Existing robot labs are defined in `web/missions.js`, with teaching steps in `web/course.js`. `host/assessment.js` supplies varied cases and direct method calls.

## Teaching flow

Ordinary lessons follow **Explore → Quiz → Practice**. `/learn/:lessonId` presents the goal, concept, highlighted Java and an interactive model. Completing the model opens `/quiz/:lessonId`; the correct prediction opens coding. A lesson with a current passing code record remains open. Multipart repairs share their parent's Explore and Quiz. These lesson screens are separate from archived slide decks.

`src/routes.js` sends ordinary coding to `/practice/:lessonId` and all five final projects to `/project/:lessonId`. The single `/projects` catalog also includes tile games at `/game/:gameId`. Independent challenges use `/challenge/:lessonId`. Old `/assignment/:lessonId`, `/assignments` and `/lesson/:lessonId` links remain redirects. The Tauri app supplies the Java editor; files stay in `~/.pip-java/`.

Projects and independent challenges declare coding prerequisites. Every required practice must pass before access, even when an older record already marks the project complete. These locks preserve existing Java, drafts and completion records. Game projects begin with a separate code refresher. [PROJECTS.md](PROJECTS.md) and [CHALLENGES.md](CHALLENGES.md) contain the current problem statements.

The concept model illustrates an idea; it does not execute the student's Java. **Run** in ordinary Practice and the final robot/console projects saves and checks the current source. Tile games and independent challenges provide **Run** for three public cases and **Submit** for at least twenty grading cases. Public runs do not award completion. Compare actual output or replay with the prediction; inspect raw compiler/runtime errors when a run fails.

Passing current code checks completes a unit: `practiceComplete` equals `hasPassedLesson`. Every coding part must pass its own assessment version. Explore and Quiz govern first access; review notes do not affect completion. Saved reviews, quiz answers and activities remain readable. Older code passes can require a current-version rerun without replacing the saved source. Course and module views distinguish unfinished work from completed work available for review.

## Declaration and debugging practice

Teach the declaration explicitly before assignment: point to the type, name, assignment symbol, initial value, and semicolon in `int bolts = 4;`. Build it in the widget, then write it in the supplied `main` method and print `bolts`. Compare `System.out.println(bolts);` with `System.out.println("bolts");`. Next, use `double power = 0.5;` to preserve a fraction. Do not accept changing the task's fractional value to hide a type error.

The five top-level debugging units cover declaration repair, incompatible numeric type, off-by-one loop, reset accumulator, and out-of-bounds array access. The declaration-repair unit `debug-semicolon` now contains five parts: missing semicolon (`debug-semicolon`), unknown type (`debug-declaration-type`), redeclaration (`debug-redeclaration`), new variable (`debug-new-variable`), and copied value (`debug-copy-value`). Each has its own `Student.java`; all five checks must pass. The parent Lesson includes declaration, assignment, and primitive-copy models, and its Quiz asks whether changing the original changes a copied `int`. The group's parts share the parent Explore and Quiz gate; completed practices stay open for review. See roadmap row 3 for the detailed part table.

Record **failure → cause → edit → retest** for each part. The copied-value program compiles but prints the wrong second value; not every bug is a compiler error. Because this group introduces reassignment and primitive copying before the later assignment unit, demonstrate those ideas in the parent model before asking for the repairs.

Keep all code references in inline backticks, including identifiers, APIs, operators, and paths; put Java examples in fenced `java` blocks. The UI renders code mentions with `CodeText` and `<code>` tags. Use **Format Document**, then review indentation, braces, names, and comments with the student.

## What the checks establish

- Reference solutions and student submissions execute as actual Java through `javac` and `java`.
- JDK AST checks through `InspectSource.java` enforce selected declarations, calls, loop counts, and method signatures. Assignment, compound-assignment, and unary-update records also enforce that `parts` and `used` remain unchanged in `main` for `debug-new-variable`.
- Initializer-based baseline cases execute the original source unmodified. Subsequent cases vary literal initializers in temporary copies. This preserves the student's file, rejects changing the required `0.5` to `0`, and checks that the computation uses its data.
- Baseline and boundary cases plus seeded fresh cases catch more fixed-answer and off-by-one mistakes than one example alone.
- Direct method harnesses exercise `announce`, `distance`, and `countLow` with changed arguments, rather than trusting output from `main` alone.
- The docking project invokes `Student.dock` directly for target distances of 30, 24, and 36 cm. Each trial must collect, avoid collision, and stop within 4 cm inclusive of its requested target; ignoring the parameter fails.
- Robot feedback labs vary starting position and motor strength.
- Compiler/runtime errors and time limits make mistakes observable.
- Progress stores explanations and predictions for later review.

These local, inspectable checks are not cheat-proof and do not establish mastery of the UW course. Structure checks are limited: a required loop's presence alone does not prove the intended algorithm. Optional teacher review can assess documentation quality, method design, explanation, and independent reasoning. The teaching suggestions below are advisory and do not affect software completion.

See `RELEASING.md` for verification coverage and history. Optional teacher assessment and student-machine performance checks continue as teaching/setup follow-up.

## Optional teacher mastery guidance

1. Ask for pseudocode or a spoken plan before an unfamiliar exercise.
2. Have the student trace one example without running it.
3. Change an input or requirement after a successful run.
4. Review method decomposition, naming, braces, comments, and tests in the real file.
5. Revisit previous topics without the original hints.
6. Use the capstone's reflection to discuss failure consequences, affected people, and human oversight.

`java-constants` covers class constants and loop-variable scope: declaring `public static final int SHELVES`, using it as a loop bound, and diagnosing the compile error from reading a loop variable after its loop. Random-number generation still needs teacher-led coding variations beyond the short core tasks — for example, write a bounded `Random.nextInt` experiment. The visual die cycles possible outcomes; it does not execute Java randomness. The course is a starting practice set, not the breadth of a university quarter's assignments and examinations.

Some early robot labs contain supplied `if` scaffolding before the dedicated conditionals module, and some input-driven exercises supply `Scanner` setup before its dedicated lesson. Explain that scaffolding is provided infrastructure; assess the currently targeted concept first.

## Robotics and GitHub transfer

Use motor commands, sensor readings, units, feedback, and repeated decisions to build robotics intuition. The simulator deliberately omits inertia, slip, and sensor noise. Explain those limitations before transferring to hardware. Twenty decisions per second is a teaching default, not a universal robot standard.

For `autonomous-docking`, compare the 30 cm default, 24 cm nearer, and 36 cm farther/weaker trials in the reflection. Mission 5 tests `Student.dock` reflectively; changing the call in `update` does not alter graded targets. Ask the student to explain how the parameter changes stopping behavior. The projects are original simplified teaching challenges, not an official game clone.

The three finish challenges in `src/challenges.js` extend this sequence: plan waypoints around a rectangle in `robot-detour`; combine collection, navigation, and delivery in `robot-cargo`; then collect one ball, align, select power, and shoot in `robot-hoop`. Use `x()`/`y()` for position, `collect()` and `hasPart()`/`hasBall()` for possession, `deliver()`/`wasDelivered()` for delivery, and `shoot(power)`/`scored()` for shooting. Each challenge has three start/motor trials and 40 simulated seconds. The roadmap records implemented geometry and exact strict/inclusive tolerances, plus remaining teacher assessment. Hoop range is 300 × power cm; the 1.5-second visual arc is not real ballistics.

For transfer practice outside Pip, use Git to commit a working Java change, inspect its diff and create a branch for an improvement. Request teacher review separately. Pip's Git activities model these concepts; they do not perform or certify real GitHub actions.
