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
/* Stage 1 — Footfall timeline. The same phase data drives hoof,
 * leg coordination and body motion, with no extra angles patched afterward.
 */
function phaseTimeline(mode,config,geom){
 const states=Object.fromEntries(FEET.map(leg=>[leg,Array.from({length:N},(_,i)=>{
  const t=gaitTarget(i,config,leg,geom);
  const kind=leg.startsWith('Fore')?'fore':'hind';
  // Breakover cannot be animated independently in this 19-joint GLB;
  // represent its timing in the target, never claim a separate hoof pivot.
  const breakover=t.stance?ease((t.u-.78)/.22):0;
  return {...t,leg,kind,breakover,flight:!t.stance};
 })]));
 const support=Array.from({length:N},(_,i)=>FEET.filter(leg=>states[leg][i].stance));
 return {mode,config,states,support,phases:N,realHoofJoint:false};
}
/* Stage 2 — Hoof trajectories. Stance uses almost-linear backward
 * treadmill-relative movement; swing has a raised forward-return arc.
 * These positions are desired constraints, not fabricated contacts.
 */
function hoofTrajectory(timeline,geom){
 const lift={walk:.055,cruise:.083,fast:.095,sprint:.105}[timeline.mode];
 const targets={};
 for(const leg of FEET){
  targets[leg]=timeline.states[leg].map(t=>{
   const departure=t.flight?Math.pow(Math.sin(PI*t.u),2):0;
   const phase=t.phase,contact=t.stance;
   return {...t,y:geom.floor+.003+(contact?0:lift*departure),
    z:t.z,roll:contact?t.breakover:0};
  });
 }
 return targets;
}
function cloneFrames(frames){
 return frames.map(p=>p.map(x=>({t:x.t.slice(),q:x.q.slice(),s:x.s.slice()})));
}
/* Stage 3 — Whole-limb coordinated motion. This is a low-dimensional,
 * cycle-wide constrained IK approximation for the existing 19 skinned bones,
 * not physical inverse dynamics and not per-frame independent IK.
 */
function limbPrior(g,mode,frames,timeline,geom){
 const game={walk:{reach:1,fore:0,hind:0,hock:0,bob:.0015,pitch:.11,neck:.10,tail:.16},
  cruise:{reach:.89,fore:2.7,hind:3.5,hock:-2.9,bob:.006,pitch:.46,neck:.25,tail:.42},
  fast:{reach:.86,fore:3.1,hind:4.1,hock:-3.3,bob:.007,pitch:.54,neck:.31,tail:.50},
  sprint:{reach:.84,fore:3.5,hind:4.7,hock:-3.6,bob:.008,pitch:.62,neck:.36,tail:.58}}[mode];
 for(const leg of FEET){
  const ids=geom.chains[leg],fore=leg.startsWith('Fore'),root=ids[0];
  const angle=q=>2*Math.atan2(q[0],q[3]);
  const mean=frames.reduce((sum,p)=>sum+angle(p[root].q),0)/N;
  for(let i=0;i<N;i++){
   const p=frames[i],t=timeline.states[leg][i],
    swing=t.flight?Math.sin(PI*t.u)**2:0,
    cur=angle(p[root].q);
   p[root].q=qmultiply(p[root].q,xdelta(clamp((mean-cur)*(1-game.reach),-4*RAD,4*RAD)));
   p[ids[1]].q=qmultiply(p[ids[1]].q,xdelta((fore?game.fore:game.hind)*RAD*swing));
   if(!fore)p[ids[2]].q=qmultiply(p[ids[2]].q,xdelta(game.hock*RAD*swing));
  }
 }
 return game;
}
/* Stage 4 — Body/poll response is synchronized to the same support map.
 * Airborne feet never drive root lift and support impulses are smoothed.
 */
