import { hasPassedLesson } from './completion.js';

const navigationTopics = ['first-movement', 'java-variables', 'java-expressions', 'java-random-math', 'java-methods', 'java-returns', 'java-conditionals', 'java-while', 'make-a-turn', 'sense-and-stop'];
const legacyPrerequisites = {
  'autonomous-docking': ['first-movement', 'java-variables', 'java-methods', 'java-conditionals', 'sense-and-stop', 'collect-a-part'],
  'java-final-report': ['java-variables', 'java-for', 'java-accumulator', 'java-methods', 'java-returns', 'java-conditionals', 'java-scanner', 'java-arrays', 'java-array-patterns'],
  'robot-detour': navigationTopics,
  'robot-cargo': [...navigationTopics, 'collect-a-part'],
  'robot-hoop': [...navigationTopics, 'collect-a-part'],
};

export const projectPrerequisites = project => project.prerequisites || legacyPrerequisites[project.id] || [];

export const missingProjectPrerequisites = (project, progress, lookup) =>
  projectPrerequisites(project).filter(id => !hasPassedLesson(lookup(id), progress, lookup));

export function assertProjectAccess(project, progress, lookup) {
  const missing = missingProjectPrerequisites(project, progress, lookup);
  if (missing.length) throw new Error(`Project locked. Complete these lessons first: ${missing.map(id => lookup(id)?.title || id).join(', ')}.`);
}
