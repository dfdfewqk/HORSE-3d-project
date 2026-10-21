#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const url='https://dfdfewqk.github.io/HORSE-3d-project/v17-0-biomechanics-preview/';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1912,height:962}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));
  page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(response.status(),200,'public site HTML must be 200');
  await page.waitForFunction(()=>{
   const w=document.getElementById('viewer')?.contentWindow;
   return !!w?.__horseV170?.ready||!!w?.__horseV170Error||
    document.getElementById('alert')?.style.display==='block';
  },null,{timeout:200000});
  const info=await page.evaluate(()=>{
   const w=document.getElementById('viewer').contentWindow,g=w.eval('object3d');
   return {error:document.getElementById('alert')?.textContent||w.__horseV170Error||'',
    available:w.__horseV170?.ready,joints:g.skins[0].joints.length,
    candidates:g.animations.filter(x=>x.name.startsWith('V17_0_')).map(x=>x.name)};
  });
  assert.equal(info.error,'');
  assert.equal(info.available,true);
  assert.equal(info.joints,19);
  assert.equal(info.candidates.length,4);
  const selections=[];
  for(const mode of ['walk','cruise','fast','sprint']){
   const btn=page.locator('[data-v17-mode="'+mode+'"]');
   await btn.click();
   const selection=await page.evaluate(mode=>{
    const s=document.getElementById('viewer').contentWindow.__horseV168Bridge.snapshot();
    return {mode:s.mode,version:s.version,clip:s.clip,
     pressed:document.querySelector('[data-v17-mode="'+mode+'"]').getAttribute('aria-pressed'),
     label:document.getElementById('currentGait').textContent,playing:s.playing};
   },mode);
   assert.equal(selection.mode,mode);
   assert.equal(selection.version,'v17');
   assert.equal(selection.pressed,'true');
   assert.match(selection.label,/V17.0/);
   selections.push(selection);
   await page.locator('#compare').click();
   const old=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV168Bridge.snapshot());
   assert.equal(old.version,'new');
  }
  if(errors.length)throw Error('Public browser errors '+errors.join('; ').slice(0,1600));
  console.log('V170_PUBLIC_BROWSER_PASS '+JSON.stringify({url,http:response.status(),info,selections}));
 }finally{await browser.close()}
})().catch(e=>{console.error('V170_PUBLIC_BROWSER_FAIL '+String(e?.stack||e));process.exitCode=1;});