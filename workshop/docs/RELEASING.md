# Releasing Pip and adding modules

## Current delivery

Pip is a desktop VS Code extension, packaged as a `.vsix`. The student already uses VS Code, its Java language support, and a JDK. The extension is not currently published to the Marketplace; `pip-learning` is the local package namespace, not a claim of a registered publisher account.

## Build a private release

From `workshop/`:

```sh
npm ci
npm test
npm run test:extension
npm run package
```

The current package is `pip-workshop-0.6.0.vsix`. It includes `InspectSource.java` and the bundled `web/explosion.js` implementation. The package command runs the build hook and uses the version in `package.json`. Inspect the file list with:

```sh
npm exec vsce -- ls --no-dependencies
```

On the verified macOS test setup, the integration suite can test an installed VSIX rather than the development folder:

```sh
PIP_TEST_VSIX=pip-workshop-0.6.0.vsix npm run test:extension
```

This installs into an isolated temporary extension directory/profile. It does not replace the extension in the normal VS Code profile. Set `VSCODE_CLI` when the command-line launcher is at a different location.

Verify the allowlist excludes development dependencies, old desktop/JDK artifacts, temporary runs, test profiles, student data, `.demo-workspace/`, and `.demo-profile/`. The student installs through **Extensions → … → Install from VSIX** and reloads VS Code if prompted.

## Add or revise teaching content

1. Keep the scope inside CSE 121.
2. Add a stable, unique lesson ID and its module membership in `src/curriculum.js`.
3. Write the two-slide Lesson (goal and concept plus model) for `/learn/:lessonId`, the standalone prediction Quiz for `/quiz/:lessonId`, and the separate coding task, starter, checks, and reflection. `src/routes.js` selects `/practice/:lessonId`, `/project/:lessonId`, or `/assignment/:lessonId`. Keep knowledge out of coding; **Review the lesson** navigates back to Lesson. Use inline backticks for code references and fenced `java` blocks for Java examples.
4. Add executable baseline, boundary, and changed-data cases and a reference solution. Specify appropriate AST requirements in lesson metadata and varied cases in `extension/assessment.js`. Use direct method calls where the method is the learning target. Include a plausible wrong program that passes the simplest example but fails a stronger case.
5. For robot capabilities, extend the Java API and matching support source deliberately. Maintain compatibility for existing lessons.
6. Update `docs/CURRICULUM.md`, `docs/ROADMAP.md`, and tests. Count top-level units separately from executable parts: currently 35 units and 39 programs (30 console, nine robot). For groups, maintain the parent's `parts` array, each child's `parentId`, and separate stable file IDs. Increment `assessmentVersion` when old code checks no longer satisfy the unit; preserve earlier records. Activities, quizzes, and review notes remain optional.
7. Bump the version in `package.json`, refresh `package-lock.json`, update `CHANGELOG.md`, and package the VSIX.

Revising a starter does not replace a student's existing file. Students can explicitly restore a starter, with confirmation and normal editor undo, or a new lesson ID can provide a fresh version. Do not reuse an old ID for an unrelated exercise.

## How students receive updates

For the current private workflow, send the new VSIX and install it over the same extension identity. Java files stay in the learning workspace. Progress stays in VS Code's per-workspace extension storage.

Schema 5 preserves earlier work and its activity/assessment version maps. Versions are per lesson/part: most are 2, while `debug-semicolon` and `autonomous-docking` are 3. `practiceComplete` equals `hasPassedLesson`: group checks match each part's own assessment version, and an old parent-only pass cannot satisfy all five parts. No activity, quiz, review/reflection, or minimum-text requirement gates completion. Saved reviews, quiz answers, and activities remain available for voluntary use; no data migration is needed. Preserve drafts/reflections during updates and retain export/import coverage. Existing `Robot.java` files are preserved; new challenge IDs receive fresh support when created, without automatic overwrites.

