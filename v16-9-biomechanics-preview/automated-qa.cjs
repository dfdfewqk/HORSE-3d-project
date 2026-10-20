#!/usr/bin/env node
/* Original 19-bone GLB real-Chromium 1280 + 160-frame QA.
   A completed numerical test does NOT certify natural horse movement. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const dir=path.resolve('v169-qa-artifacts');fs.mkdirSync(dir,{recursive:true});
const evidence={test:'real Chromium / original GLB',time:new Date().toISOString(),
  status:'NOT_EXECUTED',runtime:null,ui:null,audit:null,walk:null,errors:[],consoleErrors:[]};
const save=()=>fs.writeFileSync(path.join(dir,'v169-browser-qa.json'),JSON.stringify(evidence,null,2));
let browser;
(async()=>{
 try{
  browser=await chromium.launch({headless:true,args:[
   '--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',err=>evidence.errors.push(String(err).slice(0,2000)));
  page.on('console',msg=>{if(msg.type()==='error')evidence.consoleErrors.push(msg.text().slice(0,2000));});
  page.setDefaultTimeout(180000);
  await page.goto('http://127.0.0.1:8765/v16-9-biomechanics-preview/?debug',
    {waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>{
   const w=document.getElementById('viewer')?.contentWindow;
   return !!w?.__horseV169Candidate?.ready || !!w?.__horseV168BridgeError ||
    !!w?.__horseV167Error || !!w?.__horseV165Error ||
    document.getElementById('alert')?.style.display==='block';
  },null,{timeout:180000});
  evidence.runtime=await page.evaluate(()=>{
   const w=document.getElementById('viewer').contentWindow;
   const keys=['__horseV168BridgeError','__horseV167Error','__horseV166Error',
    '__horseV165Error','__horseV15Error','__horseV14Error','__horseV12Error','__horseV169Error'];
   const errors=keys.filter(k=>w[k]).map(k=>k+': '+w[k]);
   const alert=document.getElementById('alert');
   if(alert.style.display==='block')errors.push('UI: '+alert.textContent);
   if(errors.length)throw Error(errors.join('\n'));
   if(!w.__horseV168Bridge?.ready||!w.__horseV169Candidate?.ready||!w.__horseV169QA?.run||!w.__horseV168WalkFit?.runViewer)
    throw Error('V16.8 modules unavailable after ready signal');
   const g=w.eval('object3d'),r=w.__horseV167;
   return {skinJoints:g.skins[0].joints.length,bellyCorrected:w.__horseGaitV12?.belly?.corrected,
    clipsAdded:r.addedClips,nativeWalk:g.animations.some(a=>a.name==='Walk_V16_7_FOOTFALL'),
    v169Candidate:w.__horseV169Candidate.clip,
    v169Metrics:w.__horseV169Candidate.metrics,
    originalGlbPreserved:r.originalGlbPreserved,previousGaitsPreserved:r.originalGaitsPreserved};
  });
  assert.equal(evidence.runtime.skinJoints,19);
  assert.equal(evidence.runtime.bellyCorrected,440);
  assert.equal(evidence.runtime.clipsAdded,4);
  assert.equal(evidence.runtime.v169Metrics.stanceCountMin,2);
  assert.equal(evidence.runtime.v169Metrics.stanceCountMax,3);
  assert.equal(evidence.runtime.v169Metrics.headWithersPhaseOffset,.25);
  assert.equal(evidence.runtime.v169Metrics.limbs,14);
  assert.equal(evidence.runtime.nativeWalk,true);
  assert.equal(evidence.runtime.originalGlbPreserved,true);
  evidence.ui=await page.evaluate(()=>{
   const b=document.getElementById('viewer').contentWindow.__horseV168Bridge;
   const series=[['idle'],['walk','old'],['walk','new'],['cruise','new'],['fast','new'],['sprint','new']];
   const states=series.map(([mode,version])=>{
    const s=b.choose(mode,version);
    if(s.mode!==mode||!s.selectMatches||(mode!=='idle'&&s.version!==version))
      throw Error('Bridge selection mismatch: '+JSON.stringify(s));
    return {mode:s.mode,version:s.version,index:s.index,selectMatches:s.selectMatches};
   });
   const compare=b.compare();
   if(compare.mode!=='sprint'||compare.version!=='old'||!compare.selectMatches)
    throw Error('Compare button mapping incorrect');
   b.choose('walk','new');
   const experimental=b.choose('walk','experimental');
   if(experimental.version!=='experimental'||experimental.mode!=='walk'||!experimental.selectMatches)
    throw Error('Experimental Walk selection failed');
   const reversion=b.compare();
   if(reversion.mode!=='walk'||reversion.version!=='new')throw Error('Walk comparison broken');
   b.choose('walk','experimental');
   return {states,compare,experimental,reversion,restored:b.snapshot()};
  });
  await page.screenshot({path:path.join(dir,'walk-preview.png')});
  console.log('Original GLB and five UI modes loaded; running V16.7 eight-clip audit');
  evidence.audit=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV169QA.run());
  assert.equal(evidence.audit.totalSkinSamples,1280);
  assert.equal(evidence.audit.edgeCohorts.fore,3107);
  assert.equal(evidence.audit.edgeCohorts.hind,2932);
  save();
  const old=evidence.audit.modes.walkOld,candidate=evidence.audit.modes.walk;
  const max=(s,k)=>Math.max(...Object.values(s.feet).map(x=>x[k]));
  const stretch=s=>Math.max(s.edge.fore.max,s.edge.hind.max);
  const penetration=max(candidate,'worstPenetration'),
    slip=max(candidate,'maxTravelCorrectedStanceSlip'),
    skin=stretch(candidate);
  evidence.v169={
    frames:160,sourceWalk:'Walk_V16_7_FOOTFALL',
    candidateWalk:evidence.runtime.v169Candidate,
    originalPenetrationMm:max(old,'worstPenetration')*1000,
    candidatePenetrationMm:penetration*1000,
    originalSlipMm:max(old,'maxTravelCorrectedStanceSlip')*1000,
    candidateSlipMm:slip*1000,
    originalSkinStretch:stretch(old),candidateSkinStretch:skin,
    approved:false,gate:penetration<=.005&&slip<=.015&&skin<=1.20?
      'NUMERIC_DIAGNOSTIC_ONLY':'FAIL_NOT_APPROVED'};
  save();
  console.log('V16.9 actual GLB Walk 160: '+JSON.stringify(evidence.v169));
  console.log('1280 actual GLB samples completed; checking baseline V16.8 Walk');
  evidence.walk=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV168WalkFit.runViewer());
  assert.equal(evidence.walk.report.frames,160);
  assert.equal(evidence.walk.report.edgeCounts.fore,3107);
  assert.equal(evidence.walk.report.edgeCounts.hind,2932);
  const r=evidence.walk.report;
  assert.ok(['FAIL','NUMERIC_GATE_PASS_VISUAL_NOT_VERIFIED'].includes(r.status));
  if(r.status==='FAIL')assert.equal(evidence.walk.candidate,null,'Rejected candidate must not be exposed');
  evidence.status='V169_'+evidence.v169.gate+'_V168_'+r.status;
  save();
  console.log('160-frame actual source GLB Walk: '+r.status+
    '; penetration '+r.maximumPenetrationMm.toFixed(2)+'mm; stretch '+r.maximumSkinEdgeStretch.toFixed(3));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   '## V16.9 original-GLB experimental browser QA\n\n'+
   '- 1280 original GLB frames: executed\n- Native V16.7 Walk 160 frames: executed\n'+
   '- V16.9 numeric gate: **'+evidence.v169.gate+'**; experimental NOT approved\n'+
   '- V16.9 hoof penetration: '+evidence.v169.candidatePenetrationMm.toFixed(2)+'mm\n'+
   '- V16.9 skin stretch: '+evidence.v169.candidateSkinStretch.toFixed(3)+'×\n'+
   '- V16.8 Walk fit: '+r.status+'\n'+
   '- Hoof penetration '+r.maximumPenetrationMm.toFixed(2)+'mm; skin stretch '+
     r.maximumSkinEdgeStretch.toFixed(4)+'×\n'+
   '- See saved full JSON and browser screenshot.\n');
 }catch(err){
  evidence.status='EXECUTION_FAILED';evidence.failure=String(err?.stack||err);save();
  console.error(evidence.failure);process.exitCode=1;
 }finally{if(browser)await browser.close();}
})();
