# Changelog

## 0.10.0 — Independent challenges and the project workbench

- Add ten two-part challenges across basics, loops, methods, decisions and arrays. Keep compiler errors and syntax highlighting; disable autocomplete, hints and solution insertion. Stronger challenge versions require a new pass while preserving old code and records.
- Show Description, World and Submission beside the editor. In game projects and independent challenges, Run checks three public examples with input/output; Submit runs at least twenty checks. Correct code with warnings is Accepted; Perfect requires all checks and no lint warnings.
- Lock Supply Relay’s provided input lines throughout editor operations and validate them in the host. Vary inputs in temporary programs rather than editing saved Java.
- Simplify Supply Relay to collect one supply and finish at delivery. Keep cumulative homework, command documentation, automatic verifiable checklist steps and manual planning steps.
- Add module navigation, To do/Review lesson tabs, colored SVG icons, readable code examples, interface scale and code font controls. Keep prerequisite locks and saved work intact.
- Refresh the 3D board with a round Pip robot, stacked cargo, distinct destination tiles and a stationary scoreboard. Fix hurdle orientation and one-tile jump playback; show speech in a replay transcript. Play demo shows one solved example without editing code or completion.
- Reuse equivalent compilation inputs and batch helper probes to reduce test time. Runs remain headless; animation is replayed separately.
- Restrict Demo mode to native development runs, including host-side enforcement. Fix a native WebKit startup import race that hid the development toggle.
- Publish the Apple silicon installer and refresh the website with current screenshots, download and update instructions. See [release checks](docs/RELEASING.md).

## 0.9.0 — Course-linked projects, demo preview, and clearer screens

- Always open Course on a fresh launch. Consolidate Games and Projects into one module-grouped catalog and retain legacy redirects; link each module directly to its activities.
- Add Signal Patrol (decisions) and Mosaic Survey (arrays), bringing cumulative homework to five games. Keep existing game IDs, stars, Java files and prior project records compatible.
- Use Radix Themes controls and one light/dark palette. Replace the dropdown-heavy progress page with a six-module learning map, simplify settings, and split project guidance into Mission, Build steps, Code refresher and Commands.
- Add session-only demo preview with isolated temporary code/progress, explicit mode banner, full activity access and guarded workspace switching. Student prerequisite locks stay strict.
- Show selected-world Scanner input and labelled finish/paint-target/hurdle tiles. Keep command autocomplete and real Java checks.
- Add a dry-run-first, backup-first recovery tool. Restore verified legacy completion records and missing Java files while preserving every existing Java file and current draft.
- Supply self-contained problem/solution and UI review documents for independent feedback. See the release record for exact verification and native packaging limits.

## 0.8.0 — Tauri homework projects and saved-work compatibility

- Keep Tauri as the only desktop delivery. Remove obsolete VS Code extension entrypoints, manifests, dependencies and test harness; retain reusable Java execution and storage under `host/`.
- Unify longer activities under **Projects**, preserving legacy links and saved IDs. Require all listed coding prerequisites before opening or running any project, including completed projects, while retaining source and completion records.
- Add **Supply Relay** (basics), **Staircase Arena** (loops) and **Tower Rescue** (methods), with cumulative robotics gameplay, sample boards, explicit command references, saved milestones, code refreshers and source attribution. Budget two or three 45–60-minute sessions per project.
- Add highlighted code predictions, game-command editor snippets, sample practice without completion, precise tile-map replay, varied-data checks and independent method probes. Preserve existing student Java/support files, drafts and progress.
- Add generated student problem handout and a self-contained review packet with solutions and grading limits. Record Tauri-only compatibility requirements in the repository's AGENTS.md.
- Verification: 84 portable/Java tests and 7 native tests passed; desktop bridge UI checks passed; Apple silicon app and DMG built. Native window interaction remains unverified and the local package is not notarized. See [the exact release record](docs/RELEASING.md).

## 0.6.0 — Class constants, hints, and clearer feedback

