# Pip Workshop 0.9.0 — independent review brief

This document records the reported problems, intended behavior, and review questions for the Tauri desktop update. It can be shared with another agent without the conversation history. For the actual coding assignments and solutions, use [PROJECTS-REVIEW.md](PROJECTS-REVIEW.md), a self-contained packet covering five homework projects. [PROJECTS.md](PROJECTS.md) contains only the student-facing problems.

## Product and audience

Pip teaches beginner Java for robotics. A lesson alternates explanation, code prediction, and real Java practice. Longer game projects combine the current module with earlier concepts. Students use the built-in editor and bundled Java; they do not need VS Code or developer tools. All instructional text is addressed to the learner. Instructor evaluation and solutions belong in the review packet.

## Reported problems and intended behavior

| Problem | Behavior to review |
|---|---|
| Course showed 0/35 while Hello Arena remained complete | Preserve actual records and source files; recover the specifically approved earlier course workspace without inventing passes. |
| App resumed on an unexpected project | A fresh launch opens Course. In-app navigation and legacy links still work. |
| Separate Games and Projects felt redundant | Navigation is Course, Projects, Progress, Settings. All 12 activities appear in Projects; old `/games` and `/assignments` routes redirect there. |
| Modules did not expose their projects | Each of six modules links to its activities from both Course and the module page. Modules 4 and 5 now include Signal Patrol and Mosaic Survey. |
| Locks prevented reviewing the app | Settings has a visible demo switch. Preview bypasses lesson/project gates inside an isolated temporary workspace, with a persistent banner. Normal mode still enforces every prerequisite, even for completed projects. |
| Long paragraphs and vague duration | Catalog cards show a short mission, numeric minute estimate, reusable topic tags, status, and a clear action. Module jump navigation remains available while scrolling. Full rules are retained on project screens. |
| Commands were difficult to discover | Project screens separate Mission, Build steps, Code refresher, and Commands. Java examples remain highlighted; snippets insert complete statements. |
| Progress page relied on many dropdowns | A six-module learning map shows progress and individual lesson states. Saved notes remain available through one note selector. |
| Settings and theme looked inconsistent | Shared Radix controls, distinct settings sections, explicit System/Light/Dark selection, and one semantic palette across course and workbench. |
| Repeated labels and unclear maps | Breadcrumbs omit a repeated back-link label. Lock pages use a prerequisites heading. Maps identify finish tiles, hurdles, and blue/yellow targets. Replays show the selected world's input. |

## Progress investigation and recovery

Legacy course records can live in a separate workspace even when the desktop app already has game progress in `~/.pip-java`. Recovery requires confirming the source and closing Pip first.

The recovery tool merges authentic completion records, restores only missing Java files, and keeps existing Java and drafts unchanged. Multipart lessons still require all parts; file presence alone never implies a pass.

A full backup and JSON recovery report are created outside the repository. See [PROGRESS-RECOVERY.md](PROGRESS-RECOVERY.md) for the dry-run-first procedure. Do not import unrelated demonstration profiles.

## Component-library decision

Two established React component systems were considered against the existing React/Vite/Tauri code:

