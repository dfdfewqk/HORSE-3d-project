/* HORSE RANCH V16.3 — hoof sole and four-beat contact/swing planner.
   Real sole vertices are obtained from protected V16 GLB scanner.
   Do not interpret model local velocity alone as world-space sliding.
 */
(function(root,factory){'use strict';const x=factory();root.__horseV163Contact=x;if(typeof module==='object'&&module.exports)module.exports=x;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const R=()=>{if(!globalThis.__horseV163Reference&&typeof window==='undefined')throw Error('Walk reference missing');return typeof window!=='undefined'?window.__horseV163Reference:globalThis.__horseV163Reference;};
function progress(u) {
 const t=Math.max(0,Math.min(1,u)),a=.095,den=1-a;
 if(t<a)return t*t/(2*a*den);
 if(t>1-a)return 1-(1-t)**2/(2*a*den);
 return (t-a/2)/den;
}
function trajectory(name,frame,sole){
 const ref=R(),c=ref.CONFIG[name],p=ref.phase(name,frame),u=ref.clamp(p/c.stance);
 if(p<c.stance){
  const isBreak=u>.83,breakover=ref.smoother((u-.83)/.17);
  return {name,p,stance:true,event:u<.12?'loading':isBreak?'breakover':'midstance',
   support:ref.support(name,frame),z:c.stride*(.5-progress(u)),
   y:(sole?.floor||0)+.0045*breakover,
   pitch:(1.0+7.5*breakover)*ref.RAD,heelLift:.0045*breakover,
   swingFraction:0};
 }
 let v=(p-c.stance)/(1-c.stance);
 // Departure/arrival are deliberately near stationary horizontally while
 // the hoof transfers between a toe-breakover and stable contact.
 const advance=ref.smoother(v),bend=Math.pow(Math.sin(Math.PI*v),2);
 const release=1-ref.smoother(v/.15);
 const pitch=(1+7.5*release-7.2*bend)*ref.RAD;
 return {name,p,stance:false,event:v<.2?'toe-clearance':v>.82?'placement':'swing',
  support:0,z:c.stride*(advance-.5),y:(sole?.floor||0)+.0045*release+c.lift*bend,
  pitch,heelLift:0,swingFraction:v};
}
function make(g){
 const v16=(typeof window!=='undefined'?window:globalThis).__horseV16Targets;
 if(!v16?.collect)throw Error('V16 scanner not initialized');
 const info=v16.collect(g);
 if(info.bodyVertexCount!==24314||g.skins[0].joints.length!==19)throw Error('Protected body not found');
 return info;
}
function validate(){
 const ref=R(),res={};
 for(const [name,c] of Object.entries(ref.CONFIG)){
  const pts=Array.from({length:ref.N},(_,i)=>trajectory(name,i));
  const jump=Math.max(...pts.map((v,i)=>{const prev=pts[(i+ref.N-1)%ref.N];return Math.abs(v.z-prev.z)}));
  const touchdown=trajectory(name,c.touch*ref.N);
  res[name]={stance:c.stance,stride:c.stride,lift:c.lift,maxFrameDelta:jump,
   startY:touchdown.y,startZ:touchdown.z,finite:pts.every(x=>[x.z,x.y,x.pitch].every(Number.isFinite))};
 }
 return res;
}
return {make,trajectory,validate};
});