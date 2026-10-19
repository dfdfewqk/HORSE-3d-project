/* V16.8: GLB-target IK and objective failure gate; experimental staging.
 * Never fallback to old joint keys while claiming a changed gait.
 * Requires prior __horseV165IK, __horseV168Contact, __horseV167Builder.
 */
(function(root,factory){'use strict';const x=factory();root.__horseV168IKGate=x;
 if(typeof module==='object'&&module.exports)module.exports=x;
})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const N=160,RAD=Math.PI/180;
 function extractBody(g,clip,builder){
  const by=new Map(clip.channels.map(ch=>[g.doc.nodes[ch.node]?.name+'|'+ch.path,ch]));
  const translate=by.get('Torso|translation')?.sam,rotate=by.get('Torso|rotation')?.sam;
  if(!translate||!rotate)throw Error('Torso joint source missing');
  return Array.from({length:N},(_,i)=>{
   const t=i/N*clip.duration,pos=builder.sample(translate,t,3),q=builder.sample(rotate,t,4);
   return {x:pos[0],y:pos[1],z:pos[2],q,pitch:2*Math.atan2(q[0],q[3])};
  });
 }
 function make(mode,rig,feet,body,engine,contact,ik){
  const config=contact.config[mode];if(!config)throw Error('Invalid gait IK mode');
  if(!rig||!feet?.feet||!Number.isFinite(feet.floor)||body?.length!==N)throw Error('GLB foot or Torso measurements absent');
  const frames=contact.timeline(mode,feet.feet,feet.floor);
  const ref={N,priors:(leg,i)=>engine.angles(mode,leg,i).map(x=>x*RAD)};
  const planner={trajectory:(name,i)=>{const p=frames.rows[i].legs[name];
    return {name,stance:p.stance,support:p.stance?1:0,pitch:p.pitchDeg*RAD,
      y:p.y,z:p.relativeZ};}};
  const result=ik.bake(rig,ref,planner,feet,body);
  const fail=[];
  for(const [name,metric]of Object.entries(result.metrics)){
   for(const [field,limit] of Object.entries({maxWorldTargetError:.035,maxStanceWorldError:.025,
     cycleSeamDeg:12,maxHoofPitchErrorDeg:22})){
    const value=metric[field];
    if(!Number.isFinite(value)||value>limit)fail.push({leg:name,field,value,limit,reason:'Target missed or measurement not finite'});
   }
   if(metric.jointLimitHits>20)fail.push({leg:name,field:'jointLimitHits',value:metric.jointLimitHits,limit:20});
  }
  return {mode,frames:N,angles:result.angles,metrics:result.metrics,
   eventSummary:{airborne:frames.airborneSamples,groundEvents:config.events},
   sourceGLBActual:false,
   pass:fail.length===0,errors:fail,clipReady:fail.length===0};
 }
 function replaceLegs(candidate,g,angles,engine){
  const bones=new Map();for(const [name,chain]of Object.entries(engine.chains)){
   if(!angles[name]||angles[name].length!==N)throw Error('No IK result '+name);
   chain.forEach((bone,j)=>bones.set(bone,angles[name].map(x=>x[j])));
  }
  if(bones.size!==14)throw Error('Missing controlled bones');
  const modified=candidate.channels.map(ch=>{
   const name=g.doc.nodes[ch.node]?.name;
   if(ch.path!=='rotation'||!bones.has(name))return ch;
   const data=new Float32Array(N*4);
   const values=bones.get(name);
   for(let i=0;i<N;i++){const a=values[i],v=[Math.sin(a/2),0,0,Math.cos(a/2)];
    if(!v.every(Number.isFinite))throw Error('Nonfinite IK quaternion '+name);
    data.set(v,i*4);}
   return {node:ch.node,path:ch.path,sam:{times:ch.sam.times,data,interpolation:'LINEAR'}};
  });
  return {...candidate,channels:modified};
 }
 return {N,extractBody,make,replaceLegs};
});