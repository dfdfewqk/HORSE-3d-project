/* HORSE RANCH V13.5 — selective hind stifle/hock swing-fold correction.
 * Requires V13.4; no mesh, weights, bind pose, hip/fetlock, or other gait changes.
 * Correction amplitudes are model-specific visual tuning, NOT measured equine joint angles.
 */
(function(){'use strict';
const NAME='Gallop_V13_5_HIND_HOCK_FOLD', N=160;
const TARGET=['HindR_Stifle','HindR_Hock','HindL_Stifle','HindL_Hock'];
const smooth=(a,b,x)=>{const u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);};
const angle=(q,i)=>2*Math.atan2(q[i*4],q[i*4+3]);
let waits=0;const timer=setInterval(()=>{
 if(!window.__horseGaitV13_2?.ready||!window.__horseGaitV12?.hindRegionProtectedV134){
  if(++waits>700){clearInterval(timer);window.__horseV135FoldError='V13.4 not ready';}return;
 }
 clearInterval(timer);
 try{
  const g=object3d,base=g.animations.find(a=>a.name==='Gallop_V13_2_HIND_BOUNDED');
  if(!base||g.animations.some(a=>a.name===NAME)||g.skins?.[0]?.joints.length!==19)
   throw Error('Expected V13.4 19-bone source clip');
  const curves=new Map();
  for(const side of ['R','L']){
   const byName=new Map(base.channels.map(ch=>[(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path,ch]));
   const knee=byName.get('Hind'+side+'_Stifle|rotation'),hock=byName.get('Hind'+side+'_Hock|rotation');
   if(!knee||!hock||knee.sam.data.length!==N*4||hock.sam.data.length!==N*4)
    throw Error('Missing hind stifle/hock samples for '+side);
   const center=side==='R'?111:132;
   for(const [bone,ch,degrees] of [['Stifle',knee,-10],['Hock',hock,-18]]){
    const out=new Float32Array(N*4);
    for(let i=0;i<N;i++){
     const distance=Math.abs(((i-center+80+320)%N)-80);
     const envelope=(1-smooth(11,38,distance))*smooth(15,33,angle(knee.sam.data,i)*180/Math.PI);
     const theta=angle(ch.sam.data,i)+degrees*Math.PI/180*envelope;
     out[i*4]=Math.sin(theta/2);out[i*4+3]=Math.cos(theta/2);
    }
    curves.set('Hind'+side+'_'+bone+'|rotation',out);
   }
  }
  let updated=0;
  const channels=base.channels.map(ch=>{
   const key=(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path;
   if(!curves.has(key))return ch;
   updated++;return {node:ch.node,path:ch.path,sam:{times:ch.sam.times,data:curves.get(key),interpolation:'LINEAR'}};
  });
  if(updated!==4||channels.length!==base.channels.length)throw Error('Expected four hind-only tracks');
  g.animations.push({name:NAME,duration:base.duration,channels});
  const index=g.animations.length-1,sel=document.getElementById('animations'),option=document.createElement('option');
  option.value=String(index);option.textContent='★ Gallop V13.5 — 비절·슬관절 공중 회수';sel.append(option);
  sel.value=String(index);sel.dispatchEvent(new Event('change'));
  window.__horseGaitV135Fold={ready:true,clip:NAME,changedTracks:updated,foreBodyTracksSame:true,skinSame:true,restBindSame:true,verifiedOnUserGPU:false};
 }catch(e){window.__horseV135FoldError=String(e.message||e);console.error('V13.5 hind fold',e);}
},100);
})();