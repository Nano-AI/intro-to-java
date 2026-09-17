import { createContext, useContext } from 'react';
import { lessons, stepsFor } from './curriculum.js';
export const ProgressContext = createContext(null);
export const useProgress = () => useContext(ProgressContext);
export const hasPassedPart = (lesson, progress) => progress.completed.includes(lesson.id) && progress.assessments?.[lesson.id] === lesson.assessmentVersion;
export const hasPassedLesson = (lesson, progress) => lesson.parts ? lesson.parts.every(id=>hasPassedPart(lessons.find(l=>l.id===id),progress)) : hasPassedPart(lesson,progress);
export const quizPassed = (lesson, progress) => progress.activities?.[lesson.id] === lesson.assessmentVersion && progress.answers?.[`${lesson.id}:2`] === stepsFor(lesson)[2].answer;
export const practiceComplete = (lesson, progress) => hasPassedLesson(lesson,progress);
