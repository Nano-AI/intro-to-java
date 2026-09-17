import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, stepsFor } from '../src/curriculum.js';
import { gitLessons, gitLessonIds, findGitLesson } from '../src/git-unit.js';
import { gitScenarios, scenarioFor, takeAction, isTerminal, SCENE_KEYS } from '../src/git-scenarios.js';

const ORDER = ['git-repository', 'git-stage', 'git-commit', 'git-push', 'git-pull', 'git-branch', 'git-merge', 'git-conflict'];
const walk = (scenario, path) => path.reduce((at, actionId) => {
  const next = takeAction(scenario, at, actionId);
  assert.ok(next, `${scenario.id}: no action ${actionId} in state ${at}`);
  return next.stateId;
}, scenario.initial);
const sceneAt = (scenario, stateId) => scenario.states[stateId].scene;
const ids = list => list.map(entry => entry.id);

test('the eight concept lessons exist exactly once, in order, and stay out of the coding registry', () => {
  assert.deepEqual(gitLessonIds, ORDER);
  assert.equal(new Set(gitLessonIds).size, 8);
  for (const lesson of gitLessons) {
    assert.equal(lesson.kind, 'concept', `${lesson.id} must be a concept`);
    assert.ok(Number.isInteger(lesson.assessmentVersion) && lesson.assessmentVersion >= 1, `${lesson.id} needs an integer assessmentVersion`);
    assert.match(lesson.id, /^[a-z][a-z0-9-]{0,80}$/, `${lesson.id} must be a valid progress key`);
    for (const field of ['title', 'topic', 'intro', 'concept']) {
      assert.equal(typeof lesson[field], 'string', `${lesson.id}.${field}`);
      assert.ok(lesson[field].trim().length > 0, `${lesson.id}.${field} is empty`);
    }
    assert.equal(findGitLesson(lesson.id), lesson);
    // Concepts have no coding route: they must not reach the Java runner, the
    // starter/solution/cases fields, or the lesson registry.
    for (const field of ['starter', 'solution', 'cases', 'mission', 'requirements']) {
      assert.equal(lesson[field], undefined, `${lesson.id} must not carry ${field}`);
    }
    assert.equal(lessons.find(other => other.id === lesson.id), undefined, `${lesson.id} must stay out of curriculum lessons`);
  }
  assert.equal(findGitLesson('git-rebase'), null);
});

test('every prediction is a usable 3-tuple and renders through stepsFor at step index 2', () => {
  for (const lesson of gitLessons) {
    const [question, choices, answer] = lesson.prediction;
    assert.equal(typeof question, 'string');
    assert.ok(question.trim().length > 0, `${lesson.id}: empty question`);
    assert.ok(Array.isArray(choices) && choices.length >= 2, `${lesson.id}: needs at least two choices`);
    assert.equal(new Set(choices).size, choices.length, `${lesson.id}: duplicate choices`);
    choices.forEach((choice, index) => assert.ok(typeof choice === 'string' && choice.trim().length > 0, `${lesson.id}: choice ${index} is empty`));
    assert.ok(Number.isInteger(answer) && answer >= 0 && answer < choices.length, `${lesson.id}: answer ${answer} out of range`);

    const steps = stepsFor(lesson);
    assert.ok(steps.length >= 3, `${lesson.id}: stepsFor produced ${steps.length} steps`);
    const [goal, idea, predict] = steps;
    assert.equal(goal.title, lesson.title);
    assert.equal(goal.text, lesson.intro);
    assert.equal(idea.title, lesson.topic);
    assert.equal(idea.text, lesson.concept);
    assert.equal(idea.code, lesson.example);
    assert.equal(predict.label, 'Predict');
    assert.equal(predict.title, question);
    assert.deepEqual(predict.choices, choices);
    assert.equal(predict.answer, answer);
    assert.ok(predict.response.trim().length > 0, `${lesson.id}: quiz feedback is empty`);
    // Quiz.jsx persists progress.answers['<id>:2'] as the chosen index.
    assert.equal(predict.choices[predict.answer], choices[answer]);
  }
});

