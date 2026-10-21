/* HORSE RANCH V17: original-GLB-aware, contact-first experimental four-gait IK.
 * This is a kinematic fit, NOT a force solver, ground-reaction proof or approval.
 * Does not mutate original GLB, skin weights, old clips or previous candidates.
 */
(function(){'use strict';
const N=160,PI=Math.PI,TAU=2*PI,RAD=PI/180,
 clamp=(v,a,b)=>Math.max(a,Math.min(v,b)),frac=v=>((v%1)+1)%1,
 ease=v=>{const x=clamp(v,0,1);return x*x*(3-2*x);},
 FEET=['HindR','ForeR','HindL','ForeL'],MODES=['walk','cruise','fast','sprint'];
const LIMITS={fore:[[-43,31],[-3,47],[-19,20]],hind:[[-50,26],[-8,46],[-34,30],[-20,21]]};
const rads=d=>d*RAD;
function mul(a,b){
 const v=new Float64Array(16);
 for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)v[c*4+r]+=a[k*4+r]*b[c*4+k];
 return v;
}
function trs(t,q,s){
 const [x,y,z,w]=q,[sx,sy,sz]=s,xx=2*x*x,yy=2*y*y,zz=2*z*z,
 xy=2*x*y,xz=2*x*z,yz=2*y*z,wx=2*w*x,wy=2*w*y,wz=2*w*z;
 return Float64Array.from([(1-yy-zz)*sx,(xy+wz)*sx,(xz-wy)*sx,0,
  (xy-wz)*sy,(1-xx-zz)*sy,(yz+wx)*sy,0,
  (xz+wy)*sz,(yz-wx)*sz,(1-xx-yy)*sz,0,t[0],t[1],t[2],1]);
}
const quat=a=>[Math.sin(a*.5),0,0,Math.cos(a*.5)],angle=q=>2*Math.atan2(q[0],q[3]);
function createSkin(g){
 const s=g.skins[0],a=g.doc.meshes[0].primitives[0].attributes,doc=g.doc.nodes,
  pos=readAccessor(g,a.POSITION),j=readAccessor(g,a.JOINTS_0),w=readAccessor(g,a.WEIGHTS_0),
  parent=new Int32Array(doc.length).fill(-1),joints=s.joints,ibms=s.ibms;
 doc.forEach((node,i)=>(node.children||[]).forEach(c=>parent[c]=i));
 if(joints.length!==19||pos.length!==24314*3)throw Error('Original GLB topology unexpectedly changed');
 const sole=window.__horseV16Targets?.collect(g);
 if(!sole||!Number.isFinite(sole.floor))throw Error('Real GLB hoof sole scanner unavailable');
 const point=Object.fromEntries(FEET.map(leg=>[leg,[sole.feet[leg].contactVertex,
  sole.feet[leg].frontVertex,sole.feet[leg].backVertex]]));
 const ids=Object.fromEntries(FEET.map(leg=>[leg,window.__horseV167Builder.chains[leg].map(n=>doc.findIndex(d=>d.name===n))]));
 if(Object.values(ids).flat().some(k=>k<0))throw Error('Required anatomical chain missing');
 const torso=doc.findIndex(n=>n.name==='Torso'),neck=doc.findIndex(n=>n.name==='Neck'),
  head=doc.findIndex(n=>n.name==='Head'),tail=doc.findIndex(n=>n.name==='Tail');
 function mats(pose){
  const globals=new Array(doc.length);
  const world=i=>{
   if(globals[i])return globals[i];
   const n=g.nodes[i],p=pose[i],m=n.useMatrix?n.matrix:trs(p.t,p.q,p.s);
   globals[i]=parent[i]<0?m:mul(world(parent[i]),m);return globals[i];
  };
  return joints.map((id,k)=>mul(world(id),ibms.subarray(k*16,k*16+16)));
 }
 function xyz(index,M){
  const v=index*3,u=index*4,x=pos[v],y=pos[v+1],z=pos[v+2];let X=0,Y=0,Z=0;
  for(let k=0;k<4;k++){
   const a=w[u+k];if(a<1e-7)continue;
   const m=M[j[u+k]];
   X+=a*(m[0]*x+m[4]*y+m[8]*z+m[12]);
   Y+=a*(m[1]*x+m[5]*y+m[9]*z+m[13]);
   Z+=a*(m[2]*x+m[6]*y+m[10]*z+m[14]);
  }
  return [X,Y,Z];
 }
 function measure(pose,leg){const M=mats(pose),p=point[leg].map(k=>xyz(k,M));
  return {y:Math.min(...p.map(v=>v[1])),z:p[0][2],toe:p[1][1],heel:p[2][1]};
 }
 return {sole,ids,torso,neck,head,tail,measure,ground:sole.floor};
}
function pose(g,clip,i,builder){
 const result=g.nodes.map(n=>({t:Array.from(n.baseT),q:Array.from(n.baseQ),s:Array.from(n.baseS)}));
 for(const ch of clip.channels){
  const v=builder.sample(ch.sam,clip.duration*i/N,ch.path==='rotation'?4:3),o=result[ch.node];
  if(ch.path==='rotation')o.q=v;
  else if(ch.path==='translation')o.t=v;
  else if(ch.path==='scale')o.s=v;
 }
 return result;
}
function target(mode,leg,i,c,geometry){
 const p=frac(i/N-c.touch[leg]),type=leg.startsWith('Fore')?'fore':'hind',
  duty=c.stance[type],stance=p<duty,u=stance?p/duty:(p-duty)/(1-duty),
  stride=c.stride[type],foot=geometry.sole.feet[leg];
 const progress=stance?ease(u):ease(u);
 return {p,stance,u,y:geometry.ground+(stance?.002:.008+.067*Math.sin(PI*u)**2),
  z:foot.restZ+stride*(stance?.5-progress:progress-.5),
  stride};
}
function fitOne(g,geometry,p,mode,leg,i,c){
 const t=target(mode,leg,i,c,geometry),ids=geometry.ids[leg],kind=leg.startsWith('Fore')?'fore':'hind',
  baseline=ids.map(id=>angle(p[id].q)),current=baseline.slice();
 function score(values){
  ids.forEach((id,k)=>p[id].q=quat(values[k]));
  const v=geometry.measure(p,leg),
   pen=Math.max(0,geometry.ground+.001-v.y),w=t.stance?110:50;
  let loss=w*(v.y-t.y)**2+3*(v.z-t.z)**2+540*pen*pen;
  if(t.stance)loss+=15*(v.toe-v.heel)**2;
  else loss+=25*Math.max(0,t.y-Math.min(v.toe,v.heel))**2;
  for(let j=0;j<values.length;j++)loss+=.035*(values[j]-baseline[j])**2;
  return loss;
 }
 let best=score(current),iterations=0;
 for(const step of [5,2,1]){
  for(let j=0;j<ids.length;j++){
   const joint=LIMITS[kind][j],lo=Math.max(rads(joint[0]),baseline[j]-rads(10)),
    hi=Math.min(rads(joint[1]),baseline[j]+rads(10));
   if(lo>hi)continue;
   let keep=current[j];
   for(const sign of [-1,1]){
    const trial=clamp(current[j]+sign*rads(step),lo,hi);
    if(Math.abs(trial-current[j])<1e-10)continue;
    const arr=current.slice();arr[j]=trial;const loss=score(arr);
    if(loss+1e-10<best){best=loss;keep=trial;}
    iterations++;
   }
   current[j]=keep;ids.forEach((id,k)=>p[id].q=quat(current[k]));
  }
 }
 const final=geometry.measure(p,leg);
 return {leg,stance:t.stance,deltaDeg:current.map((x,j)=>(x-baseline[j])/RAD),
  yErrorMm:(final.y-t.y)*1000,penetrationMm:Math.max(0,geometry.ground-final.y)*1000,
  solveSamples:iterations};
}
function bake(g,mode,builder,geometry){
 const cfg=builder.configs[mode],src=g.animations.find(c=>c.name===cfg.name);
 if(!src||src.channels.length!==19)throw Error('Protected V16.7 '+mode+' unavailable');
 const frames=Array.from({length:N},(_,i)=>pose(g,src,i,builder));
 const rootLift=new Float64Array(N);
 // Enforce a moderate torso clearance before IK; smooth *upward* so a
 // frame cannot be lowered into the floor by the smoothing operation.
 for(let i=0;i<N;i++){
  const min=Math.min(...FEET.map(leg=>geometry.measure(frames[i],leg).y));
  rootLift[i]=clamp(geometry.ground+.003-min,0,.038);
 }
 const rootSmooth=Array.from({length:N},(_,i)=>
  Math.max(rootLift[i],.78*rootLift[(i+N-1)%N]+.22*rootLift[i],
   .78*rootLift[(i+1)%N]+.22*rootLift[i]));
 let maxSlip=0,maxPen=0,nContact=0,iterations=0;
 const allStats={};
 for(let i=0;i<N;i++){
  const p=frames[i],fraction=i/N,frontL=target(mode,'ForeL',i,cfg,geometry),
   frontR=target(mode,'ForeR',i,cfg,geometry),
   hindL=target(mode,'HindL',i,cfg,geometry),
   hindR=target(mode,'HindR',i,cfg,geometry);
  p[geometry.torso].t[1]+=rootSmooth[i];
  // Small support-driven trunk/poll coordination rather than independent waves.
  const front=(frontL.stance?1:0)+(frontR.stance?1:0),
   hind=(hindL.stance?1:0)+(hindR.stance?1:0);
  const heading=(front-hind)/2;
  p[geometry.neck].q=quat(angle(p[geometry.neck].q)+rads(mode==='walk'?-.7*heading:-1.15*heading));
  p[geometry.head].q=quat(angle(p[geometry.head].q)+rads(mode==='walk'?.3*heading:.5*heading));
  for(const leg of FEET){
   const stats=fitOne(g,geometry,p,mode,leg,i,cfg);iterations+=stats.solveSamples;
   maxPen=Math.max(maxPen,stats.penetrationMm);
   if(stats.stance)nContact++;
  }
 }
 // The first independent frame fits made stance feet jump by 99-437mm.
 // Smooth EACH joint trajectory periodically, not per-frame alpha guards.
 // This intentionally prioritizes temporal continuity even if some
 // instantaneous hoof clearance must be compromised and re-tested.
 const boneList=[...new Set(Object.values(geometry.ids).flat())];
 for(const id of boneList){
  const values=frames.map(p=>angle(p[id].q));
  for(let i=0;i<N;i++){
   const prev=values[(i+N-1)%N],next=values[(i+1)%N];
   const avg=.64*values[i]+.18*(prev+next);
   frames[i][id].q=quat(avg);
  }
 }
 // Clip sampling is frame-indexed, cyclic, and leaves all source clips intact.
 const samples=Float32Array.from({length:N},(_,i)=>i*src.duration/N),channels=src.channels.map(ch=>{
  const n=ch.path==='rotation'?4:3,data=new Float32Array(N*n);
  for(let i=0;i<N;i++)data.set(ch.path==='rotation'?frames[i][ch.node].q:
   ch.path==='translation'?frames[i][ch.node].t:frames[i][ch.node].s,i*n);
  return {node:ch.node,path:ch.path,sam:{times:samples,data,interpolation:'LINEAR'}};
 });
 const name='V17_0_'+mode.toUpperCase()+'_CONTACT_IK_EXPERIMENT';
 const result={name,duration:src.duration,channels};
 return {clip:result,stats:{mode,reference:src.name,period:src.duration,
  nContact,maxPenetrationMm:maxPen,totalFitEvaluations:iterations,
  maxRootLiftMm:Math.max(...rootSmooth)*1000,
  biologicalData:'contact-phase estimates; actual skin validation required',approved:false}};
}
let tries=0;
const timer=setInterval(()=>{
 if(!window.__horseV169Candidate?.ready||!window.__horseV167Builder||!window.__horseV168Bridge?.ready||
    !window.__horseV16Targets?.collect||!window.__viewerReady){
  if(++tries>900){clearInterval(timer);window.__horseV170Error='Existing GLB runtimes failed to initialize';}
  return;
 }
 clearInterval(timer);
 try{
  const g=object3d,geom=createSkin(g),builder=window.__horseV167Builder,
   results={};
  // Suspend animation while generating isolated new clips.
  for(const mode of MODES){
   const built=bake(g,mode,builder,geom),id=g.animations.length;
   g.animations.push(built.clip);window.__horseV168Bridge.registerV17(mode,id);
   results[mode]={index:id,...built.stats};
  }
  window.__horseV170={ready:true,version:'V17.0',results,originalGlbPreserved:true,
   originalSkinPreserved:true,experimental:true};
  console.log('V17.0 contact-first gait candidates',results);
 }catch(e){window.__horseV170Error=String(e.stack||e);console.error(window.__horseV170Error);}
},120);
})();