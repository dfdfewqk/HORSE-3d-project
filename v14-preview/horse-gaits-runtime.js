/* HORSE RANCH V14: four selectable gait modes. Preserve 19-bone GLB internally. */
/* preserved gallop-v12.js */
/* HORSE RANCH V12 — independently-authored preview Gallop for four legs,
   torso phase correction, and selective belly weights; preserves old clips & 19-bone source.
   This is NOT original Blender 456-bone Action / physics-grounded contact. */
(function(){'use strict';
const CLIP_NAME='Gallop_V12_FOUR_LEG_REBUILD';
const SAMPLES=160,DURATION=.72,HARMONICS=12;
const TRACKS=["Torso|translation|1","Torso|translation|2","Torso|rotation","HindR_Hip|rotation","HindR_Stifle|rotation","HindR_Hock|rotation","HindR_Fetlock|rotation","HindL_Hip|rotation","HindL_Stifle|rotation","HindL_Hock|rotation","HindL_Fetlock|rotation","ForeR_Shoulder|rotation","ForeR_Knee|rotation","ForeR_Fetlock|rotation","ForeL_Shoulder|rotation","ForeL_Knee|rotation","ForeL_Fetlock|rotation"];
const DATA='ADIeACAAAAAAAAAAAAAAAAAAAAAAAAAAAACM/+j/AAAAAAAAAAAAAAAAAAAAAAAAAACskLX/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAATgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMPmpAkX+6/0K/6z/3//y//j/+f/9//3//f9NFqD+rgDs/7P/5v/4//3/AwADAAMAAgD1BVv3TAVQAKb/CQATAAUABAD//wMAAgD//xAByv2fAToA1f8DAAQAAAAAAP7/AQABANgKYvoFA13/4P/8/wcAAQABAP7/AgABAP//pQB9/dQALQDo//3/AgD+/wEAAAABAAAAxgR5/wAAAAAAAAAAAAAAAAAAAAAAAAAAAACfAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAw+Y/yfAEsAfEA8//g//D/+f/6//7/AQAEAEYQXP4m/jIAcQAbAAEA+//7//z//P8AAPUFeffgAbr+YQDY/wYABwAEAAAAAQD+/wEAi/ptBfP+0v8SAO7/AAABAP//AwAAAAAA2Aqv+1EC9/8lAO///v8CAAEA/v8AAP//AQBZ/CwD9f7X/xIA+P8BAP7//v8CAAAAAADGBHX+AAAAAAAAAAAAAAAAAAAAAAAAAAAAALoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIj29e2e/MP+BgFo/zAABgDz/wkAAgD7/wUAFOh8A5P9gwD6/8n/HwD5//j/CAD9/wAAEhcJDk78hv/E/w8A8P8DAAYAAgABAAIAAAC97HT4XQCd/93/FAD5/wIAAQD9/wIAAAAMAgwCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIj2YAm8/e0Bef/6/wcA/P8DAAEA/v8AAAEA7uS1++0B/P6YALf/HwDx/wwA+P8GAPv/Ehc3GFIIWAD3/93///8FAAAA/v///wAAAAAG/tH+gv9zAPH/GgD6/wcAAQADAP3/AAAMAjQBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKgBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
function decode(){
 const raw=atob(DATA);const series=TRACKS.length,per=1+HARMONICS*2;
 if(raw.length!==series*per*2)throw Error('V12 compact data damaged');
 const get=(i)=>{const x=raw.charCodeAt(i*2)+raw.charCodeAt(i*2+1)*256;return (x>32767?x-65536:x)/10000;};
 const result={},torso=new Float32Array(SAMPLES*3);let offset=0;
 for(const key of TRACKS){const coeff=new Float32Array(per);
  for(let i=0;i<per;i++)coeff[i]=get(offset++);
  const angle=key.startsWith('Torso|translation|')?false:true;
  const c=angle?new Float32Array(SAMPLES*4):torso;
  const component=angle?0:Number(key.split('|').at(-1));
  for(let i=0;i<SAMPLES;i++){
   const phase=i/SAMPLES;let v=coeff[0];
   for(let k=1;k<=HARMONICS;k++){const a=2*Math.PI*k*phase;v+=coeff[k]*Math.cos(a)+coeff[k+HARMONICS]*Math.sin(a);}
   if(angle){c[i*4]=Math.sin(v/2);c[i*4+3]=Math.cos(v/2);}
   else c[i*3+component]=v;
  }
  if(angle)result[key]=c;
 }
 result['Torso|translation']=torso;
 return result;
}
function smoothstep(a,b,x){let t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
function editBelly(g){
 const mesh=g.doc.meshes?.[0],raw=mesh?.primitives?.[0],part=g.meshes?.[0]?.[0];
 if(!raw||!part||raw.attributes.JOINTS_0===undefined)return {corrected:0};
 const at=raw.attributes,pos=readAccessor(g,at.POSITION),joints=readAccessor(g,at.JOINTS_0),weights=readAccessor(g,at.WEIGHTS_0),names=g.skins[0].joints.map(id=>g.doc.nodes[id]?.name),torso=names.indexOf('Torso');
 if(torso<0)throw Error('Torso skin joint missing');let corrected=0;let before=0,after=0;
 for(let i=0;i<pos.length/3;i++){
  const x=Math.abs(pos[i*3]),y=pos[i*3+1],z=pos[i*3+2];
  const center=1-smoothstep(.13,.245,x),vert=smoothstep(.43,.69,y)*(1-smoothstep(1.03,1.20,y));
  const fore=smoothstep(-2.98,-2.63,z)*(1-smoothstep(-2.35,-2.16,z));
  const hind=smoothstep(-3.84,-3.53,z)*(1-smoothstep(-3.04,-2.78,z));
  // V13.4: the broad V12 abdominal mask reached the hind stifle/hock skin.
  // Keep the original fore-abdomen coverage while limiting the rear mask
  // to the central abdominal strip; never repaint actual hind-leg vertices.
  const hindCore=1-smoothstep(.04,.10,x);
  const strength=.98*vert*Math.max(center*fore,hindCore*hind);
  if(strength<.015)continue;
  let idx=i*4,ti=-1,weak=0;
  for(let k=0;k<4;k++){if(joints[idx+k]===torso)ti=k;if(weights[idx+k]<weights[idx+weak])weak=k;}
  let old=ti>=0?weights[idx+ti]:0;before+=old;
  for(let k=0;k<4;k++)weights[idx+k]*=(1-strength);
  if(ti<0){ti=weak;joints[idx+ti]=torso;weights[idx+ti]=strength;}else weights[idx+ti]+=strength;
  let total=0;for(let k=0;k<4;k++)total+=weights[idx+k];
  if(total>0)for(let k=0;k<4;k++)weights[idx+k]/=total;
  after+=weights[idx+ti];corrected++;
 }
 if(!ctx2d){
  gl.bindVertexArray(part.vao);
  attr(part.vao,program.attr.aJoints,joints,4);
  attr(part.vao,program.attr.aWeights,weights,4);
  gl.bindVertexArray(null);
 }else{part.joints=joints;part.weights=weights;}
 return {corrected,torsoAvgBefore:corrected?before/corrected:0,torsoAvgAfter:corrected?after/corrected:0};
}
function install(){
 if(window.__horseGaitV12)return;
 const g=object3d;if(!g||!window.__viewerReady)return;
 const ref=g.animations.find(a=>a.name==='Gallop_HIND_FLEX_CANDIDATE_PREVIEW');
 if(!ref)throw Error('Original V7 reference Gallop not found');
 const data=decode(),found=new Set(),tm=new Float32Array(SAMPLES);
 for(let i=0;i<SAMPLES;i++)tm[i]=DURATION*i/SAMPLES;
 const channels=ref.channels.map(ch=>{
  const key=(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path;
  if(!Object.prototype.hasOwnProperty.call(data,key))return ch;
  found.add(key);return {node:ch.node,path:ch.path,sam:{times:tm,data:data[key],interpolation:'LINEAR'}};
 });
 if(found.size!==16||channels.length!==19)throw Error('V12 joint channel mismatch: '+found.size+'/16');
 const belly=editBelly(g);
 if(belly.corrected<100)throw Error('Insufficient abdominal weight vertices corrected: '+belly.corrected);
 g.animations.push({name:CLIP_NAME,duration:DURATION,channels});
 const idx=g.animations.length-1,sel=document.getElementById('animations'),o=document.createElement('option');o.value=String(idx);o.textContent='★ Gallop V12 · 네 다리 + 배 교정';sel.appendChild(o);
 sel.value=String(idx);sel.dispatchEvent(new Event('change'));
 document.title='HORSE RANCH V12 — Gallop 전면 개선';
 const h=document.querySelector('#header h1');if(h)h.textContent='HORSE RANCH V12 · 네 다리 및 복부 개선';
 const sub=document.getElementById('subtitle');if(sub)sub.textContent='Gallop: 앞다리·뒷다리 독립 동작 / 복부 스킨 가중치 보정 / 몸통 주기 개선 · 임시 19본 리그 개선판';
 const note=document.getElementById('note');if(note)note.textContent='V12 새 Gallop 기본 적용 · Walk/Trot/Canter 원본 키 유지 · 원본 Blender 456본은 별도 복구 대상';
 window.__horseGaitV12={clip:CLIP_NAME,updatedChannels:found.size,samples:SAMPLES,belly:belly,walkTrotCanterUnmodified:true,hindRegionProtectedV134:true};
}
let checks=0;const poll=setInterval(()=>{
 if(!window.__viewerReady){if(++checks>700){clearInterval(poll);window.__horseV12Error='Base viewer loading timeout';}return;}
 clearInterval(poll);
 try{install();}catch(e){window.__horseV12Error=e.message;console.error('HORSE RANCH V12',e);}
},100);
})();
;
/* preserved gallop-v13-1.js */
/* HORSE RANCH V13.1: joint-length-constrained hoof-proxy motion; integrated four-limb timing; walk correction; belly GPU parity.
 * 19-joint WEB preview only. Not a native 456-bone export, nor physical hoof-contact proof. */
(function(){'use strict';
const N=160, NAMES=["Torso|translation|1", "Torso|translation|2", "Torso|rotation", "HindR_Hip|rotation", "HindR_Stifle|rotation", "HindR_Hock|rotation", "HindR_Fetlock|rotation", "HindL_Hip|rotation", "HindL_Stifle|rotation", "HindL_Hock|rotation", "HindL_Fetlock|rotation", "ForeR_Shoulder|rotation", "ForeR_Knee|rotation", "ForeR_Fetlock|rotation", "ForeL_Shoulder|rotation", "ForeL_Knee|rotation", "ForeL_Fetlock|rotation"], PACKED='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5A8gEU0SZhNnFE4VFha9FkEXoBfYF+kX0xeWFzQXrBYCFjgVUBROEzcSDRHVD5UOUQ0PDNQKpgmMCIkHpQblBUsF3gSeBIUEgQSBBIIEhASHBIsEkQSYBKEErAS4BMYE1QTnBPoEDwUmBT8FWQV1BZIFsAXQBfEFEwY2BloGfgaiBscG6wYQBzQHWAd6B5wHvQfdB/sHGAgzCEwIYgh3CIoImginCLIIugjACMIIwgi/CLkIsAilCJYIhQhxCFoIQQglCAcI5gfEB58HeAdQByYH+wbPBqIGdAZGBlMMZgx6DI0MoAyyDMUM1wzpDPoMCw0cDSwNPA1LDVkNZw10DYANjA2XDaENqw20DbwNxA3MDdIN2A3eDeMN6A3sDfAN9A33DfsN+w30DeANvw2TDVwNHA3UDIUMMAzXC3kLGQu2ClIK7AmGCSEJvQhcCP4HpQdTBwkHyAaSBmgGSQY4BjQGPgZUBnYGpAbcBh0HZge0BwYIWwiwCAMJUgmbCdwJEwo+Cl4KcgqBCo4KmQqkCq4KtwrACscKzgrVCtoK3wrjCucK6grsCu4K7wrvCu8K7wruCuwK6groCuYK4wrhCt4K2wrYCtUK0grQCs4KzArKCskKyArICsgKyQrKCswKzgrSCtYK2wrgCuYK7Qr1Cv4KBwsRCxwLJwszC0ALTgtcC2sLeguKC5sLrAu9C88L4Qv0CwcMGgwtDEAMqgOdA48DgQN0A2YDWANLAz0DLwMiAxUDBwP6Au0C4QLUAsgCvAKwAqQCmQKOAoQCegJwAmYCXQJVAk0CRQI+AjcCMAIrAiUCIAIcAhgCFQISAg8CDgIMAgwCDAIMAg0CDgIQAhMCFgIZAh4CIgInAi0CMwI5AkACSAJQAlgCYQJqAnQCfgKIApMCngKpArUCwQLNAtkC5gLyAv8CDQMaAycDNQNCA1ADXgNrA3kDhwOUA6IDrwO9A8oD1wPkA/ED/QMKBBYEIQQtBDgEQwRNBFgEYQRrBHQEfASFBIwElASbBKEEpwSsBLEEtQS5BL0EwATCBMQExQTGBMYExQTEBMMEwQS+BLsEuAS0BK8EqgSlBJ4EmASRBIkEgQR5BHAEZwReBFQESQQ/BDQEKAQdBBEEBQT4A+wD3wPSA8UDtwPc/XP96vxJ/JT70foD+i75Vfh796D2yPXz9CP0WfOX8t3xLPGG8Ozv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';
const GAITS=[{name:'Gallop_V13_1_COHERENT',duration:.72},{name:'Walk_V13_1_GROUNDED',duration:1.44}];
function decode(){let s=atob(PACKED),size=GAITS.length*NAMES.length*N*2;
 if(s.length!==size)throw Error('V13 gait sample count mismatch');
 let a=new DataView(new ArrayBuffer(s.length));for(let i=0;i<s.length;i++)a.setUint8(i,s.charCodeAt(i));
 let gaits=[];let p=0;
 for(let gait of GAITS){const data={};const xyz=new Float32Array(N*3);
  for(let key of NAMES){const values=new Float32Array(N);for(let i=0;i<N;i++)values[i]=a.getInt16(p,true)/10000,p+=2;
   if(key==='Torso|translation|1'||key==='Torso|translation|2'){const idx=Number(key.split('|').at(-1));for(let i=0;i<N;i++)xyz[i*3+idx]=values[i];}
   else{const q=new Float32Array(N*4);for(let i=0;i<N;i++){q[i*4]=Math.sin(values[i]/2);q[i*4+3]=Math.cos(values[i]/2);}data[key]=q;}
  }data['Torso|translation']=xyz;gaits.push(data);
 }return gaits;}
const DECODED=decode();
function syncBelly(g){
 const raw=g.doc.meshes?.[0]?.primitives;if(!raw?.length)throw Error('V13 body mesh unavailable');
 const body=raw[0],sharedJ=body.attributes.JOINTS_0,sharedW=body.attributes.WEIGHTS_0;
 const joints=readAccessor(g,sharedJ),weights=readAccessor(g,sharedW);let updated=0;
 if(!ctx2d){for(let i=0;i<raw.length;i++){
  if(raw[i].attributes.JOINTS_0!==sharedJ||raw[i].attributes.WEIGHTS_0!==sharedW)continue;
  const p=g.meshes[0][i];if(!p||!p.vao)continue;
  gl.bindVertexArray(p.vao);attr(p.vao,program.attr.aJoints,joints,4);attr(p.vao,program.attr.aWeights,weights,4);gl.bindVertexArray(null);updated++;
 }}else{for(let i=0;i<raw.length;i++){
  if(raw[i].attributes.JOINTS_0!==sharedJ||raw[i].attributes.WEIGHTS_0!==sharedW)continue;
  if(g.meshes[0][i]){g.meshes[0][i].joints=joints;g.meshes[0][i].weights=weights;updated++;}
 }}if(updated<2)throw Error('V13 overlapping abdomen skin parts not synchronized');
 return updated;
}
function addGait(g,ref,data,info){
 const times=Float32Array.from({length:N},(_,i)=>i*info.duration/N),seen=new Set();
 const channels=ref.channels.map(ch=>{const key=(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path;
  if(!data[key])return ch;seen.add(key);return {node:ch.node,path:ch.path,sam:{times,data:data[key],interpolation:'LINEAR'}};
 });
 if(seen.size!==NAMES.length-1||channels.length!==19)throw Error('V13 gait channel count invalid '+seen.size);
 g.animations.push({name:info.name,duration:info.duration,channels});return g.animations.length-1;
}
function findNearestPhase(g,index,oldPose){let best=0,min=1e30,clip=g.animations[index];
 for(let k=0;k<N;k+=2){let sc=0;for(const ch of clip.channels){if(ch.path!=='rotation')continue;
  const name=g.doc.nodes[ch.node]?.name||'';if(name==='Tail'||name==='Head'||name==='Neck')continue;
  const q=oldPose[ch.node]?.q;if(!q)continue;const o=k*4,a=ch.sam.data;
  const dot=Math.abs(q[0]*a[o]+q[1]*a[o+1]+q[2]*a[o+2]+q[3]*a[o+3]);sc+=1-Math.min(1,dot);
 }if(sc<min){min=sc;best=k;}}
 return best*clip.duration/N;
}
function blendQuaternion(a,b,t){let dot=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3],sign=dot<0?-1:1;
 let o=[a[0]*(1-t)+b[0]*t*sign,a[1]*(1-t)+b[1]*t*sign,a[2]*(1-t)+b[2]*t*sign,a[3]*(1-t)+b[3]*t*sign];
 const l=Math.hypot(...o)||1;return o.map(v=>v/l);
}
function installTransition(g){
 let blend=null;const old=setClip;
 // The viewer resets clip time on selection. Catch current pose before that handler.
 animSel.addEventListener('change',()=>{
  const i=Number(animSel.value),target=g.animations[i];if(!target)return;
  const snapshot=g.nodes.map(n=>({q:[...n.q],t:[...n.t]}));
  const phase=findNearestPhase(g,i,snapshot),beg=performance.now();
  blend={from:snapshot,start:beg,duration:550,phase};
  Promise.resolve().then(()=>{if(blend&&blend.start===beg)animTime=phase;});
 },true);
 setClip=function(model){old(model);if(!blend)return;
  const u=Math.max(0,Math.min(1,(performance.now()-blend.start)/blend.duration));
  const t=u*u*(3-2*u);
  for(let i=0;i<model.nodes.length;i++){const n=model.nodes[i],from=blend.from[i];
   n.q=blendQuaternion(from.q,n.q,t);
   n.t=n.t.map((v,k)=>from.t[k]*(1-t)+v*t);
  }if(u>=1)blend=null;
 };
 return ()=>({inProgress:!!blend});
}
let attempts=0;const timer=setInterval(()=>{
 if(!window.__viewerReady||!window.__horseGaitV12){if(++attempts>700){clearInterval(timer);window.__horseV13Error='V12 or GLB load timeout';}return;}
 clearInterval(timer);
 try{
  const g=object3d;
  const backup=g.animations.find(a=>a.name==='Gallop_HIND_FLEX_CANDIDATE_PREVIEW');
  const walk=g.animations.find(a=>a.name==='Walk_PREVIEW');
  if(!backup||!walk)throw Error('Base reference animations missing');
  const correctedSkins=syncBelly(g);
  const gi=addGait(g,backup,DECODED[0],GAITS[0]),wi=addGait(g,walk,DECODED[1],GAITS[1]);
  const o1=document.createElement('option');o1.value=String(gi);o1.textContent='★ Gallop V13.1 — 동기화';animSel.append(o1);
  const o2=document.createElement('option');o2.value=String(wi);o2.textContent='★ Walk V13.1 — 독립 4박자';animSel.append(o2);
  const transition=installTransition(g);
  animSel.value=String(gi);animSel.dispatchEvent(new Event('change'));
  document.title='HORSE RANCH V13.1 — 통합 보행 수정';
  const title=document.querySelector('#header h1');if(title)title.textContent='HORSE RANCH V13.1 · 보행 동기화';
  const subtitle=document.getElementById('subtitle');if(subtitle)subtitle.textContent='Gallop 네 다리 공통 보폭 / Walk 독립 4박자 / 복부 두 메쉬 가중치 일치 · 19본 개선판';
  const note=document.getElementById('note');if(note)note.textContent='V13.1 Gallop 기본 · V12 원형 비교 선택 가능 · 원본 Blender 456본 복원본은 아님';
  window.__horseGaitV13={ready:true,clips:[GAITS[0].name,GAITS[1].name],correctedSkins,states:transition,proxyIK:true,original456Rig:false};
 }catch(e){window.__horseV13Error=e.message;console.error('V13.1 error',e);}
},100);
})();
;
/* preserved gallop-v13-2.js */
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
;
/* preserved gallop-v13-5.js */
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
;
/* preserved gallop-v13-7.js */
/* HORSE RANCH V13.7b — lower-acceleration hind-chain warp experiment.
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
  // Hind warp amplitude 4 -> 1 (fore remains 1) based on a 160-sample
  // source-curve acceleration comparison. Proxy minima are not actual contact.
  const slow=1;
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
   opt.value=String(newIndex);opt.textContent='△ V13.7b 실험 — 후지 각가속도 완화';
   list.appendChild(opt);list.value=String(newIndex);list.dispatchEvent(new Event('change'));
   window.__horseGaitV137={ready:true,clip:NAME,changedTracks:modified,
    leftLeadTarget:true,footfalls:FOOTFALLS,phaseDiagnostics,
    originalGLBPreserved:true,originalGaitsPreserved:true,
    contactVerified:false,visualVerified:false,userGPUVerified:false,
    hindWarpAmplitudeSamples:1,requiresGLBSkinRetest:true};
  }catch(e){window.__horseV137Error=String(e?.message||e);console.error('V13.7 candidate',e);}
 },100);
})();

;
/* preserved gallop-v13-8.js */
/* HORSE RANCH V13.8 — whole-body balanced Gallop EXPERIMENT.
 * Builds only a new animation clip from V13.7b; original GLB, meshes, joints,
 * skin, weights and every preexisting clip remain unchanged. WEB 19-joint rig.
 * Contact times are prior hoof-PROXY minima, NOT observed foot-contact data.
 * DO NOT ship to main before actual GLB and rendered-motion validation.
 */
(function(){'use strict';
 const NAME='Gallop_V13_8_WHOLE_BODY_BALANCE_CANDIDATE';
 const SOURCE='Gallop_V13_7_INTEGRATED_CANDIDATE';
 const N=160,TAU=2*Math.PI,RAD=Math.PI/180;
 // Cues: RH 11, LH 35, RF 59, LF 82; flight-like gap after LF.
 // Event-weighted responses are deliberately small and continuously periodic.
 const pulse=(i,center,width)=>Math.exp((Math.cos(TAU*(i-center)/N)-1)*Math.pow(N/(TAU*width),2));
 const heightRaw=i=>-.008*pulse(i,11,12)-.010*pulse(i,35,13)
                     +.010*pulse(i,53,16)-.012*pulse(i,81,15)
                     +.020*pulse(i,119,23);
 const pitchRaw=i=>-.20*pulse(i,11,14)+.35*pulse(i,45,18)
                     -.55*pulse(i,81,17)+.35*pulse(i,121,26);
 const average=f=>Array.from({length:N},(_,i)=>f(i)).reduce((a,b)=>a+b,0)/N;
 const meanY=average(heightRaw),meanPitch=average(pitchRaw);
 const responseY=i=>heightRaw(i)-meanY;
 const responsePitch=i=>pitchRaw(i)-meanPitch; // degrees, rig-local X
 const secondary={
  Neck:i=>-.58*responsePitch(i-3)+.10*Math.sin(TAU*(i-13)/N),
  Head:i=>-.38*responsePitch(i-6)+.07*Math.sin(TAU*(i-23)/N),
  Tail:i=>-.45*responsePitch(i-10)+.30*Math.sin(TAU*(i-75)/N)
 };
 function composeX(arr,i,delta){
  const k=4*i,x=arr[k],y=arr[k+1],z=arr[k+2],w=arr[k+3];
  const s=Math.sin(delta*RAD/2),c=Math.cos(delta*RAD/2);
  const out=[w*s+x*c,y*c+z*s,z*c-y*s,w*c-x*s];
  const length=Math.hypot(...out);
  if(!Number.isFinite(length)||length<.999||length>1.001)
   throw Error('Invalid source/additive quaternion at sample '+i);
  return out.map(v=>v/length);
 }
 let retries=0;
 const check=setInterval(()=>{
  if(!window.__horseGaitV137?.ready){
   if(++retries>700){clearInterval(check);window.__horseV138Error='V13.7b unavailable';}
   return;
  }
  clearInterval(check);
  try{
   const g=object3d,base=g?.animations.find(a=>a.name===SOURCE);
   if(!base||g.skins?.[0]?.joints?.length!==19||g.animations.some(a=>a.name===NAME))
    throw Error('Expected unique V13.7b source in 19-joint preview');
   if(base.channels.length!==19||Math.abs(base.duration-.72)>1e-6)
    throw Error('Unexpected source track count or duration');
   const key=ch=>(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path;
   const byName=new Map(base.channels.map(ch=>[key(ch),ch]));
   const required=['Torso|translation','Torso|rotation','Neck|rotation','Head|rotation','Tail|rotation'];
   for(const name of required){
    const c=byName.get(name),rotation=name.endsWith('rotation');
    const length=c?.sam?.times?.length;
    if(!c||!length||length<2||c.sam?.data?.length!==length*(rotation?4:3)
       ||(name.startsWith('Torso|')&&length!==N))
     throw Error('Missing/mismatched whole-body source track: '+name);
   }
   const changed=new Map(),stats={maxAddedY:0,maxAddedPitch:0,secondaryMax:{}};
   const torsoPosition=new Float32Array(byName.get('Torso|translation').sam.data);
   for(let i=0;i<N;i++){
    const dy=responseY(i);
    torsoPosition[i*3+1]+=dy;
    stats.maxAddedY=Math.max(stats.maxAddedY,Math.abs(dy));
    stats.maxAddedPitch=Math.max(stats.maxAddedPitch,Math.abs(responsePitch(i)));
   }
   changed.set('Torso|translation',torsoPosition);
   for(const name of ['Torso','Neck','Head','Tail']){
    const source=byName.get(name+'|rotation').sam.data;
    const track=byName.get(name+'|rotation');
    const values=new Float32Array(source.length);
    let peak=0;
    for(let i=0;i<track.sam.times.length;i++){
     // Existing head/neck/tail samplers may use fewer than 160 keys.
     // Add motion at each original key's timestamp; preserve its sampling grid.
     const phase=track.sam.times[i]/base.duration*N;
     const delta=name==='Torso'?responsePitch(phase):secondary[name](phase);
     peak=Math.max(peak,Math.abs(delta));
     values.set(composeX(source,i,delta),i*4);
    }
    if(name!=='Torso')stats.secondaryMax[name]=peak;
    changed.set(name+'|rotation',values);
   }
   let count=0;
   const channels=base.channels.map(ch=>{
    const data=changed.get(key(ch));
    if(!data)return ch;
    count++;
    return {node:ch.node,path:ch.path,sam:{times:ch.sam.times,data,interpolation:'LINEAR'}};
   });
   if(count!==5||channels.length!==19)throw Error('Expected five new whole-body tracks, got '+count);
   const select=document.getElementById('animations');
   if(!select)throw Error('Missing animation selector');
   const newIndex=g.animations.length;
   g.animations.push({name:NAME,duration:base.duration,channels});
   const option=document.createElement('option');
   option.value=String(newIndex);
   option.textContent='△ V13.8 실험 — 몸통·사지·목·머리·꼬리 통합';
   select.appendChild(option);
   select.value=String(newIndex);
   select.dispatchEvent(new Event('change'));
   window.__horseGaitV138={ready:true,clip:NAME,from:SOURCE,
    changedTracks:5,inheritedLimbTracks:14,rigJoints:19,
    originalClipsPreserved:true,originalGLBPreserved:true,stats,
    contactVerified:false,fullGLBSkinVerified:false,visualVerified:false,userGPUVerified:false};
  }catch(e){window.__horseV138Error=String(e?.message||e);console.error('V13.8 candidate',e);}
 },100);
})();

;
/* preserved gallop-v13-9.js */
/* HORSE RANCH V13.9 — measured-proxy-informed support response CANDIDATE.
 * Reference 19-joint embedded GLB; preserves original mesh, skin, inverse bind,
 * limb-channel references and all pre-existing clips. This is NOT ground IK.
 * Before release, verify foot sole contact, 160-frame skin and native WebGL.
 */
(function(){'use strict';
  const NAME='Gallop_V13_9_SUPPORT_BALANCE_CANDIDATE';
  const SOURCE='Gallop_V13_8_WHOLE_BODY_BALANCE_CANDIDATE';
  const N=160, DURATION=.72, TWO_PI=2*Math.PI;
  const requiredParts=['Torso','Neck','Head','Tail','HindR_Hip','HindL_Hip','ForeR_Shoulder','ForeL_Shoulder'];
  const pulse=(frame,center,width)=>Math.exp((Math.cos(TWO_PI*(frame-center)/N)-1)*Math.pow(N/(TWO_PI*width),2));
  // A SMALL reversible corrective lift, not a measured force or physical contact.
  // Fitted only to actual GLB V13.8 distal mesh-proxy minima: RH sample 12, LH 33.
  // Other stance, collision, and root-motion checks are not yet proven.
  const support=frame=>.006*pulse(frame,12,14)+.011*pulse(frame,33,14);
  let tries=0;
  const poll=setInterval(()=>{
    if(!window.__horseGaitV138?.ready){
      if(++tries>700){clearInterval(poll);window.__horseV139Error='V13.8 not ready';}
      return;
    }
    clearInterval(poll);
    try{
      const g=object3d;
      const base=g?.animations?.find(a=>a.name===SOURCE);
      if(!base||g.skins?.[0]?.joints?.length!==19||g.animations.some(a=>a.name===NAME))
        throw Error('Expected unique V13.8 clip on 19-joint source');
      if(base.channels.length!==19||Math.abs(base.duration-DURATION)>1e-6)
        throw Error('Unexpected source clip track count/duration');
      if(!window.__horseGaitV12?.hindRegionProtectedV134||
         window.__horseGaitV12?.belly?.corrected!==440)
        throw Error('V13.4 protected 440-vertex abdomen weights not confirmed');
      if(window.__horseGaitV137?.hindWarpAmplitudeSamples!==1)
        throw Error('Expected V13.7b low-amplitude limb source');
      const key=ch=>(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path;
      const keys=new Set(base.channels.map(key));
      for(const name of requiredParts){
        if(!keys.has(name+'|rotation'))throw Error('Missing joint in source: '+name);
      }
      const torso=base.channels.find(ch=>key(ch)==='Torso|translation');
      if(!torso||torso.sam?.times?.length!==N||torso.sam?.data?.length!==N*3)
        throw Error('Torso translation must be 160 VEC3 samples');
      const data=new Float32Array(torso.sam.data);
      let maxLift=0;
      for(let i=0;i<N;i++){
        const y=data[3*i+1],lift=support(i);
        if(!Number.isFinite(y)||!Number.isFinite(lift)||lift<0||lift>.018)
          throw Error('Invalid support correction at frame '+i);
        data[3*i+1]=y+lift;
        maxLift=Math.max(maxLift,lift);
      }
      // All other 18 channel objects are reused rather than silently retimed.
      let updated=0;
      const channels=base.channels.map(ch=>{
        if(ch!==torso)return ch;
        updated++;
        return {node:ch.node,path:ch.path,
          sam:{times:ch.sam.times,data,interpolation:'LINEAR'}};
      });
      if(updated!==1||channels.length!==base.channels.length)
        throw Error('Unexpected torso-only corrective patch count');
      const selector=document.getElementById('animations');
      if(!selector)throw Error('Missing animation selector');
      const clipIndex=g.animations.length;
      g.animations.push({name:NAME,duration:base.duration,channels});
      const opt=document.createElement('option');
      opt.value=String(clipIndex);
      opt.textContent='△ V13.9 시험 — 후지 지지·몸통 균형';
      selector.appendChild(opt);
      selector.value=opt.value;
      selector.dispatchEvent(new Event('change'));
      window.__horseGaitV139={ready:true,clip:NAME,from:SOURCE,
        editedChannels:updated,unchangedChannelCount:18,
        sampleCount:N,maxSupportLift:maxLift,
        actualGLBProxyAnalyzed:true,actualHoofContactProven:false,
        skin160Verified:false,nativeWebGLVerified:false,originalClipsPreserved:true};
    }catch(error){
      window.__horseV139Error=String(error?.message||error);
      console.error('V13.9 support candidate',error);
    }
  },100);
})();
;
/* final four-gait controller */
/* HORSE RANCH V14 speed-dependent Gallop laboratory. EXPERIMENT ONLY.
   Source GLB, earlier 13 animations and V13.4 440 weighted vertices are preserved.
   The values in this file are design tuning, not measured physical foot contact. */
(function(){'use strict';
 const BASE='Gallop_V13_9_SUPPORT_BALANCE_CANDIDATE',N=160,TWO=2*Math.PI,RAD=Math.PI/180;
 const MODE=[
  {id:'walk',name:'Walk_V14_GROUNDED',nominal:7,period:1.44},
  {id:'cruise',name:'Gallop_V14_CRUISE',nominal:44,period:.51,warp:0,fold:0,rise:0},
  {id:'fast',name:'Gallop_V14_FAST',nominal:55,period:.46,warp:1,fold:.75,rise:.0007},
  {id:'sprint',name:'Gallop_V14_SPRINT',nominal:65,period:.42,warp:1.7,fold:1.3,rise:.0012}
 ];
 const EVENT={HindR:12,HindL:34,ForeR:59,ForeL:82},THRESHOLD=[14,50,60];
 const pulse=(i,c,w)=>Math.exp((Math.cos(TWO*(i-c)/N)-1)*(N/(TWO*w))**2);
 function sample(sam,t,size){
  let lo=0,hi=sam.times.length-1;
  if(hi<1)throw Error('Invalid animation sampler');
  while(lo<hi){let mid=(lo+hi)>>1;if(sam.times[mid]<t)lo=mid+1;else hi=mid;}
  const b=lo,a=sam.times[b]<t?b:Math.max(0,b-1);
  const w=sam.times[a]===sam.times[b]?0:Math.max(0,Math.min(1,(t-sam.times[a])/(sam.times[b]-sam.times[a])));
  const stride=sam.interpolation==='CUBICSPLINE'?size*3:size,add=sam.interpolation==='CUBICSPLINE'?size:0;
  const v=Array.from({length:size},(_,k)=>{let x=sam.data[a*stride+add+k],y=sam.data[b*stride+add+k];return x+(y-x)*w});
  if(v.some(x=>!Number.isFinite(x)))throw Error('Nonfinite animation key');
  if(size===4){const len=Math.hypot(...v);if(!Number.isFinite(len)||len<.00001)throw Error('Zero quaternion');return v.map(x=>x/len);}
  return v;
 }
 function rotateX(v,degrees){
  if(!degrees)return v;
  const [x,y,z,w]=v,s=Math.sin(degrees*RAD/2),c=Math.cos(degrees*RAD/2);
  const q=[w*s+x*c,y*c+z*s,z*c-y*s,w*c-x*s],n=Math.hypot(...q);
  if(!Number.isFinite(n)||n<.9)throw Error('Invalid adjusted quaternion');
  return q.map(x=>x/n);
 }
 function makeClip(g,base,m){
  const times=Float32Array.from({length:N},(_,i)=>i*m.period/N);
  const channels=base.channels.map(ch=>{
   const part=g.doc.nodes[ch.node]?.name||'',limb=/^(Hind[LR]|Fore[LR])_/.exec(part)?.[1],n=ch.path==='rotation'?4:3;
   if(!['rotation','translation'].includes(ch.path))throw Error('Unexpected base path '+ch.path);
   const data=new Float32Array(N*n);
   for(let i=0;i<N;i++){
    const phase=limb?(i+m.warp*(limb.startsWith('Fore')?.4:1)*Math.sin(TWO*(i-EVENT[limb])/N)+N)%N:i;
    let v=sample(ch.sam,phase/N*base.duration,n);
    if(ch.path==='rotation'){
     let delta=0;
     if(limb?.startsWith('Hind')&&(/_Stifle$|_Hock$/.test(part)))
      delta=-m.fold*pulse(i,limb==='HindR'?111:132,16)*(part.endsWith('Hock')?1:.55);
     if(part==='Torso')delta=m.fold*.1*Math.sin(TWO*(i-29)/N);
     if(part==='Neck')delta=-m.fold*.13*Math.sin(TWO*(i-6)/N);
     if(part==='Head')delta=-m.fold*.1*Math.sin(TWO*(i-10)/N);
     if(part==='Tail')delta=m.fold*.16*Math.sin(TWO*(i-16)/N);
     v=rotateX(v,delta);
    }else if(part==='Torso')v[1]+=m.rise*(Math.cos(TWO*(i-32)/N)-Math.cos(TWO*(i-110)/N));
    for(let k=0;k<n;k++){if(!Number.isFinite(v[k]))throw Error('Nonfinite generated key');data[i*n+k]=v[k];}
   }
   return {node:ch.node,path:ch.path,sam:{times,data,interpolation:'LINEAR'}};
  });
  if(channels.length!==19)throw Error('Expected 19 channels');
  return {name:m.name,duration:m.period,channels};
 }

 function generateWalk(g){
   const base=g.animations.find(a=>a.name==='Walk_V13_1_GROUNDED');
   if(!base||base.channels.length!==19)throw Error('V13.1 Walk missing');
   const ch=base.channels.find(c=>g.doc.nodes[c.node]?.name==='Torso'&&c.path==='translation');
   if(!ch||ch.sam.times.length!==160||ch.sam.data.length!==480)throw Error('Walk 160-frame torso invalid');
   const old=ch.sam.data,data=new Float32Array(old);let avg=0;
   for(let i=0;i<160;i++)avg+=old[i*3+1]/160;
   for(let i=0;i<160;i++)data[i*3+1]=avg+.6*(old[i*3+1]-avg);
   return {name:'Walk_V14_GROUNDED',duration:base.duration,
    channels:base.channels.map(c=>c===ch?
     {node:c.node,path:c.path,sam:{times:c.sam.times,data,interpolation:'LINEAR'}}:c)};
 }
 let attempts=0;
 const poll=setInterval(()=>{
  if(!window.__horseGaitV139?.ready){if(++attempts>700){clearInterval(poll);window.__horseV14Error='V13.9 timeout';}return;}
  clearInterval(poll);
  try{
   const g=object3d,base=g?.animations?.find(a=>a.name===BASE);
   if(!base||base.channels.length!==19||g.skins?.[0]?.joints?.length!==19)throw Error('Expected V13.9 19-joint source');
   if(window.__horseGaitV12?.belly?.corrected!==440)throw Error('V13.4 abdomen correction not confirmed');
   if(!g.animations.some(a=>a.name==='Canter_PREVIEW'))throw Error('Canter source missing');
   if(MODE.slice(1).some(m=>g.animations.some(a=>a.name===m.name)))throw Error('V14 already installed');
   const selector=document.getElementById('animations'),rate=document.getElementById('speed');
   if(!selector||!rate)throw Error('Viewer controls missing');
   g.animations.push(generateWalk(g));
   for(const m of MODE.slice(1)){
    g.animations.push(makeClip(g,base,m));
    const opt=document.createElement('option');opt.value=String(g.animations.length-1);
    opt.textContent='△ V14 시험 · '+m.id.toUpperCase();selector.appendChild(opt);
   }

   // Keep original rest pose, not a newly simulated fifth animation.
   const stopChoice=Array.from(selector.options).find(o=>/정지\s*자세|stop|idle/i.test(o.textContent));
   if(!stopChoice)throw Error('Original viewer still-pose choice not found');
   // The other legacy clips remain in RAM for dependencies and regression checks,
   // but only rest + Walk + three V14 Gallops appear in the dropdown.
   selector.replaceChildren(stopChoice,...MODE.map(m=>{
    const i=g.animations.findIndex(a=>a.name===m.name);
    if(i<0)throw Error('Missing gait '+m.name);
    const o=document.createElement('option');o.value=String(i);
    o.textContent=({walk:'Walk',cruise:'Gallop Cruise',fast:'Gallop Fast',sprint:'Gallop Sprint'})[m.id];
    return o;
   }));
   rate.step='.01';
   let selected=1;
   const api={ready:true,experimental:true,source:BASE,createdClips:4,originalClipsPreserved:true,
    modes:[{id:'idle',name:'정지 자세',nominal:0,period:0},
     ...MODE.map(({id,name,nominal,period})=>({id,name,nominal,period}))],
    mode:'cruise',speedKmh:44,setSpeed,
    setMode(id){
      if(id==='idle'||id==='stop')return setSpeed(0);
      const m=MODE.find(x=>x.id===id);
      if(!m)throw Error('Invalid mode '+id);
      return setSpeed(m.nominal);
    }};
   function setSpeed(speed){
    if(!Number.isFinite(Number(speed)))throw Error('Invalid race speed');
    const kmh=Math.max(0,Math.min(80,Number(speed)));
    if(kmh===0){
     if(String(selector.value)!==String(stopChoice.value)){
      selector.value=String(stopChoice.value);
      selector.dispatchEvent(new Event('change'));
     }
     api.mode='idle';api.speedKmh=0;api.period=0;api.playbackFactor=0;api.selectedClip='정지 자세';
     return {mode:'idle',clip:'정지 자세',period:0,speedKmh:0,playbackFactor:0};
    }
    let next=selected;
    while(next<3&&kmh>THRESHOLD[next]+1)next++;
    while(next>0&&kmh<THRESHOLD[next-1]-1)next--;
    const m=MODE[next],target=g.animations.findIndex(a=>a.name===m.name);
    if(target<0)throw Error('Missing speed gait: '+m.name);
    const duration=g.animations[target].duration;
    if(next!==selected||Number(selector.value)!==target){
     const current=g.animations[Number(selector.value)];
     const fraction=current?.duration?(animTime%current.duration)/current.duration:0;
     selector.value=String(target);selector.dispatchEvent(new Event('change'));
     Promise.resolve().then(()=>{animTime=fraction*duration;});
    }
    const multiplier=next===0?Math.max(.70,Math.min(1.20,kmh/m.nominal)):Math.max(.82,Math.min(1.18,kmh/m.nominal));
    rate.value=multiplier.toFixed(2);
    selected=next;
    api.mode=m.id;api.speedKmh=kmh;api.period=duration;api.playbackFactor=multiplier;
    api.selectedClip=m.name;
    return {mode:m.id,clip:m.name,period:duration,speedKmh:kmh,playbackFactor:multiplier};
   }
   api.createdClips=4;api.visibleModes=5;api.rigJoints=19;api.correctedBelly=440;
   window.__horseV14=api;setSpeed(44);
  }catch(e){window.__horseV14Error=String(e?.message||e);console.error('V14 speed gait laboratory',e);}
 },100);
})();
;
/* numerical skin QA */
/* HORSE RANCH V13.9b: deterministic 160-frame GLB skin QA.
 * No changes to GLB/poses/skin/animation. Not hoof contact or GPU validation.
 */
(function(){'use strict';
 const N=160,foot={HindR:890,HindL:3696,ForeR:984,ForeL:3790};
 const names={V14Walk:'Walk_V14_GROUNDED', V135:'Gallop_V13_5_HIND_HOCK_FOLD',
  V137b:'Gallop_V13_7_INTEGRATED_CANDIDATE',
  V138:'Gallop_V13_8_WHOLE_BODY_BALANCE_CANDIDATE',
  V139:'Gallop_V13_9_SUPPORT_BALANCE_CANDIDATE',
  V14Cruise:'Gallop_V14_CRUISE', V14Fast:'Gallop_V14_FAST', V14Sprint:'Gallop_V14_SPRINT'};
 const state={status:'idle',progress:0,result:null,error:null,run};
 window.__horseV14SkinAudit=state;
 function ok(x,label){if(!Number.isFinite(x))throw Error('Non-finite '+label);return x;}
 function mul(a,b){const o=new Float64Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;
   for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];o[c*4+r]=ok(v,'matrix');}
  return o;}
 // glTF matrices are COLUMN MAJOR; four rows and columns, no missing 3x3 row.
 function trs(t,q,s){const [x,y,z,w]=q,[sx,sy,sz]=s;
  const xx=2*x*x,yy=2*y*y,zz=2*z*z,xy=2*x*y,xz=2*x*z,yz=2*y*z,wx=2*w*x,wy=2*w*y,wz=2*w*z;
  return Float64Array.from([(1-yy-zz)*sx,(xy+wz)*sx,(xz-wy)*sx,0,
   (xy-wz)*sy,(1-xx-zz)*sy,(yz+wx)*sy,0,
   (xz+wy)*sz,(yz-wx)*sz,(1-xx-yy)*sz,0,t[0],t[1],t[2],1].map(v=>ok(v,'TRS')));}
 function sample(s,t,n){const times=s.times,data=s.data,interpolation=s.interpolation;
  if(!times?.length||!data?.length)throw Error('Empty animation sampler');
  let lo=0,hi=times.length-1;while(lo<hi){const m=(lo+hi)>>1;
   if(times[m]<t)lo=m+1;else hi=m;}
  const b=lo,a=times[b]<t?b:Math.max(0,b-1);
  const f=times[b]===times[a]?0:Math.max(0,Math.min(1,(t-times[a])/(times[b]-times[a])));
  const stride=interpolation==='CUBICSPLINE'?n*3:n,shift=interpolation==='CUBICSPLINE'?n:0,out=[];
  for(let j=0;j<n;j++){let v1=data[a*stride+shift+j],v2=data[b*stride+shift+j];
   out.push(ok(v1+(v2-v1)*(interpolation==='STEP'?0:f),'sample'));}
  if(n===4){let l=Math.hypot(...out);if(l<1e-10)throw Error('Zero quaternion');return out.map(v=>v/l);}
  return out;}
 function prepare(){
  const g=object3d;
  if(!g?.doc?.meshes?.[0]?.primitives?.[0]||g.skins?.[0]?.joints?.length!==19)
   throw Error('Expected original GLB and 19-joint skin');
  if(!window.__horseGaitV139?.ready||!window.__horseV14?.ready||!window.__horseGaitV12?.hindRegionProtectedV134||
     window.__horseGaitV12?.belly?.corrected!==440)throw Error('V13.9/V13.4 are not ready');
  const raw=g.doc.meshes[0].primitives[0],at=raw.attributes;
  const pos=readAccessor(g,at.POSITION),j=readAccessor(g,at.JOINTS_0),
   w=readAccessor(g,at.WEIGHTS_0),idx=readAccessor(g,raw.indices);
  const count=pos.length/3,limbNames=g.skins[0].joints.map(id=>g.doc.nodes[id].name);
  if(count!==24314)throw Error('Unexpected body vertex count '+count);
  const inRegion={hind:new Uint8Array(count),fore:new Uint8Array(count)};
  for(let i=0;i<count;i++){let h=0,f=0;
   for(let k=0;k<4;k++){const name=limbNames[j[i*4+k]],weight=w[i*4+k];
    ok(weight,'skin weight');if(!name)throw Error('Missing skin joint name');
    if(name.startsWith('Hind'))h+=weight;if(name.startsWith('Fore'))f+=weight;}
   inRegion.hind[i]=h>.5&&pos[3*i+1]<.95&&pos[3*i+2]<-3.1?1:0;
   inRegion.fore[i]=f>.5&&pos[3*i+1]<.95&&pos[3*i+2]>-2.8?1:0;}
  const edges={hind:[],fore:[]},seen=new Set();
  for(let k=0;k<idx.length;k+=3){
   for(const [x,y] of [[idx[k],idx[k+1]],[idx[k+1],idx[k+2]],[idx[k+2],idx[k]]]){
    const a=Math.min(x,y),b=Math.max(x,y),id=a*count+b;
    if(seen.has(id))continue;seen.add(id);
    const A=3*a,B=3*b,d=Math.hypot(pos[A]-pos[B],pos[A+1]-pos[B+1],pos[A+2]-pos[B+2]);
    if(d<.008||d>.12)continue;
    for(const region of ['hind','fore'])if(inRegion[region][a]&&inRegion[region][b])
     edges[region].push([A,B,d]);
   }
  }
  if(edges.hind.length!==2932||edges.fore.length!==3107)
   throw Error('Mismatched edge cohorts '+edges.hind.length+'/'+edges.fore.length);
  const parents=new Int16Array(g.doc.nodes.length).fill(-1);
  g.doc.nodes.forEach((node,i)=>(node.children||[]).forEach(ch=>parents[ch]=i));
  const joints=g.skins[0].joints,bind=joints.map((_,i)=>g.skins[0].ibms.subarray(i*16,(i+1)*16));
  const clips=Object.entries(names).map(([key,name])=>{
   const clip=g.animations.find(x=>x.name===name);
   if(!clip||clip.channels.length!==19||clip.duration<=0)throw Error('Missing clip '+name);
   return{key,clip};
  });
  return {g,pos,j,w,count,edges,parents,joints,bind,clips};
 }
 function deform(a,clip,frame){
  const {g,pos,j,w,count,parents,joints,bind}=a,time=clip.duration*frame/N;
  const local=g.nodes.map(n=>({t:n.baseT,q:n.baseQ,s:n.baseS}));
  for(const ch of clip.channels){const target=local[ch.node];
   if(ch.path==='rotation')target.q=sample(ch.sam,time,4);
   else if(ch.path==='translation')target.t=sample(ch.sam,time,3);
   else if(ch.path==='scale')target.s=sample(ch.sam,time,3);}
  const world=[];
  function nodeWorld(i){if(world[i])return world[i];const n=g.nodes[i],p=parents[i],t=local[i];
   const m=n.useMatrix?new Float64Array(n.matrix):trs(t.t,t.q,t.s);
   world[i]=p<0?m:mul(nodeWorld(p),m);return world[i];}
  // World-space skin matrix = joint world * inverse bind; mesh world cancels
  // as in the viewer's mesh-local skin followed by mesh world transform.
  const bone=joints.map((id,i)=>mul(nodeWorld(id),bind[i]));
  const coords=new Float32Array(pos.length);
  for(let i=0;i<count;i++){const k=3*i,u=4*i,x=pos[k],y=pos[k+1],z=pos[k+2];let X=0,Y=0,Z=0,total=0;
   for(let n=0;n<4;n++){const weight=w[u+n];if(weight<.00001)continue;
    const m=bone[j[u+n]];if(!m)throw Error('Bad bone index at vertex '+i);
    X+=weight*(m[0]*x+m[4]*y+m[8]*z+m[12]);
    Y+=weight*(m[1]*x+m[5]*y+m[9]*z+m[13]);
    Z+=weight*(m[2]*x+m[6]*y+m[10]*z+m[14]);total+=weight;}
   if(total<.001)throw Error('Missing weights at vertex '+i);
   coords[k]=ok(X,'skinned X');coords[k+1]=ok(Y,'skinned Y');coords[k+2]=ok(Z,'skinned Z');
  }return coords;}
 function run(progress){
  if(state.status==='running')return Promise.reject(Error('Already running'));
  state.status='running';state.progress=0;state.result=null;state.error=null;
  return new Promise((resolve,reject)=>{
   let a;try{a=prepare();}catch(err){state.status='error';state.error=String(err.message||err);reject(err);return;}
   const data={};
   for(const {key} of a.clips){data[key]={maxSkin:{},footProxy:{}};
    for(const id of Object.keys(foot))data[key].footProxy[id]={minY:Infinity,frame:-1};
    data[key].values={hind:new Float64Array(a.edges.hind.length),fore:new Float64Array(a.edges.fore.length)};}
   let step=0,total=a.clips.length*N;
   function tick(){try{
    for(const stop=Math.min(total,step+2);step<stop;step++){
     const v=a.clips[Math.floor(step/N)],frame=step%N,r=data[v.key],coords=deform(a,v.clip,frame);
     for(const region of ['hind','fore'])a.edges[region].forEach(([A,B,d],i)=>{
      const ratio=Math.hypot(coords[A]-coords[B],coords[A+1]-coords[B+1],coords[A+2]-coords[B+2])/d;
      ok(ratio,'edge '+v.key+' '+region);if(ratio>r.values[region][i])r.values[region][i]=ratio;
     });
     for(const [id,vertex] of Object.entries(foot)){
      const y=coords[vertex*3+1],p=r.footProxy[id];
      if(y<p.minY){p.minY=y;p.frame=frame;}
     }
    }
    state.progress=step/total;if(progress)progress(state.progress);
    if(step<total)return setTimeout(tick,0);
    for(const {key} of a.clips)for(const region of ['hind','fore']){
     const vals=Array.from(data[key].values[region]).sort((x,y)=>x-y);
     data[key].maxSkin[region]={max:vals.at(-1),p99:vals[Math.floor(.99*(vals.length-1))],
      above1_5:vals.filter(x=>x>1.5).length};
    }
    if(Math.abs(data.V135.maxSkin.hind.max-1.32234)>.003||
       Math.abs(data.V135.maxSkin.fore.max-1.69887)>.003)
      throw Error('Former V13.5 baseline was not reproduced');
    for(const v of Object.values(data))delete v.values;
    state.result={framesPerClip:N,bodyVertices:a.count,cohorts:{hind:2932,fore:3107},
     correctedBelly:440,versions:data,numericVerified:true,
     gpuVerified:false,hoofGroundContactVerified:false,readyForMain:false};
    state.status='finished';resolve(state.result);
   }catch(err){state.status='error';state.error=String(err.message||err);reject(err);}}
   setTimeout(tick,0);
  });
 }
})();