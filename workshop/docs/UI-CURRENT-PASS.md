# Pip: current UI pass

Audience: middle-school Java learners. The screen must identify the activity, show the next action and leave room to see its result. The earlier simplification removed useful structure; restore that structure without adding promotional copy.

## Visual contract

- Palette: neutral background `#f6f7f9`, white surface `#ffffff`, text `#172033`, secondary text `#526174`, action blue `#2459c5`, success green `#19734f`. Retain the existing tested dark equivalents.
- Typography: system sans-serif, readable labels and 44px primary targets. Java remains monospace and syntax highlighted.
- Hierarchy: a module has a topic summary and a real coding-progress bar. Inside it, Lessons and Projects are separate sections. Bug fixes and short games have explicit types and consistent icons.
- Accent color signals actions, activity types and progress. No decorative left stripe, marketing hero or duplicated completion label.

```
Course
  Continue [next activity]
  Java basics   [coding progress]   concise topic summary
  Loops         [coding progress]   concise topic summary

Module
  [Lessons]     Lessons    [To do | Review]
  [Projects]      selected lesson rows [Explore] [Quiz] [Practice]
  [Challenges]  Projects  [project / short-game rows]
                Challenges

Project refresher (separate screen)
  code + one question                     [Next / Start project]

Project
  [Projects]  Supply Relay              [Checklist] [Commands]
  world + short current task       |    Student.java
  trial / replay / result          |    editor
```

The isolated demo workspace additionally offers Insert solution. The host must reject that request outside demo mode. Existing student files, IDs, quiz answers and milestone keys remain unchanged.

Latest review: use Radix tabs for To do and Review instead of the native lesson disclosure. Keep the same lesson cards. Match both run controls at 44px. Replace the default flat arrow map with a simple fitted 3D board and a recognizable Pip; keep the precise map available. Drive world changes from simulator events. Auto-check only steps supported by run evidence, while retaining manual planning checks and older saved milestones. Keep the existing palette and typography; these changes clarify interaction rather than add copy.

## Review boundary

Review the actual rendered layouts at 900×600 and normal desktop sizes in light and dark appearances. Confirm the world and editor are simultaneously usable, controls do not overflow and the refresher never occupies the project work area. Browser-engine evidence and native Tauri evidence are reported separately. This pass is dev-only; packaging awaits the user's final review.

The Projects sidebar has its own neutral surface and border. Finished projects follow all unfinished groups in an always-visible Review section, reachable from the sidebar. They use muted colors with normal contrast, and their existing prerequisite locks still apply.

Module pages reuse that sidebar pattern for Lessons, Projects and Challenges. It stays visible while scrolling, omits absent sections and moves keyboard focus to the chosen heading. Blue, green and amber section headings match their navigation icons. Project icons now use green, while module icons retain blue. These accents distinguish activity types without adding copy or changing the neutral surfaces.

## Independent challenge pass

Reuse the existing module page, Monaco editor and Java runner. Two optional challenges follow each programming module's projects. An outlined flag and amber surface distinguish independent work without changing the neutral/blue application palette. Amber tokens: light ink `#855000`, surface `#fff8e8`, border `#d6aa51`; dark ink `#f5cd7e`, surface `#332a1b`, border `#ad8845`.

```
Module
  Lessons     [To do | Review]
  Projects
  Challenges  [flag + Challenge, title, topic, time, Start challenge]

Challenge
  [Module] [flag Challenge]                          [Run] [Submit]
  Description                 |  Student.java
  short problem               |  syntax-highlighted editor
  two examples + constraints  |  compiler markers; no autocomplete
                              |  [Test input | Results]
```

