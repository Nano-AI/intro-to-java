# Architecture — VS Code extension

## What owns what

| Responsibility | Owner |
|---|---|
| Java editing, completion, formatting, live language diagnostics | VS Code and `redhat.java` |
| Course/module/progress/settings pages | React webview |
| Goal and concept/model slides | Two-slide Lesson at `/learn/:lessonId` |
| Prediction | Standalone Quiz at `/quiz/:lessonId` |
| Task, run checks, optional review notes, output, and simulator | Shared coding panel at `/practice/:lessonId`, `/project/:lessonId`, or `/assignment/:lessonId` |
| Concept models and actual output summaries | `src/visual-lab.jsx` |
| 3D scene, camera, replay, collision debris | Three.js and its `OrbitControls` |
| Confetti | `canvas-confetti` |
| Commands, Java files, execution, backups, run diagnostics | VS Code extension host |
| Java semantics | Installed `javac` and `java` |

There is no embedded editor, Java interpreter, HTTP server, Electron shell, or Tauri shell in the current delivery.

## Source layout

```text
extension/extension.js   VS Code activation, commands, webview, workspace files
extension/runner.js      JDK discovery, compilation, processes, grading
extension/assessment.js  structure requirements, seeded cases, input variants
extension/state.js       serialized atomic progress writes
extension/test/          real VS Code integration tests
src/main.jsx            React routing and synchronized progress context
src/pages.jsx           course, module, progress, settings pages
src/learn.jsx           two-slide Lesson, separate from coding
src/quiz.jsx            standalone prediction Quiz
src/routes.js          Lesson/Quiz/coding path and practice-type helpers
src/workspace.jsx       task/results/assessment practice webview (no editor)
src/robot-view.jsx      replay lifecycle and telemetry
src/platform.js         private acquireVsCodeApi bridge
src/curriculum.js       lesson assembly and six module definitions
src/lesson-content.js   declaration/debugging lessons and assessment metadata
src/challenges.js       obstacle, cargo, and hoop challenge definitions
src/context.js          version-aware pass and completion predicates
src/visual-lab.jsx      interactive concept widgets and output graphics
shared/progress.js      validation and legacy migrations
web/world.js            procedural scene and effects
web/effects.js          confetti, shake, reduced-motion support
web/explosion.js        randomized crash debris, flash, smoke, gravity/bounce
web/missions.js          robot-lab definitions and reference solutions
web/course.js            robot micro-lesson steps
Robot.java / Runner.java real Java simulation support
InspectSource.java      JDK AST inspection of student source
```

Vite bundles the webview into `dist/`; esbuild bundles the host into `extension-dist/extension.cjs`, leaving `vscode` as a runtime-provided module. The VSIX allowlist contains only required deliverables. `src-tauri/target/` and `runtime/` may remain locally as ignored historical build artifacts but are not part of the extension.

## Page and editor lifecycle

Pip uses one webview panel. Course, Lesson, and Quiz pages appear in the first editor group. `/learn/:lessonId` has exactly two slides: goal and concept plus interactive model. **Take quiz** opens `/quiz/:lessonId` for an optional prediction. Lesson and Quiz always offer the appropriate **Start practice**, **Start project**, or **Start assignment** link, regardless of activity or quiz state. Resuming existing code does not force review or quiz navigation. Coding moves the panel to the second group and reveals the native Java document in the first.

`src/routes.js` maps ordinary units to `/practice/:lessonId`, the three challenge units to `/project/:lessonId`, and `java-final-report` plus `autonomous-docking` to `/assignment/:lessonId`. `/projects` and `/assignments` are catalogs of those existing units. `src/main.jsx` redirects legacy `/lesson/:lessonId` links to the appropriate coding route.

The coding panel contains the task, output/simulator, run checks, and optional review notes. Notes are collapsed by default and autosave at any length; no minimum text is required. It contains no knowledge slides, concept widget, or prediction quiz. **Review the lesson** navigates back to the separate Lesson route. The course tree and global page navigation do not appear inside coding.

The webview is retained while hidden to preserve its scene and replay. It is disposed on close; replay loops, camera controls, geometries, materials, and confetti are cleaned up. Pip stores learning progress independently, so reopening the course restores the lesson record. A closed panel does not restore an in-memory replay trace across an extension-host restart.

## Files and Java packages

The first workspace folder contains `src/pip/lessons/<lesson_id>/Student.java`. Hyphens in stable lesson IDs become underscores in package segments. The generated package line prevents duplicate `Student` class errors when several lessons are present.

There are 35 top-level units in `orderedLessons` and 39 executable entries in `lessons`: 30 console programs and nine robot programs. `debug-semicolon` has a `parts` array containing itself and four child IDs. Children have `parentId: 'debug-semicolon'`; every part has its own stable ID, package, `Student.java`, and assessment record. The main group uses the parent's optional activity, quiz, and review notes, even when a child coding file is open. Child Lesson/Quiz routes also provide optional review. Completion depends only on all five parts passing their current checks.

