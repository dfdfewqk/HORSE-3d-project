/* HORSE RANCH V16.4 — anatomically-informed 19-bone sagittal IK candidate.
   Positions and hoof orientation are both optimization targets. Gait priors
   use reference timing, not fabricated biomechanical measurements.
 */
(function(root,factory){'use strict';const out=factory();root.__horseV164IK=out;if(typeof module==='object'&&module.exports)module.exports=out;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const RAD=Math.PI/180,clamp=(a,l,h)=>Math.max(l,Math.min(h,a));
const limits={
 fore:[[-43,31],[-3,47],[-19,20]],
 hind:[[-50,26],[-8,46],[-34,30],[-20,21]]
};
function build(g,foot){
 const old=(typeof window!=='undefined'?window:globalThis).__horseV161IK;
 if(!old?.build||!old?.fk)throw Error('V16.1 IK missing');
 const obj=old.build(g,foot);
 for(const [name,leg] of Object.entries(obj.legs)){
  const type=name.startsWith('Fore')?'fore':'hind';
  leg.range=limits[type].map(pair=>pair.map(n=>n*RAD));
  leg.side=name.endsWith('R')?1:-1;
 }
 return obj;
}
function solve(leg,target,body,seed,prior,hoofPitch,support){
 const x=seed.slice(),n=x.length;
 // Model-specific control: nearby poses preferred, but reachable contact wins.
 for(let it=0;it<85;it++){
  const f=FK(leg,x,body),errY=target[0]-f[0],errZ=target[1]-f[1];
  const jac=new Array(n),eps=1e-4;
  let A=.0006,B=0,C=.0006;
  for(let j=0;j<n;j++){
   x[j]+=eps;const f2=FK(leg,x,body);x[j]-=eps;
   const jy=(f2[0]-f[0])/eps,jz=(f2[1]-f[1])/eps;
   jac[j]=[jy,jz];A+=jy*jy;B+=jy*jz;C+=jz*jz;
  }
  const det=A*C-B*B,up=(C*errY-B*errZ)/det,forward=(A*errZ-B*errY)/det;
  // Base rest sole orientation is aligned with the fetlock's local X rotation.
  const angle=body.pitch+x.reduce((a,b)=>a+b,0);
  const orientationError=clamp(hoofPitch-angle,-.18,.18);
  for(let j=0;j<n;j++){
   const grad=jac[j][0]*up+jac[j][1]*forward;
   const priorDrift=clamp(prior[j]-x[j],-.28,.28);
   const continuityDrift=clamp(seed[j]-x[j],-.22,.22);
   const orientationWeight=j===n-1?(support>.35?.16:.115):.012;
   const step=.75*grad+.019*priorDrift+.012*continuityDrift+
      orientationWeight*orientationError;
   x[j]=clamp(x[j]+clamp(step,-.135,.135),...leg.range[j]);
  }
  if(Math.hypot(errY,errZ)<.0007&&Math.abs(orientationError)<.026)break;
 }
 const f=FK(leg,x,body),rot=body.pitch+x.reduce((a,b)=>a+b,0);
 return {angles:x,error:Math.hypot(f[0]-target[0],f[1]-target[1]),
  hoofPitchError:Math.abs(rot-hoofPitch)};
}
let cachedFK=null;
function FK(leg,x,body){
 if(!cachedFK)cachedFK=(typeof window!=='undefined'?window:globalThis).__horseV161IK.fk;
 return cachedFK(leg,x,body.y,body.z,body.pitch);
}

/* The original 19 hinge joints cannot translate sideways. We transform the world
   hoof goal through the final 3-axis Torso quaternion BEFORE sagittal IK.
   The irreducible lateral error is measured, not quietly folded into Y/Z. */
function rot(q,v){
 const [x,y,z,w]=q,[a,b,c]=v;
 const tx=2*(y*c-z*b),ty=2*(z*a-x*c),tz=2*(x*b-y*a);
 return [a+w*tx+y*tz-z*ty,b+w*ty+z*tx-x*tz,c+w*tz+x*ty-y*tx];
}
function localGoal(body,goal){
 const q=body.q,inv=[-q[0],-q[1],-q[2],q[3]];
 return rot(inv,[goal[0]-body.x,goal[1]-body.y,goal[2]-body.z]);
}
function worldPosition(body,local){
 const v=rot(body.q,local);return [v[0]+body.x,v[1]+body.y,v[2]+body.z];
}
function bake(rig,reference,contact,feet,body){
 const result={},errors={},N=reference.N,root={pitch:0,y:0,z:0};
 for(const [name,leg] of Object.entries(rig.legs)){
  const f=feet.feet[name],positions=[],worldGoals=[],priors=[],states=[];
  for(let i=0;i<N;i++){
   const s=contact.trajectory(name,i,{floor:feet.floor}),b=body[i];
   // All inputs to IK use one consistent (Torso-local) coordinate frame.
   const world=[f.ref[0],(f.restY-f.lowest)+s.y,f.restZ+s.z];
   const local=localGoal(b,world);
   if(!local.every(Number.isFinite))throw Error('Invalid world-to-local hoof '+name+' frame '+i);
   positions.push([local[1],local[2]]);worldGoals.push(world);states.push(s);
   priors.push(reference.priors(name,i));
  }
  const frames=priors.map(a=>a.slice());
  for(let pass=0;pass<8;pass++){
   const reverse=(pass%2)!==0;
   for(let j=0;j<N;j++){
    const i=reverse?N-1-j:j,last=reverse?(i+1)%N:(i+N-1)%N;
    const seed=pass===0?priors[i]:frames[last];
    const hoofAngle=states[i].pitch-body[i].pitch;
    frames[i]=solve(leg,positions[i],root,seed,priors[i],hoofAngle,states[i].support).angles;
   }
  }
  // Cyclic smoothing is kept small to avoid increasing hoof residuals.
  for(let sweep=0;sweep<2;sweep++){
   const before=frames.map(v=>v.slice());
   for(let i=0;i<N;i++)for(let k=0;k<before[i].length;k++){
    const neighbor=.5*(before[(i+N-1)%N][k]+before[(i+1)%N][k]);
    frames[i][k]=clamp(.96*before[i][k]+.04*neighbor,...leg.range[k]);
   }
  }
  // Keep the repeating loop cyclic even when an underactuated limb would
  // choose different IK branches at the 159->0 boundary. Smoothly taper
  // the correction over neighboring frames; errors remain reported.
  const seamRadius=12;
  for(let k=0;k<frames[0].length;k++){
   const seam=clamp(.5*(frames[0][k]+frames[N-1][k]),...leg.range[k]);
   for(let j=0;j<seamRadius;j++){
    const u=j/seamRadius,w=1-u*u*(3-2*u);
    for(const i of [j,N-1-j])
     frames[i][k]=clamp(frames[i][k]*(1-w)+seam*w,...leg.range[k]);
   }
  }
  let mean=0,max=0,maxPitch=0,limit=0,peakSpeed=0,maxLateral=0,maxWorld=0,stanceMax=0,swingMax=0;
  for(let i=0;i<N;i++){
   const v=FK(leg,frames[i],root),b=body[i],s=states[i];
   const e=Math.hypot(v[0]-positions[i][0],v[1]-positions[i][1]);
   const world=worldPosition(b,[f.ref[0],v[0],v[1]]),goal=worldGoals[i];
   const worldError=Math.hypot(world[0]-goal[0],world[1]-goal[1],world[2]-goal[2]);
   const lateral=Math.abs(localGoal(b,goal)[0]-f.ref[0]);
   mean+=e;max=Math.max(max,e);maxWorld=Math.max(maxWorld,worldError);maxLateral=Math.max(maxLateral,lateral);
   if(s.stance)stanceMax=Math.max(stanceMax,worldError);else swingMax=Math.max(swingMax,worldError);
   maxPitch=Math.max(maxPitch,Math.abs(b.pitch+frames[i].reduce((a,c)=>a+c,0)-s.pitch)/RAD);
   for(let k=0;k<frames[i].length;k++){
    if(Math.min(Math.abs(frames[i][k]-leg.range[k][0]),Math.abs(frames[i][k]-leg.range[k][1]))<.0005)limit++;
    peakSpeed=Math.max(peakSpeed,Math.abs(frames[i][k]-frames[(i+N-1)%N][k])/RAD);
   }
  }
  result[name]=frames;
  errors[name]={maxTargetError:max,meanTargetError:mean/N,maxWorldTargetError:maxWorld,
   maxLateralResidual:maxLateral,maxStanceWorldError:stanceMax,maxSwingWorldError:swingMax,
   maxHoofPitchErrorDeg:maxPitch,jointLimitHits:limit,
   maxFrameAngleDeltaDeg:peakSpeed,
   cycleSeamDeg:Math.max(...frames[0].map((v,k)=>Math.abs(v-frames[N-1][k])/RAD))};
 }
 return {angles:result,metrics:errors};
}
return {build,solve,bake,limits,rot,localGoal,worldPosition};
});
