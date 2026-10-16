/* HORSE RANCH V16.1: regularized gait-prior IK, with cyclic pose continuity.
 * 2-D sagittal solver for existing 19-joint preview only; no physical ground forces.
 */
(function(root,factory){'use strict';const api=factory();root.__horseV161IK=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const RAD=Math.PI/180,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SET={
 ForeR:{chain:['ForeR_Shoulder','ForeR_Knee','ForeR_Fetlock'],range:[[-42,30],[-4,43],[-18,20]],stance:[-12,10,0],swing:[-5,30,-6]},
 ForeL:{chain:['ForeL_Shoulder','ForeL_Knee','ForeL_Fetlock'],range:[[-42,30],[-4,43],[-18,20]],stance:[-12,10,0],swing:[-5,30,-6]},
 HindR:{chain:['HindR_Hip','HindR_Stifle','HindR_Hock','HindR_Fetlock'],range:[[-48,22],[-7,43],[-32,28],[-18,20]],stance:[-20,9,13,1],swing:[-17,32,-18,6]},
 HindL:{chain:['HindL_Hip','HindL_Stifle','HindL_Hock','HindL_Fetlock'],range:[[-48,22],[-7,43],[-32,28],[-18,20]],stance:[-20,9,13,1],swing:[-17,32,-18,6]}
};
function build(g,feet){
 const map=new Map(g.doc.nodes.map((n,i)=>[n.name,i])),index=map.get('Torso');
 if(index===undefined)throw Error('Missing Torso');
 const t0=g.nodes[index].baseT,mesh=g.doc.meshes[0].primitives[0];
 const pos=readAccessor(g,mesh.attributes.POSITION),legs={};
 for(const [name,c] of Object.entries(SET)){
  const ids=c.chain.map(x=>map.get(x));if(ids.some(i=>i===undefined))throw Error('Missing joint '+name);
  const t=ids.map(id=>Array.from(g.nodes[id].baseT));
  const sum=t.reduce((a,b)=>a.map((x,k)=>x+b[k]),[0,0,0]);
  const foot=feet.feet[name];if(!foot)throw Error('Missing sole '+name);
  const idx=foot.contactVertex;
  legs[name]={...c,ids,t,distal:[pos[3*idx+1]-t0[1]-sum[1],pos[3*idx+2]-t0[2]-sum[2]],
   range:c.range.map(v=>v.map(x=>x*RAD)),stance:c.stance.map(x=>x*RAD),swing:c.swing.map(x=>x*RAD)};
 }
 return {legs};
}
const rot=(y,z,a)=>[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
function fk(leg,angles,rootY,rootZ,pitch){
 let y=rootY,z=rootZ,a=pitch;
 for(let k=0;k<angles.length;k++){
  const p=rot(leg.t[k][1],leg.t[k][2],a);y+=p[0];z+=p[1];a+=angles[k];
 }
 const f=rot(...leg.distal,a);return [y+f[0],z+f[1],a];
}
function desired(leg,s){
 const swing=!s.stance?Math.sin(Math.PI*s.u)**2:0;
 const out=leg.stance.map((x,i)=>x*(1-swing)+leg.swing[i]*swing);
 return out;
}
function solve(leg,target,root,seed,prior,s){
 const x=seed.slice(),n=x.length,weight=s.stance?.004:.006;
 for(let iteration=0;iteration<100;iteration++){
  const p=fk(leg,x,...root),error=[target[0]-p[0],target[1]-p[1]],eps=1e-4;
  const jac=Array.from({length:n},(_,k)=>{
   x[k]+=eps;const moved=fk(leg,x,...root);x[k]-=eps;
   return [(moved[0]-p[0])/eps,(moved[1]-p[1])/eps];
  });
  let A=.0003,B=0,C=.0003;
  for(const j of jac){A+=j[0]*j[0];B+=j[0]*j[1];C+=j[1]*j[1];}
  const det=A*C-B*B,dy=(C*error[0]-B*error[1])/det,dz=(A*error[1]-B*error[0])/det;
  const movement=jac.map(j=>.74*(j[0]*dy+j[1]*dz));
  const projected=jac.map((j,i)=>{
   const drift=weight*(prior[i]-x[i])+.008*(seed[i]-x[i]);
   return movement[i]+drift;
  });
  for(let i=0;i<n;i++)x[i]=clamp(x[i]+clamp(projected[i],-.11,.11),...leg.range[i]);
  if(Math.hypot(...error)<.0012)break;
 }
 const actual=fk(leg,x,...root),positionError=Math.hypot(actual[0]-target[0],actual[1]-target[1]);
 return {angles:x,error:positionError,actual};
}
function bake(rig,targets,feet,root){
 const N=targets.N,angles={},metrics={},trajectory={};
 for(const [name,leg] of Object.entries(rig.legs)){
  const foot=feet.feet[name],states=Array.from({length:N},(_,i)=>targets.state(name,i));
  const aim=states.map(s=>[feet.floor+(foot.restY-foot.lowest)+s.lift,foot.restZ+s.z]);
  const init=states.map(s=>desired(leg,s)),a=init.map(x=>x.slice());
  for(let pass=0;pass<6;pass++){
   const forward=pass%2===0;
   for(let n=0;n<N;n++){
    const i=forward?n:N-1-n,last=forward?(i+N-1)%N:(i+1)%N;
    const seed=pass===0?init[i]:a[last];
    const got=solve(leg,aim[i],[root.y[i],root.z[i],root.pitch[i]],seed,init[i],states[i]);
    a[i]=got.angles;
   }
  }
  for(let pass=0;pass<2;pass++){
   const old=a.map(v=>v.slice());
   for(let i=0;i<N;i++)for(let k=0;k<a[i].length;k++){
    const neighbour=.5*(old[(i+N-1)%N][k]+old[(i+1)%N][k]);
    a[i][k]=clamp(.91*old[i][k]+.09*neighbour,...leg.range[k]);
   }
  }
  let maxStance=0,maxSwing=0,meanStance=0,stanceCount=0,clamps=0,maxFrameChange=0;
  for(let i=0;i<N;i++){
   const got=fk(leg,a[i],root.y[i],root.z[i],root.pitch[i]);
   const err=Math.hypot(got[0]-aim[i][0],got[1]-aim[i][1]);
   if(states[i].stance){maxStance=Math.max(maxStance,err);meanStance+=err;stanceCount++;}
   else maxSwing=Math.max(maxSwing,err);
   for(let k=0;k<a[i].length;k++){
    if(Math.abs(a[i][k]-leg.range[k][0])<.001||Math.abs(a[i][k]-leg.range[k][1])<.001)clamps++;
    maxFrameChange=Math.max(maxFrameChange,Math.abs(a[i][k]-a[(i+N-1)%N][k])/RAD);
   }
  }
  angles[name]=a;trajectory[name]=aim;
  metrics[name]={maxStanceError:maxStance,maxSwingError:maxSwing,meanStanceError:meanStance/stanceCount,
   framesAtJointLimit:clamps,maxFrameChangeDeg:maxFrameChange,
   seamDeg:Math.max(...a[0].map((v,k)=>Math.abs(v-a[N-1][k])/RAD))};
 }
 return {angles,metrics,trajectory};
}
return {SET,build,fk,solve,desired,bake};
});