# Pip UI rules — user feedback

Recorded 2026-10-11. These are user requirements for future UI work, not a claim that the current app meets them. See [the native audit](UI-AUDIT-2026-10-11.md) for observed defects.

**Authorized: implement and review in the Tauri dev app.** Approved direction: light neutral surfaces with blue accents; one short project task beside the editor, with Back/Next. Do not package or reinstall until the user finishes development QA.

## The app is for doing work

- Design for a child who needs to recognize the next action without decoding the interface. Visual clarity is essential to the lesson working.
- Every visible element must help the current task. Do not add content merely to fill space.
- Call the app **Pip**. Remove the “Java Foundations” branding subtitle.
- Remove promotional headlines and slogans from the app, including “Learn Java. Build something that moves.” Marketing belongs on the external landing page.
- Remove unnecessary introductory copy such as “Your learning path,” “Explore and answer…,” and repeated explanations of how the app works when the controls already communicate it.
- Remove the course-coverage/tutoring disclaimer from the learning screen. Keep any needed attribution in documentation, outside the task flow.
- Remove redundant project-count badges, decorative heading numbers, and generic explanatory text. A list does not need to repeat how many projects it contains.
- Keep the useful **Continue** action. The user liked this improvement.

## Navigation and states

- Fresh launch opens Course. Keep application navigation available inside lessons, quizzes and practice. Project routes use their own Back to Projects toolbar to leave more room for the world and editor.
- Course should show the module path. Put associated projects inside the relevant module/lesson path as checkpoints or sub-items; do not expand a competing projects-and-games catalog on the home page.
- Replace the disconnected “Put this module to work / Projects & games” treatment with a clear relationship to the learning sequence.
- Completed work should recede so unfinished work is easy to find. Keep it available for review. Do not make review text unreadable by fading it excessively.
- A checkmark is enough visible completion status. Do not add “Completed” beside the same checkmark. Preserve an accessible name for assistive technology.
- Remove generic paragraphs such as “Locked projects list the lessons to finish first” and “Saved work stays intact” from the ordinary browsing flow.
- A locked item should explain its **specific missing lessons** when hovered, keyboard-focused, or clicked. Make that explanation available at the attempted action, rather than requiring a search elsewhere on the page.
- Keep **Required topics**. The user explicitly withdrew the complaint about that disclosure.

## Controls, icons, and color

- Explore, Quiz, and Practice need readable labels, generous padding, and consistent alignment. Tiny bare links are not adequate primary lesson controls.
- Use the same reusable component treatment for available, current, completed, and locked steps. Avoid different button geometry or unexpected line breaks when steps are locked.
- Fix the Module 1 lesson 3 spacing and the joined Projects/Prerequisites header. Reuse a coherent header layout throughout.
- Rework the color scheme and inspect actual light/dark screens. Do not treat passing palette-variable checks as proof that the interface is readable or visually coherent.
- Give projects such as Supply Relay meaningful icons from a consistent set. Reuse suitable existing assets/components or an appropriate icon library; avoid arbitrary decorative icons.
- Tags are **plain labels**. Do not apply Java syntax or inline-code boxes inside tags such as “String concatenation” or “Nested for loops.” Keep syntax highlighting for actual code examples.
- Use the existing component library and shared application components consistently. Do not introduce another competing design system.

## Project screens

- Give each project one clear title, such as **Supply Relay**, followed by a short guided sequence with the idea, practice, and code clearly organized.
- Show one useful next action. Reduce competing buttons and sections; the Mission / Build steps / Code refresher header is too cluttered and inconsistent.
- Keep refresher work separate from the mission instead of inserting another competing task within it.
- Make **Commands** immediately discoverable. Open the command documentation separately when requested; do not bury it inside long content or an obscure tab.
- Apply this to short games too, especially **Hoop Streak**. Its commands must be easy to find and well formatted.
- Replace story paragraphs such as “A repair team…” with brief, concrete actions. Use actual variable names where they make a rule easier to understand.
- Keep essential success conditions clear and concise. Avoid walls of requirements and test-value prose; present necessary values and examples compactly without making the learner guess a rule.
- Clearly organize the problem statement, trial run, and world/results. Worlds must not feel hidden.
- Fix overflowing text in Hoop Streak and verify long titles, descriptions, tags, and controls at smaller window sizes.

## Diagrams, boards, and legends

- Choose a visual representation deliberately: what should a child understand or do after looking at it?
- Make current state, direction, targets, and outcomes obvious. Do not rely on a cramped key to explain an otherwise unclear board.
- Give legends room and place labels close to what they explain. Avoid squeezing every key item together.
- Diagram labels and decorative board text should not become selected during ordinary interaction. Preserve selection/copying for Java code and documentation.
- Review the rendered visual itself, including text size, spacing, contrast, and meaning. Do not stop after generating a diagram or checking its data.

