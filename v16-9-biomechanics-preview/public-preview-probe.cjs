#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const sha=process.env.GITHUB_SHA||'338063294c03642e4661a99240d109d8e404ef77';
const root='dfdfewqk/HORSE-3d-project',p='v16-9-biomechanics-preview/index.html';
const urls=[
 'https://preview.githack.com/'+root+'/'+sha+'/'+p,
 'https://raw.githack.com/'+root+'/'+sha+'/'+p,
 'https://cdn.jsdelivr.net/gh/'+root+'@'+sha+'/'+p
];
(async()=>{
 const browser=await chromium.launch({headless:true});
 const diagnostics=[];
 for(const url of urls){
  const page=await browser.newPage();
  const result={url,ready:false,details:null,errors:[],badRequests:[]};
  page.on('pageerror',e=>result.errors.push(String(e).slice(0,800)));
  page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text().slice(0,800));});
  page.on('requestfailed',r=>result.badRequests.push({url:r.url(),error:r.failure()?.errorText}));
  page.on('response',r=>{if(r.status()>=400)result.badRequests.push({url:r.url(),status:r.status()});});
  try{
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   result.http=response?.status();
   result.mime=response?.headers()['content-type'];
   if(result.http===200){
    await page.waitForFunction(()=>{
     const w=document.getElementById('viewer')?.contentWindow;
     return !!w?.__horseV169Candidate?.ready ||
      document.getElementById('alert')?.style.display==='block';
    },null,{timeout:12000});
    result.details=await page.evaluate(()=>{
     const w=document.getElementById('viewer')?.contentWindow;
     return {candidate:w?.__horseV169Candidate?.clip,
      alert:document.getElementById('alert')?.textContent};
    });
    result.ready=!!result.details.candidate;
   }
  }catch(e){result.error=String(e).slice(0,500);
   try {
    result.details=await page.evaluate(()=>{
     const iframe=document.getElementById('viewer');
     let viewer={};
     try {
      const w=iframe?.contentWindow;
      viewer={url:w?.location?.href,ready:w?.__viewerReady,
       v169Error:w?.__horseV169Error,bridgeError:w?.__horseV168BridgeError,
       v167Error:w?.__horseV167Error,
       errorText:w?.document?.getElementById('error')?.textContent};
     }catch(err){viewer={crossOrigin:String(err)}}
     return {title:document.title,alert:document.getElementById('alert')?.textContent,
      state:document.getElementById('state')?.textContent,viewer};
    });
   }catch(err){result.errors.push('inspect:'+String(err).slice(0,500))}
  }
  diagnostics.push(result);console.log('PUBLIC_PREVIEW_PROBE '+JSON.stringify(result));
  await page.close();
 }
 await browser.close();
 fs.mkdirSync('v169-qa-artifacts',{recursive:true});
 fs.writeFileSync(path.join('v169-qa-artifacts','public-preview-probe.json'),JSON.stringify(diagnostics,null,2));
})();