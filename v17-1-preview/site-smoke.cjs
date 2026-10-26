#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const url='https://dfdfewqk.github.io/HORSE-3d-project/v17-1-preview/';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1912,height:962}});
  const errors=[];
  page.on('pageerror',e=>errors.push('JS '+String(e)));
  page.on('requestfailed',r=>errors.push('NETWORK '+r.url()+' '+r.failure()?.errorText));
  page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>{
   const w=document.getElementById('viewer')?.contentWindow;
   return !!w?.__horseV171?.ready||!!w?.__horseV171Error||
    document.getElementById('error')?.style.display==='block';
  },null,{timeout:200000});
  const info=await page.evaluate(()=>{
   const w=document.getElementById('viewer').contentWindow,g=w.eval('object3d');
   return {error:document.getElementById('error')?.textContent||w.__horseV171Error||'',
    ready:!!w.__horseV171?.ready,joints:g.skins[0].joints.length,
    candidateNames:g.animations.filter(x=>x.name.startsWith('V17_1_')).map(x=>x.name),
    stability:w.__horseV171?.results&&Object.fromEntries(Object.entries(w.__horseV171.results).map(([k,v])=>[k,{
      maxFullJointStepDeg:v.maxFullJointStepDeg,
      maxCycleSeamDeg:v.maxCycleSeamDeg,
      method:v.method,
      selectedIKScales:v.selectedIKScales,
      phasePhases:v.phasePhases,
      targetPathType:v.targetPathType,
      referenceJointCount:v.referenceJointCount,
      visualPolicy:v.visualPolicy,
      reachScale:v.gaitPolish?.reach,
      recoveryFlex:v.gaitPolish?.hind,
    }])),
    oldControls:!!document.getElementById('chooseV169')||!!document.getElementById('compare'),
    oldPanels:!!document.getElementById('walkFitButton')||!!document.getElementById('walk169Audit'),
    buttons:document.querySelectorAll('[data-v17-mode]').length,
    legacyLabels:(document.getElementById('bar')?.textContent||'').trim()};
  });
  assert.equal(info.error,'');assert.equal(info.ready,true);assert.equal(info.joints,19);
  assert.equal(info.candidateNames.length,4);assert.equal(info.buttons,5);
  for(const mode of ['walk','cruise','fast','sprint']){
    const stats=info.stability?.[mode];
    assert.equal(stats?.method,'phase-foot-trajectory-coordinated-IK-body-validation','correct V17.1 solver must be deployed');
    assert.equal(stats.referenceJointCount,19);
    assert.equal(stats.phasePhases,160);
    assert.equal(Object.keys(stats.selectedIKScales||{}).length,4);
    assert.ok(stats.targetPathType?.includes('stance-lock'));
    assert.ok(stats.maxFullJointStepDeg<=9,'Final joint velocity too large: '+mode);
    assert.ok(stats.maxCycleSeamDeg<=9,'Whole-gait seam discontinuity: '+mode);
  }
  for(const [mode,reach] of Object.entries({cruise:.89,fast:.86,sprint:.84})){
    const stats=info.stability?.[mode];
    assert.ok(stats.visualPolicy?.includes('game-ready'),
     'The public website does not contain latest game polish: '+mode);
    assert.ok(Math.abs(stats.reachScale-reach)<1e-6,
     'Public website motion reach settings are stale: '+mode);
    assert.ok(stats.recoveryFlex>3,
     'Public website mid-swing hindleg recovery patch missing: '+mode);
  }
  assert.equal(info.oldControls,false);assert.equal(info.oldPanels,false);
  assert.doesNotMatch(info.legacyLabels,/V16\./);
  await page.waitForFunction(()=>document.getElementById('status')?.dataset.mode==='v171',null,{timeout:30000});
  const selections=[];
  for(const mode of ['walk','cruise','fast','sprint']){
   const button=page.locator('[data-v17-mode="'+mode+'"]');
   await page.waitForFunction(mode=>!document.querySelector('[data-v17-mode="'+mode+'"]')?.disabled,mode,{timeout:15000});
   await button.click();
   const state=await page.evaluate(m=>{
    const s=document.getElementById('viewer').contentWindow.__horseV171Bridge.snapshot();
    return {...s,pressed:document.querySelector('[data-v17-mode="'+m+'"]').getAttribute('aria-pressed'),
     label:document.getElementById('status').textContent};
   },mode);
   assert.equal(state.mode,mode);assert.equal(state.version,'v171');
   assert.equal(state.pressed,'true');assert.equal(state.playing,true);
   assert.match(state.label,/V17\.1/);assert.equal(state.selectMatches,true);
   selections.push({mode,clip:state.clip,pressed:state.pressed});
  }
  // On the live website, verify that gait changes remain phase-valid.
  const transitions=[];
  for(const [from,to] of [['walk','cruise'],['cruise','sprint'],['sprint','walk']]){
   await page.locator('[data-v17-mode="'+from+'"]').click();
   await page.waitForTimeout(65);
   const pre=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV171Bridge.snapshot());
   await page.locator('[data-v17-mode="'+to+'"]').click();
   const post=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV171Bridge.snapshot());
   assert.equal(post.mode,to);assert.ok(post.phase>=0&&post.phase<=1);
   transitions.push({from,to,startPhase:pre.phase,matchedPhase:post.phase});
  }
  await page.locator('[data-v17-mode="idle"]').click();
  const idle=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV171Bridge.snapshot());
  assert.equal(idle.mode,'idle');assert.equal(idle.playing,false);
  await page.locator('[data-v17-mode="walk"]').click();
  await page.locator('#rate').selectOption('1.5');
  await page.locator('#camera').selectOption('front');
  const after=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV171Bridge.snapshot());
  assert.equal(after.mode,'walk');assert.equal(after.speed,1.5);
  if(errors.length)throw Error('Public console/network errors '+errors.slice(0,10).join('; ').slice(0,1600));
  console.log('V171_CLEAN_SITE_PUBLIC_PASS '+JSON.stringify({url,http:response.status(),info,selections,idle,after}));
 }finally{await browser.close()}
})().catch(e=>{console.error('V171_CLEAN_SITE_PUBLIC_FAIL '+String(e?.stack||e));process.exitCode=1});
