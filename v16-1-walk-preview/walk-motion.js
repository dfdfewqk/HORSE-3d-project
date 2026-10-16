/* HORSE RANCH V16.1 — Walk-only coordinated gait candidate.
 * Extends V16 without mutating prior GLB, V15/V16 clips or gallops.
 */
(function(){'use strict';
const N=160,TAU=2*Math.PI,RAD=Math.PI/180,CLIP='Walk_V16_1_COORDINATED';let waiting=0;
const ready=setInterval(()=>{
 if(!window.__viewerReady||!window.__horseV16?.ready||!window.__horseV161Targets||!window.__horseV161IK){
  if(++waiting>950){clearInterval(ready);window.__horseV161Error='V16 base or V16.1 modules unavailable';}return;
 }
 clearInterval(ready);
 try{
  const g=object3d,sel=document.getElementById('animations'),speed=document.getElementById('speed');
  const v16=window.__horseV16,v15=window.__horseV15,v14=window.__horseV14;
  if(g.skins?.[0]?.joints?.length!==19||window.__horseGaitV12?.belly?.corrected!==440)
   throw Error('Protected source GLB / belly weights missing');
  const source=g.animations.find(x=>x.name==='Walk_V15_BALANCED');
  if(!source||source.channels.length!==19||g.animations.some(x=>x.name===CLIP))throw Error('Wrong V15 Walk baseline');
  const sample=(sam,t,n)=>{
   const ts=sam.times,d=sam.data;if(!ts.length)throw Error('Empty sampler');
   let l=0,h=ts.length-1;while(l<h){const m=(l+h)>>1;if(ts[m]<t)l=m+1;else h=m;}
   const b=l,a=ts[b]<t?b:Math.max(0,b-1),w=ts[b]===ts[a]?0:Math.max(0,Math.min(1,(t-ts[a])/(ts[b]-ts[a])));
   let v=Array.from({length:n},(_,k)=>d[a*n+k]*(1-w)+d[b*n+k]*w);
   if(n===4){const norm=Math.hypot(...v);if(norm<.01)throw Error('Bad quaternion');v=v.map(x=>x/norm);}return v;
  };
  const foot=window.__horseV16Targets.collect(g),T=window.__horseV161Targets,IK=window.__horseV161IK;
  const rig=IK.build(g,foot),by=new Map(source.channels.map(x=>[(g.doc.nodes[x.node]?.name||'')+'|'+x.path,x]));
  const frames=Float32Array.from({length:N},(_,i)=>i*source.duration/N);
  const root={y:new Float64Array(N),z:new Float64Array(N),pitch:new Float64Array(N)};
  for(let i=0;i<N;i++){
   const p=TAU*i/N,torso=sample(by.get('Torso|translation').sam,frames[i],3),q=sample(by.get('Torso|rotation').sam,frames[i],4);
   root.y[i]=torso[1]+.0014*Math.cos(2*p);
   root.z[i]=torso[2];
   root.pitch[i]=2*Math.atan2(q[0],q[3])+.16*RAD*Math.sin(2*p-.35);
  }
  const baked=IK.bake(rig,T,foot,root),boneAngles=new Map();
  for(const [name,leg] of Object.entries(rig.legs))for(let k=0;k<leg.chain.length;k++)
   boneAngles.set(leg.chain[k],baked.angles[name].map(row=>row[k]));
  const multiplyX=(q,deg)=>{const a=deg*RAD/2,s=Math.sin(a),c=Math.cos(a),[x,y,z,w]=q;
   const arr=[x*c+w*s,y*c+z*s,z*c-y*s,w*c-x*s],n=Math.hypot(...arr);return arr.map(x=>x/n);};
  const channels=source.channels.map(ch=>{
   const part=g.doc.nodes[ch.node]?.name||'',key=part+'|'+ch.path,sam=ch.sam;
   if(part==='Torso'&&ch.path==='translation'){
    const data=new Float32Array(N*3);
    for(let i=0;i<N;i++){const p=sample(sam,frames[i],3);data.set([p[0],root.y[i],root.z[i]],i*3);}
    return {node:ch.node,path:ch.path,sam:{times:frames,data,interpolation:'LINEAR'}};
   }
   if(ch.path!=='rotation')return ch;
   if(boneAngles.has(part)||part==='Torso'){
    const data=new Float32Array(N*4);
    for(let i=0;i<N;i++){
     const angle=part==='Torso'?root.pitch[i]:boneAngles.get(part)[i];
     data.set([Math.sin(angle/2),0,0,Math.cos(angle/2)],i*4);
    }
    return {node:ch.node,path:ch.path,sam:{times:frames,data,interpolation:'LINEAR'}};
   }
   if(part==='Neck'||part==='Head'||part==='Tail'){
    const count=sam.times.length,data=new Float32Array(count*4);
    for(let i=0;i<count;i++){
     const time=sam.times[i],phase=time/source.duration*N,states=T.sampleAll(phase);
     const fore=(states.ForeR.support+states.ForeL.support)*.5,
      hind=(states.HindR.support+states.HindL.support)*.5;
     const p=TAU*phase/N,support=fore-hind;
     const delta=part==='Neck'?.26*support+.18*Math.sin(2*p-.45):
      part==='Head'?-.19*support-.12*Math.sin(2*p-.65):.09*Math.sin(p-1.05);
     data.set(multiplyX(sample(sam,time,4),delta),i*4);
    }
    return {node:ch.node,path:ch.path,sam:{times:sam.times,data,interpolation:'LINEAR'}};
   }
   return ch;
  });
  if(channels.length!==19||channels.some(ch=>ch.sam?.data?.some(x=>!Number.isFinite(x))))throw Error('Invalid V16.1 tracks');
  const oldClips=g.animations.slice(),priorOptions=[...sel.options],walk=priorOptions.find(o=>o.textContent.trim()==='Walk');
  if(priorOptions.length!==5||!walk)throw Error('Unexpected animation selector');
  const i=g.animations.length;g.animations.push({name:CLIP,duration:source.duration,channels});walk.value=String(i);
  const oldMode=v15.setMode,oldSpeed=v15.setSpeed;
  function walkSelect(){
   if(sel.value!==String(i)){sel.value=String(i);sel.dispatchEvent(new Event('change'));}
   v15.mode='walk';v15.selectedClip=CLIP;v14.mode='walk';v14.selectedClip=CLIP;
  }
  function setMode(mode){const out=oldMode(mode);if(mode==='walk'){
   walkSelect();return {...out,mode:'walk',clip:CLIP,period:source.duration};}return out;}
  function setSpeed(value){const out=oldSpeed(value);if(out?.mode==='walk'){
   walkSelect();v15.speedKmh=Number(value);v14.speedKmh=Number(value);
   return {...out,clip:CLIP,period:source.duration};}return out;}
  v15.setMode=setMode;v15.setSpeed=setSpeed;v14.setMode=setMode;v14.setSpeed=setSpeed;
  sel.addEventListener('change',()=>{if(sel.value===String(i)){
   v15.mode='walk';v15.selectedClip=CLIP;v14.mode='walk';v14.selectedClip=CLIP;
  }});
  const protectedClips=['Gallop_V15_CRUISE','Gallop_V15_FAST','Gallop_V15_SPRINT'];
  for(const name of protectedClips){const orig=oldClips.find(c=>c.name===name),now=g.animations.find(c=>c.name===name);
   if(!orig||now!==orig||now.channels!==orig.channels)throw Error('Protected gait changed '+name);}
  const status={ready:true,clip:CLIP,sourceV16:v16.clip,frames:N,groundY:foot.floor,
   sole:v16.sole,ikMetrics:baked.metrics,trajectory:T.check(),
   oldClipCount:oldClips.length,clipCount:g.animations.length,originalGLBPreserved:true,
   otherClipsUnchanged:true,gpuVerified:false,contactVerified:false,skinVerified:false};
  window.__horseV161=status;
  walkSelect();
 }catch(e){window.__horseV161Error=String(e?.message||e);console.error('V16.1 walk candidate',e);}
},100);
})();