- Add `java-constants` (`Set the shelf count once`) as the last unit of the "Make work repeat" module, after `debug-reset-total`. It closes the CSE 121 "Scope and Class Constants" gap: the task asks for `public static final int SHELVES = 3;` above `main`, used as the `for` loop bound and in a `Scanned N shelves` summary line. The starter reads the loop variable `i` after the loop, a scope compile error. Checks require a class-level `final int SHELVES`, a `for` loop, and four data variants (`SHELVES` at 3, 1, 5, and a random 6–9) so a hardcoded count fails. Rename `java-accumulator`'s topic from "Accumulation, scope & constants" to "Cumulative sums" and drop scope/`final` from its concept text, since `java-constants` now covers them.
- Reach 35 top-level units, six modules, and 39 executable coding parts/files: 30 console and nine robot programs.
- Add a hint ladder on coding pages: **Show a hint** reveals the unit's authored hint; a second step shows the concept and worked example. Hints never affect completion.
- Add output comparison on failed console checks: the first differing line is named (missing line, extra line, spacing-only, capitalization-only, or different text), and differing output lines are highlighted.
- Add plain-language notes for common `javac` errors (missing semicolon, unknown symbol, incompatible/lossy types, missing return, uninitialized or duplicate variable, unbalanced braces, and similar) and runtime exceptions (array/string index out of bounds, input mismatch, missing input, divide by zero, null, stack overflow), with the line number, shown above the raw compiler/JVM text.
- Add changed-data feedback: when the original data passes but changed data fails, the feedback says to calculate from the variables instead of printing a fixed answer.
- Add **Try own input** on console exercises that read input: it runs the saved `Student.java` with typed input and shows its output; it never affects checks or completion.
- Make Cmd+Enter / Ctrl+Enter also run from inside the Pip panel; the run button shows the shortcut.
- Replace Unicode glyphs used as icons (arrows, play/pause, pass/fail marks, the robot mark) with inline Lucide SVG icons that follow the theme color. Pass/fail icons carry an accessible label; the Lucide license ships as `media/LUCIDE-LICENSE.txt`.
- Fix collection-page header spacing and badge width; add a skip-to-content link; continue the neutral-voice pass across lesson text and UI.
- Stop `javac` from printing a "bad path element" warning alongside compile errors on JDK 9+.
- Make `npm test` use `workshop/runtime/jdk` when it exists, so tests run without setting `JAVA_HOME`.
- Verification: `pip-workshop-0.6.0.vsix` packaged (23 files, approximately 340 KB). `npm test` passed 14 of 14, including all 39 reference programs on a real JDK, the constants shortcut checks, custom-input runs, and the error/output feedback self-checks. `PIP_TEST_VSIX=pip-workshop-0.6.0.vsix npm run test:extension` passed on the installed VSIX. The integration suite does not drive the hint ladder, output comparison, error notes, or **Try own input**; those were checked in a browser preview with a stubbed host in light and dark themes at 480 and 900 px.

## 0.5.1 — Code-check completion and optional review

- Complete a unit when its current code checks pass: `practiceComplete` equals `hasPassedLesson`. Every part of a multipart repair must pass its own current assessment. Activity exploration, quiz answers, review/reflection, and minimum text length no longer gate completion.
- Keep review notes optional and collapsed by default, with autosave at any length. Preserve saved reviews, quiz answers, and activities for voluntary use without a data migration.
- Always allow entry to practice from Lesson and Quiz. Resuming existing code does not force review or quiz navigation.
- Cross off completed titles in module lists, catalogs, progress, completed modules, and completed part buttons, alongside visible **Completed** status.
- Retain 34 top-level units and 38 executable programs (29 console, nine robot). Teacher mastery guidance is advisory.
- Build `pip-workshop-0.5.1.vsix` successfully (approximately 331 KB). Both targeted tests in `node --test extension/completion.test.js` passed, proving completion has no notes/activity/quiz gates and still requires every multipart code check.
- Pass actual installed-VSIX integration, including native strikethrough CSS, no forced review, collapsed optional notes, saving a two-character note, no quiz navigation gate, and existing Java/UI flows. The full `npm test` suite was not rerun for this update; the unchanged 38 reference programs' suite results below remain historical 0.5.0 coverage.

## 0.5.0 — Hands-on Java and challenge labs (VSIX verified)