`Robot.java` is created beside robot lesson files to give Java tooling real type information. Creation uses exclusive writes: an existing file is never overwritten. Execution uses the extension's bundled helper files with a matching package declaration. In 0.5.0 the added APIs are needed only by new challenge IDs, so newly created challenge files receive fresh support while existing lesson helpers remain intact. There is no automatic support-file overwrite.

Use a dedicated single-folder learning workspace. If no Java source roots are configured, Pip creates the `src` tree and sets `java.project.sourcePaths` to `["src"]` at workspace scope before opening the file. This avoids the Java extension treating packaged files as standalone default-package documents. Global settings are untouched. If a different source-root list already exists, or a multi-root workspace has no configured source root, Pip asks for a dedicated folder or an explicit `src` entry rather than replacing other project settings.

## Run flow

1. Resolve a known lesson ID and the corresponding real document.
2. Check Workspace Trust and discover a usable JDK.
3. **Save & run** (command **Pip: Save and Run Current Lesson**, stable ID `pip.runLesson`) saves the real Java document before compilation and captures its source/version.
4. Create a fresh run directory outside the student's project.
5. Compile with `javac -proc:none -Xlint:all -encoding UTF-8 -d ...`. On JDK 9+, a spurious "bad path element" warning is filtered out of compile-error output.
6. Inspect source with the JDK AST helper `InspectSource.java` and check the lesson's declared structure requirements. Build console baseline, boundary, and seeded fresh cases through `extension/assessment.js`.
7. Execute console cases through `main`, temporary copies with changed literal initializers, or a direct method harness. Initializer-based baseline cases run the original source unmodified. Robot labs call `Student.update`, except mission 5, whose runner invokes `Student.dock` reflectively with each trial's requested target.
8. Apply run diagnostics to the document only if its version still matches the compiled snapshot.
9. Persist the successful assessment version and send results to the webview.
10. Remove the run directory in `finally`.

Only one run is admitted at a time, including setup. Stop aborts its controller. Each subprocess has a 12-second timeout and a 64 KiB combined output limit; student runtime heaps are limited to 64 MiB. On POSIX, cancellation also signals the process group. These limits are for accidental loops, not isolation from malicious code.

Console grading compares standard output after normalizing line endings and trimming outer whitespace. Structure rules can require named typed variables, printing a variable, loop counts, method signatures, calls, or an array alias. `InspectSource.java` also records assignments, compound assignments, and unary updates. The `unchanged` rule for `debug-new-variable` rejects updates to `parts` or `used` in `main`, in addition to output checks. These rules check selected syntax, not complete algorithmic intent: a two-loop count alone does not prove nesting.

On a failed console check, the results panel names the first differing line (missing line, extra line, spacing-only, capitalization-only, or different text) and highlights the differing output lines. When the original data passes but changed data fails, feedback points at calculating from the variables instead of printing a fixed answer. Compile and runtime failures also get a plain-language note (missing semicolon, unknown symbol, incompatible/lossy types, missing return, uninitialized or duplicate variable, unbalanced braces, array/string index out of bounds, input mismatch, missing input, divide by zero, null, stack overflow) with the source line number, shown above the raw `javac`/JVM text. **Try own input**, on console exercises that read input, runs the saved `Student.java` with typed input and displays its output without touching checks or completion. **Show a hint** reveals the unit's authored hint, then its concept and worked example on a second step; hints do not affect completion. Cmd+Enter/Ctrl+Enter runs from the editor or from inside the Pip panel.

For initializer-based exercises, the first case is labeled **Original program** and has `mutate: false`: it runs the original source without replacing initializers. Changing the required `0.5` to `0` therefore fails the baseline. Subsequent cases use AST initializer ranges to replace data in a temporary copy of `Student.java`; the workspace file is not rewritten. Method cases call `announce`, `distance`, or `countLow` directly through a generated `PipCase` harness, so output placed only in `main` cannot substitute for the method. Cases include fixed examples and fresh seeded data; results retain the seed for diagnosis. Not every lesson needs random data (the first output exercise has fixed required text).

Robot grading checks simulation state under one or three starting conditions. Each new challenge runs three trials for 40 simulated seconds (2,400 physics ticks at 60 Hz), ending early on collision. The starts are (0, -120), (0, -70), and (0, -150) cm; the third trial uses a speed scale of 85 rather than 100 cm/s at full power. A pass requires no collision, a final stop, and the mission-specific goal/delivery/score state. See `ROADMAP.md` for exact geometry and interaction boundaries. Reference solutions and cases are bundled local teaching material, not a protected assessment service. AST checks and case variation do not guarantee cheat prevention.

For `autonomous-docking` only (mission 5), `Runner.java` resolves `Student.dock(Robot, double)` reflectively and calls it at every decision. The three trials request 30 cm (default), 24 cm (nearer start), and 36 cm (farther start with weaker motors). Success requires collection, no collision, a final stop, and absolute distance error at most 4 cm. The submitted `update` call does not select the graded target; ignoring `targetDistance` is rejected by these trials. Other missions continue through `Student.update`.

