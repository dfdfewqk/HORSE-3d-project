#!/usr/bin/env node
/* Render reference vs experimental motion in REAL browser; visual QA evidence,
 * not numerical biomechanics approval. */
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve('v169-qa-artifacts');fs.mkdirSync(dir,{recursive:true});
(async()=>{
 let browser,context;
 try{
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
  context=await browser.newContext({viewport:{width:1400,height:850},
   recordVideo:{dir,size:{width:1400,height:850}}});
  const page=await context.newPage();
  const video=page.video();
  await page.goto('http://127.0.0.1:8765/v16-9-biomechanics-preview/?debug',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{
   const f=document.getElementById('viewer')?.contentWindow;
   return !!f?.__horseV169Candidate?.ready;
  },null,{timeout:120000});
  const segments=[
   ['Walk V16.7',()=>page.locator('[data-mode="walk"]').click(),4200],
   ['Walk V16.9 EXPerimental',()=>page.locator('#chooseV169').click(),5000],
   ['Gallop Cruise V16.7',()=>page.locator('[data-mode="cruise"]').click(),3500],
   ['Gallop Fast V16.7',()=>page.locator('[data-mode="fast"]').click(),3500],
   ['Gallop Sprint V16.7',()=>page.locator('[data-mode="sprint"]').click(),3500]
  ];
  for(const [name,fn,ms] of segments){
   await fn();
   await page.waitForTimeout(ms);
   console.log('Recorded '+name);
  }
  await page.close();
  await context.close();context=null;
  const videoPath=await video.path();
  const output=path.join(dir,'v169-real-glb-walk-gallops-review.webm');
  fs.copyFileSync(videoPath,output);
  console.log('VIDEO '+output+' bytes '+fs.statSync(output).size);
 }catch(e){console.log('VIDEO RECORDING UNAVAILABLE '+String(e));process.exitCode=1}
 finally{if(context)await context.close();if(browser)await browser.close()}
})();