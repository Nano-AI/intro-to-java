# Pip UI review — October 12, 2026

This record began with development QA. The user subsequently approved release 0.10.0; its final build and checks are recorded in [RELEASING.md](RELEASING.md). Browser checks used disposable workspaces and real Java execution, never the student’s saved files.

## Changes checked

| Area | Result |
| --- | --- |
| Description / Submission tabs | Removed the second, clipped focus outline. Keyboard focus remains visible. Dragging does not select interface labels. |
| Run results | Compact case buttons; Input, Output and Expected use full-width rows. Results can expand without unmounting the editor. Projects keep Submission on the left. |
| Settings | Interface size: 90%, 100%, 110%, 125%. Code font: 10–28 px. Preferences survive reload; existing font preferences and keyboard shortcuts remain supported. |
| Icons | Shared SVGs in navigation, Settings headings, judging and scene controls, map symbols, and stars. Meaningful colored backgrounds use the existing theme. |
| World motion | Scoreboard stays at a fixed world position. Orbit no longer refits the projection on every change. Pickup, drop and rewind do not move the camera or scoreboard. Explicit view presets and resizing can refit the view. |
| Judging | Correct submissions pass despite compiler warnings. Perfect requires all correctness checks and a completed lint run with zero warnings. Optional game stars do not turn a correct submission into a failure. |
| Edited code | Results clear immediately. Old in-flight results cannot describe newer source. Identical autosaves preserve current results; earned progress is preserved. |
| Editor | User editing is disabled during judging. Trusted demo replacement still updates the visible model. Supplied input lines retain their protections. |

Lint uses real `javac -Xlint:all,-path` diagnostics for student source. Perfect does not prove optimality or teaching mastery, and this pass adds no separate formatting/style grader.

## Visual coverage

Opened the localhost app in Chrome and inspected Course, a module, locked lesson actions, Explore, Quiz, Practice, Projects, the project refresher, Commands, Checklist, the 3D world, Run results, Submission, a challenge, Progress and Settings. Supply Relay ran three public examples and submitted twenty cases through the UI.

Automated browser checks additionally cover light/dark appearances, 900×600 and 1280×800 windows, all four interface sizes, popup/dialog bounds, real editor typing and undo, font shortcuts, saved preferences, compilation/runtime failures, warnings, and unchanged Java files. Chromium and WebKit coverage is distinct from native WKWebView interaction.

## Verification

- `npm test`: 174 passed. After the source-aware result changes, 31 targeted backend tests passed, including eight new stale-result regressions.
- `cargo test`: 7 passed.
- `tools/test-display-ui.mjs`: Chromium and WebKit passed both themes, both window sizes, all four scales, editor interaction and persistence. A focused final pass checked the added navigation/Settings icons at 900 px and 125%.
- `tools/test-locked-editor-ui.mjs`: Chromium and WebKit passed physical input-line protection and trusted replacement while read-only. The new replacement test failed before the fix and passed afterward.
- `tools/test-pip-ui.mjs`: passed fixed camera/scoreboard checks during replay, orbit and resize; inspected rotated, top and compact screenshots.
- `tools/test-editor-ui.mjs --production`: Chromium and WebKit passed real production assets and Tauri CSP, including visible code, both themes, both sizes, single keyboard focus rings and selection rules.
- `npm run build:web`: passed. The existing large Monaco bundle size warning remains.
- `npm run test:ui`: passed the full workbench flow, including real Java grading, warnings, failed runs, demo replacement, source invalidation and correctness independent of optional stars. The Vite log recorded four ResizeObserver notifications during rapid theme changes; layout assertions and captured screens passed.

The capable-model backend and final integration reviews found no remaining blockers in scoring or source-aware result handling. Tests also caught and prompted fixes for a stale Practice complete banner and a demo solution replacement that updated disk but not the editor.

## Evidence and review documents

Selected unmodified screenshots are saved in the repository: [test results](ui-qa/2026-10-12/test-results.png), [accepted with warnings](ui-qa/2026-10-12/accepted-with-warnings.png), [Settings light](ui-qa/2026-10-12/settings-light.png), [Settings dark](ui-qa/2026-10-12/settings-dark.png), [fixed world after rotation](ui-qa/2026-10-12/world-rotated.png).

Full screenshot artifacts are local temporary directories, not shipped app assets:

- Settings and zoom: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-display-webkit-cFR3xY`
- Final Settings icons: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-display-webkit-70D9gD`
- Fixed world: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-robot-ui-jqZvx3`
- Locked editor: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-locked-editor-KmG1jy`
- Production editor: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-editor-ui-mzNEwb`
- Full UI flow: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-desktop-ui-eIhJae`

