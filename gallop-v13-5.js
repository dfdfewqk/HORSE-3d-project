/* HORSE RANCH V13.5 — unverified hind-swing timing candidate.
 * All eight hind rotation tracks are retimed only during swing (max +12/160 samples).
 * Stance, 19-joint bind, skin weights, torso, forelimb and other gait clips unchanged.
 * This file is intentionally NOT loaded by the production index.html.
 */
(function(){'use strict';
const NAME='Gallop_V13_5_HIND_COORDINATED',N=160;
const JOINTS=['HindR_Hip','HindR_Stifle','HindR_Hock','HindR_Fetlock',
              'HindL_Hip','HindL_Stifle','HindL_Hock','HindL_Fetlock'];
const DATA='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';
let attempts=0;const timer=setInterval(()=>{
 if(!window.__horseGaitV13_2?.ready||!window.__horseGaitV12?.hindRegionProtectedV134){
  if(++attempts>500){clearInterval(timer);window.__horseV13_5Error='V13.4 dependency unavailable';}return;}
 clearInterval(timer);
 try{
  const g=object3d,base=g.animations.find(a=>a.name==='Gallop_V13_2_HIND_BOUNDED');
  if(!base||g.animations.some(a=>a.name===NAME)||!g.skins?.[0]||g.skins[0].joints.length!==19)
    throw Error('Expected V13.4 19-joint Gallop baseline missing');
  const raw=atob(DATA);if(raw.length!==JOINTS.length*N*2)throw Error('Hind payload mismatch');
  const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const dv=new DataView(bytes.buffer),repl=new Map();
  JOINTS.forEach((bone,k)=>{
   const curve=new Float32Array(N*4);
   for(let i=0;i<N;i++){const angle=dv.getInt16((k*N+i)*2,true)/10000;
    curve[i*4]=Math.sin(angle/2);curve[i*4+3]=Math.cos(angle/2);}
   repl.set(bone+'|rotation',curve);
  });
  let updated=0;const channels=base.channels.map(ch=>{
   const key=(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path;
   const data=repl.get(key);if(!data)return ch;
   updated++;return {node:ch.node,path:ch.path,sam:{times:ch.sam.times,data,interpolation:'LINEAR'}};
  });
  if(updated!==8||channels.length!==base.channels.length)throw Error('Hind-only replacement mismatch: '+updated);
  for(let i=0;i<channels.length;i++){
   const name=g.doc.nodes[channels[i].node]?.name||'';
   if(!name.startsWith('Hind')&&channels[i]!==base.channels[i])throw Error('Original fore/body channels altered');
  }
  g.animations.push({name:NAME,duration:base.duration,channels});
  const idx=g.animations.length-1,sel=document.getElementById('animations');
  const opt=document.createElement('option');opt.value=String(idx);opt.textContent='★ Gallop V13.5 — 뒷다리 회수 후보';sel.appendChild(opt);
  sel.value=String(idx);sel.dispatchEvent(new Event('change'));
  window.__horseGaitV13_5={ready:true,name:NAME,patchedHindChannels:8,foreUnchanged:true,skinUnchanged:true,otherClipsUnchanged:true,baseCommit:'b1fbb006566d640aa169388658fcdf995571650f'};
 }catch(e){window.__horseV13_5Error=e.message||String(e);console.error('V13.5 motion',e);}
},100);
})();