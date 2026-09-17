export const practiceType = lesson => lesson.challenge ? 'Project' : ['java-final-report', 'autonomous-docking'].includes(lesson.id) ? 'Assignment' : 'Practice';
export const practicePath = lesson => `/${practiceType(lesson).toLowerCase()}/${lesson.id}`;
export const quizPath = lesson => `/quiz/${lesson.id}`;
export const lessonPath = lesson => `/learn/${lesson.id}`;
