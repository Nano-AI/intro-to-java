import { lessons, stepsFor } from './curriculum.js';
import { hasPassedLesson, hasPassedPart } from '../shared/completion.js';

export const practiceType = lesson => lesson.challenge ? 'Project' : ['java-final-report', 'autonomous-docking'].includes(lesson.id) ? 'Assignment' : 'Practice';
export const practicePath = lesson => `/${practiceType(lesson).toLowerCase()}/${lesson.id}`;
export const quizPath = lesson => `/quiz/${lesson.id}`;
export const lessonPath = lesson => `/learn/${lesson.id}`;

// Lesson flow: Explore (interactive model) → Quiz → coding. A multipart repair gates on its parent's explore and quiz.
const find = id => lessons.find(l => l.id === id);
export const gateLesson = lesson => find(lesson.parentId) || lesson;
export const hasExplore = lesson => Boolean(lesson.visual);
export const hasQuiz = lesson => Boolean(stepsFor(lesson)[2]?.choices);
export const explored = (lesson, progress) => !hasExplore(lesson) || Boolean(progress.activities?.[lesson.id]); // any version, so updates keep it
export const quizCorrect = (lesson, progress) => !hasQuiz(lesson) || progress.answers?.[`${lesson.id}:2`] === stepsFor(lesson)[2].answer;
const passed = (lesson, progress) => hasPassedLesson(lesson, progress, find);
// First unfinished step before coding, or null when coding is open. Lessons already passed stay open.
export function unfinishedStep(lesson, progress) {
  const gate = gateLesson(lesson);
  if (passed(gate, progress)) return null;
  if (!explored(gate, progress)) return lessonPath(gate);
  if (!quizCorrect(gate, progress)) return quizPath(gate);
  return null;
}
// A multipart group opens at its first part that has not passed.
export const practiceTarget = (lesson, progress) => lesson.parts ? find(lesson.parts.find(id => !hasPassedPart(find(id), progress))) || lesson : lesson;
// Where a click on a lesson goes: the first unfinished step, else the coding page.
export const lessonRoute = (lesson, progress) => unfinishedStep(lesson, progress) || practicePath(practiceTarget(gateLesson(lesson), progress));
// Steps for the top indicator. `open` is false until every earlier step is done.
export function flowSteps(lesson, progress) {
  const gate = gateLesson(lesson), done = passed(gate, progress), steps = [];
  if (hasExplore(gate)) steps.push({ key: 'explore', label: 'Explore', to: lessonPath(gate), done: done || explored(gate, progress) });
  if (hasQuiz(gate)) steps.push({ key: 'quiz', label: 'Quiz', to: quizPath(gate), done: done || quizCorrect(gate, progress) });
  steps.push({ key: 'code', label: practiceType(gate), to: practicePath(practiceTarget(gate, progress)), done });
  return steps.map((step, i) => ({ ...step, open: steps.slice(0, i).every(s => s.done) }));
}
