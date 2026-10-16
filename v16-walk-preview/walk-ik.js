/* HORSE RANCH V16 constrained sagittal-plane IK: baked at 160 keys */
(function(root,factory){'use strict';const api=factory();root.__horseV16IK=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const PI=Math.PI,RAD=PI/180,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const DEFS={
 ForeR:{chain:['ForeR_Shoulder','ForeR_Knee','ForeR_Fetlock'],range:[[-34,29],[-5,54],[-20,20]],pref:[-2,11,-4]},
 ForeL:{chain:['ForeL_Shoulder','ForeL_Knee','ForeL_Fetlock'],range:[[-34,29],[-5,54],[-20,20]],pref:[-2,11,-4]},
 HindR:{chain:['HindR_Hip','HindR_Stifle','HindR_Hock','HindR_Fetlock'],range:[[-33,29],[-12,53],[-33,29],[-20,20]],pref:[-2,12,-11,1]},
 HindL:{chain:['HindL_Hip','HindL_Stifle','HindL_Hock','HindL_Fetlock'],range:[[-33,29],[-12,53],[-33,29],[-20,20]],pref:[-2,12,-11,1]}
};
const yzr=(dy,dz,a)=>[dy*Math.cos(a)-dz*Math.sin(a),dy*Math.sin(a)+dz*Math.cos(a)];
function build(g,footData){
 const nodes=g.doc.nodes,nameMap=new Map(nodes.map((n,i)=>[n.name,i])),torso=g.nodes[nameMap.get('Torso')].baseT;
 const legs={};
 for(const [name,def] of Object.entries(DEFS)){
  const ids=def.chain.map(k=>nameMap.get(k));if(ids.some(x=>x===undefined))throw Error('V16 joint missing '+name);
  const f=footData.feet[name];
  const t=ids.map(id=>Array.from(g.nodes[id].baseT)),sum=t.reduce((acc,x)=>acc.map((v,k)=>v+x[k]),[0,0,0]);
  const solePos=readAccessor(g,g.doc.meshes[0].primitives[0].attributes.POSITION);
  const distal=[solePos[3*f.contactVertex+1]-torso[1]-sum[1],solePos[3*f.contactVertex+2]-torso[2]-sum[2]];
  legs[name]={...def,ids,t,distal,range:def.range.map(([lo,hi])=>[lo*RAD,hi*RAD]),pref:def.pref.map(x=>x*RAD)};
 }
 return {legs,torsoIndex:nameMap.get('Torso')};
}
function fk(leg,angles,rootY,rootZ,pitch){
 let y=rootY,z=rootZ,a=pitch;
 for(let i=0;i<angles.length;i++){const [dy,dz]=yzr(leg.t[i][1],leg.t[i][2],a);y+=dy;z+=dz;a+=angles[i];}
 const [ey,ez]=yzr(leg.distal[0],leg.distal[1],a);return [y+ey,z+ez];
}
function solve(leg,target,rootY,rootZ,pitch,seed,stance){
 const a=seed.slice(),n=a.length,reg=stance?.012:.022,pref=leg.pref.slice();
 if(!stance){if(n===3)pref[1]=29*RAD;else{pref[1]=29*RAD;pref[2]=-21*RAD;}}
 for(let iter=0;iter<64;iter++){
  const p=fk(leg,a,rootY,rootZ,pitch),e0=target[0]-p[0],e1=target[1]-p[1];
  if(Math.hypot(e0,e1)<.00045)break;
  const dy=[],dz=[],eps=1e-4;
  for(let k=0;k<n;k++){a[k]+=eps;const q=fk(leg,a,rootY,rootZ,pitch);a[k]-=eps;dy.push((q[0]-p[0])/eps);dz.push((q[1]-p[1])/eps);}
  let a00=.0007,a01=0,a11=.0007;
  for(let k=0;k<n;k++){a00+=dy[k]*dy[k];a01+=dy[k]*dz[k];a11+=dz[k]*dz[k];}
  const det=a00*a11-a01*a01;if(det<1e-12)break;
  const v0=(a11*e0-a01*e1)/det,v1=(a00*e1-a01*e0)/det;
  for(let k=0;k<n;k++){
   let step=.82*(dy[k]*v0+dz[k]*v1)+reg*(pref[k]-a[k]);
   step=clamp(step,-.16,.16);a[k]=clamp(a[k]+step,...leg.range[k]);
  }
 }
 const got=fk(leg,a,rootY,rootZ,pitch);
 return {angles:a,got,error:Math.hypot(target[0]-got[0],target[1]-got[1])};
}
function bake(rig,targets,footData,source){
 const result={},metrics={},N=targets.N;
 for(const [name,leg] of Object.entries(rig.legs)){
  const frames=[],poses=[],notes=[];
  for(let i=0;i<N;i++){
   const s=targets.state(name,i),c=footData.feet[name];
   const target=[footData.floor+(c.restY-c.lowest)+s.heelLift,c.restZ+s.z];
   frames.push({target,stance:s.stance,s});
  }
  let seed=leg.pref.slice();
  for(let pass=0;pass<5;pass++){
   poses.length=0;notes.length=0;
   for(let i=0;i<N;i++){
    const s=frames[i],found=solve(leg,s.target,source.rootY[i],source.rootZ[i],source.pitch[i],seed,s.stance);
    poses.push(found.angles);notes.push(found);seed=found.angles;
   }
  }
  const smoothed=poses.map(x=>x.slice());
  for(let i=0;i<N;i++)for(let k=0;k<leg.chain.length;k++){
   const mid=poses[i][k],av=(poses[(i+N-1)%N][k]+poses[(i+1)%N][k])*.5;
   smoothed[i][k]=clamp(mid*.90+av*.10,...leg.range[k]);
  }
  let stanceError=0,swingError=0,stanceMax=0,swingMax=0;
  for(let i=0;i<N;i++){
   const fkPoint=fk(leg,smoothed[i],source.rootY[i],source.rootZ[i],source.pitch[i]);
   const error=Math.hypot(fkPoint[0]-frames[i].target[0],fkPoint[1]-frames[i].target[1]);
   if(frames[i].stance){stanceError+=error;stanceMax=Math.max(stanceMax,error);}
   else{swingError+=error;swingMax=Math.max(swingMax,error);}
  }
  result[name]=smoothed;
  metrics[name]={maxStanceProxyError:stanceMax,maxSwingProxyError:swingMax,
   meanStanceProxyError:stanceError/frames.filter(x=>x.stance).length,
   meanSwingProxyError:swingError/frames.filter(x=>!x.stance).length,
   cyclicAnglesGapDeg:Math.max(...smoothed[0].map((x,k)=>Math.abs(x-smoothed[N-1][k])/RAD))};
 }
 return {angles:result,metrics};
}
return {build,fk,solve,bake,DEFS};
});