function bodyFromSupport(g,mode,frames,timeline,geom,game){
 const lift=Array.from({length:N},(_,i)=>{
  const contacting=timeline.support[i];
  if(!contacting.length)return 0;
  const measured=Math.min(...contacting.map(leg=>geom.foot(frames[i],leg).y));
  return clamp(geom.floor+.003-measured,0,.037);
 });
 const root=circular(lift,10,4.3).map(x=>clamp(.72*x,0,.029));
 const tail=g.doc.nodes.findIndex(n=>n.name==='Tail');
 const foreWeights=timeline.states.ForeL.map((_,i)=>
  timeline.states.ForeL[i].weight+timeline.states.ForeR[i].weight);
 const hindWeights=timeline.states.HindL.map((_,i)=>
  timeline.states.HindL[i].weight+timeline.states.HindR[i].weight);
 const balance=circular(foreWeights.map((w,i)=>(w-hindWeights[i])*.5),8,3.5);
 for(let i=0;i<N;i++){
  const p=frames[i],theta=TAU*i/N;
  p[geom.torso].t[1]+=root[i]+game.bob*(.5+.5*Math.sin(theta-.75));
  const pitch=game.pitch*(balance[i]+.20*Math.sin(theta-.9))*RAD;
  p[geom.torso].q=qmultiply(p[geom.torso].q,xdelta(pitch));
  p[geom.neck].q=qmultiply(p[geom.neck].q,xdelta(-game.neck*RAD*balance[i]));
  p[geom.head].q=qmultiply(p[geom.head].q,
   xdelta(game.neck*.40*RAD*Math.sin(theta-1.05)));
  if(tail>=0)p[tail].q=qmultiply(p[tail].q,
   xdelta(game.tail*RAD*Math.sin(theta-1.48)));
 }
 return {maxTorsoLiftMm:Math.max(...root)*1000,supportDriven:true,
  visualPolicy:'phase-synchronized body and coordinated leg recovery'};
}
/* Optimization stage: coefficients are shared across the entire gait
 * cycle, enforcing periodicity. Candidate amplitude is selected against
 * measured hoof/skin errors; do not alter geometry or old source clips.
 */
function solveLimbs(mode,frames,prior,timeline,targets,geom){
 const training=Array.from({length:28},(_,j)=>Math.floor(j*N/28)),
  amp=[.075,.063,.063,.045,.045],optimizer={attempts:0,improvements:0,selectedScales:{}};
 const scales=mode==='walk'?[0,.15,.25,.4,.6]:[0,.15,.25,.4,.6,.8,1];
 for(const leg of FEET){
  const ids=geom.chains[leg],coeff=ids.map(()=>new Float64Array(5)),
   poses=training.map(i=>frames[i]),base=training.map(i=>prior[i]),
   desired=training.map(i=>targets[leg][i]);
  const baseline=Array.from({length:training.length},(_,j)=>geom.foot(base[j],leg,true));
  const baselineSkin=Math.max(...baseline.map(x=>x.skinStretch));
  // Whole-cycle cost: actual contact, swing clearance and treadmill slip;
  // skin regularization discourages damaging existing rig weights.
  function apply(scale){
   for(let j=0;j<training.length;j++){
    const f=training[j],p=poses[j];
    ids.forEach((id,k)=>p[id].q=qmultiply(base[j][id].q,
     xdelta(scale*phaseCorrection(coeff[k],f))));
   }
  }
  function evalCost(full=false){
   let error=0,maxSkin=0,maxPen=0;
   let prev=null;
   for(let j=0;j<training.length;j++){
    const t=desired[j],v=geom.foot(poses[j],leg,full||j%4===0),
     py=v.y-t.y,pz=v.z-t.z,pen=Math.max(0,geom.floor+.001-v.y);
    error+=(t.stance?32:10)*py*py+(t.stance?3.4:1.1)*pz*pz+180*pen*pen;
    if(t.stance){
     error+=1.25*Math.pow(v.toe-v.heel,2);
     if(prev&&prev.stance && training[j]-prev.frame<=7){
      const actualStep=v.z-prev.z;
      const requiredStep=t.z-prev.targetZ;
      error+=28*(actualStep-requiredStep)**2;
     }
    }
    prev={stance:t.stance,frame:training[j],z:v.z,targetZ:t.z};
    maxPen=Math.max(maxPen,pen);
    maxSkin=Math.max(maxSkin,v.skinStretch);
    if(full||j%4===0)error+=48*Math.max(0,v.skinStretch-1.19)**2;
   }
   for(const a of coeff)for(let k=0;k<a.length;k++)
    error+=(k===0?.025:k<=2?.03:.050)*a[k]*a[k];
   return {cost:error/training.length,maxSkin,maxPen};
  }
  apply(0);let best=evalCost().cost;
  for(const step of [.040,.019,.009]){
   for(let pass=0;pass<2;pass++)for(let k=0;k<ids.length;k++)for(let h=0;h<5;h++){
    const original=coeff[k][h];let winner=original,low=best;
    for(const dir of [-1,1]){
     const v=clamp(original+dir*step,-amp[h],amp[h]);
     if(Math.abs(v-original)<1e-8)continue;
     coeff[k][h]=v;apply(1);
     const cost=evalCost().cost;optimizer.attempts++;
     if(cost+1e-10<low){low=cost;winner=v;}
    }
    coeff[k][h]=winner;apply(1);
    if(low<best){best=low;optimizer.improvements++;}
   }
  }
  // Select a scale based on actual protected GLB geometry rather than
  // blindly applying a fixed 25% of every IK solution.
  let chosen={scale:0,cost:Infinity};
  for(const scale of scales){
   apply(scale);
   const measured=evalCost(true);
   const excessiveSkin=measured.maxSkin>baselineSkin+.004;
   // Geometry-based reject; still permits fixing a bad baseline cautiously.
   if(excessiveSkin)continue;
   const regularizer=Math.abs(scale)*.000025;
   if(measured.cost+regularizer<chosen.cost)
    chosen={scale,cost:measured.cost+regularizer,
     maxSkin:measured.maxSkin,maxPen:measured.maxPen};
  }
  optimizer.selectedScales[leg]={...chosen,baselineSkin};
  for(let i=0;i<N;i++)ids.forEach((id,j)=>
   frames[i][id].q=qmultiply(prior[i][id].q,
    xdelta(chosen.scale*phaseCorrection(coeff[j],i))));
 }
 return optimizer;
}
function smoothCycle(frames,geom){
 const jointIds=[...new Set(Object.values(geom.chains).flat())],
  ids=[...jointIds,geom.torso,geom.neck,geom.head];
 for(const id of ids){
  const q=frames.map(p=>p[id].q.slice());
  for(let i=0;i<N;i++){
   const prev=q[(i+N-1)%N],now=q[i],next=q[(i+1)%N];
   const p=now.reduce((v,x,k)=>v+x*prev[k],0)<0?-1:1,
    n=now.reduce((v,x,k)=>v+x*next[k],0)<0?-1:1;
   const a=now.map((x,k)=>.86*x+.07*(p*prev[k]+n*next[k])),
    norm=Math.hypot(...a);
   frames[i][id].q=a.map(x=>x/norm);
  }
 }
 return measureDerivative(frames,jointIds);
}
/* Stages execute in the requested order:
 * phase -> hoof trajectories -> coordinated limb IK -> body response -> verify.
 * Body first uses a support-based initial prediction, with IK then fitted
 * against that predicted torso; final pose stays one coherent cyclic clip.
 */
