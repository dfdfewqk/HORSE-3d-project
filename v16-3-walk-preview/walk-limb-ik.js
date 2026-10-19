/* HORSE RANCH V16.3 — anatomically-informed 19-bone sagittal IK candidate.
   Positions and hoof orientation are both optimization targets. Gait priors
   use reference timing, not fabricated biomechanical measurements.
 */
(function(root,factory){'use strict';const out=factory();root.__horseV163IK=out;if(typeof module==='object'&&module.exports)module.exports=out;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
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
   const orientationWeight=j===n-1?.075:.009;
   const step=.75*grad+.016*priorDrift+.007*continuityDrift+
      orientationWeight*orientationError;
   x[j]=clamp(x[j]+clamp(step,-.135,.135),...leg.range[j]);
  }
  if(Math.hypot(errY,errZ)<.0008&&Math.abs(orientationError)<.03)break;
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
function bake(rig,reference,contact,feet,body){
 const result={},errors={},N=reference.N;
 for(const [name,leg] of Object.entries(rig.legs)){
  const f=feet.feet[name],positions=[],priors=[],states=[];
  for(let i=0;i<N;i++){
   const state=contact.trajectory(name,i,{floor:feet.floor}),pose=body[i];
   // Hoof target is rig-relative; maintain lateral foot sign for roll calculation.
   // The same final Torso pose is used for the target and for skinning.
   const y=(f.restY-f.lowest)+state.y;
   const z=f.restZ+state.z;
   states.push(state);positions.push([y,z]);priors.push(reference.priors(name,i));
  }
  let frames=priors.map(a=>a.slice());
  for(let pass=0;pass<8;pass++){
   const reverse=pass%2!==0;
   for(let j=0;j<N;j++){
    const i=reverse?N-1-j:j,last=reverse?(i+1)%N:(i+N-1)%N,
      bb=body[i],root={pitch:bb.pitch,y:bb.y+f.ref[0]*Math.sin(bb.roll),z:bb.z-f.ref[0]*Math.sin(bb.yaw)};
    const seed=pass===0?priors[i]:frames[last],q=solve(leg,positions[i],root,seed,priors[i],states[i].pitch,states[i].support);
    frames[i]=q.angles;
   }
  }
  for(let sweep=0;sweep<2;sweep++){
   const prev=frames.map(x=>x.slice());
   for(let i=0;i<N;i++)for(let k=0;k<prev[i].length;k++){
    const sm=.5*(prev[(i+N-1)%N][k]+prev[(i+1)%N][k]);
    frames[i][k]=clamp(prev[i][k]*.92+sm*.08,...leg.range[k]);
   }
  }
  let mean=0,max=0,maxPitch=0,limit=0,peakSpeed=0;
  for(let i=0;i<N;i++){
   const bb=body[i],root={pitch:bb.pitch,y:bb.y+f.ref[0]*Math.sin(bb.roll),z:bb.z-f.ref[0]*Math.sin(bb.yaw)},
    p=FK(leg,frames[i],root),err=Math.hypot(p[0]-positions[i][0],p[1]-positions[i][1]);
   mean+=err;max=Math.max(max,err);maxPitch=Math.max(maxPitch,Math.abs(root.pitch+frames[i].reduce((a,b)=>a+b,0)-states[i].pitch)/RAD);
   for(let k=0;k<frames[i].length;k++){
    if(Math.min(Math.abs(frames[i][k]-leg.range[k][0]),Math.abs(frames[i][k]-leg.range[k][1]))<.0005)limit++;
    peakSpeed=Math.max(peakSpeed,Math.abs(frames[i][k]-frames[(i+N-1)%N][k])/RAD);
   }
  }
  result[name]=frames;
  errors[name]={maxTargetError:max,meanTargetError:mean/N,maxHoofPitchErrorDeg:maxPitch,
   jointLimitHits:limit,maxFrameAngleDeltaDeg:peakSpeed,cycleSeamDeg:Math.max(...frames[0].map((v,j)=>Math.abs(v-frames[N-1][j])/RAD))};
 }
 return {angles:result,metrics:errors};
}
return {build,solve,bake,limits};
});