test('each correct answer is the one that matches real Git, and no wrong answer is', () => {
  // [lesson id, the rule the correct choice must state, a rule no choice may state]
  const rules = [
    ['git-repository', /leaves them in place/i, /empties the folder/i],
    ['git-stage', /in both/i, /staging area only/i],
    ['git-commit', /on this computer/i, /hosted remote/i],
    ['git-push', /present in both/i, /removed from the local repository/i],
    ['git-pull', /nothing/i, /straight away/i],
    ['git-branch', /shared by both/i, /own separate set/i],
    ['git-merge', /still in the history/i, /removed/i],
    ['git-conflict', /stay in the history/i, /deletes them/i],
  ];
  assert.equal(rules.length, gitLessons.length);
  for (const [id, correctRule, wrongRule] of rules) {
    const [, choices, answer] = findGitLesson(id).prediction;
    assert.match(choices[answer], correctRule, `${id}: the marked answer does not state the rule`);
    assert.doesNotMatch(choices[answer], wrongRule, `${id}: the marked answer states a false rule`);
    choices.forEach((choice, index) => {
      if (index !== answer) assert.doesNotMatch(choice, correctRule, `${id}: distractor ${index} is also correct`);
    });
  }
  // The stated semantics, checked in the lesson prose rather than only in the quiz.
  assert.match(findGitLesson('git-stage').concept, /stays in the working folder/i);
  assert.match(findGitLesson('git-commit').concept, /no network and no account/i);
  assert.match(findGitLesson('git-push').concept, /stays in the local repository/i);
  assert.match(findGitLesson('git-pull').concept, /integrates them/i);
  assert.match(findGitLesson('git-branch').concept, /shares every commit made before it/i);
  assert.match(findGitLesson('git-merge').concept, /two parents/i);
  assert.match(findGitLesson('git-conflict').concept, /keep parts of both changes/i);
  assert.match(findGitLesson('git-conflict').concept, /staging it, and committing/i);
});

