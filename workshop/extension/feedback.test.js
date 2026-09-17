import test from 'node:test';
import assert from 'node:assert/strict';
import { compareOutput, explainError } from '../src/feedback.js';

test('compiler and runtime errors get a plain-language note for the first error',()=>{
  const compile='Student.java:4: error: cannot find symbol\n        System.out.println("Scanned " + i);\n                                        ^\n  symbol:   variable i\n  location: class Student\nStudent.java:9: error: \';\' expected\n2 errors\n';
  assert.match(explainError(compile),/^Line 4: Java does not recognize `i`/);
  assert.match(explainError('Student.java:3: error: incompatible types: possible lossy conversion from double to int\n'),/^Line 3: Storing a `double` value in an `int` variable loses information/);
  assert.match(explainError('Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3\n\tat pip.lessons.x.Student.main(Student.java:7)\n'),/^Line 7: Index 3 does not exist\. An array of length 3 has indexes 0 through 2/);
  assert.equal(explainError('something unfamiliar'),'');
});
test('output comparison names the first difference the way the runner compares',()=>{
  assert.equal(compareOutput('Scan 1\nScan 2','Scan 1\r\nScan 2\n'),null);
  assert.match(compareOutput('Scan 1\nScan 2\nScan 3','Scan 1\nScan 2').message,/stops early\. Line 3 should be `Scan 3`/);
  assert.match(compareOutput('Scan 1','Scan 1\nScan 2').message,/Line 2 is extra/);
  assert.match(compareOutput('Pip:8','Pip: 8').message,/only in spaces/);
  assert.match(compareOutput('READY','Ready').message,/only in capitalization/);
  assert.match(compareOutput('','Scan 1').message,/Expected no output/);
  assert.match(compareOutput('7','').message,/stops early\. Line 1 should be `7`/);
  assert.deepEqual(compareOutput('a\nb\nc','a\nx\nc').different,[false,true,false]);
});