function bake(g,mode,builder,geom){
 const config=builder.configs[mode],src=g.animations.find(c=>c.name===config.name);
 if(!src||src.channels.length!==19)throw Error('Protected base clip missing: '+mode);
 const source=Array.from({length:N},(_,i)=>copyPose(g,src,i,builder));
 const timeline=phaseTimeline(mode,config,geom);
 const targets=hoofTrajectory(timeline,geom);
 const frames=cloneFrames(source);
 const game=limbPrior(g,mode,frames,timeline,geom);
 // Motion is predicted from phase support before IK because the skeletal
 // hierarchy needs a torso position for evaluating each hoof target.
 const body=bodyFromSupport(g,mode,frames,timeline,geom,game);
 const prior=cloneFrames(frames);
 const fit=solveLimbs(mode,frames,prior,timeline,targets,geom);
 const smooth=smoothCycle(frames,geom);
 const sampleTimes=Float32Array.from({length:N},(_,i)=>src.duration*i/N);
 const channels=src.channels.map(ch=>{
  const dim=ch.path==='rotation'?4:3,values=new Float32Array(N*dim);
  for(let i=0;i<N;i++){
   const p=frames[i][ch.node],x=ch.path==='rotation'?p.q:
    ch.path==='translation'?p.t:p.s;
   values.set(x,i*dim);
  }
  return {node:ch.node,path:ch.path,sam:{times:sampleTimes,data:values,interpolation:'LINEAR'}};
 });
 const clip={name:'V17_1_'+mode.toUpperCase()+'_CYCLE_IK_EXPERIMENT',
  duration:src.duration,channels};
 const gameMotion={
  reach:game.reach,hind:game.hind,fore:game.fore,hock:game.hock,
  bob:game.bob,pitch:game.pitch,neck:game.neck,tail:game.tail};
 return {clip,stats:{mode,source:src.name,period:src.duration,
  method:'phase-foot-trajectory-coordinated-IK-body-validation',
  phasePhases:N,contactFootIds:FEET,ground:geom.floor,
  targetPathType:'stance-lock treadmill proxy, continuous lifted swing',
  optimizedSteps:fit.improvements,trialCount:fit.attempts,
  selectedIKScales:fit.selectedScales,
  maxTorsoLiftMm:body.maxTorsoLiftMm,...smooth,
  visualPolicy:body.visualPolicy,gaitPolish:gameMotion,
  originalModelPreserved:true,originalSkinPreserved:true,
  referenceJointCount:19,rigExtended:false,approved:false}};
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