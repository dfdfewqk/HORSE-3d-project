#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const url='https://dfdfewqk.github.io/HORSE-3d-project/v17-0-biomechanics-preview/';
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
   return !!w?.__horseV170?.ready||!!w?.__horseV170Error||
    document.getElementById('error')?.style.display==='block';
  },null,{timeout:200000});
  const info=await page.evaluate(()=>{
   const w=document.getElementById('viewer').contentWindow,g=w.eval('object3d');
   return {error:document.getElementById('error')?.textContent||w.__horseV170Error||'',
    ready:!!w.__horseV170?.ready,joints:g.skins[0].joints.length,
    candidateNames:g.animations.filter(x=>x.name.startsWith('V17_0_')).map(x=>x.name),
    stability:w.__horseV170?.results&&Object.fromEntries(Object.entries(w.__horseV170.results).map(([k,v])=>[k,{
      maxCorrectionStepDeg:v.maxCorrectionStepDeg,
      maxCorrectionAccelerationDeg:v.maxCorrectionAccelerationDeg,
      antiJitter:v.antiJitter,
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
    assert.ok(stats?.antiJitter?.includes('cyclic Gaussian'),'new stabilized build must be deployed for '+mode);
    assert.ok(stats.maxCorrectionStepDeg<=1,'IK delta jump regressed '+mode);
    assert.ok(stats.maxCorrectionAccelerationDeg<=.18,'IK jerk regressed '+mode);
  }
  assert.equal(info.oldControls,false);assert.equal(info.oldPanels,false);
  assert.doesNotMatch(info.legacyLabels,/V16\./);
  await page.waitForFunction(()=>document.getElementById('status')?.dataset.mode==='v17',null,{timeout:30000});
  const selections=[];
  for(const mode of ['walk','cruise','fast','sprint']){
   const button=page.locator('[data-v17-mode="'+mode+'"]');
   await page.waitForFunction(mode=>!document.querySelector('[data-v17-mode="'+mode+'"]')?.disabled,mode,{timeout:15000});
   await button.click();
   const state=await page.evaluate(m=>{
    const s=document.getElementById('viewer').contentWindow.__horseV170Bridge.snapshot();
    return {...s,pressed:document.querySelector('[data-v17-mode="'+m+'"]').getAttribute('aria-pressed'),
     label:document.getElementById('status').textContent};
   },mode);
   assert.equal(state.mode,mode);assert.equal(state.version,'v17');
   assert.equal(state.pressed,'true');assert.equal(state.playing,true);
   assert.match(state.label,/V17\.0/);assert.equal(state.selectMatches,true);
   selections.push({mode,clip:state.clip,pressed:state.pressed});
  }
  await page.locator('[data-v17-mode="idle"]').click();
  const idle=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV170Bridge.snapshot());
  assert.equal(idle.mode,'idle');assert.equal(idle.playing,false);
  await page.locator('[data-v17-mode="walk"]').click();
  await page.locator('#rate').selectOption('1.5');
  await page.locator('#camera').selectOption('front');
  const after=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV170Bridge.snapshot());
  assert.equal(after.mode,'walk');assert.equal(after.speed,1.5);
  if(errors.length)throw Error('Public console/network errors '+errors.slice(0,10).join('; ').slice(0,1600));
  console.log('V170_CLEAN_SITE_PUBLIC_PASS '+JSON.stringify({url,http:response.status(),info,selections,idle,after}));
 }finally{await browser.close()}
})().catch(e=>{console.error('V170_CLEAN_SITE_PUBLIC_FAIL '+String(e?.stack||e));process.exitCode=1});
