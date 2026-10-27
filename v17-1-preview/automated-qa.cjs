#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),{chromium}=require('playwright');
const P=require('./contact-model.js');require('./contact-tests.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'v171-artifacts');fs.mkdirSync(out,{recursive:true});
const evidence={status:'RUNNING',errors:[],transitions:[],numericStatus:'NOT_MEASURED'};
(async()=>{const server=process.env.SITE_URL?null:cp.spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});let browser;
try{await new Promise(r=>setTimeout(r,600));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1500,height:950}});page.on('pageerror',e=>evidence.errors.push(String(e)));
 await page.goto(process.env.SITE_URL||'http://127.0.0.1:8765/v17-1-preview/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const w=document.querySelector('iframe').contentWindow;return w.__horseV171?.ready||w.__horseV171Error},null,{timeout:240000});
 evidence.runtime=await page.evaluate(()=>{const w=document.querySelector('iframe').contentWindow;return {error:w.__horseV171Error,results:w.__horseV171?.results}});assert.equal(evidence.runtime.error,undefined);for(const r of Object.values(evidence.runtime.results))assert.equal(r.method,'world-anchor-skinned-contact-IK');
 await page.waitForFunction(()=>!document.querySelector('[data-v17-mode="walk"]').disabled);
 for(const mode of Object.keys(P.configs)){await page.locator('[data-v17-mode="'+mode+'"]').click();const s=await page.evaluate(()=>document.querySelector('iframe').contentWindow.__horseV171Bridge.snapshot());assert.equal(s.mode,mode);assert.equal(s.selectMatches,true);assert.equal(await page.locator('[data-v17-mode="'+mode+'"]').getAttribute('aria-pressed'),'true');}
 await page.locator('#rate').selectOption('1.5');assert.equal(await page.evaluate(()=>document.querySelector('iframe').contentWindow.__horseV171Bridge.snapshot().speed),1.5);await page.locator('#rate').selectOption('1');
 evidence.temporal=await page.evaluate(()=>{const w=document.querySelector('iframe').contentWindow,g=w.eval('object3d'),P=w.__horseV171Contact,out={};for(const [m,r] of Object.entries(w.__horseV171.results)){const c=g.animations[r.index];let max=0;for(const ch of c.channels){const assertFinite=ch.sam.data.every(Number.isFinite);if(!assertFinite)throw Error('Nonfinite clip');if(ch.path!=='rotation')continue;for(let i=0;i<640;i++){const a=P.sample(ch.sam,c.duration*i/640,4),b=P.sample(ch.sam,c.duration*(i+1)/640,4);max=Math.max(max,2*Math.acos(Math.min(1,Math.abs(a.reduce((s,x,k)=>s+x*b[k],0))))*180/Math.PI);}}out[m]={maxStepAt640:max,closingKey:c.channels.every(ch=>Math.abs(ch.sam.times.at(-1)-c.duration)<1e-6)};}return out;});
 for(const t of Object.values(evidence.temporal)){assert.equal(t.closingKey,true);assert.ok(t.maxStepAt640<3);}
 evidence.transitions=await page.evaluate(()=>{const w=document.querySelector('iframe').contentWindow,g=w.eval('object3d'),B=w.__horseV171Bridge,P=w.__horseV171Contact,A=w.__horseV171,geo=A.geometry,rows=[];B.setPlaying(false);
 const pose=()=>g.nodes.map(n=>({t:n.t.slice(),q:n.q.slice(),s:n.s.slice()}));
 for(const from of Object.keys(P.configs))for(const to of Object.keys(P.configs))if(from!==to)for(const phase of [.05,.3,.6,.9]){
  B.choose(from);B.setPlaying(false);B.stopTransition();w.eval('animTime='+P.configs[from].period*phase+';setClip(object3d)');const pre=pose();B.choose(to);B.setPlaying(false);const start=w.eval('animTime');w.eval('setClip(object3d)');const first=pose();let jump=0,maxStep=0,pen=0,worstStep=null;for(const l of P.feet){const a=geo.foot(pre,l),b=geo.foot(first,l);jump=Math.max(jump,Math.hypot(a.y-b.y,a.z-b.z));}
  let last=first;for(let k=1;k<=60;k++){w.eval('animTime='+(start+k/60)+';setClip(object3d)');const now=pose();for(const l of P.feet){const f=geo.foot(now,l);pen=Math.max(pen,geo.floor-f.y);for(const id of geo.chains[l]){const step=2*Math.acos(Math.min(1,Math.abs(last[id].q.reduce((s,x,j)=>s+x*now[id].q[j],0))))*180/Math.PI;if(step>maxStep){maxStep=step;worstStep={frame:k,leg:l,joint:id};}}}last=now;}
  rows.push({from,to,phase,startJumpMm:jump*1000,maxStepDeg:maxStep,worstStep,maxPenetrationMm:Math.max(0,pen)*1000});
 }
 return rows;});
 for(const mode of Object.keys(P.configs))for(const view of ['right','quarter']){await page.locator('[data-v17-mode="'+mode+'"]').click();await page.locator('#camera').selectOption(view);await page.evaluate(mode=>{const w=document.querySelector('iframe').contentWindow;w.__horseV171Bridge.setPlaying(false);w.__horseV171Bridge.stopTransition();w.eval('animTime='+w.__horseV171Contact.configs[mode].period*.55+';setClip(object3d)');},mode);await page.screenshot({path:path.join(out,mode+'-'+view+'.png')});}
 await page.locator('[data-v17-mode="idle"]').click();assert.equal(await page.evaluate(()=>document.querySelector('iframe').contentWindow.__horseV171Bridge.snapshot().playing),false);
 assert.deepEqual(evidence.errors,[]);evidence.status='RUNTIME_PASS';
 evidence.transitionPassed=evidence.transitions.every(t=>t.startJumpMm<=5&&t.maxPenetrationMm<=5&&t.maxStepDeg<=20);
 if(!evidence.transitionPassed){evidence.status='TRANSITION_GATE_FAILED';process.exitCode=1;}
 if(process.env.RUN_GEOMETRY_AUDIT==='1'){evidence.metrics=await page.evaluate(()=>document.querySelector('iframe').contentWindow.__horseV171QA.run());evidence.numericStatus=evidence.metrics.numericPassed?'PASS':'FAIL';if(process.env.STRICT_GEOMETRY==='1')assert.equal(evidence.metrics.numericPassed,true);}
 console.log(JSON.stringify({status:evidence.status,temporal:evidence.temporal,transitionWorst:{jump:Math.max(...evidence.transitions.map(x=>x.startJumpMm)),step:Math.max(...evidence.transitions.map(x=>x.maxStepDeg)),pen:Math.max(...evidence.transitions.map(x=>x.maxPenetrationMm))},numericStatus:evidence.numericStatus}));
}catch(e){evidence.status='EXECUTION_FAILED';evidence.error=String(e.stack||e);console.error(evidence.error);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'browser-actual-glb-qa.json'),JSON.stringify(evidence,null,2));if(browser)await browser.close();server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
