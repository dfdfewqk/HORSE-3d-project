/* HORSE RANCH V16.9: event-phased experimental Walk, original GLB untouched.
 * Forelimb contact defines withers/head oscillations; two vertical cycles
 * per full four-beat stride, 25% stride head/withers offset (published mean).
 * Joint amplitudes are ARTIST ESTIMATES, not measured kinematics or approval.
 */
(function(root,factory){'use strict';
 const api=factory();
 root.__horseV169Builder=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const N=160,PI=Math.PI,TAU=2*PI,RAD=PI/180;
 const frac=n=>((n%1)+1)%1,clamp=(v,a,b)=>Math.max(a,Math.min(v,b));
 const smooth=x=>{const p=clamp(x,0,1);return p*p*(3-2*p);};
 const NAME='Walk_V16_9_COORDINATED_EXPERIMENT';
 const gait={
   touch:{HindR:0,ForeR:.25,HindL:.50,ForeL:.75},
   stance:{fore:.64,hind:.63},period:1.44
 };
 function phase(leg,i){return frac(i/N-gait.touch[leg]);}
 function support(leg,i){
  const p=phase(leg,i),stance=leg.startsWith('Fore')?gait.stance.fore:gait.stance.hind;
  return {stance:p<stance,p,progress:p<stance?p/stance:(p-stance)/(1-stance)};
 }
 function events(i){
  const legs={};
  for(const name of Object.keys(gait.touch))legs[name]=support(name,i);
  const count=Object.values(legs).filter(v=>v.stance).length;
  // ForeR touch is stride-phase zero. Withers lower in early fore-support;
  // head occurs a quarter STRIDE later (opposite two-cycle oscillation).
  const f=frac(i/N-gait.touch.ForeR);
  const withers=-Math.cos(4*PI*(f-.075));
  const head=-Math.cos(4*PI*(f-.075-.25));
  const hindMid=leg=>{const v=legs[leg];return v.stance?Math.sin(PI*v.progress):0;};
  const pelvis=(hindMid('HindR')+hindMid('HindL'))*.5;
  const swing=name=>{const v=legs[name];return v.stance?0:Math.sin(PI*v.progress)**2;};
  return {legs,stanceCount:count,withers,head,pelvis,swing};
 }
 function mulX(q,degrees){
  const half=degrees*RAD/2,s=Math.sin(half),c=Math.cos(half),
   [x,y,z,w]=q,v=[x*c+w*s,y*c+z*s,z*c-y*s,w*c-x*s],norm=Math.hypot(...v);
  return v.map(z=>z/norm);
 }
 const radToDeg=q=>2*Math.atan2(q[0],q[3])/RAD;
 const degreesToQ=d=>[Math.sin(d*RAD/2),0,0,Math.cos(d*RAD/2)];
 function construct(g,builder){
  if(g.skins?.[0]?.joints?.length!==19)throw Error('Original 19-joint GLB required');
  if(!builder?.configs?.walk||builder.N!==N)throw Error('V16.7 builder unavailable');
  if(g.animations.some(x=>x.name===NAME))throw Error('Duplicate experimental clip');
  const walk=g.animations.find(x=>x.name==='Walk_V16_7_FOOTFALL');
  const prior=g.animations.find(x=>x.name==='Walk_V16_6_LEGS_REBUILT');
  if(!walk||walk.channels.length!==19||!prior||prior.channels.length!==19)
   throw Error('Protected Walk 19-track sources missing');
  const nameOf=node=>g.doc.nodes[node]?.name||'';
  const original=new Map(prior.channels.map(x=>[nameOf(x.node)+'|'+x.path,x]));
  const joints=new Map();
  const bounds=builder.configs.walk;
  for(const [leg,parts] of Object.entries(builder.chains))parts.forEach((part,k)=>joints.set(part,{leg,k}));
  const allEvents=Array.from({length:N},(_,i)=>events(i));
  if(allEvents.some(x=>x.stanceCount<2||x.stanceCount>3))
   throw Error('Walk support schedule must alternate 2/3 limbs with no suspension');
  const times=Float32Array.from({length:N},(_,i)=>i*walk.duration/N);
  const edited=[],stats={range:{},events:allEvents.map(x=>({stanceCount:x.stanceCount,head:x.head,withers:x.withers}))};
  const channels=walk.channels.map(ch=>{
   const name=nameOf(ch.node),n=ch.path==='rotation'?4:3;
   const base=original.get(name+'|'+ch.path);
   if(!base)throw Error('Missing original track '+name+'/'+ch.path);
   const data=new Float32Array(N*n);
   const values=[];
   for(let i=0;i<N;i++){
    const ev=allEvents[i],time=walk.duration*i/N,tPrior=prior.duration*i/N;
    let value=builder.sample(ch.sam,time,n);
    if(ch.path==='rotation'&&joints.has(name)){
     // Small contact-phase adjustments on the existing four-leg animation,
     // NOT a physical hoof-IK solution. Distal joints are limited to bounds.
     const {leg,k}=joints.get(name),p=ev.legs[leg].progress,
      stance=ev.legs[leg].stance,sw=ev.swing(leg);
     const originalAngle=radToDeg(value),fore=leg.startsWith('Fore');
     let delta=0;
     if(fore){
      if(k===0)delta=stance?1.2*(.5-p):-.75*sw;
      if(k===1)delta=3.2*sw;
      if(k===2)delta=-1.0*sw+1.0*(stance?Math.sin(PI*p):0);
     }else{
      if(k===0)delta=stance?1.1*(p-.5):-.8*sw;
      if(k===1)delta=3.3*sw;
      if(k===2)delta=-3.0*sw;
      if(k===3)delta=1.2*(stance?Math.sin(PI*p):0);
     }
     const jointBounds=builder.chains[leg].length===3?
      [[-43,31],[-3,47],[-19,20]]:[[-50,26],[-8,46],[-34,30],[-20,21]];
     const target=clamp(originalAngle+delta,...jointBounds[k]);
     value=degreesToQ(target);values.push(target);
    }else if(name==='Torso'&&ch.path==='translation'){
     // Derive withers displacement from fore-support. 8mm oscillation
     // plus a small hind-support term; this is NOT root translation.
     value=builder.sample(base.sam,tPrior,3);
     value=[value[0],value[1]+.008*ev.withers+.003*(ev.pelvis-.5),value[2]];
    }else if(name==='Torso'&&ch.path==='rotation'){
     // Rock the trunk by fore-support, rather than an unrelated sine.
     value=mulX(builder.sample(base.sam,tPrior,4),.38*ev.withers);
    }else if(name==='Neck'&&ch.path==='rotation'){
     value=mulX(builder.sample(base.sam,tPrior,4),-4.1*ev.head+.24*ev.withers);
    }else if(name==='Head'&&ch.path==='rotation'){
     // Partial poll counter-rotation stabilizes muzzle position.
     value=mulX(builder.sample(base.sam,tPrior,4),1.45*ev.head-.2*ev.withers);
    }
    if(!value.every(Number.isFinite))throw Error('Nonfinite V16.9 '+name+'/'+i);
    data.set(value,i*n);
   }
   if(values.length){stats.range[name]=Math.max(...values)-Math.min(...values);edited.push(name);}
   return {node:ch.node,path:ch.path,sam:{times,data,interpolation:'LINEAR'}};
  });
  if(channels.length!==19||edited.length!==14)throw Error('Walk protected channel count regression');
  const angularJump=Object.fromEntries(channels.filter(ch=>ch.path==='rotation').map(ch=>{
   const values=ch.sam.data,steps=Array.from({length:N},(_,i)=>{
    const a=i*4,b=((i+N-1)%N)*4;
    const dot=Math.abs(values[a]*values[b]+values[a+1]*values[b+1]+values[a+2]*values[b+2]+values[a+3]*values[b+3]);
    return 2*Math.acos(clamp(dot,-1,1))/RAD;
   });
   return [nameOf(ch.node),Math.max(...steps)];
  }));
  return {clip:{name:NAME,duration:walk.duration,channels},
   metrics:{status:'VISUAL_EXPERIMENT_NOT_APPROVED',channels:channels.length,limbs:edited.length,
    source:walk.name,period:walk.duration,angularJump,headWithersPhaseOffset:.25,
    headWavesPerStride:2,stanceCountMin:Math.min(...allEvents.map(x=>x.stanceCount)),
    stanceCountMax:Math.max(...allEvents.map(x=>x.stanceCount)),
    modelPreserved:true,jointRanges:stats.range}};
 }
 return {NAME,N,events,phase,support,construct};
});
(function(){'use strict';
 let tries=0;
 const timer=setInterval(()=>{
  if(!window.__horseV168Bridge?.ready||!window.__horseV167Builder){
   if(++tries>900){clearInterval(timer);window.__horseV169Error='Viewer/bridge initialization timeout';}
   return;
  }
  clearInterval(timer);
  try{
   const g=object3d,b=window.__horseV169Builder,build=b.construct(g,window.__horseV167Builder),
    index=g.animations.length;
   g.animations.push(build.clip);
   const bridge=window.__horseV168Bridge;
   bridge.registerCandidate('walk',index);
   window.__horseV169Candidate={ready:true,clipIndex:index,clip:build.clip.name,metrics:build.metrics,
    originalGlbPreserved:true,automaticApproval:false,
    frame:n=>{
     const v=window.__horseV167Visual,sel=document.getElementById('animations'),
      option=[...sel.options].find(x=>x.textContent==='Walk');
     if(!option)throw Error('Missing Walk option');
     option.value=String(index);sel.value=String(index);sel.dispatchEvent(new Event('change'));
     play=false;animTime=((n%160)+160)%160*build.clip.duration/160;
     setClip(g);updateWorld(g);
     return {mode:'walk',clip:build.clip.name,frame:n};
    }};
  }catch(e){window.__horseV169Error=String(e?.stack||e);console.error('V16.9 candidate',e);}
 },110);
})();