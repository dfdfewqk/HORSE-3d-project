'use strict';
const assert=require('node:assert/strict'),P=require('./contact-model.js');
for(const mode of Object.keys(P.configs)){
 const c=P.configs[mode];assert.equal(P.aerial(mode).length,mode==='walk'?0:1);
 for(const leg of P.feet){const d=P.state(mode,leg,c.touch[leg]).duty;
  const value=p=>P.target(mode,leg,p,-2,0);
  for(const event of [c.touch[leg],c.touch[leg]+d]){const h=1e-6,A=value(event-h),B=value(event+h),pre=value(event-2*h),next=value(event+2*h);assert.ok(Math.abs(A.z-B.z)<.00002);assert.ok(Math.abs(A.y-B.y)<.00002);assert.ok(Math.abs((A.z-pre.z)/h-(next.z-B.z)/h)<.001,'C1 '+mode+leg);}
  const anchor=value(c.touch[leg]+d*.1).z+c.speed*c.period*(c.touch[leg]+d*.1);
  for(let j=1;j<100;j++){const phase=c.touch[leg]+d*j/100,t=value(phase);assert.ok(t.stance);assert.ok(Math.abs(t.z+c.speed*c.period*phase-anchor)<1e-10,'whole stance anchor drift');}
 }
}
assert.deepEqual(P.sample({times:[0,1],data:[0,0,0,1,0,0,0,-1]},.5,4),[0,0,0,1]);
assert.deepEqual(P.sample({times:[0,1],data:[1,2],interpolation:'STEP'},.8,1),[1]);
assert.deepEqual(P.sample({times:[0,1],data:[1,2],interpolation:'STEP'},1,1),[2]);
assert.ok(Math.abs(P.sample({times:[0,1],data:[0,0,2,0,1,0],interpolation:'CUBICSPLINE'},.5,1)[0]-.75)<1e-10);
console.log('PASS: four phase schedules, contact anchors, trajectory continuity and quaternion/STEP/cubic sampling');
