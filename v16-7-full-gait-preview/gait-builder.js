/* HORSE RANCH V16.7: four distinct, gait-phase-driven experimental clips.
 * Only samples existing 19-track clips; does NOT alter the original GLB/skin,
 * the idle animation, or any previous animation. Biological angles are estimates.
 */
(function(root,make){'use strict';const api=make();root.__horseV167Builder=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const N=160,PI=Math.PI,TAU=2*PI,RAD=PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),frac=v=>((v%1)+1)%1,
 smooth=x=>{const t=clamp(x,0,1);return t*t*t*(t*(t*6-15)+10);};
const chains={
 ForeR:['ForeR_Shoulder','ForeR_Knee','ForeR_Fetlock'],
 ForeL:['ForeL_Shoulder','ForeL_Knee','ForeL_Fetlock'],
 HindR:['HindR_Hip','HindR_Stifle','HindR_Hock','HindR_Fetlock'],
 HindL:['HindL_Hip','HindL_Stifle','HindL_Hock','HindL_Fetlock']};
const bounds={
 fore:[[-43,31],[-3,47],[-19,20]],hind:[[-50,26],[-8,46],[-34,30],[-20,21]]};
// Four-beat Walk: RH -> RF -> LH -> LF. Gallop: RH -> LH -> RF -> LF
// (left-leading transverse gallop), one shared suspended interval.
const cfg={
 walk:{name:'Walk_V16_7_FOOTFALL',source:'Walk_V16_6_LEGS_REBUILT',
   period:1.44,touch:{HindR:0,ForeR:.25,HindL:.50,ForeL:.75},
   stance:{fore:.64,hind:.63},blend:.83,amplitude:.94,body:.0045,pitch:.27,neck:.40,
   stride:{fore:.265,hind:.29},suspension:false},
 cruise:{name:'Gallop_V16_7_CRUISE',source:'Gallop_V15_CRUISE',
   period:.51,touch:{HindR:0,HindL:.16,ForeR:.39,ForeL:.54},
   stance:{fore:.185,hind:.19},blend:.79,amplitude:.82,body:.015,pitch:.72,neck:.64,
   stride:{fore:.48,hind:.49},suspension:true},
 fast:{name:'Gallop_V16_7_FAST',source:'Gallop_V15_FAST',
   period:.46,touch:{HindR:0,HindL:.155,ForeR:.375,ForeL:.535},
   stance:{fore:.16,hind:.17},blend:.86,amplitude:1.0,body:.023,pitch:1.08,neck:.84,
   stride:{fore:.54,hind:.57},suspension:true},
 sprint:{name:'Gallop_V16_7_SPRINT',source:'Gallop_V15_SPRINT',
   period:.42,touch:{HindR:0,HindL:.145,ForeR:.365,ForeL:.52},
   stance:{fore:.145,hind:.15},blend:.93,amplitude:1.11,body:.029,pitch:1.32,neck:1.0,
   stride:{fore:.61,hind:.65},suspension:true}
};
// Local sagittal articulation templates. Independent carpus/fetlock, stifle/hock
// flexion peaks. These are constrained art-directing priors, not measured
// ground-reaction-force or 3D biomechanics outputs.
const walk={
 fore:[
 [[0,-18],[.19,-9],[.42,5],[.64,8],[.76,-7],[.93,-19],[1,-18]],
 [[0,3],[.23,4],[.55,6],[.64,10],[.76,35],[.85,24],[.97,4],[1,3]],
 [[0,-3],[.20,6],[.47,9],[.63,5],[.76,1],[.82,12],[.96,-3],[1,-3]]],
 hind:[
 [[0,-23],[.25,-14],[.49,-4],[.63,1],[.78,-21],[.95,-26],[1,-23]],
 [[0,13],[.22,7],[.49,10],[.64,15],[.78,36],[.89,24],[1,13]],
 [[0,14],[.23,5],[.51,8],[.64,14],[.81,-21],[.91,-8],[1,14]],
 [[0,2],[.23,8],[.5,6],[.64,13],[.79,0],[.92,-3],[1,2]]]};
const gallop={
 fore:[
 [[0,-12],[.12,-5],[.20,17],[.4,10],[.6,-20],[.79,-28],[.92,-18],[1,-12]],
 [[0,5],[.09,5],[.2,9],[.38,22],[.61,41],[.72,31],[.87,8],[1,5]],
 [[0,-2],[.13,11],[.25,7],[.43,-3],[.72,12],[.88,2],[1,-2]]],
 hind:[
 [[0,-18],[.1,-8],[.18,17],[.36,24],[.59,-6],[.82,-27],[1,-18]],
 [[0,12],[.12,8],[.21,15],[.36,10],[.62,39],[.77,31],[.9,15],[1,12]],
 [[0,11],[.12,4],[.27,11],[.42,18],[.66,-24],[.82,-13],[1,11]],
 [[0,2],[.14,14],[.27,8],[.46,1],[.76,13],[.9,-2],[1,2]]]};
function curve(keys,p){
 if(p<=keys[0][0])return keys[0][1];
 for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){
  const [t0,a]=keys[i-1],[t1,b]=keys[i];return a+(b-a)*smooth((p-t0)/(t1-t0));
 }return keys[keys.length-1][1];
}
function phase(mode,leg,i){return frac(i/N-cfg[mode].touch[leg]);}
function angles(mode,leg,i){
 const c=cfg[mode],p=phase(mode,leg,i),kind=leg.startsWith('Fore')?'fore':'hind',
  templates=mode==='walk'?walk[kind]:gallop[kind],
  amp=c.amplitude*(mode==='walk'?1:1);
 return templates.map((k,j)=>{
  const center=k[0][1],actual=center+(curve(k,p)-center)*amp;
  return clamp(actual,...bounds[kind][j]);
 });
}
function sample(sam,t,n){
 const tt=sam.times,dd=sam.data;if(!tt||tt.length<2)throw Error('No sampler times');
 const stride=sam.interpolation==='CUBICSPLINE'?3*n:n,offset=sam.interpolation==='CUBICSPLINE'?n:0;
 let lo=0,hi=tt.length-1;
 while(lo<hi){const mid=(lo+hi)>>1;if(tt[mid]<t)lo=mid+1;else hi=mid;}
 const b=lo,a=tt[b]<t?b:Math.max(0,b-1),u=tt[a]===tt[b]?0:clamp((t-tt[a])/(tt[b]-tt[a]),0,1);
 const v=Array.from({length:n},(_,k)=>dd[a*stride+offset+k]*(1-u)+dd[b*stride+offset+k]*u);
 if(n===4){const norm=Math.hypot(...v);if(norm<1e-4)throw Error('Zero quaternion');return v.map(x=>x/norm);}
 if(!v.every(Number.isFinite))throw Error('Bad sample');
 return v;
}
function multiplyX(q,deg){
 const a=deg*RAD*.5,s=Math.sin(a),c=Math.cos(a),[x,y,z,w]=q;
 const v=[x*c+w*s,y*c+z*s,z*c-y*s,w*c-x*s],n=Math.hypot(...v);
 return v.map(x=>x/n);
}
function quat(deg){return [Math.sin(deg*RAD/2),0,0,Math.cos(deg*RAD/2)];}
const angle=q=>2*Math.atan2(q[0],q[3])/RAD;
function build(g,mode){
 const c=cfg[mode];if(!c)throw Error('Invalid V16.7 gait '+mode);
 const src=g.animations.find(x=>x.name===c.source);
 if(!src||src.channels.length!==19)throw Error('Missing protected source '+c.source);
 const times=Float32Array.from({length:N},(_,i)=>i*c.period/N);
 const nodeName=id=>g.doc.nodes[id]?.name||'';
 const metrics={mode,source:c.source,period:c.period,footfall:Object.entries(c.touch).sort((a,b)=>a[1]-b[1]),
  activeStance:Object.entries(c.stance),jointChannels:0,rotatedJoints:{},maxStepDeg:0,
  maxSeamDeg:0,torsoVerticalRange:0,changedLegs:[],contactMeasured:false,verifiedGlbSkin:false};
 const jointValues=new Map(),oldValues=new Map(),range={};
 for(const [leg,bones] of Object.entries(chains)){
  const k=leg.startsWith('Fore')?'fore':'hind',planned=Array.from({length:N},(_,i)=>angles(mode,leg,i));
  for(let j=0;j<bones.length;j++){
   const name=bones[j],old=src.channels.find(ch=>nodeName(ch.node)===name&&ch.path==='rotation');
   if(!old)throw Error('Source misses '+name);
   const values=[],diff=[];
   for(let i=0;i<N;i++){
    const sourceAngle=angle(sample(old.sam,src.duration*i/N,4)),
     dest=clamp(sourceAngle+(planned[i][j]-sourceAngle)*c.blend,...bounds[k][j]);
    values.push(dest);diff.push(dest-sourceAngle);
   }
   const seam=Math.abs(values[0]-values[N-1]),frameStep=Math.max(...values.map((v,i)=>Math.abs(v-values[(i+N-1)%N])));
   const oldRange=Math.max(...values)-Math.min(...values);
   const rms=Math.hypot(...diff)/Math.sqrt(N);
   if(![seam,frameStep,oldRange,rms].every(Number.isFinite))throw Error('Nonfinite '+name);
   jointValues.set(name,values);range[name]={range:oldRange,rms,seam,frameStep};
   metrics.maxSeamDeg=Math.max(metrics.maxSeamDeg,seam);
   metrics.maxStepDeg=Math.max(metrics.maxStepDeg,frameStep);
  }
  if(bones.some(x=>range[x].range>8&&range[x].rms>2))metrics.changedLegs.push(leg);
 }
 const resultChannels=src.channels.map(ch=>{
  const name=nodeName(ch.node),n=ch.path==='rotation'?4:3,data=new Float32Array(N*n);
  for(let i=0;i<N;i++){
   const phaseValue=i/N,theta=phaseValue*TAU,t=src.duration*phaseValue;
   let value=sample(ch.sam,t,n);
   if(jointValues.has(name)&&ch.path==='rotation'){
    value=quat(jointValues.get(name)[i]);metrics.jointChannels++;
   }else if(name==='Torso'&&ch.path==='translation'){
    // Small controlled CoM-like vertical excursion; no root travel simulated.
    const osc=mode==='walk'?.5*Math.cos(2*theta-.6):
     .60*Math.cos(theta+.35)+.4*Math.cos(2*theta-1.1);
    value=[value[0],value[1]+c.body*osc,value[2]];
   }else if(ch.path==='rotation'&&name==='Torso'){
    value=multiplyX(value,c.pitch*(mode==='walk'?Math.sin(2*theta-.45):
     .65*Math.sin(theta-.45)+.35*Math.sin(2*theta+.28)));
   }else if(ch.path==='rotation'&&(name==='Neck'||name==='Head'||name==='Tail')){
    const swing=name==='Neck'?.68:name==='Head'?-.38:.65,delay=name==='Neck'?.55:name==='Head'?.86:1.35;
    const delta=c.neck*swing*(mode==='walk'?Math.sin(2*theta-delay):Math.sin(theta-delay));
    value=multiplyX(value,delta);
   }
   data.set(value,i*n);
  }
  return {node:ch.node,path:ch.path,sam:{times,data,interpolation:'LINEAR'}};
 });
 metrics.jointChannels/=N;
 metrics.rotatedJoints=range;
 metrics.changedLegs.sort();
 if(metrics.changedLegs.length!==4||metrics.jointChannels!==14||resultChannels.length!==19)
  throw Error('Not all four legs changed: '+JSON.stringify(metrics.changedLegs));
 const torso=resultChannels.find(ch=>nodeName(ch.node)==='Torso'&&ch.path==='translation');
 const by=torso.sam.data;metrics.torsoVerticalRange=Math.max(...Array.from({length:N},(_,i)=>by[i*3+1]))-
  Math.min(...Array.from({length:N},(_,i)=>by[i*3+1]));
 const clip={name:c.name,duration:c.period,channels:resultChannels};
 return {clip,metrics};
}
return {N,configs:cfg,chains,phase,angles,build,curve,sample,quat};
});