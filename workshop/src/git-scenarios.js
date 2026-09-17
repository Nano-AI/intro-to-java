// Warehouse scenarios for the Git & GitHub side unit. Pure serializable data.
// Owner: the git-content worktree. Consumer: src/git-lab.jsx (UI worktree).
//
// ============================================================ FROZEN SCHEMA
//
// One scenario per concept lesson, keyed by the same id. Every scenario is an
// explicit state machine, so nothing about a transition is left for the UI to
// work out. The UI renders `scene`, draws one button per action of the current
// state, shows that action's `feedback` after it is taken, and follows `to`.
//
//   Scenario = {
//     id,                // matches the lesson id in src/git-unit.js
//     title,             // heading for the scene
//     goal,              // one sentence: what this scene demonstrates
//     initial,           // state id the scene opens in
//     terminal: [id],    // state ids that finish the scene (always non-empty)
//     reset: { label, to, feedback },   // `to` is always `initial`
//     states: { [id]: State },
//   }
//
//   State = {
//     caption,           // what the scene shows right now
//     scene: Scene,
//     actions: [Action], // buttons, in display order; empty in a terminal state
//   }
//
//   Action = { id, label, to, feedback }
//     `to` is a state id declared in the same scenario. `feedback` is the
//     instructional line shown after the action; it explains the Git rule the
//     transition demonstrates, not just what moved.
//
//   Scene = {
//     workbench: [Part],   // the working folder
//     crate:     [Part],   // the staging area
//     incoming:  [Commit], // fetched, not yet integrated into a branch
//     shelf:     [Commit], // the local repository, oldest first
//     remote:    [Commit], // the hosted warehouse, oldest first
//     branches:  [Branch],
//     conflict:  null | Conflict,
//     highlight: [commitId], // commits the UI should emphasise
//   }
//   Every key is always present. SCENE_KEYS below is the closed list.
//
//   Part   = { id, label, version }      // `version` is the content, as text
//   Commit = { id, label, parents: [commitId], track }
//     `track` names the lane the UI draws the commit in. A merge commit has two
//     parents; the first commit of a history has none.
//   Branch = { id, label, head: commitId | null, current: boolean }
//   Conflict = { part, label, options: [{ id, label, version }] }
//
// The scenes must stay true to Git: staging copies and leaves the working part
// in place, a commit is recorded locally only, a push keeps the local copy, a
// pull fetches and then integrates, branches share earlier commits, a merge
// keeps both histories, and resolving a conflict changes content rather than
// history. Source: the Pro Git description of snapshots and the three states,
// https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F
//
// Warehouse exploration is optional and never gates the prediction quiz.
//
// ponytail: every reachable situation is written out as a named state. That is
// deliberate — the UI stays a renderer and the data is checkable — but it costs
// one state per path, so it does not scale past a handful of branching choices.
// A scene that needs combinatorial state (several independent toggles) wants a
// reducer here in this file, never in the UI.

export const SCENE_KEYS = ['workbench', 'crate', 'incoming', 'shelf', 'remote', 'branches', 'conflict', 'highlight'];

const EMPTY_SCENE = { workbench: [], crate: [], incoming: [], shelf: [], remote: [], branches: [], conflict: null, highlight: [] };
const state = (caption, scene, actions = []) => ({ caption, scene: { ...EMPTY_SCENE, ...scene }, actions });
const part = (id, label, version) => ({ id, label, version });
const commit = (id, label, parents, track = 'main') => ({ id, label, parents, track });
const branch = (id, label, head, current = false) => ({ id, label, head, current });
const reset = (feedback, to) => ({ label: 'Start over', to, feedback });

// Shared history used by several scenes: two crates already on the shelf.
const c1 = commit('c1', 'first handle', []);
const c2 = commit('c2', 'stronger handle', ['c1']);
const main = current => branch('main', 'main', 'c2', current);

