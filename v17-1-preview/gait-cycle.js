/* HORSE RANCH V17.1 — CYCLE-WIDE CONTINUOUS hoof IK candidate.
 * Four gaits, periodic low-frequency joint correction; source GLB and all
 * existing animation channels are preserved. Experimental, NOT approved.
 * No independent foot joint exists in the real 19-joint skeleton.
 */
(function(){'use strict';
const N=160,PI=Math.PI,TAU=2*PI,RAD=PI/180,
 FEET=['HindR','ForeR','HindL','ForeL'],MODES=['walk','cruise','fast','sprint'],
 clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),frac=x=>((x%1)+1)%1,
 ease=v=>{let t=clamp(v,0,1);return t*t*(3-2*t);};
function multiply(a,b){
 const c=new Float64Array(16);
 for(let col=0;col<4;col++)for(let row=0;row<4;row++)
  for(let k=0;k<4;k++)c[col*4+row]+=a[k*4+row]*b[col*4+k];
 return c;
}
function localMatrix(t,q,s){
 const [x,y,z,w]=q,[sx,sy,sz]=s,xx=2*x*x,yy=2*y*y,zz=2*z*z,
 xy=2*x*y,xz=2*x*z,yz=2*y*z,wx=2*w*x,wy=2*w*y,wz=2*w*z;
 return Float64Array.from([(1-yy-zz)*sx,(xy+wz)*sx,(xz-wy)*sx,0,
 (xy-wz)*sy,(1-xx-zz)*sy,(yz+wx)*sy,0,
 (xz+wy)*sz,(yz-wx)*sz,(1-xx-yy)*sz,0,t[0],t[1],t[2],1]);
}
function qmultiply(a,b){
 const [x,y,z,w]=a,[u,v,k,h]=b;
 const t=[w*u+x*h+y*k-z*v,w*v-x*k+y*h+z*u,w*k+x*v-y*u+z*h,w*h-x*u-y*v-z*k];
 const norm=Math.hypot(...t);if(norm<1e-9)throw Error('Zero quaternion');
 return t.map(n=>n/norm);
}
function xdelta(a){return [Math.sin(a*.5),0,0,Math.cos(a*.5)];}
function copyPose(g,clip,i,sampler){
 const state=g.nodes.map(n=>({t:Array.from(n.baseT),q:Array.from(n.baseQ),s:Array.from(n.baseS)}));
 for(const ch of clip.channels){
  const x=sampler.sample(ch.sam,clip.duration*i/N,ch.path==='rotation'?4:3);
  state[ch.node][ch.path==='rotation'?'q':ch.path==='translation'?'t':'s']=x;
 }
 return state;
}
function scanner(g,builder){
 const mesh=g.doc.meshes[0].primitives[0],a=mesh.attributes,doc=g.doc.nodes,
  skin=g.skins[0],pos=readAccessor(g,a.POSITION),ji=readAccessor(g,a.JOINTS_0),
  weight=readAccessor(g,a.WEIGHTS_0),indices=readAccessor(g,mesh.indices),
  parents=new Int16Array(doc.length).fill(-1);
 doc.forEach((n,i)=>(n.children||[]).forEach(k=>parents[k]=i));
 if(skin.joints.length!==19||pos.length!==24314*3)throw Error('Unexpected source GLB topology');
 const original=window.__horseV16Targets?.collect(g);
 if(!original?.feet||!Number.isFinite(original.floor))throw Error('Real hoof detector unavailable');
 const chains=Object.fromEntries(FEET.map(name=>[name,builder.chains[name].map(n=>{
  const i=doc.findIndex(x=>x.name===n);if(i<0)throw Error('Missing '+n);return i;
 })]));
 const namedJoints=skin.joints.map(id=>doc[id].name);
 const localEdges={};
 for(const leg of FEET){
  const important=new Set(namedJoints.map((n,i)=>n.startsWith(leg+'_')?i:-1).filter(i=>i>=0));
  const affected=i=>{
   let sum=0;for(let k=0;k<4;k++)if(important.has(ji[i*4+k]))sum+=weight[i*4+k];return sum;
  };
  const pts=[],seen=new Set();
  for(let i=0;i<indices.length;i+=3){
   for(const [u,v] of [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]){
    const x=Math.min(u,v),y=Math.max(u,v),key=x*24314+y;
    if(seen.has(key))continue;seen.add(key);
    const width=Math.abs(pos[x*3]-original.feet[leg].ref[0]),
     distance=Math.abs(pos[y*3]-original.feet[leg].ref[0]);
    if(width>.33||distance>.33||Math.max(affected(x),affected(y))<.35||
      Math.min(affected(x),affected(y))<.08)continue;
    const len=Math.hypot(pos[x*3]-pos[y*3],pos[x*3+1]-pos[y*3+1],pos[x*3+2]-pos[y*3+2]);
    if(len>.008&&len<.12)pts.push([x,y,len]);
   }
  }
  if(pts.length<20)throw Error('Missing skinned limb edge cohort: '+leg);
  const chosen=32;
  localEdges[leg]=Array.from({length:Math.min(chosen,pts.length)},
   (_,i)=>pts[Math.floor(i*pts.length/Math.min(chosen,pts.length))]);
 }
 function matrices(p){
  const world=new Array(doc.length);
  function transform(id){
   if(world[id])return world[id];
   const n=g.nodes[id],s=p[id],m=n.useMatrix?n.matrix:localMatrix(s.t,s.q,s.s);
   world[id]=parents[id]<0?m:multiply(transform(parents[id]),m);
   return world[id];
  }
  return skin.joints.map((id,k)=>multiply(transform(id),skin.ibms.subarray(k*16,k*16+16)));
 }
 function vertex(index,m){
  const i=3*index,j=4*index,x=pos[i],y=pos[i+1],z=pos[i+2];let X=0,Y=0,Z=0;
  for(let k=0;k<4;k++){
   const w=weight[j+k];if(w<.000001)continue;
   const t=m[ji[j+k]];
   X+=w*(t[0]*x+t[4]*y+t[8]*z+t[12]);
   Y+=w*(t[1]*x+t[5]*y+t[9]*z+t[13]);
   Z+=w*(t[2]*x+t[6]*y+t[10]*z+t[14]);
  }
  return [X,Y,Z];
 }
 function foot(p,leg,skin=false){
  const m=matrices(p),info=original.feet[leg],
   contacts=[info.contactVertex,info.frontVertex,info.backVertex].map(i=>vertex(i,m));
  let skinStretch=1;
  if(skin){
   let upper=0;
   for(const [u,v,len] of localEdges[leg]){
    const a=vertex(u,m),b=vertex(v,m);
    const ratio=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])/len;
    upper=Math.max(upper,ratio);
   }
   skinStretch=upper;
  }
  return {y:Math.min(...contacts.map(x=>x[1])),z:contacts[0][2],
   toe:contacts[1][1],heel:contacts[2][1],skinStretch};
 }
 return {original,chains,foot,torso:doc.findIndex(n=>n.name==='Torso'),
  neck:doc.findIndex(n=>n.name==='Neck'),head:doc.findIndex(n=>n.name==='Head'),floor:original.floor};
}
function gaitTarget(i,c,leg,g){
 const phase=frac(i/N-c.touch[leg]),type=leg.startsWith('Fore')?'fore':'hind',
  duty=c.stance[type],stance=phase<duty,
  u=stance?phase/duty:(phase-duty)/(1-duty);
 // Linear stance progression with softened first/last 8%; constant
 // treadmilled world velocity through the central support interval.
 const a=.08,p=u<a?u*u/(2*a*(1-a)):
  u>1-a?1-(1-u)*(1-u)/(2*a*(1-a)):(u-a/2)/(1-a);
 const advance=stance?.5-p:ease(u)-.5;
 const rise=stance?0:.080*Math.pow(Math.sin(PI*u),2);
 return {stance,u,phase,z:g.original.feet[leg].restZ+c.stride[type]*advance,
  y:g.floor+.003+rise,weight:stance?ease(u/.15)*ease((1-u)/.15):0};
}
function circular(values,radius=9,sigma=3.8){
 const k=Array.from({length:radius*2+1},(_,i)=>Math.exp(-.5*((i-radius)/sigma)**2)),
 total=k.reduce((a,b)=>a+b,0);
 return values.map((_,i)=>k.reduce((s,w,j)=>s+w*values[(i+j-radius+N)%N],0)/total);
}
function basis(i){const t=TAU*i/N;return [1,Math.sin(t),Math.cos(t),Math.sin(2*t),Math.cos(2*t)];}
const harmonic=Array.from({length:N},(_,i)=>basis(i));
function phaseCorrection(coeff,frame){
 return coeff.reduce((a,x,j)=>a+x*harmonic[frame][j],0);
}
function measureDerivative(frame,ids){
 let worstStep=0,worstAccel=0,worstSeam=0;
 for(const id of ids){
  const rot=frame.map(p=>p[id].q);
  const dist=(a,b)=>2*Math.acos(clamp(Math.abs(a.reduce((v,x,k)=>v+x*b[k],0)),-1,1));
  for(let i=0;i<N;i++){
   const next=(i+1)%N,prev=(i+N-1)%N;
   const step=dist(rot[i],rot[next])/RAD;
   worstStep=Math.max(worstStep,step);
   worstSeam=i===N-1?Math.max(worstSeam,step):worstSeam;
   worstAccel=Math.max(worstAccel,Math.abs(dist(rot[prev],rot[i])-dist(rot[i],rot[next]))/RAD);
  }
 }
 return {maxFullJointStepDeg:worstStep,maxStepMagnitudeDeltaDeg:worstAccel,maxCycleSeamDeg:worstSeam};
}
function bake(g,mode,builder,geom){
 const config=builder.configs[mode],src=g.animations.find(c=>c.name===config.name);
 if(!src||src.channels.length!==19)throw Error('Protected base clip missing: '+mode);
 const before=Array.from({length:N},(_,i)=>copyPose(g,src,i,builder));
 const frames=before.map(x=>x.map(p=>({t:p.t.slice(),q:p.q.slice(),s:p.s.slice()})));
 // Only CONTACTING feet influence the torso lift. Root correction is cyclic
 // and bounded so airborne swing hooves cannot produce vertical impulses.
 const lift=Array.from({length:N},(_,i)=>{
  const contacting=FEET.filter(leg=>gaitTarget(i,config,leg,geom).stance);
  if(!contacting.length)return 0;
  const lowest=Math.min(...contacting.map(leg=>geom.foot(before[i],leg).y));
  return clamp(geom.floor+.003-lowest,0,.037);
 });
 const root=circular(lift,9,3.7).map(x=>clamp(.76*x,0,.030));
 for(let i=0;i<N;i++){
  frames[i][geom.torso].t[1]+=root[i];
  // Fully continuous support response on a fixed gait-phase schedule.
  const ws=Object.fromEntries(FEET.map(leg=>[leg,gaitTarget(i,config,leg,geom).weight]));
  const fore=ws.ForeL+ws.ForeR,hind=ws.HindL+ws.HindR;
  const response=(fore-hind)*.5,headAmp=mode==='walk'?.38:.26;
  frames[i][geom.neck].q=qmultiply(before[i][geom.neck].q,xdelta(-response*headAmp*RAD));
  frames[i][geom.head].q=qmultiply(before[i][geom.head].q,xdelta(response*headAmp*.50*RAD));
 }
 const training=Array.from({length:24},(_,j)=>Math.floor(j*N/24));
 let trialCount=0,optimized=0;
 // Fourier coefficients are shared by ALL frames of each stride: the
 // optimizer can never choose a different local minimum every frame.
 for(const leg of FEET){
  const ids=geom.chains[leg],coeff=ids.map(()=>new Float64Array(5));
  const amp=[.072,.065,.065,.046,.046];
  const poses=training.map(i=>frames[i]),base=training.map(i=>before[i]),
   targets=training.map(i=>gaitTarget(i,config,leg,geom)),
   metricBases=[];
  function apply(coeffs){
   for(let n=0;n<training.length;n++){
    const f=training[n],p=poses[n];
    ids.forEach((id,j)=>p[id].q=qmultiply(base[n][id].q,xdelta(phaseCorrection(coeffs[j],f))));
   }
  }
  function objective(){
   let err=0;
   for(let n=0;n<training.length;n++){
    const tar=targets[n],v=geom.foot(poses[n],leg,n%3===0),
     pen=Math.max(0,geom.floor+.001-v.y),
     wz=tar.stance?2.5:.6,wy=tar.stance?25:8;
    err+=wy*(v.y-tar.y)**2+wz*(v.z-tar.z)**2+130*pen*pen;
    if(tar.stance)err+=.8*(v.toe-v.heel)**2;
    if(n%3===0)err+=12*Math.max(0,v.skinStretch-1.20)**2;
   }
   for(const coefficients of coeff)for(let k=0;k<5;k++)
    err+=(k===0?.025:k<=2?.030:.048)*coefficients[k]*coefficients[k];
   return err/training.length;
  }
  apply(coeff);let best=objective();
  for(const step of [.045,.022,.011]){
   for(let pass=0;pass<2;pass++)for(let j=0;j<ids.length;j++)for(let k=0;k<5;k++){
    const original=coeff[j][k];let win=original,localBest=best;
    for(const direction of [-1,1]){
     const candidate=clamp(original+direction*step,-amp[k],amp[k]);
     if(Math.abs(candidate-coeff[j][k])<1e-8)continue;
     coeff[j][k]=candidate;apply(coeff);
     const cost=objective();trialCount++;
     if(cost+1e-10<localBest){localBest=cost;win=candidate;}
    }
    coeff[j][k]=win;apply(coeff);
    if(localBest<best){best=localBest;optimized++;}
   }
  }
  // Geometry-guarded conservative output: most of the original cycle
  // is retained because the 19-bone skin already overstretches near joints.
  // Do not trade a slight contact win for further visible tissue distortion.
  const acceptedScale=.25;
  for(let i=0;i<N;i++)ids.forEach((id,j)=>
    frames[i][id].q=qmultiply(before[i][id].q,xdelta(acceptedScale*phaseCorrection(coeff[j],i))));
 }
 // GAME-POLISH (not an anatomical/ridigging replacement):
 // 1. Reduce visual straight-leg overreach in gallop.
 // 2. Give recovering knee/stifle/hock a SMALL coordinated flexion.
 // 3. Add low-frequency trunk counter-motion, neck/head response and delayed tail.
 // All additions are smooth and cyclic; no hard touchdown toggles.
 // This layer stays modest because unmodified 19-bone skin already overstretches.
 const game={walk:{reach:1,fore:0,hind:0,hock:0,bob:.0015,pitch:.11,neck:.10,tail:.16},
  cruise:{reach:.89,fore:2.7,hind:3.5,hock:-2.9,bob:.006,pitch:.46,neck:.25,tail:.42},
  fast:{reach:.86,fore:3.1,hind:4.1,hock:-3.3,bob:.007,pitch:.54,neck:.31,tail:.50},
  sprint:{reach:.84,fore:3.5,hind:4.7,hock:-3.6,bob:.008,pitch:.62,neck:.36,tail:.58}}[mode];
 const limbActions={};
 for(const leg of FEET){
  const ids=geom.chains[leg],isFore=leg.startsWith('Fore');
  const rootId=ids[0];
  // Compress *phase excursion*, not the joint's neutral position.
  const mean=frames.reduce((s,p)=>s+2*Math.atan2(p[rootId].q[0],p[rootId].q[3]),0)/N;
  const flexId=ids[1],hockId=isFore?null:ids[2];
  for(let i=0;i<N;i++){
   const p=frames[i],state=gaitTarget(i,config,leg,geom),
    swing=state.stance?0:Math.pow(Math.sin(PI*state.u),2),
    current=2*Math.atan2(p[rootId].q[0],p[rootId].q[3]);
   const shoulderDelta=clamp((mean-current)*(1-game.reach),-4.0*RAD,4.0*RAD);
   p[rootId].q=qmultiply(p[rootId].q,xdelta(shoulderDelta));
   p[flexId].q=qmultiply(p[flexId].q,xdelta((isFore?game.fore:game.hind)*RAD*swing));
   if(hockId!==null)p[hockId].q=qmultiply(p[hockId].q,xdelta(game.hock*RAD*swing));
  }
  limbActions[leg]={reachScale:game.reach,flexDeg:isFore?game.fore:game.hind,
   hockDeg:isFore?0:game.hock};
 }
 for(let i=0;i<N;i++){
  const p=frames[i],theta=TAU*i/N;
  // Keep motion measured and below a degree at the pelvis: no rubber torso.
  const pulse=Math.sin(theta-0.45)+.20*Math.sin(2*theta-.9);
  p[geom.torso].t[1]+=game.bob*(.5+.5*Math.sin(theta-.75));
  p[geom.torso].q=qmultiply(p[geom.torso].q,xdelta(game.pitch*RAD*pulse));
  p[geom.neck].q=qmultiply(p[geom.neck].q,xdelta(-game.neck*RAD*pulse));
  p[geom.head].q=qmultiply(p[geom.head].q,xdelta(game.neck*.42*RAD*Math.sin(theta-1.05)));
  const tailId=g.doc.nodes.findIndex(x=>x.name==='Tail');
  if(tailId>=0)p[tailId].q=qmultiply(p[tailId].q,
   xdelta(game.tail*RAD*Math.sin(theta-1.48)));
 }
 // Small periodic smoothing of final rotations (including cyclic seam).
 // Unlike repeated per-frame IK, this cannot create new pose branches.
 const allLegJoints=[...new Set(Object.values(geom.chains).flat())];
 for(const id of [...allLegJoints,geom.torso,geom.neck,geom.head]){
  const samples=frames.map(p=>p[id].q.slice());
  for(let i=0;i<N;i++){
   const previous=samples[(i+N-1)%N],current=samples[i],
    next=samples[(i+1)%N];
   const sign1=current.reduce((v,x,k)=>v+x*previous[k],0)<0?-1:1,
    sign2=current.reduce((v,x,k)=>v+x*next[k],0)<0?-1:1;
   const avg=current.map((x,k)=>.84*x+.08*(previous[k]*sign1+next[k]*sign2)),
    norm=Math.hypot(...avg);
   frames[i][id].q=avg.map(x=>x/norm);
  }
 }
 const sampleTimes=Float32Array.from({length:N},(_,i)=>src.duration*i/N);
 const channels=src.channels.map(ch=>{
  const dimension=ch.path==='rotation'?4:3,values=new Float32Array(N*dimension);
  for(let i=0;i<N;i++){
   const p=frames[i][ch.node],x=ch.path==='rotation'?p.q:ch.path==='translation'?p.t:p.s;
   values.set(x,i*dimension);
  }
  return {node:ch.node,path:ch.path,sam:{times:sampleTimes,data:values,interpolation:'LINEAR'}};
 });
 const jointIds=[...new Set(Object.values(geom.chains).flat())];
 const smooth=measureDerivative(frames,jointIds);
 const name='V17_1_'+mode.toUpperCase()+'_CYCLE_IK_EXPERIMENT';
 const clip={name,duration:src.duration,channels};
 // Original clip is never changed or promoted automatically.
 return {clip,stats:{mode,source:src.name,period:src.duration,method:'whole-cycle Fourier constrained IK',
  optimizedSteps:optimized,trialCount,referenceJointCount:19,
  maxTorsoLiftMm:Math.max(...root)*1000,...smooth,
  visualPolicy:'restrained game-ready gallop gait, reduced overreach, soft limb recovery',
  gaitPolish:game,limbActions,
  originalModelPreserved:true,rigExtended:false,approved:false}};
}
let count=0;
const wait=setInterval(()=>{
 if(!window.__horseV167?.ready||!window.__horseV167Builder||
  !window.__horseV171Bridge?.ready||!window.__horseV16Targets?.collect||!window.__viewerReady){
  if(++count>1000){clearInterval(wait);window.__horseV171Error='Original GLB/runtime missing';}return;
 }
 clearInterval(wait);
 try{
  const g=object3d,builder=window.__horseV167Builder,geometry=scanner(g,builder),results={};
  for(const mode of MODES){
   const result=bake(g,mode,builder,geometry),index=g.animations.length;
   g.animations.push(result.clip);window.__horseV171Bridge.register(mode,index);
   results[mode]={index,...result.stats};
  }
  window.__horseV171={ready:true,version:'V17.1',results,originalGlbPreserved:true,
   originalSkinPreserved:true,rigExtended:false,experimental:true};
  console.log('V17.1 cycle-wide IK experiments',results);
 }catch(e){window.__horseV171Error=String(e?.stack||e);console.error(window.__horseV171Error);}
},100);
})();