- Include 34 top-level CSE 121 learning units with 38 executable coding parts/files: 29 console programs and nine robot programs. All nine Node tests and actual installed-VSIX integration passed; the current `pip-workshop-0.5.0.vsix` is approximately 330 KB.
- Add `java-declare` and `java-types`: build declarations, choose a numeric type, then write and print the real variable.
- Expand `debug-semicolon` into a five-part group: itself plus `debug-declaration-type`, `debug-redeclaration`, `debug-new-variable`, and `debug-copy-value`. Each keeps its own `Student.java`; all must pass. Retain `debug-types`, `debug-loop-boundary`, `debug-reset-total`, and `debug-array-bounds` as separate units.
- Separate Lesson at `/learn/:lessonId` into two slides (goal and concept plus interactive model), with a standalone prediction Quiz at `/quiz/:lessonId`. Ordinary coding uses `/practice/:lessonId`; knowledge remains outside coding.
- Add `/projects` and `/project/:lessonId` for the three robot challenges, and `/assignments` and `/assignment/:lessonId` for `java-final-report` and `autonomous-docking`. Legacy `/lesson/:lessonId` redirects to the appropriate coding route.
- Label execution **Save & run** and **Pip: Save and Run Current Lesson**, retaining command ID `pip.runLesson`. Save the real Java file before compilation.
- Provide actual code-run output graphics and 3D replay in practice. UI code references use `CodeText` and `<code>` tags; documentation uses inline code and fenced Java examples.
- Strengthen grading with JDK AST inspection through `InspectSource.java`, including assignments, compound assignments, and unary updates. `debug-new-variable` enforces unchanged `parts` and `used` in `main`. Initializer-based baseline cases run original source unmodified; only subsequent cases vary data in temporary copies.
- Directly assess `Student.dock` for mission 5 with target distances of 30, 24, and 36 cm, requiring collection and a final stop within 4 cm of the requested target. Reject implementations that ignore the parameter; other robot labs still call `Student.update`.
- Track per-lesson assessment versions in progress schema 5: most are version 2; `debug-semicolon` and `autonomous-docking` are version 3. `practiceComplete` requires the correct quiz, explored activity, passing code, and reflection. Group checks use each part's own version and the parent's version for activity/Quiz; prior work remains preserved.
- Append `robot-detour`, `robot-cargo`, and `robot-hoop` to the finish module: obstacle navigation, cargo delivery, and ball collection/alignment/shooting. APIs include `x()`, `y()`, `hasBall()`, `collect()`, `deliver()`, `wasDelivered()`, `shoot(power)`, and `scored()`. Each challenge runs three start/motor trials for 40 simulated seconds; shooting uses an illustrative range model, not real ballistics.
- Preserve existing generated `Robot.java` files; new challenge IDs receive fresh support on creation, without automatic overwrites.
- Implement and launch the live VS Code demo via `npm run demo`, using `.demo-workspace/` and `.demo-profile/`; UI rebuilds refresh automatically in Development mode only, and rebuilt host changes require **Reload Window**.
- Replace spiral crash motion with independent per-crash debris directions/speeds, spin, and size in `web/explosion.js`, with gravity, bounce/friction, a short flash, and smoke. Effects and reduced-motion controls remain honored.
- Add `docs/ROADMAP.md` with a practical teacher gate for every lesson. Local checks support teacher review; they do not certify mastery or prevent all cheating.
- Verify all 38 reference solutions, five failing repair starters, varied-input/hardcode/comment/unused-method regressions, robot challenges, cancellation/storage, and randomized debris in nine Node tests. Installed-VSIX integration verifies content routes, visual declarations, light/dark selected-case contrast of at least 4.5:1, native Java tools, save-before-run, five preserved part files, Explorer lesson sync, orbit, explosions, and hoop scoring.

## 0.4.0 — VS Code extension

- Migrated delivery to a VS Code extension with a Pip activity-bar launcher.
- Kept React course, module, progress, and settings pages; coding uses VS Code's native Java editor.
- Added real workspace lesson files with unique Java packages, preserving existing code on reopen.
- Moved Java execution into the extension host, using a discovered installed JDK and no web server.
- Integrated run diagnostics with the Problems panel, plus run/stop commands and an editor shortcut.
- Preserved the 24 CSE 121 practices, interactive Three.js scene, settings, collision effects, and confetti.
- Added per-workspace progress storage and import/export for earlier prototype saves.
- Removed active Tauri, bundled-runtime setup, and embedded CodeMirror paths.

## 0.3.0 — Superseded desktop experiment

- Explored React pages and a Tauri package with a bundled JDK.
- Expanded course material to 24 practices covering the CSE 121 topic path.
- This delivery approach was superseded by the VS Code extension.

## 0.2.0 — Browser prototype

- Six robot labs, local Java execution, guided steps, and a 3D workshop.
- Added orbit controls, setting themes, progress, and learning effects.
