import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPassedPart } from '../shared/completion.js';
import { hasPassedPart as uiPassedPart } from '../src/context.js';
import { normalizeProgress } from '../shared/progress.js';

test('harder challenges require a new pass without erasing prior records or guided lesson completion', () => {
  const challenge = { id: 'challenge-saved', independent: true, assessmentVersion: 2 };
  const guided = { id: 'java-for', assessmentVersion: 99 };
  const progress = normalizeProgress({ completed: [challenge.id, guided.id], assessments: { [challenge.id]: 1 }, drafts: { [challenge.id]: 'saved Java' } });
  const before = structuredClone(progress);
  assert.equal(uiPassedPart, hasPassedPart, 'UI and host access use the same pass rule');
  assert.equal(hasPassedPart(challenge, progress), false);
  assert.equal(hasPassedPart(guided, progress), true, 'ordinary older course progress stays complete');
  assert.deepEqual(progress, before, 'checking the new version never mutates saved work');
  assert.equal(hasPassedPart(challenge, { ...progress, assessments: { [challenge.id]: 2 } }), true);
  assert.equal(hasPassedPart(challenge, { ...progress, assessments: { [challenge.id]: 3 } }), true);
  assert.equal(hasPassedPart(challenge, { ...progress, assessments: {} }), false);
});