Problem packets: [Projects](PROJECTS.md), [Challenges](CHALLENGES.md). Reviewer versions: [Projects review](PROJECTS-REVIEW.md), [Challenges review](CHALLENGES-REVIEW.md), [Prompt quality review](PROMPT-QUALITY-REVIEW.md).

## Remaining verification

The desktop inspection tool could not attach reliably to the unbundled Tauri window. Native process launch and Rust tests passed, but the final native visual click-through remains for the user's dev-app review. Browser WebKit screenshots are not a substitute for that approval. Packaging and distribution remain deferred as requested.

## Follow-up: examples, judging speed, hurdles, and development controls

Implemented after the live review:

- Description contains one view-only worked example, with its input, expected output and Play demo. Reference execution uses temporary files and never changes the student's Java, draft, submission result or completion records. Replay results are cached for repeat viewing.
- Description, World, Submission, Testcase and Test Result use the shared colored SVG icons. The world dropdown has only its selected-item check.
- Speech is a visible transcript below the world. Rewinding clears future speech. The redundant World passed message and floating speech overlays are gone.
- Hurdles sit across the entering tile edge. Jump animation follows the actual event's start/end coordinates, lifts over the bar and lands at the next tile center. Runtime jump distance stays one tile.
- Development Demo mode is gated by both Rust debug assertions and Tauri development mode. Host calls reject release and older bridges that lack the flag; Settings hides the switch there. Student-facing Play demo remains available.
- Native startup exposed a WebKit concurrent-import race: Demo mode reached the host before its top-level initialization ended (`Cannot access 'switching' before initialization`). Sharing one pending host import in `platform.js` fixed this. Native logging then confirmed `available: true`; temporary logging was removed. Delayed-bridge WebKit tests cover startup and development/release visibility.

Judging already ran without animation. Most time was Java compilation. Reusing original/duplicate input compilations, compiling helper probes together and bounding concurrent variant compilation to three reduced individual isolated measurements:

| Activity | Before | After |
| --- | ---: | ---: |
| Supply Relay Run, 3 cases | 1.42 s | 0.97 s |
| Supply Relay Submit, 20 cases | 6.84 s | 3.71 s |
| Battery challenge, 20 cases | 5.89 s | 3.29 s |
| Count matches, 33 cases | 9.49 s | 2.05 s |

Each test still gets a fresh JVM with timeout, output cap and cancellation. Robot output is checked by the headless world rules so alternate valid routes can pass. Console output is compared with expected output. A 100-case method test uses two compiler launches and 100 separate JVM executions.

Visual evidence: [example at 900px](ui-qa/2026-10-12/example-light-900-world.png), [dark input/output](ui-qa/2026-10-12/example-dark-900-values.png), [example at 1280px](ui-qa/2026-10-12/example-light-1280.png), [takeoff](ui-qa/2026-10-12/jump-E-start.png), [mid-jump](ui-qa/2026-10-12/jump-E-mid.png), [landing](ui-qa/2026-10-12/jump-E-land.png).

Verified: full desktop UI suite; focused example/replay preservation and transcript tests; Chromium and WebKit display matrices at 900/1280px, both themes and 90/100/110/125% sizes; four-direction rendered jump checks; seven native tests. Full UI logs retain development ResizeObserver notifications during rapid theme changes. The computer-use tool cannot attach to the unbundled Tauri process, so native visual inspection remains a separate user check. No installer was built or installed.

Final regression result: the full `npm test` sweep ran 193 tests; 192 passed and one still-running test process held the old expectation of three compiler launches. The updated regression expects two (original bytecode plus one distinct changed input), verifies both tiers' positions, and its full 17-test engine suite passed afterward. No other failures occurred. The final production frontend build passed with the existing large Monaco-chunk warning. `git diff --check` is clean. The Tauri dev app is running; the missing Demo switch's native startup race was traced and fixed, with `available: true` confirmed through the native window's console before removing the temporary diagnostic.

## Release verification — 0.10.0

The final full suite passed **193/193 tests**, native tests passed **7/7**, and the full desktop UI suite passed. The production editor suite passed in headless Chromium and WebKit under the release CSP. The packaged native app reported version 0.10.0, bundled Java Ready and no development Demo switch. The user confirmed code is visible in its editor; the native screenshot capture incorrectly showed that area blank. No rendering change was necessary.

The Apple silicon app and DMG passed signature, mounted-resource and disk-image checks. The website passed headless Chromium/WebKit checks at desktop and mobile widths. See the release record for the installer checksum and remaining limits.

Future screenshot QA uses headless Playwright. Do not open or manipulate the desktop app while the user is working unless they explicitly request native interaction.
