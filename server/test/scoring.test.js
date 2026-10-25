import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore, validateGenerated } from '../src/validation.js';

test('scoring grants correct base and applies clue/hint adjustments with zero floor', () => {
  assert.equal(calculateScore('easy', true, 5, 2), 105);
  assert.equal(calculateScore('hard', false, 1, 3), 0);
  assert.equal(calculateScore('medium', false, 4, 1), 10);
});
test('generated cases require exact difficulty counts and consistent solution IDs', () => {
  const data = { title:'Case', story:'A sufficiently long fictional mystery story with detail.', suspects:Array.from({length:3},(_,i)=>({id:`suspect-${i+1}`,name:'Name',description:'Description',motive:'Motive',alibi:'Alibi'})), clues:Array.from({length:5},(_,i)=>({id:`clue-${i+1}`,type:'document',title:'Evidence',content:'Details',explanation:'Why it matters'})), hints:['One','Two'], timeline:['Event'], culpritSuspectId:'suspect-1',solutionExplanation:'A sufficiently long explanation of the solution.',decisiveClueIds:['clue-1','clue-2'] };
  assert.equal(validateGenerated(data,'easy').suspects.length,3);
  assert.throws(()=>validateGenerated(data,'medium'));
});
