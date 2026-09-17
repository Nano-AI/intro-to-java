# Pip — Java Robot Workshop for VS Code

Pip 0.6.0 teaches beginner Java through **35 top-level learning units and 39 executable coding parts: 30 console programs and nine robot programs**, across six modules. Lesson and Quiz are separate pages; Practice, Project, or Assignment opens **VS Code's real Java editor on the left and Pip's task/results panel on the right**.

See `docs/RELEASING.md` for verification history.

The course is scoped to [UW CSE 121, Spring 2026](https://courses.cs.washington.edu/courses/cse121/26sp/). It is an original tutoring adaptation covering those topics, not a reproduction of UW assignments or an official UW course.

## Install

1. Use VS Code 1.96 or newer.
2. Install **Language Support for Java by Red Hat** (`redhat.java`). Pip declares it as an extension dependency. It provides Java completion, formatting, and live editor diagnostics.
3. Have a JDK available: both `java` and `javac`. Java 21 is recommended for a new setup; Pip's exercises and runner also work with Java 8 or newer. The Java language-server extension has its own runtime requirements.
4. Open **Extensions → … → Install from VSIX** and choose `pip-workshop-0.6.0.vsix`.
5. Open a dedicated learning folder, then run **Pip: Open Course** from the Command Palette.

With the VS Code CLI available, installation can also be done with:

```sh
code --install-extension redhat.java
code --install-extension pip-workshop-0.6.0.vsix
```

Pip is currently distributed as a local VSIX. It has not been published to the Marketplace. No separate Node installation, web server, Rust toolchain, or desktop app is needed by the student.

## First session

1. Open the Pip activity-bar icon and choose **Open course**.
2. Select a module, then a lesson. Start with **Bring the console online** if Java is new.
3. Open **Lesson** at `/learn/:lessonId`: two slides, goal and concept plus interactive model. Explore the model, then choose **Take quiz** for the standalone prediction at `/quiz/:lessonId`.
4. Choose **Start practice**, **Start project**, or **Start assignment** from Lesson or Quiz at any time. Exploring the activity or answering the quiz is optional. Resuming existing code opens coding without forced review or quiz navigation. The coding page contains the task, native `Student.java` file, output/simulator, run checks, and optional review notes. Use Java suggestions and **Format Document**. **Review the lesson** navigates back to the Lesson page. **Show a hint** reveals the unit's authored hint; a second step shows the concept and worked example. Hints never affect completion.
5. Click **Save & run**, use **Pip: Save and Run Current Lesson** (stable command ID `pip.runLesson`), the editor play button, or **Command/Ctrl + Enter** while editing a Pip `Student.java` or focused inside the Pip panel. The run button shows the shortcut. This saves the real Java file before compilation.
6. Compare actual output graphics or the 3D replay with the prediction. For a broken program, reproduce the failure, make a small repair, and rerun all cases. On a failed console check, the results panel names the first differing line (missing line, extra line, spacing-only, capitalization-only, or different text) and highlights the differing output lines. Common `javac` errors and runtime exceptions get a plain-language note with the line number above the raw compiler/JVM text. When the original data passes but changed data fails, the feedback says to calculate from the variables instead of printing a fixed answer. On console exercises that read input, **Try own input** runs the saved `Student.java` with typed input and shows its output; it never affects checks or completion.
7. Passing current code checks completes the unit; every part in a group must pass its own assessment version. Most versions are 2; `debug-semicolon` and `autonomous-docking` are version 3. Review notes are optional, collapsed by default, and autosave at any length, with no minimum-text requirement. Completed titles use strikethrough in module lists, catalogs, progress, completed modules, and completed part buttons, with visible **Completed** status. A teacher can optionally check reasoning and a changed case to assess understanding beyond the automated checks.

Ordinary practice uses `/practice/:lessonId`. **Projects** at `/projects` lists `robot-detour`, `robot-cargo`, and `robot-hoop`, opening `/project/:lessonId`. **Assignments** at `/assignments` lists `autonomous-docking` and `java-final-report`, opening `/assignment/:lessonId`. Legacy `/lesson/:lessonId` links redirect to the appropriate coding route. These catalogs organize existing units; they do not add to the count.

**Repair a broken declaration** (`debug-semicolon`) is one learning unit with five coding parts: missing semicolon, unknown type, redeclaration, new variable, and copied value. Each has its own `Student.java` file. All five must pass to complete the group; the parent's interactive Lesson, Quiz, and review notes are optional. See `docs/ROADMAP.md` for the part IDs and repair criteria.

For example, build the type, name, and value in the first declaration activity, then type this inside the supplied `main` method:

```java
int bolts = 4;
System.out.println(bolts);
```

The model illustrates a concept; it does not execute the student's Java. **Save & run** tests the saved real file. For initializer-based cases, the baseline runs the original source without replacing its initializers; later cases change data in temporary copies. Changing the required `0.5` to `0` fails the baseline, while printing a fixed answer fails changed-data cases. In `debug-new-variable`, AST checks also require `parts` and `used` to remain unchanged in `main`.

Pip saves the current Java buffer before running. If a run hangs, use **Pip: Stop Run** or the panel's Stop button. Each process also has a time limit.

## Files and progress

Lesson files are created under the first workspace folder:

```text
src/pip/lessons/hello_java/Student.java
src/pip/lessons/first_movement/Student.java
src/pip/lessons/first_movement/Robot.java
```

Each lesson uses a unique Java package so its `Student` class does not clash with other lessons. Keep the generated package line. `Robot.java` is support code for Java tooling; edit `Student.java` for the exercises. The runner uses the extension's bundled support implementation when executing a lab.

In a new learning workspace, Pip sets the workspace-local `java.project.sourcePaths` to `["src"]` so the Java language server resolves those packages correctly. It does not change global Java settings. If a workspace already specifies a different source root, use a dedicated learning folder or explicitly include `src` in that project's configuration.

Reopening a lesson never overwrites an existing Java file. **Restore starter** is an explicit, undoable editor operation. VS Code's usual Git features can track these files, show diffs, and create commits.

Steps, predictions, explanations, activity exploration, and assessment versions are stored in a per-workspace extension storage file. Settings shows the exact path. Reinstalling with the same extension identity preserves them. Saved reviews, quiz answers, and activities remain available for voluntary use; 0.6.0 needs no data migration. Revised code assessments require a passing run at the current assessment version before counting as complete again.

Use **Pip: Export Progress Backup** and **Pip: Import Progress Backup** when changing machines or migrating from the browser/Tauri experiments. Older numeric lesson IDs are migrated. Imported drafts seed missing lesson files; existing Java files always take precedence. Back up the Java workspace itself with Git or a filesystem copy too.

## Java setup

Run **Pip: Settings and Java Setup** to check the detected JDK. `pip.javaHome` points to a JDK home, not its `bin` directory. On macOS an example is `/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home`.

Pip looks for the first usable JDK in its configuration, VS Code Java runtime settings, `JAVA_HOME`, macOS `java_home`, and then `PATH`. A Java runtime without `javac` is insufficient. The first Java-language-server startup may take a moment to index the workspace.

Pip does not replace VS Code's editor, formatter, or Java language server. Run-time compiler errors also appear in the native Problems panel as **Pip javac** diagnostics.

## Robot labs

- Drag to orbit; scroll to zoom. Camera buttons provide rotation, top view, and reset.
- Workshop, Garden lab, and Moon station change scenery, not the grading rules.
- Choose 1, 20, or 60 decisions per simulated second. Motor commands persist between decisions; motion advances at 60 steps per second independently.
- Runs produce deterministic traces for replay. Pause and Step inspect the trace; they are not a live Java debugger.
- Crashes scatter debris with newly sampled directions, speeds, spin, and sizes, plus gravity, bounce, friction, a short flash, and smoke. The debris is not a spiral; these visual variations do not change grading.
- A newly successful run celebrates with confetti. Replaying the same trace does not award extra progress or repeat the celebration.
- Settings can disable effects. Reduced-motion preferences suppress the moving effects while keeping static success feedback.

The simulation uses flat-ground differential drive with ideal sensors and no wheel slip. Its projects are original simplified challenges, not an official game clone or an FTC/WPILib-compatible API. The tests check behavior; optional teacher review can assess reasoning, structure, and transfer to unfamiliar problems.

The `autonomous-docking` assignment directly tests `Student.dock` with targets of 30, 24, and 36 cm for the default, nearer, and farther/weaker trials. Each trial must collect, avoid collision, and finish stopped within 4 cm inclusive of its requested target. Optionally compare those three results in review notes. Editing the call in `update` does not change the graded targets: only mission 5 invokes `dock` reflectively; other robot labs call `Student.update`.

The 0.5.0 finish module adds these challenges after docking and the console report:

| Lesson ID | Goal | API additions used in the challenge sequence |
|---|---|---|
| `robot-detour` | Drive around a rectangular obstacle to the target; stop without collision. | `x()`, `y()` for position feedback |
| `robot-cargo` | Collect cargo, avoid the obstacle, and deliver it. | `deliver()`, `wasDelivered()` |
| `robot-hoop` | Collect one ball, align with the hoop, choose power, shoot, and stop. | `hasBall()`, `shoot(power)`, `scored()` |

All three challenges run for 40 simulated seconds in three start/motor trials and require no collision and a final stop. Detour must finish less than 22 cm from (100, 100); cargo pickup/delivery are at (-100, 80)/(100, 80), with interaction distance strictly less than 22 cm. Hoop pickup is at (0, -70); a shot scores within 18 cm inclusive of (100, 120). Shot power is from zero to one and range is 300 × power cm. The 1.5-second arc is illustrative, not real ballistics. See `docs/ROADMAP.md` for exact geometry and interaction rules.

Existing generated `Robot.java` files are preserved. The new APIs are needed only by the new challenge IDs, whose newly created lesson files receive fresh support; there is no automatic support-file overwrite.

## Build, test, and package

Developers need Node.js supported by Vite (use Node 22.12+ or a current LTS), npm, VS Code, the Java extension, and a JDK.

```sh
npm ci
npm run build
npm test
npm run test:extension
npm run package
```

`npm run package` builds `pip-workshop-0.6.0.vsix`. The package includes the bundled host, webview assets (including the bundled `web/explosion.js` module), Java support including `InspectSource.java`, and documentation. It excludes development dependencies, old build artifacts, student data, and demo/test profiles.

For F5 debugging, open this `workshop` folder in VS Code and use **Run Pip extension**. `npm run dev:web` is a visual-preview server only; it does not provide an editor or a Java backend.

`npm test` uses `workshop/runtime/jdk` when it exists, so tests run without setting `JAVA_HOME`.

See `docs/RELEASING.md` for the live demo command and per-release verification records.

`npm run test:extension` uses an isolated VS Code profile and Playwright. On macOS it locates `/Applications/Visual Studio Code.app`; other installations can set `VSCODE_EXECUTABLE_PATH`. It reuses an installed `redhat.java` directory read-only. Screenshots are saved under `screenshots/vscode-*.png`. Student-machine responsiveness and teacher assessment remain ongoing follow-up rather than open software verification blockers.

Grading combines selected JDK AST structure checks, baseline and boundary cases, seeded fresh data, and direct calls to exercise methods. These checks improve feedback and catch common fixed-answer shortcuts. Bundled local checks are inspectable and are not cheat-proof; optional teacher review can assess reasoning and transfer.

## Local execution boundary

Run trusted teaching code in a trusted learning workspace. Java executes with the local user's permissions; process limits are not an untrusted-code sandbox. Pip does not open an HTTP server. Course material remains readable in an untrusted workspace, but creating/running Java is blocked.

## More documentation

- `docs/ARCHITECTURE.md`: editor/host boundary, files, persistence, and recovery.
- `docs/CURRICULUM.md`: CSE 121 topic coverage and teacher review.
- `docs/ROADMAP.md`: all 35 units and the five-part group, Lesson/Quiz/coding routes, tests, and optional teacher guidance.
- `docs/RELEASING.md`: VSIX releases and future module updates.
- `CHANGELOG.md`: migration history.
