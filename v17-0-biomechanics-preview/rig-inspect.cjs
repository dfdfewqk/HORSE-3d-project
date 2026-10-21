'use strict';
const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader']});
try{
const p=await browser.newPage();
await p.goto('http://127.0.0.1:8765/v16-9-biomechanics-preview/');
await p.waitForFunction(()=>document.getElementById('viewer')?.contentWindow?.__horseV169Candidate?.ready,null,{timeout:120000});
const result=await p.evaluate(()=>{
const w=document.getElementById('viewer').contentWindow,g=w.eval('object3d'),nodes=g.doc.nodes,skin=g.skins[0];
const parents={};for(const n of nodes)for(const c of n.children||[])parents[c]=n.name;
const attrs=g.doc.meshes[0].primitives[0].attributes,pos=w.readAccessor(g,attrs.POSITION),
 joints=w.readAccessor(g,attrs.JOINTS_0),weights=w.readAccessor(g,attrs.WEIGHTS_0);
const bones=skin.joints.map((id,i)=>{
let weight=0,vertices=0;for(let j=0;j<weights.length;j++)if(joints[j]===i){weight+=weights[j];if(weights[j]>.05)vertices++;}
return {name:nodes[id].name,id,parent:parents[id]||null,translation:g.nodes[id].baseT,
 children:(nodes[id].children||[]).map(k=>nodes[k].name),weight,vertices};
});
const scan=w.__horseV16Targets?.collect(g);
return {jointCount:bones.length,bodyVertexCount:pos.length/3,bones,
 ground:scan?.floor,feet:scan?.feet};
});
fs.mkdirSync('v170-artifacts',{recursive:true});
fs.writeFileSync('v170-artifacts/rig.json',JSON.stringify(result,null,2));
console.log('V170_RIG '+JSON.stringify(result));
}finally{await browser.close();}
})().catch(e=>{console.error('V170_INSPECT_FAILED '+String(e.stack||e));process.exitCode=1;});