/* HORSE RANCH V16 walk-only animation candidate.
 * Loads after V15, preserves original GLB, clips, 19 joints, and 440 weight fix.
 * Numerical IK is baked once to 160 keys. Non-Walk clips remain byte-identical.
 */
(function(){'use strict';
const N=160,TAU=2*Math.PI,RAD=Math.PI/180;
let retries=0;
const wait=setInterval(()=>{
 if(!window.__horseV15?.ready||!window.__horseV15Hair?.ready||!window.__horseV15SkinAudit?.run||!window.__horseV16Targets||!window.__horseV16IK||!window.__viewerReady){
  if(++retries>950){clearInterval(wait);window.__horseV16Error='Missing V15 baseline or V16 IK/targets';}return;
 }
 clearInterval(wait);
 try {
  const g=object3d,sel=document.getElementById('animations'),speed=document.getElementById('speed');
  if(!sel||!speed||g.skins?.[0]?.joints?.length!==19||window.__horseGaitV12?.belly?.corrected!==440)
   throw Error('Original preview constraints are not satisfied');
  const base=g.animations.find(x=>x.name==='Walk_V15_BALANCED');
  if(!base||base.channels.length!==19||Math.abs(base.duration-1.44)>1e-4)throw Error('V15 Walk 19-channel reference absent');
  const clipName='Walk_V16_FOOT_TARGET_IK';
  if(g.animations.some(c=>c.name===clipName))throw Error('V16 candidate duplicated');
  const foot=window.__horseV16Targets.collect(g),ik=window.__horseV16IK;
  if(foot.bodyVertexCount!==24314)throw Error('Original body vertex count changed');
  const rig=ik.build(g,foot),byName=new Map(base.channels.map(ch=>[(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path,ch]));
  const sample=(key,t,dim)=>{const sam=byName.get(key)?.sam;if(!sam)throw Error('Missing channel '+key);
   const step=(sam.times[1]-sam.times[0]);if(!Number.isFinite(step)||step<=0)throw Error('Bad animation sample time');
   const a=Math.min(sam.times.length-1,Math.max(0,Math.floor(t/step))),b=Math.min(sam.times.length-1,a+1);
   const u=a===b?0:Math.max(0,Math.min(1,(t-sam.times[a])/(sam.times[b]-sam.times[a])));
   let values=Array.from({length:dim},(_,k)=>sam.data[a*dim+k]*(1-u)+sam.data[b*dim+k]*u);
   if(dim===4){const norm=Math.hypot(...values);if(norm<.1)throw Error('Invalid base quaternion');values=values.map(x=>x/norm);}return values;
  };
  const rootY=new Float64Array(N),rootZ=new Float64Array(N),pitch=new Float64Array(N);
  for(let i=0;i<N;i++){
   const t=i*base.duration/N,q=sample('Torso|rotation',t,4),xyz=sample('Torso|translation',t,3),phase=TAU*i/N;
   rootY[i]=xyz[1]-.023 + .0018*Math.cos(2*phase);
   rootZ[i]=xyz[2];pitch[i]=2*Math.atan2(q[0],q[3]);
  }
  const baked=ik.bake(rig,window.__horseV16Targets,foot,{rootY,rootZ,pitch});
  const nameToAngles=new Map();
  for(const [name,leg] of Object.entries(rig.legs))for(let k=0;k<leg.chain.length;k++)
   nameToAngles.set(leg.chain[k],baked.angles[name].map(p=>p[k]));
  const times=Float32Array.from({length:N},(_,i)=>i*base.duration/N);
  const channels=base.channels.map(ch=>{
   const part=g.doc.nodes[ch.node]?.name||'',key=part+'|'+ch.path,src=ch.sam;
   if(part==='Torso'&&ch.path==='translation'){
    const data=new Float32Array(N*3);
    for(let i=0;i<N;i++){const original=sample(key,times[i],3);data.set([original[0],rootY[i],rootZ[i]],3*i);}
    return {node:ch.node,path:ch.path,sam:{times,data,interpolation:'LINEAR'}};
   }
   if(ch.path!=='rotation')return ch;
   if(nameToAngles.has(part)){
    const data=new Float32Array(N*4),angles=nameToAngles.get(part);
    for(let i=0;i<N;i++){const a=angles[i]*.5;data.set([Math.sin(a),0,0,Math.cos(a)],i*4);}
    return {node:ch.node,path:ch.path,sam:{times,data,interpolation:'LINEAR'}};
   }
   if(['Torso','Neck','Head','Tail'].includes(part)){
    const count=src.times.length,data=new Float32Array(src.data);
    for(let i=0;i<count;i++){
     const t=src.times[i]/base.duration,at=Math.round(t*N)%N,phase=TAU*t;
     const rh=window.__horseV16Targets.state('HindR',at),lh=window.__horseV16Targets.state('HindL',at),
      rf=window.__horseV16Targets.state('ForeR',at),lf=window.__horseV16Targets.state('ForeL',at);
     const support=(Number(rf.stance)+Number(lf.stance)-Number(rh.stance)-Number(lh.stance))*.5;
     const bob=part==='Torso'? .18*support :part==='Neck'?.25*support+ .16*Math.sin(2*phase-.3):
       part==='Head'? -.16*support-.10*Math.sin(2*phase-.5): .1*Math.sin(phase-1.1);
     const deg=bob*RAD/2,k=i*4,s=Math.sin(deg),c=Math.cos(deg),x=data[k],y=data[k+1],z=data[k+2],w=data[k+3];
     const q=[x*c+w*s,y*c+z*s,z*c-y*s,w*c-x*s],norm=Math.hypot(...q);
     data.set(q.map(x=>x/norm),k);
    }
    return {node:ch.node,path:ch.path,sam:{times:src.times,data,interpolation:'LINEAR'}};
   }
   return ch;
  });
  if(channels.length!==19||channels.some(ch=>Array.from(ch.sam.data).some(x=>!Number.isFinite(x))))
   throw Error('V16 channels invalid');
  const opts=[...sel.options],walk=opts.find(x=>x.textContent.trim()==='Walk');
  if(opts.length!==5||!walk)throw Error('Unexpected V15 dropdown');
  const nonWalk=opts.filter(x=>x!==walk).map(x=>[x.value,x.textContent]);
  const newIndex=g.animations.length;g.animations.push({name:clipName,duration:base.duration,channels});
  walk.value=String(newIndex);
  const v15=window.__horseV15,v14=window.__horseV14,oldMode=v15.setMode,oldSpeed=v15.setSpeed;
  function syncWalk(){sel.value=String(newIndex);sel.dispatchEvent(new Event('change'));
   v15.mode='walk';v15.selectedClip=clipName;v15.speedKmh=7;v14.mode='walk';v14.selectedClip=clipName;
   return {mode:'walk',clip:clipName,period:base.duration,speedKmh:7};}
  function setMode(id){const response=oldMode(id);if(id==='walk')return syncWalk();return response;}
  function setSpeed(speedKmh){const result=oldSpeed(speedKmh);if(result.mode==='walk'){
    const updated=syncWalk();v15.speedKmh=Number(speedKmh);v14.speedKmh=Number(speedKmh);
    updated.speedKmh=Number(speedKmh);return {...result,...updated};}
   return result;}
  v15.setMode=setMode;v15.setSpeed=setSpeed;v14.setMode=setMode;v14.setSpeed=setSpeed;
  v15.modes=v15.modes.map(m=>m.id==='walk'?{...m,name:clipName}:m);v14.modes=v15.modes;
  sel.addEventListener('change',()=>{if(sel.value===String(newIndex)){
    v15.mode='walk';v15.selectedClip=clipName;v14.mode='walk';v14.selectedClip=clipName;
   }});
  if(nonWalk.some(([v,t])=>![...sel.options].some(x=>x.value===v&&x.textContent===t)))throw Error('Non-Walk options modified');
  const diagnostics={ready:true,version:'V16',clip:clipName,walkOnly:true,originalGLBPreserved:true,
   otherClipsUnchanged:true,joints:19,bellyFixed:440,frames:N,groundY:foot.floor,
   sole:Object.fromEntries(Object.entries(foot.feet).map(([name,f])=>[name,{soleCount:f.soleCount,
    contactVertex:f.contactVertex,toeVertex:f.frontVertex,heelVertex:f.backVertex}])),
   proxyMetrics:baked.metrics,contactVerified:false,fullSkinVerified:false,gpuVerified:false,
   note:'Target IK and CPU proxy tests are separate from real visual contact and GPU rendering.'};
  window.__horseV16=diagnostics;
  syncWalk();
 }catch(e){window.__horseV16Error=String(e?.message||e);console.error('V16 walk candidate',e);}
},100);
})();