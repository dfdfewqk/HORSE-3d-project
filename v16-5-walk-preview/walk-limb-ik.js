/* HORSE RANCH V16.5 Walk-only constrained cyclic IK.
 * Local 19-joint X-hinges are preserved. Footfall targets are projected via
 * the ACTUAL final three-axis Torso pose; lateral underactuation is reported.
 * The numeric solver uses weighted damped least-squares with joint limits and
 * backtracking, not unbounded angles or artificial seam equality.
 */
(function(root,factory){'use strict';const out=factory();root.__horseV165IK=out;if(typeof module==='object'&&module.exports)module.exports=out;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const RAD=Math.PI/180,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const baseIK=()=> (typeof window!=='undefined'?window:globalThis).__horseV161IK;
const limits={fore:[[-43,31],[-3,47],[-19,20]],hind:[[-50,26],[-8,46],[-34,30],[-20,21]]};
function build(g,feet){
 const old=baseIK();if(!old?.build||!old?.fk)throw Error('V16.1 rig FK required');
 const rig=old.build(g,feet);
 for(const [name,leg] of Object.entries(rig.legs)){
  const kind=name.startsWith('Fore')?'fore':'hind';
  if(leg.chain.length!==limits[kind].length)throw Error('Unexpected chain '+name);
  leg.range=limits[kind].map(pair=>pair.map(x=>x*RAD));
  leg.side=name.endsWith('R')?1:-1;
  if(!leg.t.every(p=>p.every(Number.isFinite)))throw Error('Invalid GLB joint translations '+name);
 }
 return rig;
}
function rot(q,v){
 const [x,y,z,w]=q,[a,b,c]=v;
 const tx=2*(y*c-z*b),ty=2*(z*a-x*c),tz=2*(x*b-y*a);
 return [a+w*tx+y*tz-z*ty,b+w*ty+z*tx-x*tz,c+w*tz+x*ty-y*tx];
}
function localGoal(body,goal){
 const [x,y,z,w]=body.q;return rot([-x,-y,-z,w],[goal[0]-body.x,goal[1]-body.y,goal[2]-body.z]);
}
function worldPosition(body,p){
 const v=rot(body.q,p);return [v[0]+body.x,v[1]+body.y,v[2]+body.z];
}
function fk(leg,angles){return baseIK().fk(leg,angles,0,0,0);}
function linear(A,b){
 const n=b.length,M=A.map((row,i)=>row.concat([b[i]]));
 for(let i=0;i<n;i++){
  let best=i;for(let j=i+1;j<n;j++)if(Math.abs(M[j][i])>Math.abs(M[best][i]))best=j;
  if(Math.abs(M[best][i])<1e-12)return null;
  if(best!==i)[M[best],M[i]]=[M[i],M[best]];
  const inv=1/M[i][i];for(let k=i;k<=n;k++)M[i][k]*=inv;
  for(let j=0;j<n;j++)if(j!==i){const f=M[j][i];for(let k=i;k<=n;k++)M[j][k]-=f*M[i][k];}
 }
 return M.map(row=>row[n]);
}
function solve(leg,target,seed,prior,pitch,support){
 const n=leg.range.length,stance=support>.2,weight=stance?1.8:1,
  orientWeight=stance?.003:.0015,priorWeight=.0004,continuousWeight=.0013,damping=.0008;
 let x=seed.map((v,i)=>clamp(v,...leg.range[i]));
 function objective(a){
  const p=fk(leg,a),dy=target[0]-p[0],dz=target[1]-p[1],ang=pitch-a.reduce((s,t)=>s+t,0);
  let c=weight*(dy*dy+dz*dz)+orientWeight*ang*ang;
  for(let i=0;i<n;i++)c+=priorWeight*(a[i]-prior[i])**2+continuousWeight*(a[i]-seed[i])**2;
  return c;
 }
 for(let t=0;t<72;t++){
  const p=fk(leg,x),dy=target[0]-p[0],dz=target[1]-p[1],
   angle=clamp(pitch-x.reduce((s,v)=>s+v,0),-.32,.32);
  if(Math.hypot(dy,dz)<.0005&&Math.abs(angle)<.025)break;
  const eps=1e-4,J=x.map((v,k)=>{
   x[k]=v+eps;const changed=fk(leg,x);x[k]=v;
   return [(changed[0]-p[0])/eps,(changed[1]-p[1])/eps];
  });
  const A=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>
   weight*(J[i][0]*J[j][0]+J[i][1]*J[j][1])+orientWeight+
   (i===j?priorWeight+continuousWeight+damping:0)));
  const b=Array.from({length:n},(_,i)=>weight*(J[i][0]*dy+J[i][1]*dz)+orientWeight*angle+
     priorWeight*(prior[i]-x[i])+continuousWeight*(seed[i]-x[i]));
  const step=linear(A,b);if(!step||!step.every(Number.isFinite))break;
  const cur=objective(x);let accepted=false;
  for(const scale of [1,.5,.25,.125,.0625]){
   const candidate=x.map((v,i)=>clamp(v+clamp(step[i]*scale,-.12,.12),...leg.range[i]));
   if(objective(candidate)<cur-1e-12){x=candidate;accepted=true;break;}
  }
  if(!accepted)break;
 }
 const p=fk(leg,x);
 return {angles:x,error:Math.hypot(p[0]-target[0],p[1]-target[1]),pitchError:Math.abs(pitch-p[2])};
}
function bake(rig,reference,contact,feet,body){
 const N=reference.N,angles={},metrics={},targets={},trajectory={};
 for(const [name,leg] of Object.entries(rig.legs)){
  const foot=feet.feet[name],goals=[],priors=[],positions=[],states=[];
  for(let i=0;i<N;i++){
   const s=contact.trajectory(name,i,{floor:feet.floor}),b=body[i],
    world=[foot.ref[0],feet.floor+foot.restY-foot.lowest+s.y-feet.floor,foot.restZ+s.z],
    p=localGoal(b,world);
   if(!p.every(Number.isFinite))throw Error('Invalid target '+name+'/'+i);
   goals.push(world);positions.push([p[1],p[2]]);priors.push(reference.priors(name,i));states.push(s);
  }
  const frames=priors.map(p=>p.slice());
  // Alternate sweeps avoid systematic left-to-right time bias; all seeds are
  // cyclic neighbours. No arbitrary 159/0 hard equalization is applied.
  for(let pass=0;pass<10;pass++){
   const reverse=pass%2===1;
   for(let j=0;j<N;j++){
    const i=reverse?N-1-j:j,last=reverse?(i+1)%N:(i+N-1)%N;
    const seed=pass===0?priors[i]:frames[last];
    frames[i]=solve(leg,positions[i],seed,priors[i],states[i].pitch-body[i].pitch,states[i].support).angles;
   }
  }
  // Cyclic smoothing is followed by a short target-constrained re-solve.
  // Do not override the position to force a deceptive zero-valued seam.
  for(let pass=0;pass<3;pass++){
   const before=frames.map(x=>x.slice()),mix=pass===2?.035:.08;
   for(let i=0;i<N;i++){
    const ideal=before[i].map((v,k)=>clamp((1-mix)*v+mix*(before[(i+N-1)%N][k]+before[(i+1)%N][k])/2,...leg.range[k]));
    frames[i]=solve(leg,positions[i],ideal,priors[i],states[i].pitch-body[i].pitch,states[i].support).angles;
   }
  }
  // Periodic first-derivative matching. Unlike V16.4, the boundary is not
  // forced to a zero angular step: the fitted velocity is retained.
  // Large repairs are flagged for per-leg V16.4 fallback by the exporter.
  const radius=14;
  for(let k=0;k<frames[0].length;k++){
   const left=frames[N-1][k],right=frames[0][k],
    d=0.5*((frames[1][k]-right)+(left-frames[N-2][k])),
    error=(right-left)-d;
   for(let j=0;j<radius;j++){
    const u=j/radius,t=(1-u)*(1-u)*(1+2*u),delta=error*t*.5;
    frames[j][k]=clamp(frames[j][k]-delta,...leg.range[k]);
    frames[N-1-j][k]=clamp(frames[N-1-j][k]+delta,...leg.range[k]);
   }
  }
  let mean=0,max=0,maxWorld=0,maxLateral=0,maxStance=0,maxSwing=0,maxPitch=0,limit=0,peak=0;
  for(let i=0;i<N;i++){
   const bb=body[i],p=fk(leg,frames[i]),world=worldPosition(bb,[foot.ref[0],p[0],p[1]]),goal=goals[i],
    e=Math.hypot(p[0]-positions[i][0],p[1]-positions[i][1]),
    eWorld=Math.hypot(world[0]-goal[0],world[1]-goal[1],world[2]-goal[2]);
   mean+=e;max=Math.max(max,e);maxWorld=Math.max(maxWorld,eWorld);
   maxLateral=Math.max(maxLateral,Math.abs(localGoal(bb,goal)[0]-foot.ref[0]));
   if(states[i].stance)maxStance=Math.max(maxStance,eWorld);else maxSwing=Math.max(maxSwing,eWorld);
   maxPitch=Math.max(maxPitch,Math.abs(bb.pitch+p[2]-states[i].pitch)/RAD);
   for(let j=0;j<frames[i].length;j++){
    if(Math.min(Math.abs(frames[i][j]-leg.range[j][0]),Math.abs(frames[i][j]-leg.range[j][1]))<.0005)limit++;
    peak=Math.max(peak,Math.abs(frames[i][j]-frames[(i+N-1)%N][j])/RAD);
   }
  }
  const seam=Math.max(...frames[0].map((v,k)=>Math.abs(v-frames[N-1][k])/RAD));
  angles[name]=frames;targets[name]=goals;trajectory[name]=states;
  metrics[name]={maxTargetError:max,meanTargetError:mean/N,maxWorldTargetError:maxWorld,
   maxLateralResidual:maxLateral,maxStanceWorldError:maxStance,maxSwingWorldError:maxSwing,
   maxHoofPitchErrorDeg:maxPitch,jointLimitHits:limit,maxFrameAngleDeltaDeg:peak,
   cycleSeamDeg:seam,cycleContinuityWarning:seam>15,
   physicalContactProven:false,actualGroundForcesMeasured:false};
 }
 return {angles,metrics,targets,trajectory};
}
return {build,solve,bake,limits,rot,localGoal,worldPosition};
});