## Quality review and delivery

- Use the **fuck-slop** skill in the authorized cleanup, alongside these concrete requirements. The user explicitly requested it.
- Visually inspect screenshots of the actual lesson and project flows, not just Course, Projects, Progress, and Settings.
- Cover available, locked, partial, completed, loading, error, and quiz-result states in both appearances and at the desktop minimum size.
- Check the full path from module to Explore, Quiz, Practice, and project; verify persistent navigation, clear next actions, padded controls, readable diagrams, and discoverable commands.
- Native Tauri/WKWebView must be checked. Chromium bridge tests alone missed the reported native experience. The blank native editor observed during the audit remains an unresolved finding until reproduced and diagnosed.
- Keep test evidence and visual evidence distinct. Do not claim a complete visual review after checking only selected screens or palette values.
- Iterate in the **Tauri dev app** with live reload. The user does not want an installer for each feedback round.
- After the development review, build/install for the user's final pass. Package and distribute the final version only after that pass and authorization; do not treat this feedback record as release approval.
- Preserve existing student Java files and progress throughout. UI cleanup must not alter prerequisite rules, saved IDs, or learning records.


## Current pass — authorized implementation (2026-10-11)

The user explicitly requested these changes and a relaunch. Implement and verify them in the dev app before calling this pass ready. Recording feedback is not implementation.

- Simplification removed useful visual structure. Restore meaningful progress bars/metrics and topic context on course/module entries. Avoid decorative counts or promotional text, but do show how much learning is finished and what a module contains.
- Make lessons, repair exercises, short games and homework projects visually distinguishable. Use clear grouping and useful labels/icons; the current flat sequence is too ambiguous. Keep project catalog groups recognizable too.
- Remove the narrow colored stripe on the left of module project cards. The user dislikes it as a substitute for actual organization.
- **Confirmed:** move the code refresher to a separate phase before the project opens. It should not consume the problem/world panel during project work.
- The world must remain visible during project work. The current step/checklist region takes too much space.
- Place Commands and a separate Checklist control in the same horizontal toolbar as Back to Projects. Checklist details open on demand rather than occupy the work area permanently.
- Hide global app navigation during projects to recover space, with Back to Projects retained. This is the approved exception to the earlier persistent-navigation requirement.
- Add **Insert solution** only in isolated demo mode. It may replace demo code for quick QA; never expose that action in student mode or write to the student's real files.
- Keep the chosen neutral light/blue direction, but improve visual identity and meaningful accents. The current result feels too bland. More visuals should clarify purpose/progress, not add copy.
- Explicitly use **frontend-design** (Anthropic), **minimalist-ui**, and **fuck-slop** in the next design pass. Skill sources: `~/.codex/plugins/cache/claude-plugins-official/frontend-design/local/skills/frontend-design/SKILL.md`, `~/.agents/skills/minimalist-ui/SKILL.md`, `~/.agents/skills/fuck-slop/SKILL.md`.

## Follow-up after live review

- Replace the **Review lessons** disclosure with **To do / Review** tabs. Keep familiar lesson cards and controls in both lists.
- **Trial run** and **Run / Check project** must have the same height and comfortable padding.
- Use a simple 3D board with a recognizable Pip robot, readable objects and visible movement during replay. Keep Map available for exact coordinates.
- Check individual coding steps automatically when run evidence meets their goals. Planning and explanation steps remain manual. Keep old checkmarks and student code intact.
- A successful sample is not sufficient proof of general calculations or helper behavior. Use the existing varied inputs and independent method checks for those steps.

- Give the Projects module sidebar a distinct surface and boundary. Group finished projects at the bottom, muted but readable and still interactive. Do not use reduced opacity that makes text unreadable.

## Independent challenges

- Include beginner challenges in all five programming modules: basics, loops, methods, decisions and arrays. They test understanding without guided assistance.
- Make Challenge visually unmistakable: a flag, amber surface/border, explicit activity label and realistic time estimate. Keep the problem concise and leave room for code.
- No hints, walkthroughs, solution insertion or autocomplete, including in demo mode. **Autocomplete completely off** is the user's explicit choice. Retain Java syntax highlighting and compiler errors.
- Run executes the current program without awarding completion. Submit checks varied cases and records a pass. Do not present old results as the result of newly edited code.
- Require the relevant coding prerequisites without changing existing course totals, IDs, Java files or progress. Optional challenges live inside their modules.
- Keep the standalone problem and reviewer documents current. Document the limits of automatic grading; output tests and syntax checks cannot prove understanding.

