#!/usr/bin/env node
/* V17.0 original GLB numerical and UI regression -- NOT certification */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const path='v170-artifacts';fs.mkdirSync(path,{recursive:true});
const file=path+'/browser-actual-glb-qa.json';
const evidence={status:'NOT_EXECUTED',errors:[],runtime:null,ui:null,metrics:null,numeric:{},scope:'experiment not approved'};
const save=()=>fs.writeFileSync(file,JSON.stringify(evidence,null,2));
(async()=>{
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1912,height:962}});
 page.on('pageerror',e=>evidence.errors.push(String(e).slice(0,1000)));
 page.on('console',m=>{if(m.type()==='error')evidence.errors.push(m.text().slice(0,500));});
 await page.goto('http://127.0.0.1:8765/v17-0-biomechanics-preview/?debug',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>{
  const w=document.getElementById('viewer')?.contentWindow;
  return w?.__horseV170?.ready||w?.__horseV170Error||document.getElementById('alert')?.style.display==='block';
 },null,{timeout:240000});
 evidence.runtime=await page.evaluate(()=>{
  const w=document.getElementById('viewer').contentWindow,g=w.eval('object3d');
  return {error:w.__horseV170Error||document.getElementById('alert').textContent,
   ready:!!w.__horseV170?.ready,results:w.__horseV170?.results,
   originalJointCount:g.skins[0].joints.length,
   originalMeshVertices:w.readAccessor(g,g.doc.meshes[0].primitives[0].attributes.POSITION).length/3,
   nV170Clips:g.animations.filter(a=>a.name.startsWith('V17_0_')).length};
 });
 assert.equal(evidence.runtime.error,'');
 assert.equal(evidence.runtime.ready,true);
 assert.equal(evidence.runtime.originalJointCount,19);
 assert.equal(evidence.runtime.originalMeshVertices,24314);
 assert.equal(evidence.runtime.nV170Clips,4);
 evidence.ui=[];
 for(const mode of ['walk','cruise','fast','sprint']){
  const selector='[data-v17-mode="'+mode+'"]',btn=page.locator(selector);
  await btn.click();
  const state=await page.evaluate(mode=>{
   const w=document.getElementById('viewer').contentWindow,s=w.__horseV170Bridge.snapshot();
   const btn=document.querySelector('[data-v17-mode="'+mode+'"]');
   return {...s,buttonPressed:btn.getAttribute('aria-pressed'),
    label:document.getElementById('currentGait')?.textContent};
  },mode);
  assert.equal(state.version,'v17');
  assert.equal(state.mode,mode);
  assert.equal(state.buttonPressed,'true');
  assert.match(state.label,/V17.0/);
  evidence.ui.push(state);
  assert.equal(state.selectMatches,true);
  assert.equal(state.playing,true);
 }
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
 evidence.metrics=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV170QA.run());
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
 await page.screenshot({path:path+'/v170-ui-candidate.png'});
 evidence.status=Object.values(evidence.numeric).every(x=>x.passed)?
  'NUMERIC_PASS_VISUAL_UNVERIFIED':'NUMERIC_FAIL_CANDIDATES_UNAPPROVED';
 save();
 console.log('V170_ACTUAL_GLB_RESULTS '+JSON.stringify({status:evidence.status,numeric:evidence.numeric,summary:evidence.runtime.results}));
}catch(e){evidence.status='EXECUTION_FAILED';evidence.error=String(e?.stack||e);save();console.error(evidence.error);process.exitCode=1}
finally{await browser.close()}
})();