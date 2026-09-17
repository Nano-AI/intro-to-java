# Game practice — frozen contracts and implementation notes

Companion to `2026-09-17-game-practice-design.md`. Step 0 deliverable. Baseline: `master` at `47233f7`, Pip 0.6.0.

Everything here is **frozen**. Changing a shape means proposing it in this document, getting the affected owners' acknowledgement, and landing it through the coordinator — never a private copy in one worktree.

## 1. What Step 0 landed

| File | Owner after Step 0 | Contents |
|---|---|---|
| `shared/game-contract.js` | integration | Every cross-boundary shape: catalogue counts, limits, vocabulary, event kinds, paths, seeded RNG, progress records, run/world result factories, `validateWorld`, `validateGame`. Node-pure, no imports. |
| `shared/game-fixtures.js` | integration | The five required fixtures: success, failed world, compile error, stopped run, ungraded input experiment. Engine and UI use these same objects. |
| `shared/completion.js` | **structure** | Scaffold with frozen signatures. Game and unlock predicates implemented; curriculum-shaped predicates take injected members rather than importing `src/curriculum.js`. |
| `src/games/unit-{1..5}.js` | content authors | `export const games = []`. |
| `src/games/index.js` | integration | Concatenating registry plus `findGame`, `gamesForSubtopic`, `projectsForUnit`. |
| `src/git-unit.js` | **git-content** | `export const gitLessons = []`. |
| `extension/contract.test.js` | integration | Runs under the existing `npm test` glob. Nine checks over the contract itself. |
| `package.json` | integration | Run button and `ctrl/cmd+enter` widened from `/pip/lessons/` to `/pip/(lessons\|games)/`. |

`shared/game-contract.js` is imported by Node (engine, host, tests) **and** bundled into the webview, so it uses `TextEncoder`, never `Buffer`, and pulls in nothing else.

## 2. Frozen shapes

Read the module — it is the specification, not a copy of one. The pieces that most constrain other work:

**Seeded randomness.** `mulberry32(seed)` lives in the contract; `src/games/engine.js` re-exports it so content authors receive it "from the engine" as the design spec says, without a second implementation existing. Harness seeds are always `1..N` (`seedsFor`), default 3 per level.

**Progress record.** `{ stars, best, updatedAt }` per game id. `mergeGameRecord(saved, incoming, gameId)` is monotonic in all three fields — max stars, min non-null best, latest timestamp — so a stale host patch, a late run result, and an old backup import are all safe. An absent entry never erases a record. Projects cap at 1 star and always keep `best: null`. `totalStars(games, registeredIds)` ignores unknown ids, so a backup from a future version cannot inflate unlocks.

**Run result.** `gameResult({...})` → `{ kind: 'game', gameId, runId, mode, earnedStars, savedStars, sourceChecks, diagnostics, worlds, stage, error }`. Per world: `worldResult({...})` → `{ level, seed, world, events, end, passed, message }`. A result with a `stage` never reports `passed`. Custom-input mode sets `mode: 'custom'` and `earnedStars: null` — not `0` — so no UI can render a star claim for an experiment.

**`end`.** `emptyEnd()` shows the full shape. It carries remaining `ground` items, `acquired` order, `gates`, and per-character `delivered` and `stock`, so a goal checks swaps and exchanges from state instead of re-parsing output text.

**Events.** `EVENT_KINDS` is closed. Every event has `seq` (increasing) and `action` (originating action index). Automatic robot lines (`ROBOT_REPLIES`) appear as `reply` events in the transcript and are **never** student actions.

**Paths.** `src/pip/games/<id_with_underscores>/Student.java`, package `pip.games.<id_with_underscores>`. Under `src/` so the existing `java.project.sourcePaths = ['src']` keeps resolving.

## 3. Code evidence the workers need

Verified against the 0.6.0 checkout. These are the real obstacles behind the design spec's section 6 table.

### Host and runner (`engine` worktree)

