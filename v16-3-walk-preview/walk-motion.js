/* HORSE RANCH V16.3 — integrated walk-only full-body candidate.
 * Protected 19 joint GLB; earlier clips and native HairKey untouched.
 * Torso 3D response is optimized before limb IK, never patched afterward.
 */
(function(){'use strict';
const N=160,PI=Math.PI,TAU=2*PI,NAME='Walk_V16_3_CONTACT_COORDINATED';let waits=0;
const timer=setInterval(()=>{
 const refs=['__horseV162','__horseV163Reference','__horseV163Contact','__horseV163Body','__horseV163IK'];
 if(!window.__viewerReady||refs.some(x=>!window[x]?.ready&&x==='__horseV161'||!window[x])){
  if(++waits>950){clearInterval(timer);window.__horseV163Error='Previous Walk or required V16.3 modules missing';}return;
 }
 clearInterval(timer);
 try{
  const g=object3d,select=document.getElementById('animations'),speed=document.getElementById('speed'),v15=window.__horseV15,v14=window.__horseV14;
  const R=window.__horseV163Reference,C=window.__horseV163Contact,B=window.__horseV163Body,IK=window.__horseV163IK;
  if(g?.skins?.[0]?.joints?.length!==19||window.__horseGaitV12?.belly?.corrected!==440||!select||!speed)
   throw Error('Protected original GLB and viewer constraints are not met');
  const base=g.animations.find(x=>x.name==='Walk_V15_BALANCED');
  if(!base||base.channels.length!==19||g.animations.some(a=>a.name===NAME))throw Error('Walk reference mismatch');
  const by=new Map(base.channels.map(ch=>[(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path,ch]));
  function sample(sam,t,n){
   const a=sam.times,d=sam.data;if(a.length<2)throw Error('Insufficient sampler');
   let lo=0,hi=a.length-1;
   while(lo<hi){const m=(lo+hi)>>1;if(a[m]<t)lo=m+1;else hi=m;}
   const j=lo,k=a[j]<t?j:Math.max(0,j-1),f=a[j]===a[k]?0:Math.max(0,Math.min(1,(t-a[k])/(a[j]-a[k])));
   let v=Array.from({length:n},(_,i)=>d[k*n+i]*(1-f)+d[j*n+i]*f);
   if(n===4){const norm=Math.hypot(...v);if(norm<.1)throw Error('Zero quaternion');v=v.map(x=>x/norm);}
   return v;
  }
  const baseTranslation=by.get('Torso|translation')?.sam,baseRotation=by.get('Torso|rotation')?.sam;
  if(!baseTranslation||!baseRotation)throw Error('Torso channels missing');
  const times=Float32Array.from({length:N},(_,i)=>base.duration*i/N);
  const body=Array.from({length:N},(_,i)=>{
   const tr=sample(baseTranslation,times[i],3),q=sample(baseRotation,times[i],4);
   return B.pose(i,{x:tr[0],y:tr[1],z:tr[2],pitch:2*Math.atan2(q[0],q[3])});
  });
  const feet=C.make(g),rig=IK.build(g,feet),baked=IK.bake(rig,R,C,feet,body);
  const map=new Map();
  for(const [name,leg] of Object.entries(rig.legs))for(let j=0;j<leg.chain.length;j++)
   map.set(leg.chain[j],baked.angles[name].map(frame=>frame[j]));
  const multiplyX=(q,a)=>{const sn=Math.sin(a/2),cs=Math.cos(a/2),[x,y,z,w]=q,
   out=[x*cs+w*sn,y*cs+z*sn,z*cs-y*sn,w*cs-x*sn],norm=Math.hypot(...out);
   return out.map(x=>x/norm);};
  let edited=0;
  const channels=base.channels.map(ch=>{
   const part=g.doc.nodes[ch.node]?.name||'',sam=ch.sam;
   if(part==='Torso'&&ch.path==='translation'){
    const data=new Float32Array(N*3);
    for(let i=0;i<N;i++)data.set([body[i].x,body[i].y,body[i].z],i*3);
    edited++;return {node:ch.node,path:ch.path,sam:{times,data,interpolation:'LINEAR'}};
   }
   if(part==='Torso'&&ch.path==='rotation'){
    const data=new Float32Array(N*4);
    for(let i=0;i<N;i++)data.set(body[i].q,i*4);
    edited++;return {node:ch.node,path:ch.path,sam:{times,data,interpolation:'LINEAR'}};
   }
   if(ch.path==='rotation'&&map.has(part)){
    const data=new Float32Array(N*4),angles=map.get(part);
    for(let i=0;i<N;i++)data.set([Math.sin(angles[i]/2),0,0,Math.cos(angles[i]/2)],i*4);
    edited++;return {node:ch.node,path:ch.path,sam:{times,data,interpolation:'LINEAR'}};
   }
   if(ch.path==='rotation'&&['Neck','Head','Tail'].includes(part)){
    const data=new Float32Array(N*4);
    for(let i=0;i<N;i++){
     const q=sample(sam,times[i],4);
     data.set(multiplyX(q,body[i][part==='Neck'?'neck':part==='Head'?'head':'tail']),i*4);
    }
    edited++;return {node:ch.node,path:ch.path,sam:{times,data,interpolation:'LINEAR'}};
   }
   return ch;
  });
  if(edited!==19||channels.length!==19||channels.some(c=>!c.sam?.data||Array.from(c.sam.data).some(x=>!Number.isFinite(x))))
   throw Error('Walk 19-channel export invalid');
  const existing=g.animations.slice(),opts=Array.from(select.options),
   walk=opts.find(x=>x.textContent.trim()==='Walk'),labels=opts.map(x=>x.textContent.trim());
  if(labels.join('|')!=='정지 자세|Walk|Gallop Cruise|Gallop Fast|Gallop Sprint'||!walk)
   throw Error('V16.1 viewer options changed');
  const index=g.animations.length;g.animations.push({name:NAME,duration:base.duration,channels});walk.value=String(index);
  const originalChoose=v15.setMode,originalSpeed=v15.setSpeed;
  function selectWalk(){
   select.value=String(index);select.dispatchEvent(new Event('change'));
   v15.mode='walk';v15.selectedClip=NAME;v14.mode='walk';v14.selectedClip=NAME;
  }
  function setMode(id){
   const state=originalChoose(id);if(id==='walk'){selectWalk();return {...state,mode:'walk',clip:NAME,period:base.duration};}
   return state;
  }
  function setSpeed(value){
   const state=originalSpeed(value);if(state?.mode==='walk'){
    selectWalk();v15.speedKmh=Number(value);v14.speedKmh=Number(value);
    return {...state,clip:NAME,period:base.duration};
   }return state;
  }
  v15.setMode=setMode;v15.setSpeed=setSpeed;v14.setMode=setMode;v14.setSpeed=setSpeed;
  select.addEventListener('change',()=>{if(select.value===String(index)){
   v15.mode='walk';v15.selectedClip=NAME;v14.mode='walk';v14.selectedClip=NAME;
  }});
  for(const old of existing){if(g.animations.find(x=>x.name===old.name)!==old)throw Error('Previously saved clip overwritten '+old.name);}
  const runtime={ready:true,version:'V16.3',clip:NAME,frames:N,sole:window.__horseV162.sole,
   groundY:feet.floor,rigJoints:19,originalGLBUnchanged:true,gallopsUnchanged:true,
   proxyMetrics:baked.metrics,footTargets:C.validate(),geometryQA:false,visualQA:false,
   reference:'Real equine literature constrains timing, individual rig angles remain estimated',
   physicalForcesMeasured:false,restoredBlender456Bones:false,viewerNominalSpeedNotPhysical:true};
  window.__horseV163=runtime;selectWalk();
 }catch(err){window.__horseV163Error=String(err?.message||err);console.error('V16.3 walk candidate',err);}
},100);
})();