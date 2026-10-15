/* HORSE RANCH V10: 160-phase hind-leg IK fitted movement and torso smoothing. Preserves original V7 GLB for rollback. */
(function(){'use strict';
const TRACK_NAMES=["Torso|translation_0","Torso|translation_1","Torso|translation_2","Torso|rotation_0","HindL_Hip|rotation_0","HindL_Stifle|rotation_0","HindL_Hock|rotation_0","HindL_Fetlock|rotation_0","HindR_Hip|rotation_0","HindR_Stifle|rotation_0","HindR_Hock|rotation_0","HindR_Fetlock|rotation_0"];
const B64='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO0y2P/7/wcA//8CAP//AAAAAAAAAAAAAAAAAAAAAFwA+v8AAP//AwAAAAAAAAAAAAAAAAAAAAAAAACskNf/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADt/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACO/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO71Fv7a/jz/IQBLAPT/3P8EAAkA9f/5/wEA///8/4L7rfw+ACsAt/+Y/97/9P/h/+r//P/8//r//f+a8vcCaADi/3EAGQAGAEYAIwD4/wsACgD+/wEAAQBi/GcApP/y/8r/NQAuAPj/DwAYAAEA//8BAP7/vi8R9kYAMAFZ/uX+FQC+/6r/AgAHAAIABgAAAAkAWwoDCEQBWgCXAbkA/P87ADAABAAKAAgADgAQANn5AAQ2AN3/fABSAPn/DgAVAP///f/+//7/AAD9//3+tv18/8v/gv/E//3/7//y//3//f/+//z/+/8k9m0E/QGZAEMAdgBIAAgABAAZABIAAQD+/wEAAgAo/pUCdwD+/xAAPwAiAO7/7P/9////+f/6////uPIvBFf/w/92ACYA0f/u/wcA6f/n//j//v8BAAIAGwHj/ywA2P8KANL/rf/o/woAAgADAAYAAgACAFsvXvTP/X4Ac/4p/pP/GADv//j/CwAMAAkA9//y/0P3dvi1/gsB8/+5/1oAYQAeAAUA+/8DAAwAAQDh+VwBZACe/18AjgAmAPr/AwACAP///v/+/wMABABEBEgCTACb//r/GADu/+f/9//+/wIA///8/wAA';
function unpack(){const s=atob(B64),d=new DataView(new ArrayBuffer(s.length));for(let i=0;i<s.length;i++)d.setUint8(i,s.charCodeAt(i));let f=[];for(let i=0;i<TRACK_NAMES.length;i++){let row=[];for(let k=0;k<29;k++)row.push(d.getInt16((i*29+k)*2,true)/10000);f.push(row);}return f;}
function value(coeff,p){let out=coeff[0];for(let k=1;k<=14;k++){const a=2*Math.PI*k*p;out+=2*(coeff[k]*Math.cos(a)-coeff[14+k]*Math.sin(a));}return out;}
window.HorseGaitV10=function(g){
 const src=g.animations.find(a=>a.name==='Gallop_HIND_FLEX_CANDIDATE_PREVIEW');if(!src)throw Error('V10 requires V7 Gallop');
 const coeff=unpack(),data={},N=160,times=Float32Array.from({length:N},(_,i)=>i*.72/N);
 for(let j=0;j<TRACK_NAMES.length;j++){
  const [name,tag]=TRACK_NAMES[j].split('|'),[path,part]=tag.split('_'),key=name+'|'+path,comp=Number(part);
  const width=path==='rotation'?4:3;if(!data[key])data[key]=new Float32Array(N*width);
  for(let i=0;i<N;i++){let v=value(coeff[j],i/N),idx=i*width;
   if(width===4){data[key][idx]=Math.sin(v/2);data[key][idx+3]=Math.cos(v/2);}
   else data[key][idx+comp]=v;
  }
 }
 for(const [name,factor] of [['Neck',.81],['Head',.85]]){
  const ch=src.channels.find(x=>(g.doc.nodes[x.node]?.name===name)&&x.path==='rotation');
  if(!ch)throw Error('V10 missing '+name);
  let a=ch.sam,arr=new Float32Array(N*4);
  for(let i=0;i<N;i++){
   let t=times[i],m=Math.max(0,Math.min(a.times.length-2,Math.floor(t/.72*(a.times.length-1))));
   while(m<a.times.length-2&&a.times[m+1]<t)m++;
   let u=Math.max(0,Math.min(1,(t-a.times[m])/Math.max(1e-9,a.times[m+1]-a.times[m])));
   let q0=2*Math.atan2(a.data[m*4],a.data[m*4+3]),q1=2*Math.atan2(a.data[(m+1)*4],a.data[(m+1)*4+3]);
   let v=(q0*(1-u)+q1*u)*factor;arr[i*4]=Math.sin(v/2);arr[i*4+3]=Math.cos(v/2);
  }
  data[name+'|rotation']=arr;
 }
 const found=new Set(),channels=src.channels.map(ch=>{
  const key=(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path;
  if(!data[key])return {...ch};found.add(key);
  return {node:ch.node,path:ch.path,sam:{times,data:data[key],interpolation:'LINEAR'}};
 });
 if(found.size!==Object.keys(data).length||channels.length!==19)throw Error('V10 correction channels missing');
 if(channels.filter(c=>/^Fore/.test(g.doc.nodes[c.node]?.name||'')).length!==6)throw Error('V10 fore-leg preservation failed');
 g.animations.push({name:'Gallop_V10_HOOF_TRAJECTORY_TORSO',duration:src.duration,channels});
 window.__horseGaitV10={samples:N,edited:found.size,source:'19-bone preview rig',complete:true};
};
let tries=0;const tick=setInterval(()=>{
 if(!window.__viewerReady){if(++tries>450){clearInterval(tick);window.__horseV10Error='Viewer initialization timeout';}return;}
 clearInterval(tick);
 try{
  window.HorseGaitV10(object3d);
  const name='Gallop_V10_HOOF_TRAJECTORY_TORSO',i=object3d.animations.findIndex(a=>a.name===name);
  if(i<0)throw Error('Missing corrected Gallop');
  const sel=document.getElementById('animations'),op=document.createElement('option');op.value=String(i);op.textContent='★ Gallop V10 (뒷다리·몸통 개선)';sel.appendChild(op);
  sel.value=String(i);sel.dispatchEvent(new Event('change'));
  document.title='HORSE RANCH V10 · 뒷다리/몸통 개선';
  const h=document.querySelector('#header h1');if(h)h.textContent='HORSE RANCH · GALLOP V10 · 통합 개선';
  const sub=document.getElementById('subtitle');if(sub)sub.textContent='V10: 좌우 뒷다리 회수·몸통 출렁임 동시 보정 · 기존 앞다리·갈기·꼬리 보존 · 원본 456본 복원본은 아님';
  const note=document.getElementById('note');if(note)note.textContent='[V10 기본 적용] 기존 Gallop과 선택 비교 가능 · 다른 보행/앞다리/꼬리 보존 · 이 버전은 현재 19본 웹 모델의 실제 애니메이션 개선본입니다.';
  const meta=document.getElementById('meta');if(meta)meta.textContent+='\nV10 Gallop: 160시점 보정 적용';
 }catch(e){window.__horseV10Error=e.message;console.error(e);}
},120);
})();