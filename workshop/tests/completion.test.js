import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/curriculum.js';
import { practiceComplete } from '../src/context.js';
import { normalizeProgress } from '../shared/progress.js';

test('passing checks completes a lesson without review, activity, or quiz requirements',()=>{
  const lesson=lessons.find(l=>l.id==='hello-java');
  const progress=normalizeProgress({completed:[lesson.id],assessments:{[lesson.id]:lesson.assessmentVersion}});
  assert.equal(practiceComplete(lesson,progress),true);
  assert.deepEqual(progress.reflections,{});assert.deepEqual(progress.activities,{});assert.deepEqual(progress.answers,{});
  progress.reflections[lesson.id]='OK';assert.equal(practiceComplete(lesson,progress),true);
  // A pass from an older app version still counts after an update.
  progress.assessments[lesson.id]=lesson.assessmentVersion-1;assert.equal(practiceComplete(lesson,progress),true);
  delete progress.assessments[lesson.id];assert.equal(practiceComplete(lesson,progress),true);
  progress.completed=[];assert.equal(practiceComplete(lesson,progress),false);
});
test('multipart completion still requires every repair, but never requires notes',()=>{
  const parent=lessons.find(l=>l.id==='debug-semicolon');
  const progress=normalizeProgress({completed:parent.parts,assessments:Object.fromEntries(parent.parts.map(id=>[id,lessons.find(l=>l.id===id).assessmentVersion]))});
  assert.equal(practiceComplete(parent,progress),true);
  progress.completed=parent.parts.slice(0,-1);assert.equal(practiceComplete(parent,progress),false);
});
