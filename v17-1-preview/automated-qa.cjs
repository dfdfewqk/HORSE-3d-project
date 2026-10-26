#!/usr/bin/env node
/* V17.1 original GLB numerical and UI regression -- NOT certification */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const path='v171-artifacts';fs.mkdirSync(path,{recursive:true});
const file=path+'/browser-actual-glb-qa.json';
const evidence={status:'NOT_EXECUTED',errors:[],runtime:null,ui:null,metrics:null,numeric:{},scope:'experiment not approved'};
const save=()=>fs.writeFileSync(file,JSON.stringify(evidence,null,2));
(async()=>{
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1912,height:962}});
 page.on('pageerror',e=>evidence.errors.push(String(e).slice(0,1000)));
 page.on('console',m=>{if(m.type()==='error')evidence.errors.push(m.text().slice(0,500));});
 await page.goto('http://127.0.0.1:8765/v17-1-preview/?debug',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>{
  const w=document.getElementById('viewer')?.contentWindow;
  return w?.__horseV171?.ready||w?.__horseV171Error||document.getElementById('error')?.style.display==='block';
 },null,{timeout:240000});
 evidence.runtime=await page.evaluate(()=>{
  const w=document.getElementById('viewer').contentWindow,g=w.eval('object3d');
  return {error:w.__horseV171Error||document.getElementById('error').textContent,
   ready:!!w.__horseV171?.ready,results:w.__horseV171?.results,
   originalJointCount:g.skins[0].joints.length,
   originalMeshVertices:w.readAccessor(g,g.doc.meshes[0].primitives[0].attributes.POSITION).length/3,
   nV170Clips:g.animations.filter(a=>a.name.startsWith('V17_1_')).length};
 });
 assert.equal(evidence.runtime.error,'');
 assert.equal(evidence.runtime.ready,true);
 assert.equal(evidence.runtime.originalJointCount,19);
 assert.equal(evidence.runtime.originalMeshVertices,24314);
 assert.equal(evidence.runtime.nV170Clips,4);
 // Regression gate: the four gait clips MUST be produced by the new
 // phase -> hoof -> coupled-limb IK -> body -> measurement pipeline.
 for(const [mode,detail] of Object.entries(evidence.runtime.results||{})){
  assert.equal(detail.method,'phase-foot-trajectory-coordinated-IK-body-validation',
   'Old separate-angle solver still active: '+mode);
  assert.equal(detail.phasePhases,160);
  assert.deepEqual(detail.contactFootIds,['HindR','ForeR','HindL','ForeL']);
  assert.equal(detail.referenceJointCount,19);
  assert.equal(detail.originalSkinPreserved,true);
  assert.equal(Object.keys(detail.selectedIKScales||{}).length,4);
  assert.ok(detail.maxFullJointStepDeg<9);
 }
 evidence.transitions=[];
 for(const [from,to] of [['walk','cruise'],['cruise','fast'],['fast','sprint'],['sprint','walk']]){
  await page.locator('[data-v17-mode="'+from+'"]').click();
  await page.waitForTimeout(70);
  const before=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV171Bridge.snapshot());
  await page.locator('[data-v17-mode="'+to+'"]').click();
  const after=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV171Bridge.snapshot());
  assert.equal(after.mode,to);assert.equal(after.version,'v171');
  assert.ok(Number.isFinite(after.phase)&&after.phase>=0&&after.phase<=1);
  evidence.transitions.push({from,to,phaseFrom:before.phase,phaseTo:after.phase});
 }
 evidence.ui=[];
 for(const mode of ['walk','cruise','fast','sprint']){
  const selector='[data-v17-mode="'+mode+'"]',btn=page.locator(selector);
  await btn.click();
  const state=await page.evaluate(mode=>{
   const w=document.getElementById('viewer').contentWindow,s=w.__horseV171Bridge.snapshot();
   const btn=document.querySelector('[data-v17-mode="'+mode+'"]');
   return {...s,buttonPressed:btn.getAttribute('aria-pressed'),
    label:document.getElementById('status')?.textContent};
  },mode);
  assert.equal(state.version,'v171');
  assert.equal(state.mode,mode);
  assert.equal(state.buttonPressed,'true');
  assert.match(state.label,/V17.1/);
  evidence.ui.push(state);
  assert.equal(state.selectMatches,true);
  assert.equal(state.playing,true);
 }
 // Save side-view motion samples for genuine game-visual review.
 // A 1280-frame geometry PASS cannot substitute for frames with unnatural poses.
 evidence.visualFrames=[];
 const modes=['walk','cruise','fast','sprint'];
 for(const mode of modes)for(const phase of [.14,.46,.79]){
  try{
   await page.evaluate(({mode,phase})=>{
    const w=document.getElementById('viewer').contentWindow,
     bridge=w.__horseV171Bridge;
    bridge.choose(mode);bridge.setPlaying(false);bridge.stopTransition();
    const clip=w.eval('object3d.animations[clipIndex]');
    w.eval('yaw=Math.PI/2;pitch=.12;animTime='+clip.duration*phase+
     ';setClip(object3d);');
   },{mode,phase});
   await page.waitForTimeout(80);
   const filename=path+'/gait-'+mode+'-'+Math.round(phase*100)+'.png';
   await page.screenshot({path:filename,clip:{x:450,y:210,width:1050,height:650}});
   evidence.visualFrames.push({mode,phase,file:filename});
  }catch(error){
   evidence.errors.push('Motion review capture '+mode+'/'+phase+': '+String(error));
  }
 }
 await page.locator('[data-v17-mode="walk"]').click();
 const cleaned=await page.evaluate(()=>({
   oldControls:!!document.getElementById('chooseV169')||!!document.getElementById('compare'),
   oldReports:!!document.getElementById('walkFitButton')||!!document.getElementById('walk169Audit'),
   currentButtons:document.querySelectorAll('[data-v17-mode]').length,
   oldLabels:/Walk V16\.7|Walk V16\.9|이전 버전과 비교/.test(document.getElementById('bar')?.textContent||'')
 }));
 assert.equal(cleaned.oldControls,false);
 assert.equal(cleaned.oldReports,false);
 assert.equal(cleaned.oldLabels,false);
 assert.equal(cleaned.currentButtons,5);
 evidence.cleanedUI=cleaned;
 evidence.temporal=await page.evaluate(()=>{
  const w=document.getElementById('viewer').contentWindow,g=w.eval('object3d'),
   sampler=w.__horseV167Builder;
  const result={};
  for(const mode of ['walk','cruise','fast','sprint']){
   const clip=g.animations.find(c=>c.name==='V17_1_'+mode.toUpperCase()+'_CYCLE_IK_EXPERIMENT');
   if(!clip||clip.channels.length!==19)throw Error('Temporal clip missing '+mode);
   let step=0,acceleration=0,seam=0,checked=0;
   const angle=(a,b)=>2*Math.acos(Math.max(-1,Math.min(1,
    Math.abs(a.reduce((v,x,k)=>v+x*b[k],0)))))*180/Math.PI;
   for(const channel of clip.channels){
    if(channel.path!=='rotation')continue;
    const q=Array.from({length:160},(_,i)=>sampler.sample(channel.sam,clip.duration*i/160,4));
    for(let i=0;i<160;i++){
     const pre=q[(i+159)%160],nxt=q[(i+1)%160],now=q[i],
      d=angle(now,nxt),back=angle(pre,now);
     step=Math.max(step,d);
     acceleration=Math.max(acceleration,Math.abs(d-back));
     if(i===159)seam=Math.max(seam,d);
    }
    checked++;
   }
   result[mode]={maxWholeJointAngularStepDeg:step,maxWholeJointAngularAccelerationProxyDeg:acceleration,
     maxSeamStepDeg:seam,checkedRotationChannels:checked};
  }
  return result;
 });
 for(const [mode,q] of Object.entries(evidence.temporal)){
  assert.ok(q.checkedRotationChannels>=14,'Missing skinned joint rotations: '+mode);
  assert.ok(q.maxWholeJointAngularStepDeg<9,'Abrupt full-joint angular jump: '+mode);
  assert.ok(q.maxSeamStepDeg<9,'Cyclic rotation seam jump: '+mode);
  assert.ok(q.maxWholeJointAngularAccelerationProxyDeg<4,'Full-joint chatter: '+mode);
 }
 evidence.metrics=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV171QA.run());
 assert.equal(evidence.metrics.totalSkinSamples,1280);
 assert.equal(evidence.metrics.edgeCohorts.fore,3107);
 assert.equal(evidence.metrics.edgeCohorts.hind,2932);
 const worst=(r,k)=>Math.max(...Object.values(r.feet).map(f=>f[k])),
  stretch=r=>Math.max(r.edge.fore.max,r.edge.hind.max);
 for(const mode of ['walk','cruise','fast','sprint']){
  const old=evidence.metrics.modes[mode+'Old'],now=evidence.metrics.modes[mode];
  const pen=worst(now,'worstPenetration'),slip=worst(now,'maxTravelCorrectedStanceSlip'),edge=stretch(now);
  evidence.numeric[mode]={baselinePenetrationMm:1000*worst(old,'worstPenetration'),
   candidatePenetrationMm:1000*pen,baselineSlipMm:1000*worst(old,'maxTravelCorrectedStanceSlip'),
   candidateSlipMm:1000*slip,baselineSkinStretch:stretch(old),candidateSkinStretch:edge,
   passed:pen<=.005&&slip<=.015&&edge<=1.20};
 }
 await page.screenshot({path:path+'/v171-ui-candidate.png'});
 evidence.status=Object.values(evidence.numeric).every(x=>x.passed)?
  'NUMERIC_PASS_VISUAL_UNVERIFIED':'NUMERIC_FAIL_CANDIDATES_UNAPPROVED';
 save();
 console.log('V171_ACTUAL_GLB_RESULTS '+JSON.stringify({status:evidence.status,numeric:evidence.numeric,summary:evidence.runtime.results}));
}catch(e){evidence.status='EXECUTION_FAILED';evidence.error=String(e?.stack||e);save();console.error(evidence.error);process.exitCode=1}
finally{await browser.close()}
})();