test('the authored voice stays neutral: no second person, no gendered pronouns, no git commands', () => {
  const strings = [];
  const collect = value => {
    if (typeof value === 'string') strings.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(gitLessons);
  collect(gitScenarios);
  assert.ok(strings.length > 200, `only ${strings.length} strings collected`);
  for (const text of strings) {
    assert.doesNotMatch(text, /\b(you|your|yours|yourself)\b/i, `second person in: ${text}`);
    assert.doesNotMatch(text, /\b(he|him|his|she|her|hers|himself|herself)\b/i, `gendered pronoun in: ${text}`);
    assert.doesNotMatch(text, /\bgit\s+(init|add|commit|push|pull|fetch|merge|branch|checkout|switch|clone|status)\b/i, `git command in: ${text}`);
  }
});

test('every scenario is JSON-serializable data with a closed set of declared states', () => {
  assert.deepEqual(gitScenarios.map(scenario => scenario.id), ORDER, 'one scenario per concept lesson, same order');
  for (const scenario of gitScenarios) {
    assert.deepEqual(JSON.parse(JSON.stringify(scenario)), scenario, `${scenario.id} is not plain serializable data`);
    assert.equal(scenarioFor(scenario.id), scenario);
    for (const field of ['title', 'goal']) assert.ok(scenario[field]?.trim().length > 0, `${scenario.id}.${field}`);

    const stateIds = Object.keys(scenario.states);
    assert.ok(stateIds.includes(scenario.initial), `${scenario.id}: initial state ${scenario.initial} is not declared`);
    assert.ok(scenario.terminal.length >= 1, `${scenario.id}: no terminal state`);
    for (const terminal of scenario.terminal) assert.ok(stateIds.includes(terminal), `${scenario.id}: terminal ${terminal} is not declared`);

    const actionIds = new Set();
    for (const [stateId, node] of Object.entries(scenario.states)) {
      assert.ok(node.caption?.trim().length > 0, `${scenario.id}/${stateId}: no caption`);
      assert.deepEqual(Object.keys(node.scene).sort(), [...SCENE_KEYS].sort(), `${scenario.id}/${stateId}: scene keys outside the schema`);
      const terminal = isTerminal(scenario, stateId);
      assert.equal(node.actions.length === 0, terminal, `${scenario.id}/${stateId}: only terminal states may have no actions`);
      const commitIds = new Set([...node.scene.shelf, ...node.scene.incoming, ...node.scene.remote].map(entry => entry.id));
      for (const list of ['shelf', 'incoming', 'remote']) {
        for (const entry of node.scene[list]) {
          assert.ok(Array.isArray(entry.parents), `${scenario.id}/${stateId}: ${entry.id} has no parents array`);
          for (const parent of entry.parents) assert.ok(commitIds.has(parent), `${scenario.id}/${stateId}: ${entry.id} names unknown parent ${parent}`);
          assert.ok(typeof entry.track === 'string' && entry.track, `${scenario.id}/${stateId}: ${entry.id} has no track`);
        }
      }
      for (const b of node.scene.branches) {
        assert.ok(b.head === null || commitIds.has(b.head), `${scenario.id}/${stateId}: branch ${b.id} points at unknown ${b.head}`);
        assert.equal(typeof b.current, 'boolean');
      }
      assert.ok(node.scene.branches.filter(b => b.current).length <= 1, `${scenario.id}/${stateId}: more than one current branch`);
      for (const p of [...node.scene.workbench, ...node.scene.crate]) {
        assert.ok(p.id && p.label && typeof p.version === 'string', `${scenario.id}/${stateId}: malformed part`);
      }
      for (const action of node.actions) {
        assert.ok(action.label?.trim().length > 0, `${scenario.id}/${stateId}/${action.id}: no button label`);
        assert.ok(action.feedback?.trim().length > 20, `${scenario.id}/${stateId}/${action.id}: feedback is not instructional`);
        assert.ok(stateIds.includes(action.to), `${scenario.id}/${stateId}/${action.id} targets undeclared state ${action.to}`);
        assert.equal(takeAction(scenario, stateId, action.id).stateId, action.to);
        actionIds.add(`${stateId}/${action.id}`);
      }
      assert.equal(new Set(node.actions.map(a => a.id)).size, node.actions.length, `${scenario.id}/${stateId}: duplicate action ids`);
      assert.equal(takeAction(scenario, stateId, 'no-such-action'), null);
    }
    assert.ok(actionIds.size >= 2, `${scenario.id}: needs at least two named actions`);
  }
});

test('every scenario reaches all of its terminals through its own actions, and resets cleanly', () => {
  for (const scenario of gitScenarios) {
    const seen = new Set([scenario.initial]);
    const queue = [scenario.initial];
    while (queue.length) {
      for (const action of scenario.states[queue.shift()].actions) {
        if (!seen.has(action.to)) { seen.add(action.to); queue.push(action.to); }
      }
    }
    for (const terminal of scenario.terminal) assert.ok(seen.has(terminal), `${scenario.id}: terminal ${terminal} is unreachable`);
    assert.deepEqual([...seen].sort(), Object.keys(scenario.states).sort(), `${scenario.id}: unreachable states declared`);

    assert.equal(scenario.reset.to, scenario.initial, `${scenario.id}: reset must return to the initial state`);
    assert.ok(scenario.reset.label?.trim().length > 0 && scenario.reset.feedback?.trim().length > 0);
    // Resetting from any state gives back the untouched opening scene.
    for (const stateId of Object.keys(scenario.states)) {
      assert.deepEqual(scenario.states[scenario.reset.to], scenario.states[scenario.initial], `${scenario.id}: reset from ${stateId} is not the initial state`);
    }
  }
});

test('the warehouse preserves Git semantics: copy, keep, integrate, share, and retain', () => {
  // Staging copies: the crate gains the version and the workbench keeps the part.
  const stage = scenarioFor('git-stage');
  const staged = sceneAt(stage, walk(stage, ['stage']));
  assert.deepEqual(ids(staged.workbench), ['handle'], 'staging must not empty the workbench');
  assert.deepEqual(ids(staged.crate), ['handle']);
  assert.equal(staged.crate[0].version, staged.workbench[0].version, 'the crate holds a copy of the staged version');
  const drifted = sceneAt(stage, walk(stage, ['stage', 'edit']));
  assert.equal(drifted.workbench[0].version, 'v3');
  assert.equal(drifted.crate[0].version, 'v2', 'a later edit must not follow the already staged copy');
  const restaged = sceneAt(stage, walk(stage, ['stage', 'edit', 'restage']));
  assert.equal(restaged.crate[0].version, restaged.workbench[0].version);

  // Committing records locally only, and empties the crate.
  const commitScene = scenarioFor('git-commit');
  const before = sceneAt(commitScene, commitScene.initial);
  const after = sceneAt(commitScene, walk(commitScene, ['commit']));
  assert.deepEqual(after.remote, [], 'a commit must not reach the remote');
  assert.deepEqual(after.crate, [], 'the staging area is empty after a commit');
  assert.deepEqual(after.workbench, before.workbench, 'a commit must not change the working folder');
  assert.equal(after.shelf.length, before.shelf.length + 1);
  assert.deepEqual(after.shelf.at(-1).parents, [before.shelf.at(-1).id], 'a commit links to the one before it');
  const stale = sceneAt(commitScene, walk(commitScene, ['commit', 'edit']));
  assert.deepEqual(stale.shelf, after.shelf, 'editing after a commit must not rewrite the snapshot');

  // Pushing copies: the local shelf keeps everything it sent.
  const push = scenarioFor('git-push');
  const ahead = sceneAt(push, push.initial);
  const pushed = sceneAt(push, walk(push, ['push']));
  for (const id of ids(ahead.shelf)) assert.ok(ids(pushed.shelf).includes(id), `push dropped local commit ${id}`);
  assert.deepEqual(ids(pushed.shelf), ids(pushed.remote), 'the same snapshots exist in both places');
  assert.deepEqual(ids(pushed.shelf), ids(ahead.shelf), 'pushing adds no local commit');
  const edited = sceneAt(push, walk(push, ['push', 'edit']));
  assert.deepEqual(ids(edited.remote), ids(pushed.remote), 'an uncommitted edit must not travel');
  assert.notEqual(edited.workbench[0].version, pushed.workbench[0].version);

  // Pulling fetches, and only integrating touches the working folder.
  const pull = scenarioFor('git-pull');
  const behind = sceneAt(pull, pull.initial);
  const fetched = sceneAt(pull, walk(pull, ['fetch']));
  assert.deepEqual(fetched.workbench, behind.workbench, 'fetching must not change the working folder');
  assert.deepEqual(ids(fetched.shelf), ids(behind.shelf), 'fetching must not join the branch');
  assert.deepEqual(ids(fetched.incoming), ['c3']);
  const integrated = sceneAt(pull, walk(pull, ['fetch', 'integrate']));
  assert.deepEqual(integrated.incoming, [], 'integrating consumes the fetched commit');
  assert.deepEqual(ids(integrated.shelf), [...ids(behind.shelf), 'c3']);
  assert.notDeepEqual(integrated.workbench, behind.workbench, 'integrating updates the working folder');
  assert.equal(integrated.branches.find(b => b.current).head, 'c3');

  // Branching shares the earlier history and never copies it.
  const branchScene = scenarioFor('git-branch');
  const start = sceneAt(branchScene, branchScene.initial);
  const branched = sceneAt(branchScene, walk(branchScene, ['branch']));
  assert.deepEqual(ids(branched.shelf), ids(start.shelf), 'creating a branch copies no commit');
  assert.equal(new Set(branched.branches.map(b => b.head)).size, 1, 'both branches start at the same commit');
  const sideAhead = sceneAt(branchScene, walk(branchScene, ['branch', 'commit']));
  for (const id of ids(start.shelf)) assert.ok(ids(sideAhead.shelf).includes(id), `shared commit ${id} was lost`);
  assert.equal(sideAhead.branches.find(b => b.id === 'main').head, 'c2', 'the other branch must not move');
  assert.deepEqual(sideAhead.shelf.at(-1).parents, ['c2'], 'the new commit builds on the shared commit');

  // Merging keeps both histories and records both parents.
  const merge = scenarioFor('git-merge');
  const diverged = sceneAt(merge, merge.initial);
  const merged = sceneAt(merge, walk(merge, ['merge']));
  const mergeCommit = merged.shelf.at(-1);
  assert.deepEqual(mergeCommit.parents, ['c3a', 'c3b'], 'the merge commit must record both parents');
  assert.deepEqual([...mergeCommit.parents].sort(), diverged.branches.map(b => b.head).sort(), 'the parents are the two branch heads');
  for (const id of ids(diverged.shelf)) assert.ok(ids(merged.shelf).includes(id), `merge discarded commit ${id}`);
  assert.ok(merged.branches.find(b => b.id === 'side'), 'merging must not delete the merged-in branch');
  assert.equal(merged.branches.find(b => b.id === 'side').head, 'c3b');
  const traced = sceneAt(merge, walk(merge, ['merge', 'trace']));
  for (const id of ids(merged.shelf)) assert.ok(traced.highlight.includes(id), `${id} is not reachable from the merge commit`);

  // Resolving a conflict changes content, not history — on either choice.
  const conflict = scenarioFor('git-conflict');
  const paused = sceneAt(conflict, conflict.initial);
  assert.equal(paused.conflict.options.length, 2);
  assert.equal(new Set(paused.conflict.options.map(o => o.version)).size, 2, 'the two crates must differ');
  const mainEnd = sceneAt(conflict, walk(conflict, ['keep-main', 'commit']));
  const sideEnd = sceneAt(conflict, walk(conflict, ['keep-side', 'commit']));
  for (const end of [mainEnd, sideEnd]) {
    for (const id of ids(paused.shelf)) assert.ok(ids(end.shelf).includes(id), `resolving erased commit ${id}`);
    assert.deepEqual(end.shelf.at(-1).parents, ['c3a', 'c3b'], 'the resolution is a merge commit with both parents');
    assert.equal(end.conflict, null, 'the conflict is cleared once it is recorded');
    assert.ok(end.branches.find(b => b.id === 'side'), 'both branches survive the resolution');
  }
  assert.deepEqual(ids(mainEnd.shelf), ids(sideEnd.shelf), 'the choice must not change which commits exist');
  assert.notEqual(mainEnd.workbench[0].version, sideEnd.workbench[0].version, 'the choice decides the merged content');
  assert.equal(mainEnd.workbench[0].version, paused.conflict.options[0].version);
  assert.equal(sideEnd.workbench[0].version, paused.conflict.options[1].version);
  // Both offered versions must still appear as committed work on the shelf.
  const messages = mainEnd.shelf.map(entry => entry.label).join(' | ');
  for (const option of paused.conflict.options) assert.ok(messages.includes(option.version), `${option.version} is missing from the retained history`);
  // The lesson, not the two-button scene, is where combining both changes is stated.
  assert.match(conflict.states.conflicted.actions[0].feedback, /combine both wordings/i);
  assert.match(conflict.states.conflicted.actions[1].feedback, /combine both wordings/i);
});