- **Message transport.** One RPC channel (`{id, method, params}` → `{id, data}` | `{id, error}`, 90 s timeout, `extension.js:64`, `platform.js:7`) and five broadcast events (`progress`, `navigate`, `run.started`, `run.finished`, `document.changed`, `focus`). The error channel is a **bare string** with no code. Game requests join the same dispatcher at `extension.js:159–195`.
- **`lesson.run` results arrive twice** — once as the RPC reply, once as `run.finished`. Keep that for games; the UI applies both through one handler.
- **Setup failures are mislabelled.** No workspace / untrusted / no JDK / save failed are all broadcast as `result.stage === 'runtime'` (`extension.js:135`), indistinguishable from a student exception. Games must separate engine errors from student failures, so give setup failures their own stage.
- **One run at a time, process-wide** (`activeRun`, `extension.js:109`) plus a single shared `lastResult`. A six-world game run is one `activeRun` holding the lock for the whole sequence; per-world progress goes out as events, not as separate runs.
- **Process limits are per child**, not per run: 12 s timeout, 64 KiB combined output, `-Xmx64m` (`runner.js:7,86`). Six worlds are six children.
- **`replaceInputs` already recompiles** a temporary variant per mutated case (`runner.js:104–106`) and never touches the saved file. What is missing is variant caching within a run. `replaceInputs` **throws** rather than failing a check when a name does not resolve to exactly one initialised `main`/`class` variable (`assessment.js:5–11`), so `constants` must be verified for name *and* type before replacement.
- **`assessmentCases` is a hardcoded switch over 22 lesson ids** (`assessment.js:30–62`). Games must not extend it; they take their data from `world.input` on stdin.
- **`runLesson` rejects any kind outside `console`/`robot`** (`runner.js:69`). Games need their own path, not a third `kind` smuggled through the lesson path.
- **Diagnostics are scraped with a regex hardcoded to `Student.java:`** (`runner.js:58`). Games keep the filename `Student.java`, so this keeps working.
- **Five places hardcode the lesson path**: `lessonUri` (`extension.js:33`), `documentLesson` (`:36`), the `onDidChangeTextDocument` basename filter (`:226`), and the two `package.json` bindings (already widened in Step 0). Without the first three, a game file gets no `focus` event, no draft autosave, and no diagnostics clearing.
- **Nesting cannot be proved today.** `analysis.loops` is a flat `[{kind, scope}]` (`InspectSource.java:62–65`) and `checkStructure` only counts (`assessment.js:24`). `scope` is the enclosing *method name*, so a loop inside an `if` inside `main` still reads `"main"`. Nested-loop and helper-use requirements need a new `InspectSource` field (depth or parent index) before any dependent game is authored. `InspectSource.java` ships via `.vscodeignore`; any new root-level Java support file must be whitelisted there too.
- **`.vscodeignore` whitelist** currently names exactly `Robot.java`, `Runner.java`, `InspectSource.java`.
- **Activation is `onView:pip.launcher` only.** In a cold window the keybinding does nothing until the Pip sidebar opens. Game entry points outside the sidebar need an added activation event.

### Progress and curriculum (`structure` worktree, scaffolded not implemented)

- `normalizeProgress` is a **whitelist rebuild** with `version: 5` as a literal (`shared/progress.js:11–21`), so any unlisted map is dropped on every save. A `games` map needs edits in **four** places: `normalizeProgress`, the 7-key merge list in `extension/state.js:14`, the 6-key list in `mergeProgress` (`progress.js:28`), and — only if the webview ever writes it — the allowlist at `extension.js:163`. Earned stars are host-owned, so they stay **out** of that allowlist.
- `mergeProgress`'s "incoming wins" shallow merge is wrong for stars; per-game merging goes through `mergeGameRecord`.
- Completion is `assessments[id] === assessmentVersion`, an **equality** — a version bump silently un-completes a lesson. Keeping existing ids and versions untouched is load-bearing.
- `src/context.js` predicates import `lessons` from `curriculum.js`, which is why `shared/completion.js` injects members instead.
- `orderedLessons` deliberately excludes multipart children (35 entries vs 39 lessons). The tagged activity list must not double-count parts.
- **Hardcoded counts break first**: `runner.test.js:16–19` asserts 35 ordered lessons / 6 modules / 39 lessons; `extension/test/suite.js` asserts 6 module cards, 3 projects, 2 assignments.
- Module `finish` disappears; its five members move to `methods`, `decisions`, and `arrays`. `/module/finish` redirects to `/`.