## Visual teaching boundary

Each unit has a concept widget on its Lesson page, a prediction on its Quiz page, and a real-code result view on its separate coding page. Widgets model declarations, assignment, primitive copying, loops, grids, branches, methods, input, arrays, or robot steering. They do not interpret the student's Java. Console output graphics summarize actual returned output; robot replay shows the Java simulation trace. UI code references use `CodeText` and `<code>` tags. Teachers compare the Quiz prediction with the coding result and use diagnostics or failing cases to guide small repairs.

`web/explosion.js` samples independent offsets, velocity components, spin, size, and bounce values for debris on every crash, rather than generating a spiral. It applies gravity, ground bounce, and friction, with a flash lasting about 0.24 seconds and smoke fading over two seconds. Effects/reduced-motion controls suppress moving effects as configured. Decorative randomness is separate from deterministic Java simulation and grading.

Version 0.5.0 appended `robot-detour`, `robot-cargo`, and `robot-hoop` to `finish`. Version 0.6.0 appends `java-constants` to `loops`, for 35 lessons. Position feedback uses `x()` and `y()`; interactions use `collect()`, `hasPart()`, `hasBall()`, `deliver()`, `wasDelivered()`, `shoot(power)`, and `scored()`. `distance()` includes the rectangular obstacle in challenge missions. The shot travels along the current heading for 300 × power cm, using a fixed 1.5-second illustrative arc. The ball is not tested for obstacle collision; robot collision still fails the mission. This is not a ballistic hardware model.

## Webview boundary

The extension exposes a small allowlist of message methods. Webviews request known lessons; they cannot supply an arbitrary executable or filesystem path. The host reads the actual Java document and owns the cases, process arguments, paths, and completion records.

Static assets use `asWebviewUri`, restricted resource roots, and a Content Security Policy. The VS Code API object remains private to the bridge. React renders student output as text. Course-content updates currently ship as trusted extension code, not remotely downloaded scripts.

## Persistence and recovery

Progress lives in `ExtensionContext.storageUri/progress.json`, scoped to the workspace. Without a workspace, course/settings access falls back to global extension storage. Settings shows the actual path.

Schema version 5 stores stable lesson/part IDs, achieved checks, drafts, slide positions, prediction answers, reflections, preferences, and the `assessments`/`activities` maps. `assessmentVersion` is per lesson: most are 2; the `debug-semicolon` parent and `autonomous-docking` assignment are 3. In `src/context.js`, `hasPassedPart` requires a `completed` record and an assessment matching that part's own version. `hasPassedLesson` checks every entry in `parts` independently, or the single part for an ungrouped unit. Thus the declaration group currently needs version 3 for its first/parent part and version 2 for each child.

Since 0.5.1, `practiceComplete` equals `hasPassedLesson`. Activity exploration, quiz answers, and review/reflection text do not gate completion or entry to coding. The `${lesson.id}:2` prediction key remains saved for voluntary quiz use; `:2` is a step key, not an assessment version. Schema 5 and saved reviews, quiz answers, and activities are preserved without a data migration.

Completed titles use strikethrough in module lists, catalogs, progress, completed modules, and completed part buttons, with visible **Completed** status. Teacher review is advisory and does not affect the software completion predicate.

Versions from the browser/Tauri prototypes are normalized on import, including the original six numeric IDs. Existing completion records and drafts are preserved, but an older pass without the required version is not a current pass. Unknown valid lesson IDs are preserved for content-update compatibility.

Updates merge at the host and serialize writes through a temporary file plus rename. Java-file edits are cached as drafts; the real file remains authoritative. An import never overwrites an existing Java file. Run completion caches the latest document text rather than replacing newer edits with the old run snapshot.

If the progress JSON is corrupt, activation reports the path and preserves the original file. Close the extension host, copy that file somewhere safe, then repair it or rename it and import a known-good backup after reopening. Do not delete the Java workspace as part of recovery.

Changing publisher/name changes the extension storage identity. Keep `pip-learning.pip-workshop` stable for private updates, or explicitly export/import when moving to a different publishing identity.

For an earlier browser save without an export button, run the visual preview on the same original origin, open the browser's developer console, and copy `localStorage.getItem('pip-workshop-v1')` into a JSON file. Import that file through Pip. A previous Tauri profile used `progress.json` in its application-data directory; import that JSON directly. Do not substitute the extension's development/test profile for the student's actual profile.

## Live development demo

`npm run demo` launches real VS Code using isolated `.demo-workspace/` and `.demo-profile/` directories; see `RELEASING.md` for the command and options. Use **Developer: Reload Window** for the latest host changes. UI rebuilds refresh automatically only in Development mode. Demo data is separate from normal student work and excluded from the VSIX. `npm run dev:web` remains a UI-only preview, not a replacement for host-backed Java execution.

See `RELEASING.md` for packaging and verification records.