The structure follows the [LeetCode problem workspace](https://leetcode.com/problems/two-sum/): description beside code, with execution controls above and results below the editor. Input and Results tabs appear only for stdin problems. Running selects Results automatically. Editing clears stale results. Completed cards move behind unfinished cards. Prerequisite locks retain hover/focus/click explanations. No hints, solution buttons or guided lesson navigation appear in this workspace. Run is ungraded; Submit uses the existing varied-input and direct-method checks. This remains a dev update, not a release.

Inline Java has a monospace font, bordered surface and syntax colors. Java example inputs are highlighted; raw stdin/output remain plain. The same Java renderer covers lessons, quizzes and visual models, including loop comparison choices. Ordinary interface text is not selectable; Java, console output and editable fields remain selectable.

All ten challenges now combine related results or methods. Assessment version 2 requires a fresh pass without changing source paths or deleting earlier completion records. Guided lesson completion is unchanged. Compatibility tests cover reopening old CRLF/package Java unchanged, failing the revised task without erasing its earlier pass, and recording a new pass only after explicit edits and submission.

### Earlier verification record (before the compact workspace and version 2)

- `npm test`: 124 passed, including real Java solutions, failing starters, fixed-answer rejection, array preservation and legacy save compatibility.
- `cargo test`: 7 passed. `npm run build:web` and `git diff --check` passed.
- `npm run test:ui`: passed. All ten challenge screens checked at 900×600 in light/dark. The end-to-end path verifies prerequisite locks, highlighting, compiler errors, disabled manual autocomplete, stale-result clearing, ungraded Run, graded Submit, preserved Java and unchanged course totals. Screenshots: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-desktop-ui-QDxUud`.
- Production Chromium/WebKit editor matrix passed at 900/1280 in both appearances, including the shared challenge workspace. Screenshots: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-editor-ui-rHxjY3`.
- Manually inspected every challenge's rendered problem/editor screen, plus cards, compiler failure and passing results. Corrected a test paste that introduced indentation; clean source fixtures now show normal formatting. A final helper-check message now says “another method” because helpers may be called outside `main`; the focused Match score Java test passed after this copy correction.
- Native Tauri process remains running with the updated dev source. These browser-engine screenshots are not a native window click-through. No installer or distribution build was made. Student timing and native interaction still need live review.

### Run-feedback follow-up

The user extended independent diagnosis to ordinary practice and projects. Removed automatic whitespace/capitalization mismatch explanations, line-by-line diff highlighting, compiler paraphrases and programming advice in game failure summaries. Raw output, expected values, compiler/runtime errors, source requirements and pass/fail remain. Ordinary hints are manual; the second-stage worked example was removed. Challenge mode remains unassisted. The Tauri dev app was restarted for review; no installer was created.

### Current verification: compact workspace and assessment version 2

- `npm test`: **138 passed**, including all ten stronger reference solutions, failing starters, memorized-example rejection, incomplete two-part solutions, array preservation and fresh-pass compatibility.
- `npm run test:ui`: passed with real Java execution. It checks all ten screens in light/dark at 900×600, compact actions, syntax-colored loop controls, disabled completion, raw compiler errors, Run versus Submit, and reopening an older challenge pass without changing its Java file. Artifacts: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-desktop-ui-ckx9Vg`.
- Production Chromium/WebKit matrix: passed in light/dark at 900×600 and 1280×800. Checks include visible Java, editor dimensions, code/prose distinction, highlighted example inputs and code-only text selection. Artifacts: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-editor-ui-G4ph0Z`.
- `npm run build:web`, `git diff --check` and the seven native `cargo test` checks passed. Native code was unchanged in this pass.
- Inspected the rendered compact workspace, stronger method/array descriptions, passed results, and loop comparison controls. The syntax fixture checked token contrast in both browser engines and both appearances. Fixed a legacy SVG width rule that hid dropdown text. A separate curriculum review found the examples, arithmetic, boundaries and prerequisite topic limits consistent.
- [Student problem set](CHALLENGES.md) and [review packet with answer keys](CHALLENGES-REVIEW.md) regenerated from the challenge registry.

The Tauri dev process is running. Native window interaction and student timing remain unverified. No installer was created; saved student work was not replaced.

### Module sidebar follow-up

The section sidebar and additional activity colors passed the full desktop UI flow and production Chromium/WebKit checks at both window sizes and appearances. Navigation targets receive keyboard focus, remain below the app header and keep the sidebar available. Absent sections are omitted. Section-heading contrast is checked against its rendered surface. Screenshots were inspected for light Lessons and dark Challenges at 900px, plus the 1280px layout.

The final `npm test` rerun passed all 138 tests. Web build and diff checks passed.

- Full UI flow: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-desktop-ui-Io0AIS`.
- Production browser matrix: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-editor-ui-jxEstZ`.

### Pip and carried boxes

Both 3D renderers share a low, round robot with a bright blue lid, dark bumper and pale front light. The map uses the same silhouette and colors. Each collected supply adds one visible box; drops and replay rewind remove the corresponding boxes. Large loads fill four three-box stacks before growing taller, and camera framing reserves space for the load. Ball handling and Java commands are unchanged.

- `npm test`: 140 passed; the final compact-stack revision also passed the two focused model tests. They cover simulated pickup/drop/rewind, movement, 91 distinct boxes, camera bounds and unchanged world data.
- `npm run test:ui`, web build and diff checks passed. The focused renderer fixture exercised both renderers, inspected pickup/drop states and the largest load, and verified canvas cleanup without touching student files. Screenshots: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-robot-ui-8lMCzI`.
- The existing Tauri dev process received the updates. Native-window visual inspection remains pending; no installer or native-code changes were made.
- Replay lifecycle check passed 32 long/empty/short replay replacements and eight world switches, including the updated map. Screenshot: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-desktop-ui-r7HOsx/replay-lifecycle-final.png`.

## Current pass: world clarity, supplied inputs and test cases

The board now has pale alternating tiles against a slate background, depth-tested coordinates, amber delivery approaches pointing toward each depot, and green pads marking the exact Home/Finish tile. A replay-driven LCD scoreboard sits behind the board and stays readable after rotation or Top view. The accessible score text remains available without duplicating the visible scoreboard.

Supply Relay now asks for one pickup, delivery and an energy report. It ends beside the depot; no return journey or repeated pickups. The entire supplied `gap`, `energy` and `costPerTile` lines are protected in Monaco. The runner separately validates the declarations and changes their values in temporary test copies. Existing student sources are preserved; replacing an older starter requires the existing explicit Restore action.

Projects and independent challenges share three public Run cases with Input and Output. Submit runs twenty project cases and twenty to thirty-three challenge cases and opens a left-side Submission panel. Method/source checks remain separate. Short games retain their tiers, checking twenty to forty worlds; the introductory Hello Arena is a fixed authored board, so repeated executions are not distinct input scenarios. Run can check off observed project actions but does not award completion, stars or a calculation milestone that needs the larger suite.

An independent GPT-6 Astra reviewer inspected all current prompt sources and independently recalculated all 260 challenge expectations. The content pass makes practice tasks self-contained, restores missing quiz context, fixes misleading Git captions and the fraction model, highlights code names, and uses the current Run/Submit labels. Detailed findings are in [PROMPT-QUALITY-REVIEW.md](PROMPT-QUALITY-REVIEW.md); generated problem and reviewer documents remain the handoff for a separate curriculum review.

### Verification

- `npm test`: 166 passed. After the final checklist correction, the affected real-host preservation/checklist test passed again. Native `cargo test`: 7 passed. The final copy pass passed 20 content/contract/Git checks.
- The dedicated locked-editor Chromium/WebKit fixture passed typing, clipboard cut/paste, whole-file replacement, line joins, formatting, undo/redo, multicursor, CRLF preservation and authorized starter reset. Artifacts: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-locked-editor-8C2k23`.
- Five scene/model tests passed. The renderer fixture verified pickup/drop/rewind, 91 boxes, cleanup and projected scoreboard bounds in Top view. Inspected standard, compact, rotated and top screenshots: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-robot-ui-PkC6L1`.
- Inspected left-side accepted submissions in both appearances and public input/output layouts at 900×600. Focused real-host UI artifacts: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-desktop-ui-oHPU69`.
- Web build and diff check passed. `npm run test:ui` passed the complete real-Java/desktop-host flow: three public cases, twenty-plus submission cases, left submission panels, quiz context, compiler/runtime input visibility, completion locks, preserved sources, autocomplete, automatic/manual checklist steps and all ten challenges in both appearances. Screenshots: `/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/pip-desktop-ui-MhVT4I`. Four ResizeObserver scheduling notices appeared in Vite during rapid theme navigation; pane-size/overflow assertions passed and no page or console errors were captured.

The UI walkthrough also found command snippets disappearing after a comment ending with a period. The shared member-position helper now checks that the dot belongs to Java code, preserving actual multiline member completion. All five focused command tests passed, including LF/CRLF comment regression coverage.

Known limits: rejecting an edit that touches a protected input line clears Monaco's undo history, while preserving the accepted source. The native Course screenshot was inspected, but the automation tool cannot attach to the unbundled Tauri executable for a full native click-through. Browser engine checks do not replace that review or a child comprehension session. The dev process remains running; no installer was built and no saved student Java was replaced.
