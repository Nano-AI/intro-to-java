# Releasing Pip and adding projects

## Current delivery

Pip 0.10.0 is a standalone Tauri desktop release for **Apple silicon Macs**. Download the [latest installer](https://github.com/Nano-AI/intro-to-java/releases/download/v0.10.0/Pip-Workshop-0.10.0-mac-arm64.dmg) or read the [release notes](https://github.com/Nano-AI/intro-to-java/releases/tag/v0.10.0). Java is included. The package is ad-hoc signed and **not notarized**; the website includes Apple's first-open instructions.

Historical release records remain in [CHANGELOG.md](../CHANGELOG.md). They do not establish verification of the current desktop package.

## Build and verify

From `workshop/`, with Node.js/npm, Rust/Cargo, platform build tools, and a JDK available:

```sh
npm install
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run test:ui
npm run build:jre # required on a clean checkout; use the intended JDK
npm run build:desktop
```

`npm run dev:desktop` launches the native development app. `npm run build` only builds frontend assets; `build:desktop` creates the installable native bundle. Packages appear under `src-tauri/target/release/bundle/`; macOS disk images are in its `dmg/` directory. Names and architectures depend on the target machine, so use the actual build output.

The package includes `Robot.java`, `Runner.java`, `InspectSource.java`, `desktop/DiagD.java`, and the Java runtime in `src-tauri/jre/`. The runtime is not checked into git. On a clean checkout, or when changing the bundled JDK, put the intended JDK's `jlink` on `PATH` and run:

```sh
npm run build:jre
```

This recreates the bundled runtime for that JDK/platform. Verify it contains working `bin/java` and `bin/javac` before packaging. Build architecture must match the intended student computer.

The UI test uses an isolated desktop bridge with real files and Java. It covers project navigation, locks, saved work, quizzes, milestones, snippets, sample runs, and grading. It is not an installed native app test.

Before sharing the resulting package:

1. Open the packaged app from its installed location and verify bundled Java setup.
2. Check a lesson and a project in the native window: edit, autocomplete, save, run, replay, quit, and reopen.
3. Confirm a project with missing prerequisites stays locked, including when a completion record exists. Confirm old Java files and progress survive app replacement.
4. Confirm the bundle contains its Java resources and no student files, test profiles, or temporary run data.
5. Record the package filename, target platform/architecture, checks performed, and remaining limits.

The macOS configuration currently uses ad-hoc signing. Local packaging does not establish notarization or public distribution readiness. Only link an installer on the website after that actual package has been verified and intentionally published; editing the landing page alone does not publish a release.

## Updating installed copies

Quit Pip, install the new app over the old one, and reopen it. Source files and progress remain in `~/.pip-java`; do not change this location during a routine update. Back up the whole folder when moving machines.

The 0.8.0 prerequisites apply to every project, including previously completed projects. Saved completion records are preserved. A project becomes accessible again after its missing prerequisite lessons pass. Legacy assignment routes redirect into the single Projects section.

Starters only seed missing files. Revising a starter must never replace an existing `Student.java`; replacing code requires the explicit **Restore starter** action. Imported progress also preserves existing Java files.

## Add or revise content

1. Choose a stable ID and required topics. Keep first-three-module homework within Java features already taught.
2. Add a brief, sample, starter, milestones, code prediction questions, explicit command/API reference, and source attributions. Describe any adaptation of an external problem.
3. Add content to `src/curriculum.js` or the game project content files and declare prerequisites. Reuse the existing game engine and project UI.
4. Add a reference solution, boundary cases, changed data, and plausible incorrect solutions. Use `host/assessment.js` structure rules where appropriate and independent helper probes when methods are the learning target.
5. Add portable tests under `tests/`; update desktop UI coverage when the flow changes. Keep saved IDs, source paths, and progress normalization compatible.
6. Update [PROJECTS.md](PROJECTS.md), [PROJECTS-REVIEW.md](PROJECTS-REVIEW.md), curriculum documentation, and the changelog. Keep teacher guidance out of student-facing task text.
7. Keep versions aligned in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`, then rebuild and verify the package.

Bundled checks are inspectable local teaching material. They should catch common mistakes and fixed-answer shortcuts without claiming to be a protected assessment service.

## 0.10.0 verification record

Status: **Apple silicon release built and verified** (2026-10-12).

- `npm test`: **193/193 passed**, including real Java grading, compatibility, locked input lines, challenge versions, lint quality, development-only Demo, and read-only worked examples.
- `cargo test`: **7/7 passed** for native execution, limits, cancellation, diagnostics and completion.
- `npm run test:ui`: **passed** with an isolated bridge and real Java. Covered navigation, prerequisites, saved files, challenges, Run/Submit, editor assistance, project refreshers, checklist, themes, commands and replay. Rapid resize/theme changes emit non-failing development `ResizeObserver` notifications.
- Chromium and WebKit checks covered the worked example and settings scale at desktop/narrow sizes; actual Three.js checks covered jumps in four directions and the stationary board/scoreboard. See [visual QA](UI-FINAL-QA-2026-10-12.md).
- `npm run build:desktop`: **passed**, creating Pip Workshop.app and the DMG. The native binary and mounted app both report **0.10.0**, architecture **arm64**. Ad-hoc signature and disk-image integrity checks passed. The mounted installer contains the `/Applications` drop link.
- Bundled `java` and `javac` report **21.0.12.1**. The bundle contains Robot, Runner, InspectSource and DiagD, and no student Java, progress, or settings files.
- The packaged native app opened successfully. Settings showed **Pip 0.10.0**, **Java Ready**, and no Demo switch. Saved course progress, a practice file and Supply Relay loaded. The user confirmed that Java code is visible in the packaged editor; native screenshot capture omitted its rendered text. Production editor screenshots passed in headless Chromium and WebKit. No native test edits were made to student files.
- The website passed local Chromium/WebKit checks at **1440, 390 and 320 px** with no overflow or page errors. The screenshot uses an isolated fixture, not student work.

Published installer name: `Pip-Workshop-0.10.0-mac-arm64.dmg` (30,572,718 bytes).

SHA-256:

```text
223adc611f6489f9df14ebd59657b3be88f0ad586ce5e4a8c96697803e323dce
```

Remaining limits: this package is **not notarized**. Windows and Intel Mac packages were not built. Native launch checks supplement the isolated automated edit/save/run tests; they are not an exhaustive native workflow test. Existing installed copies are replaced manually, preserving `~/.pip-java/`.

## 0.8.0 verification record

Status: **local Apple silicon package built; automated checks passed** (2026-10-11). No publication or installed-app replacement performed.

- `npm test`: **84/84 passed**, including all 39 existing Java practice parts, all three project reference solutions and authored incorrect solutions, independent helper probes, changed-data checks, command completion, and preservation of old Java/support files and progress.
- `cargo test`: **7/7 passed**, covering native process limits/cancellation and Java diagnostics/completion.
- `npm run test:ui`: **passed** in Chromium using the real desktop host, an isolated IPC/filesystem bridge and bundled Java. Exercised strict locks (including completed projects), legacy route redirect, preserved Java, nine highlighted refresher questions, saved milestones, command reference, Monaco snippet insertion, sample runs without completion, and full project grading. Inspected captured brief, quiz and completion screens.
- `npm run build:desktop`: **passed**, producing `src-tauri/target/release/bundle/macos/Pip Workshop.app` and `src-tauri/target/release/bundle/dmg/Pip Workshop_0.8.0_aarch64.dmg`.
- Bundle version is **0.8.0**. Ad-hoc signature verification passed. Bundle contains the Java runtime, compiler, Robot/Runner/InspectSource and DiagD resources; no student Java sources are bundled.
- `git diff --check`: passed. Problem documents regenerated from the same project definitions; independent content review checked maps, counts, quiz keys, prerequisites and student-facing wording.

Remaining limits: the native computer-use pipe failed to start, so installed WKWebView interaction was not checked. The package is ad-hoc signed and **not notarized**; macOS may require approval to open it on another computer. Windows/Intel Mac packages were not built. The two-to-three-session duration is a planning budget, not student-tested timing. Source checks provide learning feedback and are not a proof against every deliberately hardcoded program.


## 0.9.0 verification record

Status: **local Apple silicon package built; automated checks passed** (2026-10-11). No publication or installed-app replacement performed.

- `npm test`: **95/95 passed**, including existing Java practices, five cumulative homework solutions and authored incorrect programs, independent helper probes, varied input, autocomplete, storage compatibility, recovery, and demo isolation/concurrency.
- `cargo test`: **7/7 passed**, covering native process limits/cancellation and Java diagnostics/completion.
- `npm run test:ui`: **passed** using the real desktop host, isolated IPC/filesystem bridge and bundled Java. Covered Course on fresh launch; navigation and legacy redirects; six module project lists; strict locks; the progress map; light/dark semantic contrast; demo editing without changing student files or progress; all 15 homework quizzes; saved milestones; highlighted commands; Monaco snippet insertion; sample/full grading; replay input; finish markers; and no horizontal overflow at 900 × 600. Captured screens were visually inspected. No page errors occurred.
- The release build produced **Pip Workshop.app 0.9.0**. Tauri's DMG script completed the app copy and Finder layout but failed to eject its temporary volume with `Resource busy`. After a successful ordinary `hdiutil detach`, the existing image was compressed with `hdiutil convert -format UDZO -imagekey zlib-level=9`. The resulting installer is `src-tauri/target/release/bundle/dmg/Pip Workshop_0.9.0_aarch64.dmg`.
- Ad-hoc app signature verification passed. Bundled `java` and `javac` both report **21.0.12.1**. Resources include Robot, Runner, InspectSource and DiagD; no student Java sources are bundled.
- `hdiutil verify` passed for the final DMG. Its mounted app reports 0.9.0, passes signature verification, and includes the `/Applications` drop link. Installer SHA-256: `34e16bf0f250c0606c3819d05f257751daff22fc4637576c2facf92f5e13c06a`.
- Approved legacy recovery merged verified completion records and restored missing Java files. Existing Java, drafts and game records remained unchanged. A full workspace backup and recovery report were created first.
- Problem documents were regenerated from the same project definitions. Separate agent reviews checked curriculum contracts, module/catalog coverage, progress recovery, and demo behavior. `git diff --check` passed.

Review artifacts: [UI review brief](UI-REVIEW-REQUEST.md), [complete project review packet](PROJECTS-REVIEW.md), [student problems](PROJECTS.md), and [recovery record](PROGRESS-RECOVERY.md).

Remaining limits: native computer-use failed to start, so installed WKWebView interaction remains unverified. The package is ad-hoc signed and **not notarized**; another Mac may require approval to open it. Windows/Intel Mac packages were not built. Theme checks are not a complete accessibility audit. Project durations remain planning budgets, not student-tested timings; local source checks do not prove resistance to every deliberately hardcoded answer.