### Concepts (`git-content` worktree)

- **Concept lessons can never complete today.** `completed` and `assessments` are written only inside a successful `run()` (`extension.js:129`), and the webview's patch allowlist excludes both. A persisted `concepts` map plus a host-validated quiz submission is the only path.
- **`lesson.open` has no kind guard** — `ensureLesson` will `mkdir` and write `Student.java` for any id in `lessons` and mutate `java.project.sourcePaths`, leaving a stray Java file. Guards are needed in four places: `routes.js`, the `main.jsx` route elements, `workspace.jsx:16–19`, and host `ensureLesson`/`openLesson`.
- The existing prediction format is a 3-tuple `[questionMarkdown, [choices], correctIndex]`, surfaced as step index 2 by `stepsFor` and persisted as `progress.answers["<id>:2"] = chosenIndex`. Answer values are validated as integers `0..9` and id keys as `/^[a-z][a-z0-9-]{0,80}$/`.
- `quizPassed` exists in `src/context.js:7` but has **no callers** — it is free to redefine.

## 4. Handoff expectations

Every worker hands back: branch and base commit, changed files, the exact commands run and their output, sample ids/seeds to reproduce a failure, outstanding issues, and any change wanted outside its ownership. Mocks and skipped JDK tests do not count as a pass.

Fixture mode is development and test only. Before Phase 1 acceptance, fixture transport is replaced with the real host and both sample games run end to end from the native editor.

## 5. Coordinator decisions made during Phase 1

These resolve ambiguities the engine worker hit. They are now part of the frozen contract.

- **`setup` is its own run stage.** No workspace, untrusted workspace, missing JDK and failed save report `stage: 'setup'`, not `'runtime'`. `ENGINE_STAGES` names the two stages that are never the student's fault. This closes the mislabelling recorded in section 3.
- **`run.progress` is a frozen broadcast**, payload `{ gameId, runId, world }` with one `worldResult`. A graded run simulates up to six worlds, each Java child gets its own 12 s budget, so the run as a whole far outlasts any single process limit and the student needs per-world feedback while it runs.
- **Activation adds `workspaceContains:src/pip/**`.** Without it, `ctrl/cmd+enter` on a game file does nothing in a cold window until the Pip sidebar is opened.
- **A jump into a wall ends the run**, exactly like a move bump. The design spec spells the run-end rule out for `move` and says only that a jump "still causes a bump"; treating a jump bump as survivable would let a student probe walls for free.
- **No `pip.openGame` command.** `game.open` over the existing RPC already opens games; nothing needs a command-palette entry yet.
- **World variety is the generator's responsibility, not the RNG's.** `mulberry32` on adjacent small seeds is well behaved — seeds 1..3 give 0.627, 0.734, 0.720. What produces repeated worlds is a generator mapping a good draw onto a narrow range: a `3..6` parameter yields only four possible worlds, so a 3-seed graded run frequently repeats one. Authors widen the parameter space; `games.test.js` carries a spread guard so a too-narrow range fails at test time. Anti-memorisation does **not** rest on world variety — per the design spec it "cannot prove concept use". The real defences are `requirements` and authored `rejects`.

## 6. Open product decisions

Design spec section 6 items 1–3 (existing arena access, Git in course completion, the skin catalogue) are **unconfirmed**. Work proceeds against the documented proposed defaults; the settings and completion UI that depends on them is not final until the user confirms.
