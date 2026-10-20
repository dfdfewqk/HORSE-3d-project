#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const url='https://dfdfewqk.github.io/HORSE-3d-project/v16-9-biomechanics-preview/';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push('JS '+String(e).slice(0,700)));
  page.on('requestfailed',r=>errors.push('NETWORK '+r.url()+' '+r.failure()?.errorText));
  page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());});
  const resp=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  if(resp?.status()!==200)throw Error('Live HTML HTTP '+resp?.status());
  try{
   await page.waitForFunction(()=>{
    const w=document.getElementById('viewer')?.contentWindow;
    return w?.__horseV169Candidate?.ready||document.getElementById('alert')?.style?.display==='block';
   },null,{timeout:120000});
  }catch(e){errors.push('TIMEOUT '+String(e).slice(0,400));}
  const state=await page.evaluate(()=>{
   const iframe=document.getElementById('viewer');
   const w=iframe?.contentWindow;
   let accessible={};
   try{
    accessible={url:w?.location?.href,ready:!!w?.__horseV169Candidate?.ready,
     candidateClip:w?.__horseV169Candidate?.clip,
     bridgeReady:!!w?.__horseV168Bridge?.ready,viewerReady:!!w?.__viewerReady,
     report:w?.__horseV169Error||w?.__horseV168BridgeError||'',
     skinJoints:w?.eval('object3d')?.skins?.[0]?.joints?.length,
     status:document.getElementById('state')?.textContent};
   }catch(e){accessible={error:String(e)}}
   return {title:document.title,alert:document.getElementById('alert')?.textContent,viewer:accessible};
  });
  console.log('REAL_PUBLIC_GITHUB_PAGES '+JSON.stringify({url,http:resp.status(),state,errors:errors.slice(0,25)}));
  if(!state.viewer.ready||state.viewer.skinJoints!==19||!state.viewer.bridgeReady){
   throw Error('Public V16.9 3D viewer failed to initialize');
  }
  await page.locator('#chooseV169').click();
  await page.waitForTimeout(800);
  const selection=await page.evaluate(()=>document.getElementById('viewer').contentWindow.__horseV168Bridge.snapshot());
  if(selection.version!=='experimental'||selection.mode!=='walk')throw Error('Public V16.9 experimental Walk not selectable');
  console.log('PUBLIC_V16.9_UI_PASS '+JSON.stringify(selection));
 }finally{await browser.close();}
})().catch(e=>{console.error('PUBLIC_V16.9_SITE_FAIL '+String(e?.stack||e));process.exitCode=1;});