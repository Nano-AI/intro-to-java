# Architecture — Tauri desktop app

Pip runs a React interface in a Tauri window. Monaco supplies the built-in editor; a Java compiler daemon provides type-aware completion and diagnostics. Real Java programs run through the native desktop bridge. The installed app needs no web server or separate editor.

## Responsibilities

| Responsibility | Owner |
|---|---|
| Desktop window, native files, subprocesses, cancellation | `src-tauri/src/main.rs` |
| Lesson/game requests, source files, progress updates | `desktop/host.js` |
| Native command adapters for shared JavaScript | `desktop/node-*.js`, `desktop/process.js` |
| Java compilation, test cases, grading | `host/runner.js`, `host/assessment.js` |
| Serialized progress writes and imports | `host/state.js`, `shared/progress.js` |
| Java source inspection | `InspectSource.java` |
| Warm Java completion and diagnostics daemon | `desktop/DiagD.java` and native daemon management |
| Course, lesson, quiz, and project pages | `src/` |
| Shared appearance and accessible controls | Radix Themes, `src/appearance.jsx`, semantic CSS palette |
| Development-only isolated demo preview | `src/demo.jsx`, session workspace in `desktop/host.js` |
| Embedded Java editor and command suggestions | `src/editor.jsx`, `shared/game-commands.js` |
| Prerequisite rules | `shared/project-access.js`, `shared/completion.js` |
| Tile-game simulation and replay data | `src/games/engine.js`, `shared/game-contract.js` |
| Robot scene and effects | `web/`, Three.js, `canvas-confetti` |

Vite builds the interface into `dist/`. Its aliases route shared host filesystem/process calls through desktop adapters. Tauri packages these assets with Java support sources and `src-tauri/jre/`. Portable Node tests use the same `host/` logic without a native window; `desktop/` tests cover bridge behavior.

## Pages and content

`src/main.jsx` owns routing and the progress context. Lesson explanations and quizzes remain separate from ordinary coding practice. Coding pages contain the editor, task, run feedback, and console output or robot replay.

**Projects** is the single catalog for short games, cumulative homework, and existing final tasks. Course opens on a fresh launch; each module directly links to its projects. Legacy game/assignment catalog links redirect to Projects. Homework content lives in `src/games/projects.js` and `src/games/advanced-projects.js`; its brief, milestones, code refresher, command reference, world generator, starter, reference solution, and checks travel together.

Project prerequisites are evaluated by a shared predicate in both the UI and desktop host. In student mode, direct navigation and host requests cannot bypass a lock. A saved project completion does not waive missing prerequisites, and locking never deletes the saved record or Java file.

Project milestones and refresher answers use stable keys in the existing progress answer map. They support revisiting work; only the code checks award project completion.

## Editing and execution

Java source lives under `~/.pip-java/src/pip/lessons/<lesson_id>/` or `~/.pip-java/src/pip/games/<game_id>/`. Stable IDs become package segments by replacing hyphens with underscores. This layout is unchanged from earlier desktop releases.

The host creates missing files with exclusive writes and seeds them from a saved draft or starter. It preserves existing files. Robot labs receive a `Robot.java` support file for tooling; execution uses the bundled support implementation. Monaco saves edits automatically and sends the current buffer with a run request.

The editor combines static Java snippets, game commands, and type-aware results from `DiagD.java`. Command snippets insert `System.out.println` statements and are filtered by the open game's allowed commands. They are suppressed in comments, strings, and member expressions. Helpers defined by the student are completed through the compiler daemon.

For a run, the desktop host resolves the known activity, enforces prerequisites, saves the submitted source, and starts the shared runner. The runner compiles in a temporary directory, inspects the Java AST, executes cases, and returns diagnostics plus results. Temporary changed-data programs do not rewrite the student's file. Equivalent input variants reuse compiled classes; helper probes can share a compiled harness. Compiler concurrency is bounded, and each test still uses a fresh JVM. A `finally` block removes the run directory.

Console lessons compare actual output against baseline, boundary, and changed-data cases. Method exercises call required helpers directly. Continuous robot labs grade the Java simulation state across trials. Tile games interpret each printed line as an allowed action or speech, simulate the generated board, and check its final state. Project helper probes test methods independently of `main`.

In game projects and independent challenges, Run saves code and checks three public examples without awarding completion. Submit applies at least twenty checks. Play demo uses one reference example in temporary execution and does not change student code, progress or run results. Older lesson-based final projects retain graded Run with their authored trial counts. Source requirements and varied cases catch common mistakes, but local grading does not prove all algorithmic intent.

Only one run is admitted at a time. Stop cancels its controller; the native bridge terminates the subprocess group where supported. Subprocesses have time and output limits, and student Java heaps are limited. These controls handle accidental runaway code; Java still executes with the local user's permissions.

## Visuals

Concept widgets illustrate ideas without interpreting student Java. Console graphics summarize actual output. Continuous robot replay shows recorded simulation frames; tile-game replay combines the existing 3D scene with a coordinate map showing items, paint, and delivery state.

Camera controls, pause, step, and speed affect replay only. Effects and cosmetic environments do not alter grading. Scene resources and animation loops are disposed when their view unmounts.

## Persistence and compatibility

`~/.pip-java/progress.json` stores completed lesson IDs, game records, drafts, answers, milestones, reflections, and display preferences. `settings.json` stores desktop Java configuration. Existing Java files remain the source of truth, and an imported draft never replaces an existing file.

Progress writes are serialized and use a temporary file plus rename. Normalization preserves valid stable IDs and migrates the earlier numeric lesson IDs. Existing completion records remain recorded after an update; project access is evaluated separately against current prerequisites. Multipart lessons require every part to be completed.

Replacing the app keeps `~/.pip-java` unchanged. Back up that whole folder to retain both source files and progress. Import reads `pip-progress-import.json` inside it and merges valid records. A corrupt progress file is preserved for recovery; do not delete the Java directory to repair progress.

## Demo and appearance

The native bridge enables Demo only when both the debug build and Tauri development-runtime checks pass. Release builds reject Demo requests and hide its settings. `demo.set` creates a temporary workspace and a deep copy of progress; missing preview Java files are seeded from existing student files or starters. While demo is enabled, UI and host prerequisite gates are bypassed. All code saves, quiz answers and run completions go to that temporary workspace. Leaving demo removes it and restores the student store. Restarting begins in student mode. Pending writes/runs prevent a workspace switch; background completion/diagnostic reads do not block it. Global Java runtime preferences remain shared app settings.

`appearance.jsx` persists System/Light/Dark preference in local storage, follows OS changes in System mode, and applies the same theme to Radix and application semantic colors. Code blocks and Monaco use matching light or dark syntax palettes. Interface scale and editor font size are adjustable in Settings.

The backup-first `tools/recover-progress.mjs` explicitly migrates a confirmed earlier workspace without overwriting current files or inventing passes. It refuses recovery while Pip is running. See [PROGRESS-RECOVERY.md](PROGRESS-RECOVERY.md).

## Verification

`npm test` runs portable tests in `tests/` and bridge tests in `desktop/`, including real Java compilation. `cargo test --manifest-path src-tauri/Cargo.toml` checks native process and filesystem behavior. `npm run test:ui` exercises the desktop interface against an isolated test bridge with real files and Java. It does not exercise the packaged Tauri window; installed-app checks remain part of [releasing](RELEASING.md).
