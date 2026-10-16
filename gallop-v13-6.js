/* HORSE RANCH V13.6 — unverified Hock release candidate.
 * Experimental branch only. Requires V13.5; preserves mesh, skin, rig and all other tracks.
 * Joint rotations are local rig tuning, not measured anatomical angles.
 */
(function(){'use strict';
const NAME='Gallop_V13_6_HOCK_RELEASE_CANDIDATE', N=160, RAD=Math.PI/180;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const cyclicDistance=(i,c)=>Math.abs(((i-c+80+320)%N)-80);
const xAngle=(samples,i)=>2*Math.atan2(samples[i*4],samples[i*4+3]);
let waits=0;
const timer=setInterval(()=>{
 if(!window.__horseGaitV135Fold?.ready||!window.__horseGaitV13_2?.ready){
  if(++waits>700){clearInterval(timer);window.__horseV136Error='V13.5 not ready';}
  return;
 }
 clearInterval(timer);
 try{
  const g=object3d,old=g.animations.find(a=>a.name==='Gallop_V13_5_HIND_HOCK_FOLD');
  const original=g.animations.find(a=>a.name==='Gallop_V13_2_HIND_BOUNDED');
  if(!old||!original||g.animations.some(a=>a.name===NAME)||g.skins?.[0]?.joints.length!==19)
   throw Error('V13.5 and 19-joint reference required');
  const key=ch=>(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path;
  const v13=new Map(old.channels.map(ch=>[key(ch),ch]));
  const v12=new Map(original.channels.map(ch=>[key(ch),ch]));
  const updates=new Map(), diagnostics=[];
  for(const side of ['R','L']){
   const stName='Hind'+side+'_Stifle|rotation', hkName='Hind'+side+'_Hock|rotation';
   const st=v12.get(stName), hk=v12.get(hkName), existing=v13.get(hkName);
   if(!st||!hk||!existing||[st,hk,existing].some(ch=>ch.sam.data.length!==N*4))
    throw Error('Hind channel missing: '+side);
   const center=side==='R'?111:132;
   let peak=-1,maximum=-Infinity;
   for(let i=0;i<N;i++){
    if(cyclicDistance(i,center)>25)continue;
    const knee=xAngle(st.sam.data,i);
    if(knee>maximum){maximum=knee;peak=i;}
   }
   if(peak<0||!Number.isFinite(maximum))throw Error('Invalid stifle peak');
   const data=new Float32Array(N*4);
   for(let i=0;i<N;i++){
    const d=cyclicDistance(i,center);
    const gate=(1-smooth(11,38,d))*smooth(15,33,xAngle(st.sam.data,i)/RAD);
    // Stifle peaks first; let the hock re-extend during later airborne recovery.
    // Shape never exceeds V13.5's -18-degree maximum: no added fold amplitude.
    const release=1-0.35*smooth(0,24,cyclicDistance(i,peak));
    const theta=xAngle(hk.sam.data,i)-18*RAD*gate*release;
    if(!Number.isFinite(theta))throw Error('Non-finite hock angle');
    data[i*4]=Math.sin(theta/2);
    data[i*4+3]=Math.cos(theta/2);
   }
   updates.set(hkName,data);
   diagnostics.push({side,stiflePeakSample:peak,center,modifiedJoint:hkName});
  }
  let changed=0;
  const channels=old.channels.map(ch=>{
   const v=updates.get(key(ch));
   if(!v)return ch;
   changed++;
   return {node:ch.node,path:ch.path,sam:{times:ch.sam.times,data:v,interpolation:'LINEAR'}};
  });
  if(changed!==2||channels.length!==old.channels.length)
   throw Error('Exactly two hock tracks must change');
  const select=document.getElementById('animations');
  if(!select)throw Error('Missing animation selector');
  g.animations.push({name:NAME,duration:old.duration,channels});
  const option=document.createElement('option');
  option.value=String(g.animations.length-1);
  option.textContent='△ V13.6 실험 — 비절 회수/펴기';
  select.appendChild(option);
  select.value=option.value;
  select.dispatchEvent(new Event('change'));
  window.__horseGaitV136={ready:true,clip:NAME,changedTracks:changed,
    originalGaitsPreserved:true,modelPreserved:true,visualQA:false,diagnostics};
 }catch(e){window.__horseV136Error=String(e.message||e);console.error('V13.6 candidate',e);}
},100);
})();