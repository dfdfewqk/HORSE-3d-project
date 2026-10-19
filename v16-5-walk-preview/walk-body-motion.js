/* HORSE RANCH V16.5 — continuity-aware axial gait response.
 * Root Torso can pitch, roll and yaw: original 19-joint GLB kept.
 * No fictitious independent pelvis, spine or shoulder bones are claimed.
 */
(function(root,factory){'use strict';const api=factory();root.__horseV165Body=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
function R(){return (typeof window!=='undefined'?window:globalThis).__horseV165Reference;}
const mul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
 a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
 a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
 a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
function quaternion(pitch,roll,yaw){
 const axis=(a,index)=>{const q=[0,0,0,Math.cos(a/2)];q[index]=Math.sin(a/2);return q;};
 const q=mul(mul(axis(yaw,1),axis(roll,2)),axis(pitch,0)),m=Math.hypot(...q);return q.map(x=>x/m);
}
function pose(frame,source){
 const r=R(),p=2*Math.PI*frame/r.N,s=r.all(frame);
 const front=(s.ForeR.support+s.ForeL.support)*.5,rear=(s.HindR.support+s.HindL.support)*.5;
 const right=(s.ForeR.support+s.HindR.support)*.5,left=(s.ForeL.support+s.HindL.support)*.5;
 const balance=right-left,foreaft=front-rear,PI=Math.PI/180;
 const pitch=source.pitch+.26*PI*foreaft+.08*PI*Math.sin(2*p-.3);
 const roll=.52*PI*balance;
 const yaw=.11*PI*Math.sin(p+.15);
 // Combined root response: no discontinuous Boolean contact counting.
 const x=source.x+.0052*balance;
 const y=source.y+.0040*Math.cos(2*p-.45)+.0018*foreaft;
 const z=source.z;
 return {x,y,z,pitch,roll,yaw,q:quaternion(pitch,roll,yaw),
  support:s,foreaft,balance,neck:(1.85*Math.sin(2*p-.55)+.50*foreaft)*PI,
  head:(-1.05*Math.sin(2*p-.89)-.19*foreaft)*PI,
  tail:.25*PI*Math.sin(p-1.0)};
}
return {pose,quaternion,mul};
});