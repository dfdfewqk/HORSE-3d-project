/* HORSE RANCH V13.2 — HIND-ONLY overshoot correction.
 Replaces no meshes/weights/forelimb/torso/Walk. Fully reversible V13.1 remains in model. */
(function(){'use strict';
const NAME='Gallop_V13_2_HIND_BOUNDED';
const JOINTS=["HindR_Hip|rotation", "HindR_Stifle|rotation", "HindR_Hock|rotation", "HindL_Hip|rotation", "HindL_Stifle|rotation", "HindL_Hock|rotation"],B64='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';
let ticks=0;const timer=setInterval(()=>{
 if(!window.__horseGaitV13?.ready){if(++ticks>600){clearInterval(timer);window.__horseV13_2Error='V13.1 base unavailable';}return;}
 clearInterval(timer);
 try{
  const g=object3d,base=g.animations.find(x=>x.name==='Gallop_V13_1_COHERENT');
  if(!base||g.animations.some(x=>x.name===NAME))throw Error('Base gait missing or duplicate V13.2');
  const raw=atob(B64);if(raw.length!==6*160*2)throw Error('V13.2 hind-curve data mismatch');
  const buf=new ArrayBuffer(raw.length),dv=new DataView(buf);
  for(let i=0;i<raw.length;i++)dv.setUint8(i,raw.charCodeAt(i));
  const repl=new Map();for(let k=0;k<JOINTS.length;k++){
   const data=new Float32Array(160*4);
   for(let i=0;i<160;i++){
    const angle=dv.getInt16((k*160+i)*2,true)/10000;
    data[i*4]=Math.sin(angle/2);data[i*4+3]=Math.cos(angle/2);
   }repl.set(JOINTS[k],data);
  }
  let n=0;const channels=base.channels.map(ch=>{
   const key=(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path;
   const curve=repl.get(key);if(!curve)return ch;
   n++;return {node:ch.node,path:ch.path,sam:{times:ch.sam.times,data:curve,interpolation:'LINEAR'}};
  });
  if(n!==6)throw Error('Hind patch expected 6 channels; got '+n);
  g.animations.push({name:NAME,duration:base.duration,channels});
  const idx=g.animations.length-1,sel=document.getElementById('animations'),o=document.createElement('option');
  o.value=String(idx);o.textContent='★ Gallop V13.2 — 뒷다리 신장 보정';sel.appendChild(o);
  sel.value=String(idx);sel.dispatchEvent(new Event('change'));
  document.title='HORSE RANCH V13.2 — 뒷다리 과신장 개선';
  const t=document.querySelector('#header h1');if(t)t.textContent='HORSE RANCH V13.2 · 뒷다리 과신장 보정';
  const d=document.getElementById('subtitle');if(d)d.textContent='기존 V13.1의 Gallop 리듬·앞다리·복부 보존 / 뒷다리의 과도한 회수 경로만 제한';
  window.__horseGaitV13_2={ready:true,clip:NAME,patchedHindChannels:n,basePreserved:true,frontUntouched:true,bellyUntouched:true,walkUntouched:true};
 }catch(e){window.__horseV13_2Error=e.message;console.error(e);}
},100);
})();