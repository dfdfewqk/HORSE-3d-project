/* V16.8 experimental IK: append candidates only; never replace/choose original clips. */
(function(){'use strict';
const N=160,MODES=['walk','cruise','fast','sprint'];
const CLIP={walk:'Walk_V16_8_IK_STAGING',cruise:'Gallop_V16_8_CRUISE_IK_STAGING',
 fast:'Gallop_V16_8_FAST_IK_STAGING',sprint:'Gallop_V16_8_SPRINT_IK_STAGING'};
let task=null;
const state={ready:true,status:'not_run',generatedIndexes:{},ikMetrics:null,ikProxyPass:false,
 geometryQA:false,skinVerified:false,visualVerified:false,errors:[],clipNames:CLIP,prepare};
window.__horseV168Experiment=state;
function finiteClip(clip){
 if(clip.channels.length!==19||!Number.isFinite(clip.duration))throw Error('Invalid IK clip');
 for(const ch of clip.channels){
  if(ch.sam.times.length!==N||ch.sam.data.length!==N*(ch.path==='rotation'?4:3))
   throw Error('Bad joint shape '+ch.node+'/'+ch.path);
  if(!Array.from(ch.sam.data).every(Number.isFinite))throw Error('Nonfinite joint '+ch.node);
 }
}
async function prepare(){
 if(task)return task;
 task=(async()=>{
  state.status='running';
  try{
   const g=object3d,old=window.__horseV167,engine=window.__horseV167Builder,
    C=window.__horseV168Contact,gate=window.__horseV168IKGate,IK=window.__horseV165IK,
    scanner=window.__horseV165Contact;
   if(!old?.ready||!engine?.build||!C?.timeline||!gate?.make||!IK?.build||!scanner?.make)
    throw Error('Missing GLB / IK dependency');
   if(g.skins?.[0]?.joints?.length!==19||window.__horseGaitV12?.belly?.corrected!==440)
    throw Error('Original GLB / abdomen 440 not preserved');
   const feet=scanner.make(g),rig=IK.build(g,feet),before=g.animations.slice(),
    prepared={},details={},errors=[];
   if(MODES.some(mode=>g.animations.some(a=>a.name===CLIP[mode])))
    throw Error('Duplicate V16.8 clip');
   for(const mode of MODES){
    const base=g.animations[old.clipIndexes[mode]],body=gate.extractBody(g,base,engine),
     result=gate.make(mode,rig,feet,body,engine,C,IK),
     candidate=gate.replaceLegs(base,g,result.angles,engine);
    candidate.name=CLIP[mode];finiteClip(candidate);
    prepared[mode]=candidate;details[mode]=result.metrics;
    for(const error of result.errors)errors.push({mode,...error});
    await new Promise(resolve=>setTimeout(resolve,0));
   }
   if(g.animations.length!==before.length||before.some((x,i)=>g.animations[i]!==x))
    throw Error('Protected clips changed while baking');
   for(const mode of MODES){state.generatedIndexes[mode]=g.animations.length;g.animations.push(prepared[mode]);}
   if(before.some((x,i)=>g.animations[i]!==x))throw Error('Protected source replaced');
   state.errors=errors;state.ikMetrics=details;state.ikProxyPass=errors.length===0;
   state.status='staged_for_skin_audit';
   return {indexes:state.generatedIndexes,ikProxyPass:state.ikProxyPass,errors,details};
  }catch(e){state.status='fail';state.errors.push({stage:'IK',message:String(e?.message||e)});throw e;}
 })();
 return task;
}
})();