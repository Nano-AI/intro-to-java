# Pip — Java Robot Workshop

Pip is a standalone Tauri desktop app for learning beginner Java through lessons, code predictions, practice, and robot games. Its built-in editor provides syntax highlighting, Java completion, error underlines, and automatic saving. Java is included in the desktop bundle.

Version 0.10.0 includes five cumulative game projects, shorter robot games, ten independent challenges, and final projects. In game projects and independent challenges, Run checks three public examples and Submit checks at least twenty cases. See [release checks](docs/RELEASING.md).

## Install and update

Download [Pip Workshop 0.10.0 for Apple silicon Macs](https://github.com/Nano-AI/intro-to-java/releases/download/v0.10.0/Pip-Workshop-0.10.0-mac-arm64.dmg). Open the `.dmg`, drag **Pip Workshop** into **Applications**, and open the app. This package is for Apple silicon (M-series), not Intel Macs. The student does not need a separate editor or development tools.

The app is ad-hoc signed and not notarized. If macOS blocks it after the first launch attempt, open **System Settings → Privacy & Security → Open Anyway** for Pip. See [Apple’s first-open instructions](https://support.apple.com/en-us/102445).

To update, quit Pip and replace the app in Applications. Existing work stays in `~/.pip-java`; replacing the app does not replace that folder. Copy this folder when moving computers or making a backup.

## Learn, practice, and build

1. Choose a module and lesson. Read the explanation, explore its model, and predict the code's result in the quiz.
2. Open practice and edit `Student.java` in the built-in editor. Keep its generated package line.
3. Choose **Run**, or press **Command+Enter** on Mac. Compare the input, output and expected output. **Stop** cancels a running program.
4. Open a module’s **Projects** or **Challenges**. Locked activities show the lessons to finish first.
5. Game projects start with a short refresher. In the workspace, **Commands** opens documentation and **Checklist** shows steps. **Play demo** replays one solved example without changing code or progress.
6. In game projects and independent challenges, **Run** checks three public examples; **Submit** runs at least twenty checks. Correct code passes as **Accepted**; **Perfect** additionally requires a completed lint check with no warnings. Supply Relay’s provided input lines are locked in the editor; tests vary their values without changing the saved file.

| Module | Homework game | Ideas combined |
|---|---|---|
| 1 — Java basics | Supply Relay | Variables, arithmetic, strings, ordered robot instructions |
| 2 — Loops | Staircase Arena | Nested loops, changing bounds, accumulators, class constants |
| 3 — Methods | Tower Rescue | Simple methods, parameters, return values, loops, decomposition |
| 4 — Decisions | Signal Patrol | Scanner, sentinel while loop, if/else, methods, cargo totals |
| 5 — Arrays | Mosaic Survey | 2D arrays, row helpers, traversal, decisions, exact paint patterns |

Supply Relay is a shorter 30–60 minute project. The other homework projects have a 90–180 minute planning estimate. The shorter games show their own estimates. Milestones and quiz answers save between sessions. The existing robot challenges and final coding tasks also appear in **Projects**.

Prerequisites apply to every project, including previously completed ones. Saved completion and code remain intact while a project is locked. Passing the missing prerequisite lessons unlocks access again.

## Independent challenges

Each of the first five modules has two optional **Challenges**, below its projects. The flag and amber card identify independent work, with a 10–20 minute estimate. Each combines two related results or methods. These do not change the guided course's 35 entries or 39 coding practices.

Challenges keep Java highlighting, compiler errors and saving, but turn off autocomplete, hints and solution insertion—even in demo mode. **Run** checks three public examples without awarding a pass. **Submit** checks varied inputs and records successful completion. The required coding practices must pass before a challenge opens.

The stronger assessment requires a new pass. Earlier completion records and saved Java remain intact; extend the existing code and submit again. Ordinary lesson passes remain valid.

See [the problems and starters](docs/CHALLENGES.md), or [the reviewer packet with solutions, cases and grading limits](docs/CHALLENGES-REVIEW.md).

## Preview and appearance

A fresh launch opens **Course**. Projects are linked from their modules; the **Projects** page also groups every activity by module. **Progress** shows the six-module learning map and saved notes.

In **Settings**, choose System, Light, or Dark, adjust interface size, and change the code font size.

Only development builds show **Demo mode**. It opens all activities in a separate temporary workspace. The banner identifies preview mode; code edits and completions there do not alter the student workspace. Turning demo off restores normal prerequisite locks. Preview resets on restart. Java runtime preferences are shared app settings.

## Understand the robot interface

Tile games use printed command strings. For example:

```java
System.out.println("move 3");
System.out.println("turn left");
System.out.println("pick up");
```

The project's **Commands** button lists the commands available in that game and explains positions, facing direction, and item handling. Type `pip` in the editor to find complete command snippets, such as `pipMove`; press **Ctrl+Space** to open suggestions. These snippet names insert real Java statements. The editor also completes Java methods and helpers defined in `Student`.

The earlier continuous robot labs use the `Robot` methods shown in their own lesson instructions. Follow the interface documented for the open activity. Replay controls inspect a recorded run; they are not a live Java debugger.

## Files, progress, and recovery

```text
~/.pip-java/
  progress.json
  settings.json
  src/pip/lessons/<lesson_id>/Student.java
  src/pip/lessons/<robot_lesson_id>/Robot.java
  src/pip/games/<game_id>/Student.java
```

Stable IDs and Java packages keep files separate. Reopening an activity preserves its existing Java file. **Restore starter** asks for confirmation before replacing code. Existing robot support files are also preserved.

The real Java file is authoritative; stored drafts seed missing files. Importing progress merges saved records and does not overwrite existing Java files. Settings shows the storage location. The current import workflow reads `~/.pip-java/pip-progress-import.json`.

If progress cannot be read, preserve `progress.json` before repairing it or restoring a backup. Do not delete the Java source folder as part of recovery. Automatic checks provide feedback and record completion; they do not prove full mastery or prevent every shortcut.

## Develop and test

Developers need Node.js/npm, Rust/Cargo with platform build tools, and a JDK. From this directory:

```sh
npm install
npm run dev:desktop
```

For verification and packaging:

```sh
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run test:ui
npm run build:jre # first build, or when changing the bundled JDK
npm run build:desktop
```

`npm test` covers portable grading, real Java programs, progress compatibility, and desktop host behavior. `test:ui` exercises the desktop UI with an isolated test bridge and real Java; it does not replace opening the packaged native app. `build:desktop` creates native packages under `src-tauri/target/release/bundle/`.

The bundle requires `src-tauri/jre/`. If it needs rebuilding, run `npm run build:jre` with the intended JDK's `jlink` on `PATH`, then build the desktop app. See [RELEASING.md](docs/RELEASING.md) for package checks.

Java runs locally with the user's permissions. Time and output limits stop common accidental loops; they are not an untrusted-code sandbox.

## Documentation and credits

- [Architecture](docs/ARCHITECTURE.md)
- [Independent UI review brief](docs/UI-REVIEW-REQUEST.md) and [progress recovery](docs/PROGRESS-RECOVERY.md)
- [Project briefs](docs/PROJECTS.md) and [review packet](docs/PROJECTS-REVIEW.md)
- [Curriculum coverage](docs/CURRICULUM.md), [lesson roadmap](docs/ROADMAP.md), and [release procedure](docs/RELEASING.md)
- [Historical changelog](CHANGELOG.md)

The course is an original tutoring adaptation of [UW CSE 121, Spring 2026](https://courses.cs.washington.edu/courses/cse121/26sp/) topics, not an official UW course. Project briefs identify their problem inspirations and explain the adaptations.
