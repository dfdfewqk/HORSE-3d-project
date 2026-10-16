/* HORSE RANCH V13.7 — event-aligned integrated gallop candidate.
 * Left lead matches source V13.5 proxy low-point order: RH -> LH -> RF -> LF.
 * The events below are DESIGN TARGETS, not measured horse footfall timestamps.
 * Re-times complete limb chains (not isolated hock bones) and adds restrained
 * torso motion. The original GLB, skin, rest/bind data, and all gaits remain.
 * Experimental branch only: actual perceptual/hoof-contact QA still required.
 */
(function(){'use strict';
 const NAME='Gallop_V13_7_INTEGRATED_CANDIDATE',N=160,TAU=2*Math.PI,RAD=Math.PI/180;
 const FOOTFALLS={HindR:9,HindL:34,ForeR:59,ForeL:83};
 const BASE_MINIMA={HindR:15,HindL:37,ForeR:59,ForeL:83};
 const LIMBS={
  HindR:['Hip','Stifle','Hock','Fetlock'],
  HindL:['Hip','Stifle','Hock','Fetlock'],
  ForeR:['Shoulder','Knee','Fetlock'],
  ForeL:['Shoulder','Knee','Fetlock']
 };
 const wrap=n=>((n%N)+N)%N;
 const localAngle=(q,i)=>2*Math.atan2(q[4*i],q[4*i+3]);
 function warpedPhase(i,limb){
  // One smooth, monotone phase mapping per complete leg. Does not reverse time.
  const d=wrap(i-FOOTFALLS[limb]+80)-80;
  const slow=limb.startsWith('Fore')?1:4;
  return wrap(BASE_MINIMA[limb]+d-slow*Math.sin(TAU*d/N));
 }
 function sampleRotation(q,index){
  const a=Math.floor(index),b=(a+1)%N,t=index-a;
  let x=localAngle(q,a),y=localAngle(q,b);
  let delta=y-x;
  if(delta>Math.PI)delta-=TAU;
  if(delta< -Math.PI)delta+=TAU;
  return x+t*delta;
 }
 const makeQuaternion=a=>[Math.sin(a/2),0,0,Math.cos(a/2)];
 let tries=0;
 const poll=setInterval(()=>{
  if(!window.__horseGaitV135Fold?.ready){
   if(++tries>700){clearInterval(poll);window.__horseV137Error='V13.5 not ready';}
   return;
  }
  clearInterval(poll);
  try{
   const g=object3d;
   const old=g?.animations.find(a=>a.name==='Gallop_V13_5_HIND_HOCK_FOLD');
   if(!old||g.skins?.[0]?.joints.length!==19||g.animations.some(a=>a.name===NAME))
    throw Error('Expected V13.5 19-joint source or candidate already exists');
   if(old.duration!==.72||old.channels.length!==19)throw Error('Unexpected Gallop source structure');
   const byName=new Map(old.channels.map(ch=>[(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path,ch]));
   const replacement=new Map(),phaseDiagnostics={};
   for(const [limb,bones] of Object.entries(LIMBS)){
    phaseDiagnostics[limb]={sourceLowestProxySample:BASE_MINIMA[limb],targetLowestProxySample:FOOTFALLS[limb]};
    for(const bone of bones){
     const key=limb+'_'+bone+'|rotation',ch=byName.get(key);
     if(!ch||ch.sam?.data.length!==N*4||ch.sam?.times.length!==N)
      throw Error('Required limb rotation channel missing: '+key);
     const out=new Float32Array(N*4);
     for(let i=0;i<N;i++){
      const theta=sampleRotation(ch.sam.data,warpedPhase(i,limb));
      if(!Number.isFinite(theta))throw Error('Non-finite limb rotation: '+key);
      const q=makeQuaternion(theta);
      out.set(q,i*4);
     }
     replacement.set(key,out);
    }
   }
   const torsoR=byName.get('Torso|rotation');
   const torsoT=byName.get('Torso|translation');
   if(!torsoR||torsoR.sam?.data.length!==N*4||!torsoT||torsoT.sam?.data.length!==N*3)
    throw Error('Required torso channels missing');
   const tRot=new Float32Array(N*4);
   const tPos=new Float32Array(torsoT.sam.data);
   for(let i=0;i<N;i++){
    const flight=TAU*(i-130)/N;
    // Small response to hind propulsion, fore contact and the late-cycle flight.
    const dy=.004*Math.cos(flight)-.0015*Math.cos(2*flight);
    const pitch=(.25*Math.sin(flight)+.12*Math.sin(2*flight))*RAD;
    tPos[i*3+1]+=dy;
    tRot.set(makeQuaternion(localAngle(torsoR.sam.data,i)+pitch),i*4);
   }
   replacement.set('Torso|rotation',tRot);
   replacement.set('Torso|translation',tPos);
   let modified=0;
   const channels=old.channels.map(ch=>{
    const key=(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path;
    if(!replacement.has(key))return ch;
    modified++;
    const data=replacement.get(key);
    return {node:ch.node,path:ch.path,sam:{times:ch.sam.times,data,interpolation:'LINEAR'}};
   });
   if(modified!==16||channels.length!==19)throw Error('Expected 16 revised limb/torso channels, got '+modified);
   // No model/skin/bind mutation. Keep all original clips selectable.
   const list=document.getElementById('animations');
   if(!list)throw Error('Animation selector unavailable');
   const newIndex=g.animations.length;
   g.animations.push({name:NAME,duration:old.duration,channels});
   const opt=document.createElement('option');
   opt.value=String(newIndex);opt.textContent='△ V13.7 실험 — 통합 Gallop';
   list.appendChild(opt);list.value=String(newIndex);list.dispatchEvent(new Event('change'));
   window.__horseGaitV137={ready:true,clip:NAME,changedTracks:modified,
    leftLeadTarget:true,footfalls:FOOTFALLS,phaseDiagnostics,
    originalGLBPreserved:true,originalGaitsPreserved:true,
    contactVerified:false,visualVerified:false,userGPUVerified:false};
  }catch(e){window.__horseV137Error=String(e?.message||e);console.error('V13.7 candidate',e);}
 },100);
})();
