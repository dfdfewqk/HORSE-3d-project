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