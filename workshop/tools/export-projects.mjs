import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { games } from '../src/games/index.js';
import { projectSteps } from '../src/project-steps.js';
import { lessons } from '../src/curriculum.js';
import { gameCommands } from '../shared/game-commands.js';

const code = text => `\n\n\`\`\`java\n${text.trim()}\n\`\`\`\n\n`;
const projects = games.filter(game => game.project);
const lessonName = id => lessons.find(lesson => lesson.id === id)?.title || id;
function map(world) {
  const rows = [`    ${Array.from({ length: world.width }, (_, x) => String(x).padStart(2)).join(' ')}`];
  for (let y = 0; y < world.height; y++) {
    const tiles = Array.from({ length: world.width }, (_, x) => {
      if (world.robot.x === x && world.robot.y === y) return { N: '^', E: '>', S: 'v', W: '<' }[world.robot.dir];
      if (world.walls?.some(tile => tile[0] === x && tile[1] === y)) return 'X';
      if (world.hurdles?.some(tile => tile[0] === x && tile[1] === y)) return 'H';
      if (world.characters?.some(item => item.x === x && item.y === y)) return 'D';
      if (world.items?.some(item => item.x === x && item.y === y)) return '*';
      const target = world.targets?.find(item => item.x === x && item.y === y);
      if (target) return target.color === 'yellow' ? 'Y' : '#';
      if (world.finish?.x === x && world.finish?.y === y) return 'F';
      return '.';
    });
    rows.push(`${String(y).padStart(2)}  ${tiles.map(tile => tile.padStart(2)).join(' ')}`);
  }
  return `\n\`\`\`text\n${rows.join('\n')}\n\`\`\`\n\nArrow = Pip; * = supply; D = depot; # = blue target; Y = yellow target; X = wall; H = hurdle; F = finish. Coordinates start at zero. The arrow may cover a home/target tile.\n`;
}
assert.ok(['basics', 'loops', 'methods', 'decisions', 'arrays'].every(unit => projects.some(project => project.unit === unit)));
assert.ok(projects.every(project => project.refresher.length === 3 && project.milestones.length === 5 && project.solution && project.sources.length));
let handout = '# Java robotics homework projects\n\nPip Workshop 0.9.0 · Tauri desktop app\n\nSupply Relay takes about 30–60 minutes. Plan for two or three sessions of 45–60 minutes for each later project. These are planning estimates. Begin with the code refresher, build one milestone at a time, and save between sessions.\n\nOpen **Projects** in the app. Each project lists its required lessons. Complete their coding checks to unlock it. Runs check off steps they can verify. Mark planning steps yourself. The checklist does not replace the final code checks.\n\n**Run** checks three visible examples and shows their inputs and output without awarding completion. **Submit** checks 20 worlds and the required Java constructs for each homework project. Short games check 20 worlds per tier, up to 40. Test values change in temporary copies; the saved Java file stays intact. Modules 1–3 need no input reading, sensors, arrays, conditions, or while loops. Module 4 adds supplied Scanner input, conditions, and a while loop; Module 5 adds a 2D array and array parameters. Input is supplied automatically, never typed interactively during a run. Custom input changes the data only, not the pictured board.\n\n';
let review = '# Project review packet\n\nPip Workshop 0.9.0 · Generated from the app’s project definitions.\n\nThis packet is for instructor/agent review and includes solutions. The complete student-facing problem statements, starter programs, maps and quizzes are included at the end of this packet and also available separately in [PROJECTS.md](PROJECTS.md). This file can be reviewed on its own.\n\n## Review scope\n\nCheck pedagogical clarity, prerequisites, solvability, ambiguous route instructions, quiz answers, difficulty and grading shortcuts. Timing has not been calibrated with a student. These are original adaptations, not reproductions or endorsements of the source assignments.\n\nThe progression is module 1 statements/variables, module 2 counted repetition, module 3 decomposition/parameters/returns, module 4 input-driven decisions, then module 5 array traversal and composition. Module 3 begins with a simple turn method, then one tower, then loops and composition. Do not require later topics to solve a project.\n\nThe same Tauri desktop app, Java package paths and ~/.pip-java storage are retained. Prerequisite locks apply even to previously completed projects, by explicit request. Completed records and old source files are preserved; code is never replaced merely by installing an update.\n\n## Acceptance and known limits\n\n- Every world must pass; collision, timeout, compiler failure and action limits prevent completion.\n- Generated data is checked in temporary source copies. Star counts do not decline after a failed attempt.\n- Source checks enforce declared variables, loop structure and method signatures. They are learning feedback, not an anti-cheating proof. Independent method probes test actual helper behavior.\n- Supply Relay is a short one-supply delivery. It varies gap, starting energy, and cost per tile. The first two graded worlds use the smallest and largest supported inputs; later worlds use generated values. A fixed movement distance, fixed travel count, or fixed energy report fails these checks.\n- Supply Relay declares lockedInputs as gap: 2, energy: 50, costPerTile: 2. Each must be declared once as the supplied final int local in main, with its exact sample numeric literal. The host rejects altered or missing input declarations during trials and grading; Java also rejects reassignment. The editor protects supplied lines. Test values replace only initializers in temporary copies.\n- Saved Supply Relay files from the three-supply version are retained byte-for-byte. Older non-final input declarations receive a validation error directing the user to the explicit Restore starter action. No update or validation silently changes a file. The same project ID, Java package, completion records, quiz keys, and five milestone indices remain readable.\n- Staircase Arena checks the exact coordinate/color set, not only the number painted.\n- Both the 3D board and Map show collection, delivery and paint from the same replay state. Map keeps exact grid coordinates available.\n- Runs automatically check off individual steps supported by simulator outcomes, source checks and independent method probes. Run and custom trials can check off visible actions such as collecting or delivering a supply. They never award project completion or stars. Helper methods and changed-data calculations require Submit. Planning, explanations and deliberately breaking/restoring code remain manual. Old checkmarks stay editable and are preserved, so a checkmark alone is not proof of a passing solution. Successful Java checks complete the project.\n\n';
for (const [index, project] of projects.entries()) {
  handout += `## ${index + 1}. ${project.title}\n\n**Module:** ${project.unit} · **Estimated work:** ${project.estimatedMinutes[0]}–${project.estimatedMinutes[1]} minutes · ${project.duration.split(' · ')[0]}\n\n**Required lessons:** ${project.prerequisites.map(lessonName).join('; ')}.\n\n**Topics:** ${project.topics.join('; ')}.\n\n${project.summary}\n\n### Mission\n\n${project.task}\n\n${project.brief}\n\n### Sample map\n${map(project.sampleWorld)}`;
  if (project.sampleWorld.input) handout += '\n### Sample input\n\n' + project.inputHelp + '\n\n```text\n' + project.sampleWorld.input.trim() + '\n```\n\n';
  handout += '\n### Commands\n\nEach command below is a real Java statement. In the editor, type `pip` to see game snippets or press Ctrl+Space. These snippet labels are shortcuts, not Java methods.\n';
  for (const command of gameCommands(project)) handout += code(command.code) + command.description + '\n';
  if (project.methods) {
    handout += '\n### Methods to build\n';
    for (const method of project.methods) handout += code(method.signature) + method.description + '\n';
  }
  handout += '\n### Code refresher\n\nPredict each answer before writing the project.\n';
  for (const [i, question] of project.refresher.entries()) handout += `\n**${i + 1}. ${question.title}**${code(question.code)}${question.choices.map((choice, j) => `- **${String.fromCharCode(65 + j)}.** ${choice}`).join('\n')}\n`;
  handout += '\n### Steps in the app\n';
  for (const [i, step] of projectSteps(project).entries()) handout += `\n**${i + 1}. ${step.title}**\n\n${step.text}\n${step.code ? code(step.code) : ''}\n**Check:** ${step.check}\n`;
  handout += '\n### Starter program\n' + code(project.starter) + '\n### Hint\n\n' + project.hint + '\n\n### Sources and adaptation\n\n';
  for (const source of project.sources) handout += `[${source.title}](${source.url}). ${source.adaptation}\n\n`;
  review += `## ${project.title}\n\n**ID:** \`${project.id}\` · **Prerequisite IDs:** ${project.prerequisites.map(id => `\`${id}\``).join(', ')}\n\n### Quiz answer key\n\n`;
  for (const [i, question] of project.refresher.entries()) review += `${i + 1}. **${String.fromCharCode(65 + question.answer)} — ${question.choices[question.answer]}**. ${question.response}\n\n`;
  review += '\n### Source requirements\n\n```json\n' + JSON.stringify(project.requirements, null, 2) + '\n```\n';
  if (project.lockedInputs) review += '\n### Locked supplied inputs\n\n```json\n' + JSON.stringify(project.lockedInputs, null, 2) + '\n```\n\nThese sample values and their final int declarations are checked independently of the editor before any program executes. Existing files are preserved; Restore starter requires an explicit choice.\n';
  review += '\n### Reference solution\n' + code(project.solution) + '\n### Exact world acceptance predicate\n\n```javascript\n' + project.goal.toString() + '\n```\n\nThe shared engine additionally rejects collisions and exceeded action limits. `atFinish` compares x, y and direction with the world’s finish pose; `verdict` returns `{passed, message}`. `matchesPaint` requires the painted coordinate/color set to equal the complete target set.\n\n### Incorrect programs tested\n\n';
  review += project.rejects.map(reject => `- ${reject.label}`).join('\n') + '\n\n';
  if (project.methodCases) review += '### Independent helper checks\n\n' + project.methodCases.map(probe => `- ${probe.label}`).join('\n') + '\n\n';
  review += '### Source attribution\n\n' + project.sources.map(source => `[${source.title}](${source.url}). ${source.adaptation}`).join('\n\n') + '\n\n';
}
review += '## Reproduce verification\n\nFrom `workshop/`: `npm test` checks Java solutions, authored failures, source preservation, locks and progress compatibility; `npm run test:ui` exercises the desktop frontend and host in Chromium through an isolated IPC bridge with real Java. From `workshop/src-tauri/`: `cargo test` covers the native process runner and Java diagnostics/completions. The UI bridge test is not a claim of native WKWebView interaction testing.\n';
handout = handout.replace('Begin with the code refresher, build one milestone at a time, and save between sessions.', 'Answer the code refresher on its own screen before opening the project. In the workspace, use the current task beside the world, open Checklist for steps, and open Commands for Java examples. Save between sessions.').replaceAll('Try sample board', 'Run').replaceAll('Trial run', 'Run').replaceAll('Check project', 'Submit').replaceAll('Save & run', 'Submit');
await writeFile(new URL('../docs/PROJECTS.md', import.meta.url), handout);
await writeFile(new URL('../docs/PROJECTS-REVIEW.md', import.meta.url), review + '\n---\n\n# Complete student problem statements\n\n' + handout);
console.log(`Wrote student problems and reviewer solutions for ${projects.length} projects.`);
