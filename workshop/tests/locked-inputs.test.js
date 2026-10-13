import test from 'node:test';
import assert from 'node:assert/strict';
import { lockedInputLines, touchesLockedInput, moveLockedInputLines, sameLockedInputLines, validLockedInputReset } from '../src/locked-inputs.js';

const inputs={gap:2,energy:50,costPerTile:2};
const source='class Student {\n void main() {\n  final int gap = 2; // given\n  final int energy = 50;\n  final int costPerTile = 2;\n  int remaining = energy;\n }\n}\n';

test('locks entire actual declaration lines, not comments, strings or only the initializer',()=>{
  const withDecoys=source.replace('  int remaining', '  // int gap = 900;\n  String note = "int energy = 1;";\n  int remaining');
  const lines=lockedInputLines(withDecoys,inputs);
  assert.equal(lines.length,3);
  assert.equal(lines[0].text,'  final int gap = 2; // given');
  for(const offset of [lines[0].start,lines[0].start+2,lines[0].end-1]) assert.equal(touchesLockedInput([{rangeOffset:offset,rangeLength:0,text:'x'}],lines),true);
  assert.equal(touchesLockedInput([{rangeOffset:withDecoys.indexOf('// int gap'),rangeLength:1,text:'x'}],lines),false);
});

test('protects both newline joins and moves protection after an allowed prefix edit',()=>{
  const lines=lockedInputLines(source,inputs);
  assert.equal(touchesLockedInput([{rangeOffset:lines[0].start-1,rangeLength:1,text:''}],lines),true);
  assert.equal(touchesLockedInput([{rangeOffset:lines[2].end,rangeLength:1,text:''}],lines),true);
  const change={rangeOffset:0,rangeLength:0,text:'// header\n'};
  assert.equal(touchesLockedInput([change],lines),false);
  const moved=moveLockedInputLines(lines,[change]);
  assert.equal(moved[0].start,lines[0].start+10);
  assert.equal(touchesLockedInput([{rangeOffset:moved[0].start,rangeLength:1,text:''}],moved),true);
});

test('legacy mutable declarations retain their exact bytes and cannot be silently replaced',()=>{
  const legacy=source.replaceAll('final int','int').replaceAll('\n','\r\n');
  const old=lockedInputLines(legacy,inputs);
  assert.equal(old.length,3);
  assert.equal(old[0].text,'  int gap = 2; // given\r');
  assert.equal(sameLockedInputLines(old,lockedInputLines(source,inputs)),false);
  assert.equal(sameLockedInputLines(old,lockedInputLines(legacy.replace('remaining = energy','remaining = energy - 1'),inputs)),true);
});

test('authorized reset still requires the supplied final int values directly inside main',()=>{
  assert.equal(validLockedInputReset(source,inputs),true);
  for(const changed of [source.replace('gap = 2','gap = 3'),source.replace('final int gap','int gap'),source.replace('void main','void helper'),source.replace('final int gap = 2;','final int gap = 2 + 0;'),source.replace('final int gap = 2;','final int gap = 2; final int gap = 2;')]) {
    assert.equal(validLockedInputReset(changed,inputs),false);
  }
});