For future Marketplace distribution, establish a publisher identity and publication/license decisions, then publish through the usual VS Code extension process. VS Code can update Marketplace-installed extensions according to the student's update settings. If the publishing identity differs from the private one, export/import progress during migration.

A separate downloadable lesson-content service is not implemented. Bundling new modules in extension releases is sufficient for this tutoring workflow. No Tauri/Electron updater is needed.

## 0.6.0 verification record

- Packaging: `pip-workshop-0.6.0.vsix`, 23 files, approximately 340 KB.
- `npm test`: 14 of 14 passed, including all 39 reference programs.
- `npm run test:extension` / installed-VSIX integration: passed with `PIP_TEST_VSIX=pip-workshop-0.6.0.vsix`. New coding-page feedback UI was checked separately in a stubbed browser preview.

Course counts are 35 units and 39 programs (30 console, nine robot), reflecting the new `java-constants` unit.

## 0.5.1 verification record — historical

- Packaging succeeded: `pip-workshop-0.5.1.vsix`, approximately 331 KB.
- `node --test extension/completion.test.js`: **two targeted tests passed**, proving notes, activity, and quizzes do not gate completion and every multipart code check is still required.
- Actual installed-VSIX integration passed. Updated assertions cover native strikethrough CSS, no forced review, collapsed optional notes, saving a two-character note, no quiz navigation gate, and existing Java/UI flows.

The full `npm test` suite was not rerun for the 0.5.1 update. The unchanged 38 reference programs' suite results remained the historical 0.5.0 record below. Course counts at 0.5.1 were 34 units and 38 programs.

## 0.5.0 verification record — complete

**`npm test`: nine tests passed.** Coverage includes:

- All 38 reference coding parts in 34 top-level units (29 console programs, nine robot programs), with module unit counts **9 / 6 / 3 / 6 / 5 / 5**.
- All five failing declaration-repair starters; varied-input, hardcoded-answer, comment, and unused-method regressions.
- Original-source initializer baselines, unchanged-variable checks, and direct docking parameter assessment. Mission 5 calls `Student.dock` with 30/24/36 cm targets and requires collection plus a collision-free final stop within 4 cm of the requested target.
- Obstacle, cargo, and hoop challenges; cancellation/storage; randomized debris.

**Actual installed `pip-workshop-0.5.0.vsix` integration: passed.** This verification used the installed package, not only the development folder. Coverage includes:

- Separate Lesson, Quiz, Practice, Project, and Assignment content routes, with knowledge outside coding; interactive declaration models and Quiz flow.
- Selected-case contrast of at least 4.5:1 in both light and dark themes.
- Native Java tooling and **Save & run** / **Pip: Save and Run Current Lesson** (`pip.runLesson`) saving unsaved real Java files before execution.
- Preservation of all five part files and Explorer lesson synchronization.
- Orbit controls, explosions, and successful hoop scoring.

For future source/content releases, repeat `npm test`, `npm run test:extension`, and installed-VSIX verification using the commands above. Retain coverage for per-part versions, original-source baselines, and support-file preservation; use the current completion and optional-review criteria above. The full-suite verification record in this section applies only to 0.5.0.

## Live demo and ongoing teaching follow-up

Run `npm run demo` from `workshop/` for a live VS Code demo with isolated `.demo-workspace/` and `.demo-profile/` directories. UI rebuilds refresh automatically in Development mode only. Use **Developer: Reload Window** to load host changes; installed releases do not use development auto-refresh.

Student-machine setup and performance are ongoing follow-up: confirm the student's JDK, try a fresh unit and reload, and observe simulator responsiveness on an M1 machine with normal extensions enabled. The recorded 0.5.0 installed-package verification is on the local macOS setup; Windows/Linux have not received the same end-to-end run. Teacher review of reasoning and transfer is optional guidance and is not required by the software.

Export a progress backup and preserve the Java workspace before changing computers or publisher identity. Completion counts record passing code checks; optional teacher review can provide further evidence of mastery.
