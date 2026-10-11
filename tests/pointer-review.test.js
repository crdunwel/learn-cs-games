import test from 'node:test';
import assert from 'node:assert/strict';
import {queueMoveSteps} from '../src/engine/learningSteps.js';

test('ordinary operation explanations retain front and rear at both endpoints',()=>{
 for(const [before,after] of [[[],['10']],[['10'],[]],[['10','20'],['20']]]) {
  const steps=queueMoveSteps({before:{items:before},state:{items:after},operation:{kind:before.length?'dequeue':'enqueue',value:'10'},result:'10',explanation:'FIFO'});
  const [start,end]=steps[0].math.split('\n');
  assert.match(start,/FRONT/);assert.match(start,/REAR/);assert.match(end,/FRONT/);assert.match(end,/REAR/);
 }
});