export const gitScenarios = [
  {
    id: 'git-repository',
    title: 'A folder, then a repository',
    goal: 'Starting a repository adds a place for snapshots and leaves the working files alone.',
    initial: 'loose',
    terminal: ['edited'],
    reset: reset('Back to a folder with no shelf beside it.', 'loose'),
    states: {
      loose: state(
        'A part sits on the workbench. There is no shelf beside it, so no version of this part is recorded anywhere.',
        { workbench: [part('handle', 'handle.txt', 'v1')] },
        [{ id: 'init', label: 'Start a repository', to: 'tracked', feedback: 'The workbench is untouched. An empty shelf now stands beside it, ready to hold snapshots. Nothing has been recorded yet.' }]),
      tracked: state(
        'The shelf exists and is empty. The part on the workbench is exactly as it was.',
        { workbench: [part('handle', 'handle.txt', 'v1')], branches: [branch('main', 'main', null, true)] },
        [{ id: 'edit', label: 'Edit the part', to: 'edited', feedback: 'The working folder changed. The shelf is still empty, so neither version is recorded — a repository stores snapshots only once they are committed.' }]),
      edited: state(
        'The workbench holds a newer part. The repository holds no snapshot of either version.',
        { workbench: [part('handle', 'handle.txt', 'v2')], branches: [branch('main', 'main', null, true)] }),
    },
  },

  {
    id: 'git-stage',
    title: 'Loading the crate',
    goal: 'Staging copies a chosen version into the crate and leaves the part on the workbench.',
    initial: 'edited',
    terminal: ['restaged'],
    reset: reset('Back to an edited handle with an empty crate.', 'edited'),
    states: {
      edited: state(
        'The shelf holds one snapshot. The workbench holds a newer handle that is not in it. The crate is empty.',
        { workbench: [part('handle', 'handle.txt', 'v2')], shelf: [c1], branches: [branch('main', 'main', 'c1', true)] },
        [{ id: 'stage', label: 'Stage the handle', to: 'staged', feedback: 'A copy of handle v2 went into the crate. The handle is still on the workbench and can still be edited: staging copies a version, it does not take the part away.' }]),
      staged: state(
        'The crate holds a copy of handle v2. The same handle is still on the workbench.',
        { workbench: [part('handle', 'handle.txt', 'v2')], crate: [part('handle', 'handle.txt', 'v2')], shelf: [c1], branches: [branch('main', 'main', 'c1', true)] },
        [{ id: 'edit', label: 'Edit the handle again', to: 'drifted', feedback: 'The workbench now holds handle v3. The crate still holds the copy taken earlier, because staging captured a version rather than a link to the file.' }]),
      drifted: state(
        'The workbench and the crate hold different versions. A commit now would record the crate version, v2.',
        { workbench: [part('handle', 'handle.txt', 'v3')], crate: [part('handle', 'handle.txt', 'v2')], shelf: [c1], branches: [branch('main', 'main', 'c1', true)] },
        [{ id: 'restage', label: 'Stage the handle again', to: 'restaged', feedback: 'The crate now holds handle v3, replacing the earlier copy. The workbench still holds handle v3 as well.' }]),
      restaged: state(
        'The crate and the workbench hold the same version. Committing now would record handle v3.',
        { workbench: [part('handle', 'handle.txt', 'v3')], crate: [part('handle', 'handle.txt', 'v3')], shelf: [c1], branches: [branch('main', 'main', 'c1', true)] }),
    },
  },

  {
    id: 'git-commit',
    title: 'Sealing a crate onto the shelf',
    goal: 'A commit records the staged version in the local repository and nowhere else.',
    initial: 'staged',
    terminal: ['after-commit'],
    reset: reset('Back to a loaded crate and an empty second slot on the shelf.', 'staged'),
    states: {
      staged: state(
        'The crate holds handle v2, ready to be sealed. The warehouse is empty.',
        { workbench: [part('handle', 'handle.txt', 'v2')], crate: [part('handle', 'handle.txt', 'v2')], shelf: [c1], branches: [branch('main', 'main', 'c1', true)] },
        [{ id: 'commit', label: 'Seal and shelve the crate', to: 'committed', feedback: 'The crate was sealed, labelled, and placed on the shelf in this workshop. The crate is empty again and the workbench is unchanged. No other building knows this snapshot exists.' }]),
      committed: state(
        'The shelf holds two snapshots. The crate is empty and the workbench still holds handle v2.',
        { workbench: [part('handle', 'handle.txt', 'v2')], shelf: [c1, c2], branches: [main(true)], highlight: ['c2'] },
        [{ id: 'edit', label: 'Edit the handle', to: 'after-commit', feedback: 'The snapshot on the shelf still shows handle v2. A later edit is recorded only after it is staged and committed in turn.' }]),
      'after-commit': state(
        'The workbench has moved ahead of the newest snapshot. The shelf still shows what was committed.',
        { workbench: [part('handle', 'handle.txt', 'v3')], shelf: [c1, c2], branches: [main(true)], highlight: ['c2'] }),
    },
  },

  {
    id: 'git-push',
    title: 'Trucking crates to the warehouse',
    goal: 'A push copies commits to the remote and keeps every one of them locally.',
    initial: 'ahead',
    terminal: ['local-edit'],
    reset: reset('Back to a local shelf that is one crate ahead of the warehouse.', 'ahead'),
    states: {
      ahead: state(
        'The local shelf holds two crates. The warehouse holds only the first one.',
        { workbench: [part('handle', 'handle.txt', 'v2')], shelf: [c1, c2], remote: [c1], branches: [main(true)], highlight: ['c2'] },
        [{ id: 'push', label: 'Send the new crate', to: 'pushed', feedback: 'The truck carried a copy. Both shelves now hold the same two crates, and nothing was removed from the local shelf.' }]),
      pushed: state(
        'The local shelf and the warehouse hold the same two crates.',
        { workbench: [part('handle', 'handle.txt', 'v2')], shelf: [c1, c2], remote: [c1, c2], branches: [main(true)] },
        [{ id: 'edit', label: 'Edit the handle', to: 'local-edit', feedback: 'The workbench changed, but an edit is not a crate. A push carries sealed crates from the shelf, so this change would not travel until it is staged and committed.' }]),
      'local-edit': state(
        'The workbench holds an unrecorded change. Both shelves still hold the same two crates.',
        { workbench: [part('handle', 'handle.txt', 'v3')], shelf: [c1, c2], remote: [c1, c2], branches: [main(true)] }),
    },
  },

  {
    id: 'git-pull',
    title: 'Fetching, then integrating',
    goal: 'A pull is two steps: the crate arrives, and then it is joined to this branch.',
    initial: 'behind',
    terminal: ['integrated'],
    reset: reset('Back to a warehouse holding one crate the local shelf does not.', 'behind'),
    states: {
      behind: state(
        'The warehouse holds a crate that the local shelf does not. The receiving bay is empty.',
        {
          workbench: [part('handle', 'handle.txt', 'v2')], shelf: [c1, c2],
          remote: [c1, c2, commit('c3', 'wider grip', ['c2'])], branches: [main(true)],
        },
        [{ id: 'fetch', label: 'Fetch the new crate', to: 'fetched', feedback: 'The crate arrived and waits in the receiving bay. The workbench has not changed: fetching brings the crate across and does nothing else.' }]),
      fetched: state(
        'The fetched crate is in the repository but not in this branch. The workbench still holds handle v2.',
        {
          workbench: [part('handle', 'handle.txt', 'v2')], shelf: [c1, c2],
          incoming: [commit('c3', 'wider grip', ['c2'])],
          remote: [c1, c2, commit('c3', 'wider grip', ['c2'])], branches: [main(true)], highlight: ['c3'],
        },
        [{ id: 'integrate', label: 'Integrate the fetched crate', to: 'integrated', feedback: 'The arrived crate joined this branch, and the workbench was updated to match it. A pull is these two steps together: fetch, then integrate.' }]),
      integrated: state(
        'The crate is part of this branch and the workbench shows its contents.',
        {
          workbench: [part('handle', 'handle.txt', 'v3')], shelf: [c1, c2, commit('c3', 'wider grip', ['c2'])],
          remote: [c1, c2, commit('c3', 'wider grip', ['c2'])],
          branches: [branch('main', 'main', 'c3', true)], highlight: ['c3'],
        }),
    },
  },

  {
    id: 'git-branch',
    title: 'Opening a side track',
    goal: 'A branch starts at the current crate and shares everything before it.',
    initial: 'main-only',
    terminal: ['side-ahead'],
    reset: reset('Back to a single track ending at the second crate.', 'main-only'),
    states: {
      'main-only': state(
        'One track runs through two crates. Every snapshot so far belongs to it.',
        { workbench: [part('handle', 'handle.txt', 'v2')], shelf: [c1, c2], branches: [main(true)] },
        [{ id: 'branch', label: 'Start a side track', to: 'branched', feedback: 'A side track now starts at the newest crate. Nothing was copied: both tracks share the two crates already on the shelf.' }]),
      branched: state(
        'Two track names point at the same crate. The shelf still holds two crates in total.',
        {
          workbench: [part('handle', 'handle.txt', 'v2')], shelf: [c1, c2],
          branches: [branch('main', 'main', 'c2'), branch('side', 'side track', 'c2', true)], highlight: ['c1', 'c2'],
        },
        [{ id: 'commit', label: 'Shelve a crate on the side track', to: 'side-ahead', feedback: 'The new crate extends the side track only. The main track still ends at the crate both tracks share, so the earlier history stays common to both.' }]),
      'side-ahead': state(
        'The side track runs one crate further. The first two crates still belong to both tracks.',
        {
          workbench: [part('handle', 'handle.txt', 'v3')], shelf: [c1, c2, commit('c3', 'padded grip', ['c2'], 'side')],
          branches: [branch('main', 'main', 'c2'), branch('side', 'side track', 'c3', true)], highlight: ['c1', 'c2'],
        }),
    },
  },

  {
    id: 'git-merge',
    title: 'Joining the tracks',
    goal: 'A merge crate records both parents, so neither history is lost.',
    initial: 'diverged',
    terminal: ['traced'],
    reset: reset('Back to two tracks that have each moved on from the shared crate.', 'diverged'),
    states: {
      diverged: state(
        'Both tracks moved on from the crate they last shared. Neither track can see the other one’s newest crate.',
        {
          workbench: [part('handle', 'handle.txt', 'v3a')],
          shelf: [c1, c2, commit('c3a', 'steel grip', ['c2']), commit('c3b', 'padded grip', ['c2'], 'side')],
          branches: [branch('main', 'main', 'c3a', true), branch('side', 'side track', 'c3b')],
        },
        [{ id: 'merge', label: 'Join the tracks', to: 'merged', feedback: 'A new crate sits on top of both tracks and names both of them as parents. Every earlier crate is still on the shelf, and the side track still exists.' }]),
      merged: state(
        'A merge crate closes the gap. It lists two parents, one from each track.',
        {
          workbench: [part('handle', 'handle.txt', 'v4')],
          shelf: [c1, c2, commit('c3a', 'steel grip', ['c2']), commit('c3b', 'padded grip', ['c2'], 'side'), commit('m', 'merge the grips', ['c3a', 'c3b'])],
          branches: [branch('main', 'main', 'm', true), branch('side', 'side track', 'c3b')], highlight: ['m'],
        },
        [{ id: 'trace', label: 'Trace the history back', to: 'traced', feedback: 'Following the merge crate backwards reaches both tracks, so the work done on each one is still readable. A merge adds a crate; it removes none.' }]),
      traced: state(
        'Every crate on both tracks is reachable from the merge crate.',
        {
          workbench: [part('handle', 'handle.txt', 'v4')],
          shelf: [c1, c2, commit('c3a', 'steel grip', ['c2']), commit('c3b', 'padded grip', ['c2'], 'side'), commit('m', 'merge the grips', ['c3a', 'c3b'])],
          branches: [branch('main', 'main', 'm', true), branch('side', 'side track', 'c3b')],
          highlight: ['c1', 'c2', 'c3a', 'c3b', 'm'],
        }),
    },
  },

  {
    id: 'git-conflict',
    title: 'Two crates for one slot',
    goal: 'Resolving a conflict decides the merged content; both tracks keep every crate.',
    initial: 'conflicted',
    terminal: ['resolved-main', 'resolved-side'],
    reset: reset('Back to the paused merge with both wordings still on offer.', 'conflicted'),
    states: {
      conflicted: state(
        'Both tracks changed the same label plate, so the merge stopped. Both wordings are on offer and nothing has been decided.',
        {
          workbench: [part('plate', 'label-plate.txt', 'two versions marked in the file')],
          shelf: [c1, c2, commit('c3a', 'plate reads Bay 4', ['c2']), commit('c3b', 'plate reads Bay 4 spares', ['c2'], 'side')],
          branches: [branch('main', 'main', 'c3a', true), branch('side', 'side track', 'c3b')],
          conflict: {
            part: 'plate', label: 'label plate',
            options: [
              { id: 'main', label: 'Main track wording', version: 'Bay 4' },
              { id: 'side', label: 'Side track wording', version: 'Bay 4 spares' },
            ],
          },
        },
        [
          { id: 'keep-main', label: 'Keep the main track wording', to: 'chose-main', feedback: 'The merged plate now reads "Bay 4". Both tracks keep every crate they had: the choice sets the merged content, not the history. A real resolution can also combine both wordings into one.' },
          { id: 'keep-side', label: 'Keep the side track wording', to: 'chose-side', feedback: 'The merged plate now reads "Bay 4 spares". Both tracks keep every crate they had: the choice sets the merged content, not the history. A real resolution can also combine both wordings into one.' },
        ]),
      'chose-main': state(
        'The plate on the workbench holds the chosen wording. The merge is not finished until it is recorded.',
        {
          workbench: [part('plate', 'label-plate.txt', 'Bay 4')],
          shelf: [c1, c2, commit('c3a', 'plate reads Bay 4', ['c2']), commit('c3b', 'plate reads Bay 4 spares', ['c2'], 'side')],
          branches: [branch('main', 'main', 'c3a', true), branch('side', 'side track', 'c3b')],
        },
        [{ id: 'commit', label: 'Stage the plate and commit', to: 'resolved-main', feedback: 'Staging the resolved plate and committing it seals a merge crate that names both tracks as parents. Both earlier crates are still on the shelf.' }]),
      'chose-side': state(
        'The plate on the workbench holds the chosen wording. The merge is not finished until it is recorded.',
        {
          workbench: [part('plate', 'label-plate.txt', 'Bay 4 spares')],
          shelf: [c1, c2, commit('c3a', 'plate reads Bay 4', ['c2']), commit('c3b', 'plate reads Bay 4 spares', ['c2'], 'side')],
          branches: [branch('main', 'main', 'c3a', true), branch('side', 'side track', 'c3b')],
        },
        [{ id: 'commit', label: 'Stage the plate and commit', to: 'resolved-side', feedback: 'Staging the resolved plate and committing it seals a merge crate that names both tracks as parents. Both earlier crates are still on the shelf.' }]),
      'resolved-main': state(
        'The merge crate records the chosen wording and both parents. Neither track lost a crate.',
        {
          workbench: [part('plate', 'label-plate.txt', 'Bay 4')],
          shelf: [c1, c2, commit('c3a', 'plate reads Bay 4', ['c2']), commit('c3b', 'plate reads Bay 4 spares', ['c2'], 'side'), commit('m', 'resolve the plate', ['c3a', 'c3b'])],
          branches: [branch('main', 'main', 'm', true), branch('side', 'side track', 'c3b')],
          highlight: ['c3a', 'c3b', 'm'],
        }),
      'resolved-side': state(
        'The merge crate records the chosen wording and both parents. Neither track lost a crate.',
        {
          workbench: [part('plate', 'label-plate.txt', 'Bay 4 spares')],
          shelf: [c1, c2, commit('c3a', 'plate reads Bay 4', ['c2']), commit('c3b', 'plate reads Bay 4 spares', ['c2'], 'side'), commit('m', 'resolve the plate', ['c3a', 'c3b'])],
          branches: [branch('main', 'main', 'm', true), branch('side', 'side track', 'c3b')],
          highlight: ['c3a', 'c3b', 'm'],
        }),
    },
  },
];

export const scenarioFor = lessonId => gitScenarios.find(scenario => scenario.id === lessonId) ?? null;

// The one transition rule, so the UI and the tests share it instead of each
// keeping a copy. Returns null for an action the current state does not offer.
export function takeAction(scenario, stateId, actionId) {
  const action = scenario.states[stateId]?.actions.find(candidate => candidate.id === actionId);
  if (!action) return null;
  return { stateId: action.to, state: scenario.states[action.to], feedback: action.feedback };
}

export const isTerminal = (scenario, stateId) => scenario.terminal.includes(stateId);
