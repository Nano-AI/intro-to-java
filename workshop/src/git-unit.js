// The Git & GitHub side unit: eight concept lessons, no coding route.
// Each entry is { id, kind: 'concept', title, assessmentVersion, ...lessonFields,
// prediction: [question, choices, answerIndex] } — the existing lesson-content
// shape, so Learn and Quiz render it unchanged.
// Owner: the git-content worktree.
//
// `stepsFor` in src/curriculum.js turns these fields into the five steps:
//   0 Goal     ← title, intro
//   1 One idea ← topic, concept, example
//   2 Predict  ← prediction (the quiz)
//   3 Task / 4 Explain are unused: concepts have no coding route.
//
// The warehouse analogy is workbench = working folder, crate = staging area,
// shelf = local repository, warehouse = remote, side track = branch. The
// interactive scenes live in src/git-scenarios.js, keyed by these same ids.
//
// Semantics follow the Pro Git description of snapshots and the three states,
// https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F (reviewed
// 2026-09-17). Concepts only: no git commands, no apps, no accounts.

const concept = (id, title, topic, intro, text, example, prediction) =>
  ({ id, kind: 'concept', title, topic, intro, concept: text, example, prediction, assessmentVersion: 1 });

export const gitLessons = [
  concept('git-repository', 'Working folder and repository', 'Three places a file can be',
    'A project folder holds the files being edited right now. A repository adds a stored record of what those files looked like at earlier moments.',
    'Git keeps a project in three places: the working folder, where files are edited; the staging area, where the next snapshot is assembled; and the repository, where finished snapshots are stored. A snapshot records the whole set of files at one moment, not a list of edits. Starting a repository does not move or rewrite the files already in the folder — it adds the history beside them.',
    'workbench          crate            shelf\n(working folder)   (staging area)   (repository)',
    ['Starting a repository inside a folder that already holds files does what to those files?',
      ['Leaves them in place and adds somewhere to store snapshots',
        'Moves them into the repository and empties the folder',
        'Replaces them with the newest stored snapshot'], 0]),

  concept('git-stage', 'Stage a change', 'The staging area',
    'Load one chosen version of a file into the crate that will become the next snapshot.',
    'Staging copies the current contents of a chosen file into the staging area. The file stays in the working folder and stays editable. Staging is how the next snapshot is selected: staged changes go into it, unstaged changes do not. Editing a file after staging leaves the staged copy exactly as it was until that file is staged again.',
    'workbench: handle v2  --copy-->  crate: handle v2\nthe workbench still holds handle v2',
    ['A file is edited and then staged. Where is that file now?',
      ['In the staging area only',
        'In the working folder only',
        'In both: the staging area holds a copy and the working folder keeps the file'], 2]),

  concept('git-commit', 'Commit a snapshot', 'Recording a snapshot locally',
    'Seal whatever is staged into a labelled snapshot and store it in the local history.',
    'A commit stores the contents of the staging area in the repository as a snapshot, with a message and a link to the commit before it. That repository sits on this computer, so a commit needs no network and no account. After a commit the staging area is empty, the working folder is unchanged, and no other machine knows the snapshot exists.',
    'crate: handle v2  --seal and label-->  shelf: [c1] [c2]\nthe crate is empty again, the workbench is unchanged',
    ['A commit is made. Where does that snapshot live?',
      ['On the hosted remote, as soon as the commit finishes',
        'In the repository on this computer, until it is sent somewhere else',
        'In the staging area, until the next commit replaces it'], 1]),

  concept('git-push', 'Push to the remote', 'Copying history to a remote',
    'Send local snapshots to a shared repository so other people can read them.',
    'A push copies commits from the local repository to a remote repository, such as one hosted on GitHub. Copying is the whole operation: every pushed commit stays in the local repository as well, so the same snapshots then exist in two places. A push sends commits only. Edits sitting in the working folder or the staging area have not been recorded as snapshots, so they do not travel.',
    'shelf: [c1] [c2]  --truck-->  warehouse: [c1] [c2]\nthe shelf still holds [c1] [c2]',
    ['After a successful push, the commits that were sent are:',
      ['Moved to the remote and removed from the local repository',
        'Present in both the local repository and the remote',
        'Combined into one new commit on the remote'], 1]),

  concept('git-pull', 'Pull from the remote', 'Fetching and integrating',
    'Bring in commits made elsewhere and join them to the local branch.',
    'A pull is two steps. The first fetches commits that the remote has and the local repository does not; they arrive in the repository, and the working folder is untouched. The second integrates them into the current branch, and that step is what updates the files in the working folder. When local and remote work changed the same lines, the second step is where a conflict appears.',
    'warehouse: [c3]     --fetch-->      receiving bay: [c3]\nreceiving bay: [c3] --integrate-->  shelf and workbench',
    ['Fetching new commits, on its own, does what to the working folder?',
      ['Replaces its files with the remote versions straight away',
        'Removes any local commits the remote does not have',
        'Nothing — the files change when the fetched commits are integrated'], 2]),

  concept('git-branch', 'Work on a branch', 'A side track through the history',
    'Start a second line of work without disturbing the first one.',
    'A branch is a movable name for one line of commits. Creating a branch copies nothing: the new branch starts at the current commit and shares every commit made before it. New commits extend only the branch they are made on, so the other branch still ends where it did. Switching branches changes which snapshot the working folder shows.',
    'main        [c1]--[c2]\nside track         \\--[c3]\n[c1] and [c2] belong to both tracks',
    ['A branch is created, then two commits are added to it. The commits made before the branch existed are:',
      ['Copied, so each branch holds its own separate set',
        'Shared by both branches',
        'Reachable from the new branch only'], 1]),

  concept('git-merge', 'Merge two branches', 'Joining two lines of work',
    'Combine the work from a side track back into the main line.',
    'A merge brings one branch into another. Git compares both branches against the last commit they shared and combines the changes into a new commit that records two parents. Both lines of history are kept and stay readable through that merge commit. Merging discards no commits and does not delete the branch that was merged in.',
    'main        [c1]--[c2]--[c3a]--[m]\nside track         \\--[c3b]-----/\n[m] records [c3a] and [c3b] as its parents',
    ['After a merge, the commits from the branch that was merged in are:',
      ['Replaced by the single merge commit',
        'Removed, because one history can hold only one line',
        'Still in the history, reachable through the merge commit'], 2]),

  concept('git-conflict', 'Resolve a merge conflict', 'Two versions of one part',
    'Decide the final content when both branches changed the same lines.',
    'A conflict happens when two branches changed the same part of the same file, so no combination is obvious. Git marks both versions inside the file and pauses the merge. Resolving means editing the file into the wanted final content, staging it, and committing. Real resolutions often keep parts of both changes; this exercise offers a choice between the two versions to keep the model small. Either way both branches keep every commit they already had: the resolution decides the merged content, not the history.',
    'slot: label plate\n  main track:  "Bay 4"\n  side track:  "Bay 4 spares"\nedit the final wording, stage it, commit',
    ['Keeping one branch’s version while resolving a conflict does what to the other branch’s commits?',
      ['Nothing — they stay in the history; the choice sets the merged content only',
        'Deletes them from the repository',
        'Moves them onto the branch that was kept'], 0]),
];

export const gitLessonIds = gitLessons.map(lesson => lesson.id);
export const findGitLesson = id => gitLessons.find(lesson => lesson.id === id) ?? null;
