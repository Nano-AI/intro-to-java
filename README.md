# Pip — Java learning for robotics

The active project is **Pip Workshop**, a VS Code extension in [`workshop/`](workshop/README.md). Students manipulate concept models, write real Java, repair broken programs, and compare predictions with output graphics or a 3D robot replay.

**Course scope: UW CSE 121, Spring 2026.** Version 0.6.0 includes **35 top-level learning units across six modules, with 39 executable coding parts/files: 30 console and nine robot programs**. The declaration-repair unit has five parts; robotics includes obstacle detour, cargo delivery, and hoop shooting. It is an original tutoring adaptation, not an official UW course or a certification of mastery. Teacher review is optional guidance for assessing understanding.

## Use the extension

1. In VS Code, install **Language Support for Java by Red Hat** and have a JDK available.
2. Install `workshop/pip-workshop-0.6.0.vsix` using **Extensions → … → Install from VSIX**.
3. Open a dedicated learning folder.
4. Run **Pip: Open Course** from the Command Palette, or select Pip in the activity bar.
5. Open **Lesson** at `/learn/:lessonId` for two slides: goal and concept plus interactive model. **Quiz** at `/quiz/:lessonId` is the separate prediction page.
6. Continue to Practice at `/practice/:lessonId`, Project at `/project/:lessonId`, or Assignment at `/assignment/:lessonId`. Coding shows the task with an optional hint ladder, the native `Student.java`, output or simulator, checks with plain-language error notes, **Try own input** for programs that read input, and optional notes. **Review the lesson** returns to Lesson. Legacy `/lesson/:lessonId` redirects.
7. Choose **Save & run** or **Pip: Save and Run Current Lesson** (`pip.runLesson`); the real Java file is saved before compilation.

The `/projects` catalog contains the three robot challenges. `/assignments` contains `autonomous-docking` and `java-final-report`. These are alternate views of existing course units.

Students do not need Node.js, Rust, Tauri, or a running web server. The extension uses VS Code's extension host and an installed JDK.

Begin with output and explicit variable declarations, then the five-part declaration-repair group, types, loops, methods, decisions, and arrays. Completion requires only passing current code checks for every coding part. Activities, quizzes, and review/reflection are optional. Review notes are collapsed by default and autosave at any length. Lesson and Quiz always allow entering practice; resuming existing code does not force review or quiz navigation. Completed titles are crossed off in module lists, catalogs, progress, completed modules, and part buttons, with visible **Completed** status. Prior files and saved reviews, quiz answers, and activities are preserved for voluntary use; no data migration is needed. AST structure checks, changed data, and direct method tests strengthen feedback, but local grading is not cheat-proof.

Assessment versions are per lesson/part: most are version 2; `debug-semicolon` and `autonomous-docking` are version 3. Group checks use each part's own version. The robot projects are original simplified teaching challenges, not an official game clone.

## Develop and package

From `workshop/`:

```sh
npm ci
npm run build
npm test
npm run test:extension
npm run package
```

Open the `workshop` folder in VS Code and press **F5** to run an Extension Development Host. Integration tests use a separate profile and learning folder.

See [`workshop/docs/RELEASING.md`](workshop/docs/RELEASING.md) for the live VS Code demo command and verification history.

## Local documentation

- [Extension installation and usage](workshop/README.md)
- [Architecture and storage](workshop/docs/ARCHITECTURE.md)
- [CSE 121 coverage and teaching notes](workshop/docs/CURRICULUM.md)
- [Every lesson: visual action, coding target, tests, and optional teacher guidance](workshop/docs/ROADMAP.md)
- [Packaging and module updates](workshop/docs/RELEASING.md)
- [Changelog](workshop/CHANGELOG.md)
- `teacher/course-map.md`: private local hands-on teaching plan. The previous CSE 142 notes and slide materials are retained under `teacher/archive/` and their existing locations as legacy references.

## Repository layout

```text
workshop/             active VS Code extension
  extension/          commands, Java runner, progress storage, integration tests
  src/                React course pages and lesson/simulator webview
  web/                reusable 3D scene, effects, robot lesson definitions
  shared/             progress normalization/migration
  docs/               current technical and teaching documentation
docs/                 earlier static course website and starter downloads
teacher/              private teaching notes and slide decks (gitignored)
make-zips.py          rebuilds the earlier website's starter archives
```

## Earlier static course website

The original site remains at https://nano-ai.github.io/intro-to-java/. Its week 0–4 pages cover setup, variables, arithmetic/input, conditionals, and methods. These are supplementary material; they have not been converted into the extension UI.

The `docs/` website still has no build dependencies and is served through GitHub Pages from `master` → `/docs`. After changing files in `docs/starters/`, rebuild the downloads from the repository root:

```sh
python3 make-zips.py
```

The original Battle Sim was adapted from CSE 142's Admissions assignment. That historical attribution remains valid; the current extension's curriculum reference is [CSE 121, Spring 2026](https://courses.cs.washington.edu/courses/cse121/26sp/).
