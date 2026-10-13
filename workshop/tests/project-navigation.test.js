import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/curriculum.js';
import { flowSteps, lessonRoute, practicePath, practiceType } from '../src/routes.js';

const find = id => lessons.find(lesson => lesson.id === id);
const projectIds = ['autonomous-docking', 'java-final-report', 'robot-detour', 'robot-cargo', 'robot-hoop'];

test('all existing independent programs use the same project routes and labels', () => {
  for (const id of projectIds) {
    const lesson = find(id);
    assert.equal(practiceType(lesson), 'Project', id);
    assert.equal(practicePath(lesson), `/project/${id}`);
    assert.equal(flowSteps(lesson, { completed: [], activities: {}, answers: {} }).at(-1).label, 'Project');
  }
});

test('saved project records resolve to the canonical route without changing progress', () => {
  for (const id of projectIds) {
    const progress = { completed: [id], drafts: { [id]: 'saved Java source' }, activities: {}, answers: {} };
    const before = structuredClone(progress);
    assert.equal(lessonRoute(find(id), progress), `/project/${id}`);
    assert.deepEqual(progress, before);
  }
});

test('regular practice and its Explore/Quiz sequence keep their existing routes', () => {
  const lesson = find('java-methods');
  assert.equal(practiceType(lesson), 'Practice');
  assert.equal(practicePath(lesson), '/practice/java-methods');
  assert.equal(lessonRoute(lesson, { completed: [], activities: {}, answers: {} }), '/learn/java-methods');
  assert.equal(lessonRoute(lesson, { completed: ['java-methods'] }), '/practice/java-methods');
});