## Feedback across coding activities

- Practice, projects and games should let the student diagnose the result. Show actual output, expected output, test status and raw compiler/runtime errors without automatically explaining whitespace, capitalization, the exact mismatch or the fix.
- Keep ordinary hints optional and manual. Do not expand a practice hint into a worked example. Challenges have no hints.
- Game results report success/failure and measured outcomes. Do not append programming advice to failure messages or suggest command corrections in the speech transcript.
- Preserve task requirements, lesson teaching material, command documentation and the existing instructor-only solution insertion in isolated demo mode. These controls are separate from automatic run feedback.

## Latest challenge and code review

- Use a LeetCode-like challenge workbench: description on the left, code on the right, test input/results beside the coding work. Run/Submit share the compact top toolbar. Remove the “Solve independently” time banner and avoid spending another row on run controls.
- Inline variables and expressions must look like code: a distinct background, border and monospace text, with real syntax coloring. Code examples and loop-comparison diagrams also need syntax highlighting in both appearances. Plain tags remain plain text.
- Strengthen all ten challenges with related parts or combined requirements. Avoid a single trivial division as a complete challenge. Every required concept must already have been taught; update standalone problem/review documents with the strengthened cases.
- Ordinary interface text should not be selectable. Preserve selection for code, program output and editable inputs.
- Module pages such as Loops need a persistent section sidebar for Lessons, Projects and Challenges. Omit sections that do not exist. Use meaningful color accents: blue lessons, green projects and amber challenges, with matching icons and headings. Keep the neutral surface and avoid adding explanatory copy.

## World, inputs and judging

- Tiles must contrast with the world background. Coordinate labels obey depth so objects hide them. Mark the exact Home/Finish tile; mark valid delivery tiles with a different color and an indicator pointing toward the depot.
- Show replay score on an LCD-style board behind the world. Keep it readable during rotation and Top view; avoid a second visible copy of the same score.
- Supply Relay is one pickup followed by delivery, with no return journey. Challenge comes from using the changing inputs and calculating energy, not repeating the same commands.
- Protect each supplied input declaration's entire physical line in the editor, including whitespace, line joins, paste, cut, formatting and undo. The host must validate inputs independently. Never rewrite an existing student's source to introduce the new declarations.
- Both projects and independent challenges use Run for three public cases, with visible input and output. Submit judges at least twenty cases and opens Submission on the left. Public runs do not award completion.
- Student prompts state the goal, supplied values, required output and relevant boundary cases in plain language. Required information cannot live only on an earlier screen. Keep code names highlighted and avoid giving the solution algorithm in independent challenges.

## Icon and motion feedback

- Use the shared SVG Icon set for controls and status. Do not substitute Unicode arrows, ticks, crosses or emoji for icons. Pair color with shape and accessible labels; soft backgrounds can group controls without adding decoration everywhere.
- Keep the 3D board anchored. Ambient animation must not move the board or camera. Only explicit camera controls and game actions should change their positions.
- Tab keyboard focus uses one visible ring; it must not clip into adjacent tabs. Interface labels stay unselectable while code, output and editable fields stay selectable.
- Correct submissions pass with compiler warnings. Perfect requires all correctness checks to pass and a completed compiler lint run with zero warnings. Editing invalidates displayed results; never present a previous source snapshot as the current verdict.

## Worked examples and replay follow-up

- Development Demo mode (unlocking and solution insertion) is available only in development builds. Packaged apps must reject it at the host boundary as well as hide its controls.
- Play demo is a student-facing replay of **one** worked example. Show its input and expected output; leave the student's Java, results and progress unchanged.
- Run/Submit judge headlessly. Playback never delays tests. Keep valid alternative robot programs acceptable instead of comparing command text to one reference route.
- Description, World, Submission, Testcase and Test Result use the shared SVG icons. Dropdown selection gets one checkmark, not both a selected check and a pass check.
- Speech belongs in a visible transcript below the world, synchronized to playback. Remove the redundant World passed line.
- Place hurdles across the travel direction at the entering tile edge. Each jump starts at the current tile center and ends at the next tile center; preserve existing one-tile command behavior.

## Review without interrupting the user

Use headless Playwright with isolated workspaces for screenshots and UI checks, including production assets in Chromium and WebKit. Do not launch or manipulate the desktop app during the user’s work unless explicitly requested. Native capture may omit Monaco text even when it is visible on screen; do not treat that capture alone as a rendering failure.
