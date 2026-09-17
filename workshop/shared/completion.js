// Pure completion and unlock predicates.
//
// STEP 0 SCAFFOLD — owner: the `structure` worktree (Codex).
// The signatures below are frozen: engine, host, and UI all call them and
// src/context.js adapts them for React without redefining any rule. The
// game/unlock predicates are implemented here because they fall straight out of
// shared/game-contract.js. The curriculum-shaped ones are deliberately
// dependency-injected rather than importing src/curriculum.js, because this file
// must stay importable from plain Node with no React and no browser globals.

import {
  ARENA_THRESHOLDS, SKIN_THRESHOLDS, isGameRecord, starsNeeded, totalStars,
} from './game-contract.js';

export { totalStars, starsNeeded };

// ------------------------------------------------------------ coding lessons

// Unchanged from src/context.js: a pass is the id in `completed` AND an
// assessment recorded at exactly the current version, so bumping a version
// asks the student to re-run the checks.
export const hasPassedPart = (lesson, progress) =>
  Boolean(lesson) && (progress.completed || []).includes(lesson.id) &&
  progress.assessments?.[lesson.id] === lesson.assessmentVersion;

// `lookup` resolves a multipart child id to its lesson object.
export const hasPassedLesson = (lesson, progress, lookup) =>
  Boolean(lesson) && (lesson.parts
    ? lesson.parts.every(id => hasPassedPart(lookup ? lookup(id) : null, progress))
    : hasPassedPart(lesson, progress));

// ------------------------------------------------------------ concepts (Git)

// A concept pass is persisted, not recomputed, so a later wrong answer cannot
// revoke it. The host validates the submitted answer against the current
// prediction before writing `progress.concepts[id] = assessmentVersion`.
export const conceptPassed = (lesson, progress) =>
  Boolean(lesson) && Number.isInteger(progress.concepts?.[lesson.id]) &&
  progress.concepts[lesson.id] >= lesson.assessmentVersion;

// ------------------------------------------------------------ games

export const gameStars = (gameId, progress) => {
  const record = progress.games?.[gameId];
  return isGameRecord(record, gameId) ? record.stars : 0;
};

export const gameComplete = (gameId, progress) => gameStars(gameId, progress) >= 1;

// ------------------------------------------------------------ groupings

// `lessons` and `gameIds` are the subtopic's members, supplied by the caller.
export const subtopicComplete = (progress, { lessons = [], gameIds = [], lookup } = {}) =>
  lessons.every(lesson => hasPassedLesson(lesson, progress, lookup)) &&
  gameIds.every(id => gameComplete(id, progress));

// A unit is complete when every subtopic is, plus its projects and assignments.
export const unitComplete = (progress, { subtopics = [], projectIds = [], assignmentLessons = [], lookup } = {}) =>
  subtopics.every(members => subtopicComplete(progress, { ...members, lookup })) &&
  projectIds.every(id => gameComplete(id, progress)) &&
  assignmentLessons.every(lesson => hasPassedLesson(lesson, progress, lookup));

// ------------------------------------------------------------ unlocks

// Cosmetics only. These never affect simulation or grading.
export const skinUnlocked = (index, stars) => index === 0 || stars >= (SKIN_THRESHOLDS[index - 1] ?? Infinity);
export const arenaUnlocked = (arena, stars) => stars >= (ARENA_THRESHOLDS[arena] ?? 0);
