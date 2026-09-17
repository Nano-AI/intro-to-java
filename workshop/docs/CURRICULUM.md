# Curriculum — CSE 121 only

Reference: [UW CSE 121, Spring 2026](https://courses.cs.washington.edu/courses/cse121/26sp/) and its [syllabus](https://courses.cs.washington.edu/courses/cse121/26sp/syllabus/). The course explicitly teaches introductory procedural programming in Java and assumes no previous Java experience.

Pip is an original tutoring adaptation. **Version 0.6.0 contains 35 top-level learning units and 39 executable coding parts/files: 30 console programs and nine robot programs**. The five-part declaration-repair group counts as one unit. The scope ends at CSE 121 fundamentals. Collections, inheritance, recursion, and later-course data structures are outside this project's current teaching scope.

## Modules

| Module | Top-level units | Main coverage |
|---|---:|---|
| Start with Java | 9 | Printing, declarations, syntax/type repair, assignment, casting, strings/characters, first robot motion |
| Make work repeat | 7 | `for` loops, boundary repair, nested loops, `Random`/`Math`, cumulative sums, reset repair, scope/class constants |
| Build reusable actions | 3 | Methods, parameters, return values, precision parking |
| Respond to the world | 6 | Conditions, `while` loops, `Scanner`, heading comparisons, feedback, booleans |
| Work with collections of data | 5 | Arrays, traversal, bounds repair, reference semantics, 2D arrays, maximum algorithms |
| Put it all together | 5 | Reusable docking, console report, obstacle detour, cargo delivery, hoop shooting |

Use [the lesson-by-lesson roadmap](ROADMAP.md) for prerequisites, visual actions, coding targets, debugging/test criteria, and optional teacher readiness guidance. `src/curriculum.js` assembles the module order; `src/lesson-content.js` adds declarations, debugging exercises, visual metadata, and structure requirements. Existing robot labs are defined in `web/missions.js`, with teaching steps in `web/course.js`. `extension/assessment.js` supplies varied cases and direct method calls.

## Teaching flow

Each unit separates Lesson, Quiz, and coding. `/learn/:lessonId`, implemented in `src/learn.jsx`, has two interactive slides: **goal → concept plus model**. **Take quiz** opens the standalone prediction page `/quiz/:lessonId` in `src/quiz.jsx`. Activities and quizzes are optional; both pages always allow entry to coding. Resuming existing code does not force review or quiz navigation. These hands-on Lesson slides are separate from the archived slide decks.

`src/routes.js` assigns ordinary units to Practice at `/practice/:lessonId`, the three robot challenges to Project at `/project/:lessonId`, and `autonomous-docking` plus `java-final-report` to Assignment at `/assignment/:lessonId`. `/projects` and `/assignments` catalog those units; legacy `/lesson/:lessonId` redirects. Coding contains only the task, native Java file, output/simulator, run checks, and optional review notes. It does not embed knowledge or the quiz. **Review the lesson** navigates back to Lesson.

The concept widget is an illustrative model, not a trace of arbitrary student code. **Save & run** saves the real Java file before compilation; the command is **Pip: Save and Run Current Lesson** (`pip.runLesson`). Compare actual output graphics or 3D replay with the Quiz prediction. On errors, identify evidence, propose the smallest repair, and rerun both the failing case and the other cases.

Passing current code checks completes a unit: `practiceComplete` equals `hasPassedLesson`. Every coding part must pass its own assessment version. Most `assessmentVersion` values are 2; `debug-semicolon` and `autonomous-docking` are 3. The declaration group needs its parent/first part at version 3 and its four children at version 2. Activities, quizzes, and review/reflection do not gate completion. Review notes are optional, collapsed by default, and autosave at any length. Saved reviews, quiz answers, and activities remain available without a data migration; old code checks may still need a current-version rerun. Completed titles are crossed off in module lists, catalogs, progress, completed modules, and part buttons, with visible **Completed** status.

## Declaration and debugging practice

Teach the declaration explicitly before assignment: point to the type, name, assignment symbol, initial value, and semicolon in `int bolts = 4;`. Build it in the widget, then write it in the supplied `main` method and print `bolts`. Compare `System.out.println(bolts);` with `System.out.println("bolts");`. Next, use `double power = 0.5;` to preserve a fraction. Do not accept changing the task's fractional value to hide a type error.

The five top-level debugging units cover declaration repair, incompatible numeric type, off-by-one loop, reset accumulator, and out-of-bounds array access. The declaration-repair unit `debug-semicolon` now contains five parts: missing semicolon (`debug-semicolon`), unknown type (`debug-declaration-type`), redeclaration (`debug-redeclaration`), new variable (`debug-new-variable`), and copied value (`debug-copy-value`). Each has its own `Student.java`; all five checks must pass. The parent Lesson includes declaration, assignment, and primitive-copy models, and its Quiz asks whether changing the original changes a copied `int`. Parent and child Lesson/Quiz views are optional. See roadmap row 3 for the detailed part table.

Record **failure → cause → edit → retest** for each part. The copied-value program compiles but prints the wrong second value; not every bug is a compiler error. Because this group introduces reassignment and primitive copying before the later assignment unit, demonstrate those ideas in the parent model before asking for the repairs.

Keep all code references in inline backticks, including identifiers, APIs, operators, and paths; put Java examples in fenced `java` blocks. The UI renders code mentions with `CodeText` and `<code>` tags. Use **Format Document**, then review indentation, braces, names, and comments with the student.

## What the checks establish

- Reference solutions and student submissions execute as actual Java through `javac` and `java`.
- JDK AST checks through `InspectSource.java` enforce selected declarations, calls, loop counts, and method signatures. Assignment, compound-assignment, and unary-update records also enforce that `parts` and `used` remain unchanged in `main` for `debug-new-variable`.
- Initializer-based baseline cases execute the original source unmodified. Subsequent cases vary literal initializers in temporary copies. This preserves the student's file, rejects changing the required `0.5` to `0`, and checks that the computation uses its data.
- Baseline and boundary cases plus seeded fresh cases catch more fixed-answer and off-by-one mistakes than one example alone.
- Direct method harnesses exercise `announce`, `distance`, and `countLow` with changed arguments, rather than trusting output from `main` alone.
- The docking assignment invokes `Student.dock` directly for target distances of 30, 24, and 36 cm. Each trial must collect, avoid collision, and stop within 4 cm inclusive of its requested target; ignoring the parameter fails.
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

Have the student commit a working Java change, inspect its diff, create a branch for an improvement, and request teacher review. VS Code supplies these Git capabilities; Pip does not award completion for GitHub actions it has not verified.
