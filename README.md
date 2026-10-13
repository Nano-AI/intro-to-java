# Pip — Java learning for robotics

**Pip Workshop is a standalone Tauri desktop app** in [`workshop/`](workshop/README.md). Learn a Java concept, predict what a short program does, then write real Java in the built-in editor and inspect its output or robot replay. The desktop bundle includes Java.

Version 0.10.0 links every module to its projects: **Supply Relay**, **Staircase Arena**, **Tower Rescue**, **Signal Patrol**, and **Mosaic Survey**, alongside the existing short games and final projects. One **Projects** section provides topic tags, time estimates, prerequisites, and direct module links. A visual progress map and consistent light/dark settings use Radix Themes components. Ten independent challenges add varied input tests without autocomplete or solution assistance. Development builds also offer an isolated Demo mode.

The curriculum is an original tutoring adaptation of [UW CSE 121, Spring 2026](https://courses.cs.washington.edu/courses/cse121/26sp/), with robotics practice. It is not an official UW course or a certification of mastery.

## Use Pip

Download [Pip Workshop 0.10.0 for Apple silicon Macs](https://github.com/Nano-AI/intro-to-java/releases/download/v0.10.0/Pip-Workshop-0.10.0-mac-arm64.dmg), open the disk image, and drag **Pip Workshop** into **Applications**. Students use the app's Java editor; no separate editor, Node.js, Rust, or web server is needed. See the [desktop guide](workshop/README.md).

The Mac package includes Java and uses ad-hoc signing; it is not notarized. If macOS blocks first launch, follow the [installation guide](workshop/README.md#install-and-update). See [release checks](workshop/docs/RELEASING.md) and the [course website](https://bankoti.dev/intro-to-java/).

Code and progress remain in `~/.pip-java`. Existing Java files, drafts, quiz answers, and completion records are preserved. Prerequisite locks apply to completed projects too; passing missing prerequisite lessons restores access to their saved work.

## Develop

From `workshop/`:

```sh
npm install
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run test:ui
npm run build:jre # first build, or when changing the bundled JDK
npm run build:desktop
```

Use `npm run dev:desktop` for native development. Developers need Node.js/npm, Rust/Cargo, platform build tools, and a JDK. See [build and release details](workshop/docs/RELEASING.md), including the bundled Java runtime.

## Documentation

- [Desktop installation and usage](workshop/README.md)
- [Architecture and storage](workshop/docs/ARCHITECTURE.md)
- [Independent UI review brief](workshop/docs/UI-REVIEW-REQUEST.md) and [progress recovery procedure](workshop/docs/PROGRESS-RECOVERY.md)
- [Project briefs](workshop/docs/PROJECTS.md) and [independent review packet](workshop/docs/PROJECTS-REVIEW.md)
- [Curriculum coverage](workshop/docs/CURRICULUM.md) and [lesson roadmap](workshop/docs/ROADMAP.md)
- [Release procedure](workshop/docs/RELEASING.md) and [historical changelog](workshop/CHANGELOG.md)

Private teaching notes and slide decks remain under the gitignored `teacher/` directory, including earlier materials in `teacher/archive/`.

## Repository layout

```text
workshop/
  src/          React course, projects, editor, and replay pages
  desktop/      Native bridge adapters and Java completion daemon
  host/         Shared Java runner, grading, and progress storage
  src-tauri/    Tauri shell, native commands, and bundled Java runtime
  shared/       Progress, game contracts, commands, and prerequisite rules
  tests/        Portable Java, game, grading, and compatibility tests
  web/          Reusable 3D scene and robot simulation content
  docs/         Technical documentation and project review material
docs/           Static landing page, earlier weekly notes, and starter downloads
teacher/        Private teaching notes and slide decks (gitignored)
make-zips.py    Rebuilds the earlier website's starter archives
```

## Earlier weekly notes

The [course website](https://bankoti.dev/intro-to-java/) introduces Pip and retains the original week 0–4 notes, Battle Sim, and starter downloads. Those historical materials remain separate from the desktop app. The original Battle Sim was adapted from CSE 142's Admissions assignment; that attribution still applies.

The static site has no build dependencies. After changing `docs/starters/`, rebuild its starter downloads from the repository root:

```sh
python3 make-zips.py
```

Desktop releases are built separately. Updating the website does not publish or install a new app package.
