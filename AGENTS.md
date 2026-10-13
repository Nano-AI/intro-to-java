# Pip Workshop

- The supported application is the **Tauri desktop app** in `workshop/`. Do not reintroduce VS Code, VSIX, or Electron delivery.
- Reuse `workshop/host/` for Java execution, assessment and progress storage, and `workshop/desktop/` for the Tauri bridge and editor services.
- Updates must preserve the student's existing `~/.pip-java/` Java files, package names, lesson/game IDs, drafts, quizzes, and progress. Create starters only when files do not exist. Never overwrite saved Java during an update or import.
- Keep older progress backups and links readable. Add a compatibility test whenever changing storage, source paths, course IDs or runtime contracts.
- Projects have explicit prerequisite lesson IDs. All required coding practices must pass before access, including when the project was completed in an older version. Locking must preserve saved work and completion records.
- Student-facing material must use clear, direct language, highlighted Java examples, and documented commands. Do not put instructor reminders into student-facing content.
- Before UI or copy changes, read [the user’s UI rules](workshop/docs/UI-DESIGN-RULES.md). Pip is an application, not a landing page: remove promotional copy, redundant labels/counts, and competing controls. Review the actual child-facing lesson and project flows visually, not only the dashboard or test results. Use the requested `fuck-slop` skill during the authorized UI cleanup.
- Validate changes with `npm test`, `npm run test:ui`, and appropriate native tests (`cargo test` in `workshop/src-tauri`). Build app releases with `npm run build:desktop`.