| Option | Relevant fit | Decision |
|---|---|---|
| [Radix Themes](https://www.radix-ui.com/themes/docs/overview/getting-started) | Pre-styled components, a shared Theme provider, tabs, select, switch, segmented controls, badges and progress; no Tailwind migration required | Used for the new controls and shared presentation. |
| [Mantine](https://mantine.dev/styles/global-styles/) | Broad component library with its own required global styles/reset | Viable, but no need to introduce a larger alternative once Radix covers these screens. |

Radix [appearance control](https://www.radix-ui.com/themes/docs/theme/dark-mode) is connected to the same application theme preference. Existing Java editor and robotics rendering components remain reused. Small application components compose the library; there is no new general-purpose UI framework.

## Questions for reviewers

1. Can a first-time learner find their module's project, its prerequisites, and its commands without guessing?
2. Are time estimates and tags useful without overloading the cards? Are any essential instructions hidden too deeply?
3. Does the progress map distinguish completion, partial work, and available projects clearly without relying only on color?
4. Are both themes readable at the desktop minimum size (900 × 600), especially code, tags, disabled controls and diagrams?
5. Is it obvious whether demo or student mode is active? Can any demo action accidentally alter the real student's code or progress?
6. Do the five problem statements require only their declared prerequisites? Are sample inputs, command positions, method contracts and stopping conditions unambiguous?
7. Can a plausible wrong program earn completion? Report a concrete counterexample, expected result, and actual result.
8. Does the update preserve existing files, IDs, routes, drafts and valid completions? Are any missing records wrongly treated as evidence of completion?

Please return findings with severity, reproduction steps, a file/screen reference, and a suggested correction. Separate observed defects from preferences or untested concerns.

## Verification boundaries

Automated tests exercise real Java solutions and incorrect programs, storage compatibility, backup-first recovery, demo isolation and concurrency, and the desktop frontend through an isolated IPC bridge. The bridge is Chromium, not native WKWebView. Theme checks cover semantic foreground/background pairs; they are not a complete accessibility audit. Final packaging and test evidence is recorded in [RELEASING.md](RELEASING.md).

The local macOS package is ad-hoc signed, not notarized. Windows and Intel Mac packages are not built here. Project estimates are planning budgets rather than student-calibrated timings. Local source checks support teaching and do not claim to defeat every deliberately hardcoded solution.


## Current dev review: simplified UI (2026-10-11)

Approved choices: neutral light surfaces with blue accents; project instructions one step at a time beside the editor, with Back/Next. Review the running Tauri dev app, not the earlier 0.9.0 installer. No new release was packaged for this pass.

Check [UI-DESIGN-RULES.md](UI-DESIGN-RULES.md) before suggesting changes. Avoid adding introductory copy, redundant statuses, or more competing controls. The problem definitions for independent review remain in [PROJECTS.md](PROJECTS.md); the concise in-app sequence lives in `src/project-steps.js` and preserves the existing project IDs and saved milestone keys.

### Reference patterns considered

- [Code.org resource panel](https://support.code.org/hc/en-us/articles/40421580261133-Resource-Panel-in-Labs): instructions remain beside the workspace; documentation is available on demand. Applied here as one short task and a visible Commands button.
- [CodeCombat layout update](https://blog.codecombat.com/new-features-classroom-gems-optimized-game-layout-more/): reviewed its before/after game screenshot and explanation of reducing overlap between code, hints and the game view. Applied here as distinct task, editor and world areas.
- [LeetCode Two Sum](https://leetcode.com/problems/two-sum/description/): reviewed the problem, examples and testcase/result structure. Applied here as a concise goal, a trial run and separate full checks. This is an adaptation, not a copy of its interface.

This pass does not change prerequisites, graders, source paths or stored progress. Cross-engine editor testing supplements the desktop IPC test. Neither substitutes for a native WKWebView check; see the audit for the exact remaining boundary.

### Latest feedback correction

Review [UI-CURRENT-PASS.md](UI-CURRENT-PASS.md) against the implemented screens:

- Course/module progress counts individual coding practices, including each saved repair part (39 total). Does this make partial progress clear?
- Module pages separate Lessons and Projects; Bug fix and Minigame labels identify those activities. Can a learner distinguish them at a glance?
- A project's refresher appears before its workspace. Once in the workspace, the map/world and Java editor are visible together, including at 900×600.
- The project toolbar has Back to Projects, Checklist and Commands. The global navigation is omitted only on project routes. Does the return route remain obvious?
- Checklist details open on demand; the current short task remains next to the world. Are essential instructions accessible without burying the world?
- Insert solution appears only in isolated Demo mode. The host rejects it in student mode, and test fixtures check that original files and progress remain unchanged.

Use the complete [problem document](PROJECTS.md) and [solution/review packet](PROJECTS-REVIEW.md) for pedagogical review. App copy and independent problem documentation serve different purposes; do not put the entire review packet on the workbench.
