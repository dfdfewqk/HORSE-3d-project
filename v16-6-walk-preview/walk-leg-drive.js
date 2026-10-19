/* HORSE RANCH V16.6: visibly driven, 4-beat Walk leg tracks.
 * This is a conservative rig-specific corrective candidate, NOT force-validated
 * equine kinetics. It never silently copies a failed leg from an earlier clip.
 */
(function(root,factory){'use strict';const out=factory();root.__horseV166Legs=out;if(typeof module==='object'&&module.exports)module.exports=out;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const N=160,RAD=Math.PI/180;
const touch={HindR:0,ForeR:.25,HindL:.5,ForeL:.75};
const bounds={ForeR:[[-43,31],[-3,47],[-19,20]],ForeL:[[-43,31],[-3,47],[-19,20]],
 HindR:[[-50,26],[-8,46],[-34,30],[-20,21]],HindL:[[-50,26],[-8,46],[-34,30],[-20,21]]};
const chain={ForeR:['ForeR_Shoulder','ForeR_Knee','ForeR_Fetlock'],
 ForeL:['ForeL_Shoulder','ForeL_Knee','ForeL_Fetlock'],
 HindR:['HindR_Hip','HindR_Stifle','HindR_Hock','HindR_Fetlock'],
 HindL:['HindL_Hip','HindL_Stifle','HindL_Hock','HindL_Fetlock']};
const configs={fore:[
 [[0,-19],[.18,-10],[.45,3],[.64,8],[.76,-2],[.91,-17],[1,-19]],
 [[0,3],[.30,3],[.58,7],[.66,12],[.76,34],[.85,24],[.96,4],[1,3]],
 [[0,-2],[.30,5],[.58,7],[.67,3],[.78,0],[.84,11],[.96,-2],[1,-2]]
],hind:[
 [[0,-21],[.18,-13],[.48,-5],[.635,1],[.77,-15],[.91,-28],[1,-21]],
 [[0,13],[.30,8],[.58,11],[.64,16],[.79,35],[.89,27],[1,13]],
 [[0,13],[.24,5],[.48,8],[.635,12],[.80,-18],[.90,-9],[1,13]],
 [[0,2],[.26,6],[.56,6],[.65,12],[.77,1],[.90,-3],[1,2]]
]};
const clamp=(x,l,h)=>Math.max(l,Math.min(h,x)),frac=x=>((x%1)+1)%1,smooth=t=>{const x=clamp(t,0,1);return x*x*x*(x*(x*6-15)+10)};
function curve(keys,p){if(p<=keys[0][0])return keys[0][1];
 for(let k=1;k<keys.length;k++)if(p<=keys[k][0]){
  const [a,v]=keys[k-1],[b,w]=keys[k];return v+(w-v)*smooth((p-a)/(b-a));
 }return keys[keys.length-1][1];}
function goal(name,frame){const k=name.startsWith('Fore')?'fore':'hind',
 p=frac(frame/N-touch[name]);if(!chain[name])throw Error('Unknown Walk leg '+name);
 return configs[k].map(points=>curve(points,p));}
function sample(s,t){const ts=s.times,d=s.data;if(ts.length<2||d.length!==ts.length*4)throw Error('Not 4D linear gait channel');
 let low=0,high=ts.length-1;while(low<high){const mid=(low+high)>>1;if(ts[mid]<t)low=mid+1;else high=mid;}
 const b=low,a=ts[b]<t?b:Math.max(0,b-1),u=ts[a]===ts[b]?0:clamp((t-ts[a])/(ts[b]-ts[a]),0,1);
 const q=Array.from({length:4},(_,j)=>d[a*4+j]*(1-u)+d[b*4+j]*u),norm=Math.hypot(...q);
 if(norm<.01)throw Error('Invalid source quaternion');
 return q.map(x=>x/norm);
}
const angle=q=>2*Math.atan2(q[0],q[3])/RAD;
const quat=degrees=>[Math.sin(degrees*RAD/2),0,0,Math.cos(degrees*RAD/2)];
function build(source,doc,fallback=[]){
 if(source.channels.length!==19)throw Error('19 tracked gait channels required');
 const by=new Map(),times=Float32Array.from({length:N},(_,i)=>source.duration*i/N);
 for(const ch of source.channels)by.set(doc.nodes[ch.node]?.name+'|'+ch.path,ch);
 const tracks=new Map(),stats={},fallbackSet=new Set(fallback);
 for(const [name,bones] of Object.entries(chain)){
  let jointRanges=[],greatest=0,average=0,frameShift=0;
  bones.forEach((bone,k)=>{
   const ch=by.get(bone+'|rotation');if(!ch||ch.sam?.interpolation==='CUBICSPLINE')throw Error('Missing direct joint channel '+bone);
   const values=new Float32Array(N*4),observed=[],base=[],diff=[];
   const kind=name.startsWith('Fore')?'fore':'hind',mix=fallbackSet.has(name)?.82:.72;
   for(let i=0;i<N;i++){
    const old=angle(sample(ch.sam,times[i])),wanted=goal(name,i)[k],
     target=clamp(old+(wanted-old)*mix,...bounds[name][k]),
     rotation=quat(target);
    values.set(rotation,i*4);observed.push(target);base.push(old);diff.push(target-old);
   }
   const range=Math.max(...observed)-Math.min(...observed),
    rms=Math.sqrt(diff.reduce((a,b)=>a+b*b,0)/N),
    maxChange=Math.max(...diff.map(Math.abs)),
    jumps=observed.map((x,i)=>Math.abs(x-observed[(i+N-1)%N])),
    step=Math.max(...jumps);
   if(![range,rms,maxChange,step].every(Number.isFinite))throw Error('Nonfinite '+bone);
   tracks.set(bone,{node:ch.node,path:'rotation',sam:{times,data:values,interpolation:'LINEAR'}});
   jointRanges.push({bone,dynamicRangeDeg:range,rmsChangeFromV165Deg:rms,maxChangeFromV165Deg:maxChange,maxFrameStepDeg:step});
   greatest=Math.max(greatest,maxChange);average+=rms;frameShift=Math.max(frameShift,step);
  });
  stats[name]={joints:jointRanges,maxChangeDeg:greatest,avgRmsChangeDeg:average/bones.length,
   maxFrameStepDeg:frameShift,sourceFellBack:fallbackSet.has(name)};
 }
 const channels=source.channels.map(ch=>{
  const name=doc.nodes[ch.node]?.name;
  return ch.path==='rotation'&&tracks.has(name)?tracks.get(name):ch;
 });
 if(channels.length!==19||tracks.size!==14)throw Error('Only 14 leg rotations must be rebuilt');
 const moving=Object.entries(stats).filter(([_,s])=>s.joints.some(j=>j.dynamicRangeDeg>=9)&&s.maxChangeDeg>=3).map(([n])=>n);
 const minDifferences=Object.values(stats).flatMap(s=>s.joints.map(j=>j.rmsChangeFromV165Deg));
 return {clip:{name:'Walk_V16_6_LEGS_REBUILT',duration:source.duration,channels},stats,legMovementCount:moving.length,
  realGLBVisibleVerified:false,allLegsAssigned:tracks.size===14,minimumRmsJointChangeDeg:Math.min(...minDifferences)};
}
return {N,chain,bounds,goal,build,curve};
});