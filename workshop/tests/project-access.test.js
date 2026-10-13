import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/curriculum.js';
import { assertProjectAccess, missingProjectPrerequisites, projectPrerequisites } from '../shared/project-access.js';

const lookup = id => lessons.find(lesson => lesson.id === id);

test('projects require every named topic, including every part of a repair', () => {
  const project = { id: 'method-game', title: 'Method game', prerequisites: ['java-methods', 'debug-semicolon'] };
  const parts = lookup('debug-semicolon').parts;
  const progress = { completed: ['java-methods', ...parts.slice(0, -1)] };
  assert.deepEqual(missingProjectPrerequisites(project, progress, lookup), ['debug-semicolon']);
  assert.throws(() => assertProjectAccess(project, progress, lookup), /Project locked.*Repair a broken declaration/);
  progress.completed.push(parts.at(-1));
  assert.deepEqual(missingProjectPrerequisites(project, progress, lookup), []);
  assert.doesNotThrow(() => assertProjectAccess(project, progress, lookup));
});

test('completed projects and saved drafts do not bypass missing prerequisite topics', () => {
  const project = { id: 'method-game', prerequisites: ['java-methods', 'java-for'] };
  const progress = { completed: [project.id, 'java-methods'], drafts: { [project.id]: 'saved code' }, games: { [project.id]: { stars: 1 } } };
  const before = structuredClone(progress);
  assert.deepEqual(missingProjectPrerequisites(project, progress, lookup), ['java-for']);
  assert.throws(() => assertProjectAccess(project, progress, lookup), /Project locked/);
  assert.deepEqual(progress, before);
});

test('unknown prerequisite IDs fail closed while ordinary lessons stay open', () => {
  assert.deepEqual(missingProjectPrerequisites({ prerequisites: ['missing-topic'] }, { completed: ['missing-topic'] }, lookup), ['missing-topic']);
  assert.deepEqual(missingProjectPrerequisites(lookup('hello-java'), { completed: [] }, lookup), []);
});

test('legacy projects declare real prior lessons and retain their relevant topics', () => {
  const expected = {
    'java-final-report': ['java-for', 'java-methods', 'java-returns', 'java-conditionals', 'java-arrays'],
    'autonomous-docking': ['java-methods', 'java-conditionals', 'sense-and-stop', 'collect-a-part'],
    'robot-detour': ['java-methods', 'java-conditionals', 'java-while', 'make-a-turn', 'sense-and-stop'],
    'robot-cargo': ['java-methods', 'java-conditionals', 'java-while', 'collect-a-part'],
    'robot-hoop': ['java-methods', 'java-conditionals', 'java-while', 'collect-a-part'],
  };
  for (const [id, required] of Object.entries(expected)) {
    const prerequisites = projectPrerequisites(lookup(id));
    for (const topic of required) assert.ok(prerequisites.includes(topic), `${id} requires ${topic}`);
    for (const topic of prerequisites) assert.ok(lookup(topic), `${id}: unknown prerequisite ${topic}`);
    assert.ok(!prerequisites.includes(id), 'a project never depends on itself');
    assert.deepEqual(missingProjectPrerequisites(lookup(id), { completed: prerequisites }, lookup), []);
  }
});
