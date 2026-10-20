/* HORSE RANCH V16.8 / P1-P2 — actual GLB skinned contact-fit candidate.
 * EXPERIMENTAL. Walk only. No original source clip or GLB mutation.
 * No automatic selection, publish or PASS without toe/heel/edge QA.
 */
(function(root,factory){'use strict';const api=factory();root.__horseV168WalkFit=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const N=160,PI=Math.PI,RAD=PI/180,clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),
   frac=v=>((v%1)+1)%1,smooth=v=>{const t=clamp(v,0,1);return t*t*t*(t*(t*6-15)+10);};
 const FEET=['HindR','ForeR','HindL','ForeL'];
 // Identical treadmill-relative stance progress to V16.7 gait-audit.js.
 // Its shape is eased only at lift-off/landing, not a full-stance smoothstep.
 const stanceProgress=u=>{
  const t=clamp(u,0,1),a=.10,den=1-a;
  return t<a?t*t/(2*a*den):t>1-a?1-(1-t)**2/(2*a*den):(t-a/2)/den;
 };
 const LIMITS={fore:[[-43,31],[-3,47],[-19,20]],hind:[[-50,26],[-8,46],[-34,30],[-20,21]]};
 const NAME='Walk_V16_8_SKIN_CONTACT_CANDIDATE';
 function mul(a,b){
  const v=new Float64Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)v[c*4+r]+=a[k*4+r]*b[c*4+k];
  return v;
 }
 function trs(t,q,s){
  const [x,y,z,w]=q,[sx,sy,sz]=s,xx=2*x*x,yy=2*y*y,zz=2*z*z,
   xy=2*x*y,xz=2*x*z,yz=2*y*z,wx=2*w*x,wy=2*w*y,wz=2*z*w;
  return Float64Array.from([(1-yy-zz)*sx,(xy+wz)*sx,(xz-wy)*sx,0,
   (xy-wz)*sy,(1-xx-zz)*sy,(yz+wx)*sy,0,
   (xz+wy)*sz,(yz-wx)*sz,(1-xx-yy)*sz,0,t[0],t[1],t[2],1]);
 }
 function prepare(g,sole,read){
  if(g.skins?.[0]?.joints?.length!==19||!sole?.feet||!Number.isFinite(sole.floor))
   throw Error('GLB and ground discovery unavailable');
  const primitive=g.doc.meshes[0].primitives[0],attrs=primitive.attributes,
   pos=read(g,attrs.POSITION),j=read(g,attrs.JOINTS_0),weights=read(g,attrs.WEIGHTS_0),
   faces=read(g,primitive.indices);
  if(pos.length!==24314*3||j.length!==24314*4||weights.length!==j.length)
   throw Error('Unexpected original mesh or skin attributes');
  const docNodes=g.doc.nodes,parent=new Int32Array(docNodes.length).fill(-1);
  docNodes.forEach((node,i)=>(node.children||[]).forEach(child=>parent[child]=i));
  const joints=g.skins[0].joints,ibms=g.skins[0].ibms,groups={fore:[],hind:[]},
   region={fore:new Uint8Array(pos.length/3),hind:new Uint8Array(pos.length/3)},
   skinnedNames=joints.map(id=>docNodes[id].name);
  for(let i=0;i<pos.length/3;i++){
   let a=0,b=0;
   for(let k=0;k<4;k++){
    const w=weights[i*4+k],name=skinnedNames[j[i*4+k]]||'';
    if(name.startsWith('Fore'))a+=w;if(name.startsWith('Hind'))b+=w;
   }
   region.fore[i]=a>.5&&pos[3*i+1]<.95&&pos[3*i+2]>-2.8?1:0;
   region.hind[i]=b>.5&&pos[3*i+1]<.95&&pos[3*i+2]<-3.1?1:0;
  }
  const seen=new Set(),count=pos.length/3;
  for(let k=0;k<faces.length;k+=3)for(const [a,b] of [[faces[k],faces[k+1]],[faces[k+1],faces[k+2]],[faces[k+2],faces[k]]]){
   const u=Math.min(a,b),v=Math.max(a,b),key=u*count+v;
   if(seen.has(key))continue;seen.add(key);
   const length=Math.hypot(pos[3*u]-pos[3*v],pos[3*u+1]-pos[3*v+1],pos[3*u+2]-pos[3*v+2]);
   if(length<.008||length>.12)continue;
   for(const type of ['fore','hind'])if(region[type][u]&&region[type][v])groups[type].push([u,v,length]);
  }
  const soleFeet={},legEdges={},edgeCounts={fore:groups.fore.length,hind:groups.hind.length};
  for(const leg of FEET){
   const f=sole.feet[leg],pts=[f.contactVertex,f.frontVertex,f.backVertex];
   if(pts.some(v=>!Number.isInteger(v)||v<0||v>=24314))throw Error('Invalid actual hoof vertex '+leg);
   soleFeet[leg]={...f,vertices:pts};
   // Use ORIGINAL corrected GLB skin indices/weights and proximal limb bone
   // influence to sample actual skinned triangle edges for optimization.
   const set=new Set(skinnedNames.map((name,i)=>name.startsWith(leg+'_')?i:-1).filter(i=>i>=0));
   const strength=vertex=>{
    let sum=0;for(let k=0;k<4;k++)if(set.has(j[vertex*4+k]))sum+=weights[vertex*4+k];
    return sum;
   };
   const kind=leg.startsWith('Fore')?'fore':'hind',x=f.ref[0],
    group=groups[kind].filter(([u,v])=>
     Math.abs(pos[3*u]-x)<.36&&Math.abs(pos[3*v]-x)<.36&&
     Math.max(strength(u),strength(v))>.32&&Math.min(strength(u),strength(v))>.09);
   // Stable spaced sample from the SAME corrected vertex cohorts used in full QA.
   // Do not game the full-mesh thresholds with the smaller optimization sample.
   if(group.length<30)throw Error('Insufficient local limb skin edges '+leg+': '+group.length);
   const sample=[];
   for(let k=0;k<Math.min(96,group.length);k++)
    sample.push(group[Math.floor(k*group.length/Math.min(96,group.length))]);
   legEdges[leg]=sample;
  }
  return {g,pos,j,weights,parent,joints,ibms,edges:groups,legEdges,feet:soleFeet,ground:sole.floor,
   edgeCounts,sameTopology:edgeCounts.fore===3107&&edgeCounts.hind===2932};
 }
 function poseMatrices(a,pose){
  const doc=a.g.doc.nodes,global=new Array(doc.length);
  function walk(i){if(global[i])return global[i];
   const nd=a.g.nodes[i],local=pose[i],m=nd.useMatrix?nd.matrix:trs(local.t,local.q,local.s);
   global[i]=a.parent[i]<0?m:mul(walk(a.parent[i]),m);return global[i];}
  const matrices=a.joints.map((index,k)=>mul(walk(index),a.ibms.subarray(k*16,k*16+16)));
  return matrices;
 }
 function transform(a,vertex,mats){
  const t=3*vertex,k=4*vertex,x=a.pos[t],y=a.pos[t+1],z=a.pos[t+2];
  let X=0,Y=0,Z=0,total=0;
  for(let h=0;h<4;h++){
   const w=a.weights[k+h];if(w<1e-7)continue;
   const m=mats[a.j[k+h]];if(!m)throw Error('Skin index invalid');
   X+=w*(m[0]*x+m[4]*y+m[8]*z+m[12]);
   Y+=w*(m[1]*x+m[5]*y+m[9]*z+m[13]);
   Z+=w*(m[2]*x+m[6]*y+m[10]*z+m[14]);total+=w;
  }
  if(total<.99||total>1.01||![X,Y,Z].every(Number.isFinite))throw Error('Malformed vertex skinning');
  return [X,Y,Z];
 }
 function measureWithMatrices(a,mats,leg){
  const f=a.feet[leg],v=f.vertices.map(i=>transform(a,i,mats));
  return {contact:v[0],toe:v[1],heel:v[2],minY:Math.min(v[0][1],v[1][1],v[2][1])};
 }
 function measure(a,pose,leg){return measureWithMatrices(a,poseMatrices(a,pose),leg);}
 function localSkinPenalty(a,mats,leg){
  const edges=a.legEdges[leg];let penalty=0,worst=0;
  const cache=new Map(),point=id=>{
   if(!cache.has(id))cache.set(id,transform(a,id,mats));return cache.get(id);
  };
  for(const [u,v,originalLength] of edges){
   const p=point(u),q=point(v),stretch=Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])/originalLength;
   if(!Number.isFinite(stretch))throw Error('Nonfinite limb edge '+leg);
   worst=Math.max(worst,stretch);
   penalty+=Math.max(0,stretch-1.16)**2;
  }
  return {penalty:penalty/edges.length,maxStretch:worst,inspectedEdges:edges.length};
 }
 function basePose(g,clip,i,builder){
  const t=clip.duration*i/N,pose=g.nodes.map(n=>({t:Array.from(n.baseT),q:Array.from(n.baseQ),s:Array.from(n.baseS)}));
  for(const ch of clip.channels){
   const n=ch.path==='rotation'?4:3,value=builder.sample(ch.sam,t,n),state=pose[ch.node];
   if(ch.path==='rotation')state.q=value;
   if(ch.path==='translation')state.t=value;
   if(ch.path==='scale')state.s=value;
  }return pose;
 }
 function angle(q){return 2*Math.atan2(q[0],q[3]);}
 function assign(pose,ids,angles){
  ids.forEach((i,k)=>{const x=angles[k];pose[i].q=[Math.sin(x/2),0,0,Math.cos(x/2)];});
 }
 function goal(mode,leg,i,foot,ground,cfg){
  if(mode!=='walk')throw Error('Only Walk can be fit before gallops');
  const touch=cfg.touch[leg],stance=cfg.stance[leg.startsWith('Fore')?'fore':'hind'],
   stride=cfg.stride[leg.startsWith('Fore')?'fore':'hind'],p=frac(i/N-touch),
   planted=p<stance,u=planted?p/stance:(p-stance)/(1-stance),travel=planted?.5-stanceProgress(u):smooth(u)-.5,
   lift=planted?0:.065*Math.sin(PI*u)**2,
   breakover=planted?smooth((u-.85)/.15):0;
  return {stance:planted,phase:p,targetY:ground+.002+lift+.003*breakover,
   targetZ:foot.restZ+stride*travel,stride,breakover};
 }
 function loss(points,target,oldAngles,newAngles,neighbor,ground,localSkin){
  const C=points.contact,T=points.toe,H=points.heel,stance=target.stance,
   penetration=Math.max(0,ground+.001-points.minY);
  // Protect toe/heel clearance before pursuing a larger cosmetic stride.
  // Lower stride weight avoids trading hoof penetration for horizontal reach.
  let value=14*(C[1]-target.targetY)**2+1.2*(C[2]-target.targetZ)**2+
   140*penetration**2;
  if(stance){value+=10*(T[1]-H[1])**2*(1-target.breakover);}
  else{value+=30*Math.max(0,target.targetY-Math.min(T[1],H[1]))**2;}
  for(let k=0;k<newAngles.length;k++){
   value+=.007*(newAngles[k]-oldAngles[k])**2;
   if(neighbor)value+=.006*(newAngles[k]-neighbor[k])**2;
  }
  // True CPU-skinned leg edge stretch is now part of the optimization, NOT
  // merely checked after baking. Lower bound remains the original 1.20x gate.
  value+=.35*localSkin.penalty;
  return value;
 }
 function optimizeFrame(a,builder,clip,leg,i,neighbor,sharedPose){
  // Fit each limb against the ACTUAL already-composed frame, not against
  // a fresh, independent copy of the source pose for every limb.
  const kind=leg.startsWith('Fore')?'fore':'hind',ids=builder.chains[leg].map(n=>{
   const ix=a.g.doc.nodes.findIndex(x=>x.name===n);
   if(ix<0)throw Error('Missing rig joint '+n);return ix;
  });
  const initial=sharedPose?sharedPose.map(n=>({t:n.t.slice(),q:n.q.slice(),s:n.s.slice()})):
   basePose(a.g,clip,i,builder),
   old=ids.map(id=>angle(initial[id].q)),current=old.slice(),
   bounds=LIMITS[kind].map(x=>x.map(v=>v*RAD)),target=goal('walk',leg,i,a.feet[leg],a.ground,builder.configs.walk);
  function score(values){
   assign(initial,ids,values);
   const mats=poseMatrices(a,initial);
   return loss(measureWithMatrices(a,mats,leg),target,old,values,neighbor,
    a.ground,localSkinPenalty(a,mats,leg));
  }
  let best=score(current),changed=false;
  for(const step of [4,2,1,.5]){
   let update=false;
   for(let k=0;k<current.length;k++){
    let at=current[k],val=best;
    for(const sign of [-1,1]){
     const x=clamp(current[k]+sign*step*RAD,Math.max(bounds[k][0],old[k]-12*RAD),
       Math.min(bounds[k][1],old[k]+12*RAD));
     if(x===current[k])continue;
     const probe=current.slice();probe[k]=x;const tested=score(probe);
     if(tested<val-1e-12){at=x;val=tested;}
    }
    if(at!==current[k]){current[k]=at;best=val;update=true;changed=true;}
   }
   if(update){ /* conservative coordinate descent, no relaxation that hides misses */ }
  }
  assign(initial,ids,current);
  const finalMats=poseMatrices(a,initial),measured=measureWithMatrices(a,finalMats,leg),
   skin=localSkinPenalty(a,finalMats,leg);
  return {angles:current,old,measure:measured,target,energy:best,changed,
   localizedEdgeMaxStretch:skin.maxStretch,skinEdgeSampleCount:skin.inspectedEdges};
 }
 function fullSkin(a,pose){
  const mats=poseMatrices(a,pose),arr=new Float32Array(a.pos.length);
  for(let i=0;i<arr.length/3;i++)arr.set(transform(a,i,mats),i*3);
  return arr;
 }
 function edgeStat(a,coords){
  const stats={},worst={};
  for(const kind of ['fore','hind']){
   let max=0,location=null;
   for(const [u,v,d] of a.edges[kind]){
    const U=u*3,V=v*3,r=Math.hypot(coords[U]-coords[V],coords[U+1]-coords[V+1],coords[U+2]-coords[V+2])/d;
    if(!Number.isFinite(r))throw Error('Nonfinite skin edge '+kind);
    if(r>max){max=r;location={region:kind,vertexA:u,vertexB:v,stretch:r};}
   }
   stats[kind]=max;worst[kind]=location;
  }
  stats.worst=worst;
  return stats;
 }
 const state={status:'idle',progress:0,report:null,error:null};
 async function run(g,source,sole,builder,reader,notify){
  if(state.status==='running')throw Error('Walk contact-fit already running');
  state.status='running';state.error=null;state.progress=0;state.report=null;state.candidate=null;
  try{
   const a=prepare(g,sole,reader),clip=g.animations.find(x=>x.name==='Walk_V16_7_FOOTFALL');
   if(source?.addedClips!==4&&source?.sourceTag!=='isolated-proxy')
    throw Error('Gait runtime provenance missing, refusing unverified clip');

   if(!clip||clip.channels.length!==19||!a.sameTopology)throw Error('Protected V16.7 clip or GLB edge cohorts changed');
   const frames=[],limbs={},previous={};for(const leg of FEET)limbs[leg]=[];
   for(let i=0;i<N;i++){
    const pose=basePose(g,clip,i,builder),data={};
    for(const leg of FEET){
     const f=optimizeFrame(a,builder,clip,leg,i,previous[leg],pose);
     const joints=builder.chains[leg].map(name=>g.doc.nodes.findIndex(n=>n.name===name));
     assign(pose,joints,f.angles);previous[leg]=f.angles;limbs[leg].push(f.angles);data[leg]=f;
    }
    frames.push({pose,data});
    state.progress=(i+1)/(2*N);if(notify)notify(state.progress);
    if(i%4===3)await new Promise(resolve=>setTimeout(resolve,0));
   }
   // Cyclic re-fit at wrap point: frame zero sees the actual fitted frame 159.
   // Only the first frame is revisited; keep native clip and all prior files intact.
   // The full 160-frame skin audit below remains the release gate.
   for(const leg of FEET){
    const pose=frames[0].pose,fit=optimizeFrame(a,builder,clip,leg,0,limbs[leg][N-1],pose);
    const joints=builder.chains[leg].map(name=>g.doc.nodes.findIndex(n=>n.name===name));
    assign(pose,joints,fit.angles);
    limbs[leg][0]=fit.angles;frames[0].data[leg]=fit;
   }
   let deepest=0,maxEdge=0,maxSeam=0,maxStanceError=0,slip=0,lateralSlip=0;
   let baselineDepth=0,baselineEdge=0,baselineStanceError=0,baselineSlip=0,minimumSwingClearance=Infinity;
   const backedOff=[];let smallestGuardAlpha=1;
   let worstPenetrationFrame=-1,worstStretchFrame=-1,worstStanceFrame=-1,worstSkinEdge=null;
   let worstPenetrationFoot=null,maxHoofTipPenetration=0,maxHoofHeelPenetration=0;
   const lastStanceZ={},lastStanceX={},baselineLastStanceZ={};
   const violations=[];
   for(let i=0;i<N;i++){
    const originalPose=basePose(g,clip,i,builder),original=fullSkin(a,originalPose),
     oldEdge=edgeStat(a,original),oldStretch=Math.max(oldEdge.fore,oldEdge.hind);
    baselineEdge=Math.max(baselineEdge,oldStretch);
    const oldDepth=Math.max(...FEET.map(leg=>{
     const foot=a.feet[leg];
     return Math.max(0,a.ground-Math.min(...foot.vertices.map(index=>original[index*3+1])));
    }));
    const stanceErrorFor=arr=>Math.max(0,...FEET.filter(leg=>frames[i].data[leg].target.stance)
     .map(leg=>Math.abs(arr[a.feet[leg].vertices[0]*3+1]-a.ground)));
    const oldStanceError=stanceErrorFor(original);
    baselineStanceError=Math.max(baselineStanceError,oldStanceError);
    let pose=frames[i].pose,coords=fullSkin(a,pose),edge=edgeStat(a,coords),
     edgeNow=Math.max(edge.fore,edge.hind);
    const depthFor=arr=>Math.max(...FEET.map(leg=>Math.max(0,a.ground-
      Math.min(...a.feet[leg].vertices.map(index=>arr[index*3+1])))));
    // Preserve all 19 original channels. If a candidate frame regresses beyond
    // the baseline, use the largest safe interpolation fraction. It is NOT a
    // physical approval; any such backtracking is a mandatory audit failure.
    if(edgeNow>oldStretch+.02||depthFor(coords)>oldDepth+.001||
       stanceErrorFor(coords)>oldStanceError+.001){
     let selected=null,alpha=0;
     for(const fraction of [.75,.5,.25,.125,0]){
      const proposal=originalPose.map(n=>({t:n.t.slice(),q:n.q.slice(),s:n.s.slice()}));
      for(const leg of FEET){
       builder.chains[leg].forEach((joint,k)=>{
        const idx=g.doc.nodes.findIndex(n=>n.name===joint);
        const before=angle(originalPose[idx].q),after=limbs[leg][i][k],
         theta=before+(after-before)*fraction;
        proposal[idx].q=[Math.sin(theta/2),0,0,Math.cos(theta/2)];
       });
      }
      const data=fraction===0?original:fullSkin(a,proposal),e=fraction===0?oldEdge:edgeStat(a,data),
       stretch=Math.max(e.fore,e.hind);
      if(stretch<=oldStretch+.02+1e-6&&depthFor(data)<=oldDepth+.001+1e-6&&
         stanceErrorFor(data)<=oldStanceError+.001+1e-6){
       selected={proposal,data,edge:e,stretch};alpha=fraction;break;
      }
     }
     if(!selected)throw Error('No safe baseline-preserving interpolation found at frame '+i);
     pose=selected.proposal;coords=selected.data;edge=selected.edge;edgeNow=selected.stretch;
     frames[i].pose=pose;
     for(const leg of FEET){
      limbs[leg][i]=builder.chains[leg].map(joint=>{
       const idx=g.doc.nodes.findIndex(n=>n.name===joint);return angle(pose[idx].q);
      });
     }
     backedOff.push({frame:i,alpha});
     smallestGuardAlpha=Math.min(smallestGuardAlpha,alpha);
    }
    if(edgeNow>maxEdge){
     maxEdge=edgeNow;worstStretchFrame=i;
     const kind=edge.fore>=edge.hind?'fore':'hind';
     worstSkinEdge=edge.worst[kind]?{frame:i,...edge.worst[kind]}:null;
    }
    for(const leg of FEET){
     const f=a.feet[leg],v=f.vertices.map(index=>[coords[index*3],coords[index*3+1],coords[index*3+2]]),
      target=frames[i].data[leg].target,minY=Math.min(...v.map(p=>p[1])),
      penetration=Math.max(0,a.ground-minY);
     if(penetration>deepest){deepest=penetration;worstPenetrationFrame=i;worstPenetrationFoot=leg;}
     maxHoofTipPenetration=Math.max(maxHoofTipPenetration,Math.max(0,a.ground-v[1][1]));
     maxHoofHeelPenetration=Math.max(maxHoofHeelPenetration,Math.max(0,a.ground-v[2][1]));
     const oldLegDepth=Math.max(0,a.ground-Math.min(...f.vertices.map(index=>original[index*3+1])));
     baselineDepth=Math.max(baselineDepth,oldLegDepth);
     if(!target.stance)
      minimumSwingClearance=Math.min(minimumSwingClearance,minY-a.ground);
     if(target.stance){
      const error=Math.abs(v[0][1]-a.ground);
      if(error>maxStanceError){maxStanceError=error;worstStanceFrame=i;}
      const u=target.phase/builder.configs.walk.stance[leg.startsWith('Fore')?'fore':'hind'];
      const correctedZ=v[0][2]+target.stride*stanceProgress(u);
      const baselineCorrectedZ=original[f.vertices[0]*3+2]+target.stride*stanceProgress(u);
      if(i&&frames[i-1].data[leg].target.stance&&baselineLastStanceZ[leg]!==undefined)
       baselineSlip=Math.max(baselineSlip,Math.abs(baselineCorrectedZ-baselineLastStanceZ[leg]));
      baselineLastStanceZ[leg]=baselineCorrectedZ;
      if(i&&frames[i-1].data[leg].target.stance&&lastStanceZ[leg]!==undefined)
       slip=Math.max(slip,Math.abs(correctedZ-lastStanceZ[leg]));
      lastStanceZ[leg]=correctedZ;
      const footX=v[0][0];
      if(lastStanceX[leg]!==undefined&&i&&frames[i-1].data[leg].target.stance)
       lateralSlip=Math.max(lateralSlip,Math.abs(footX-lastStanceX[leg]));
      lastStanceX[leg]=footX;
     }
    }
    state.progress=.5+(i+1)/(2*N);if(notify)notify(state.progress);
    if(i%4===3)await new Promise(resolve=>setTimeout(resolve,0));
   }
   for(const leg of FEET){const seq=limbs[leg];
    for(let k=0;k<seq[0].length;k++)maxSeam=Math.max(maxSeam,Math.abs(seq[N-1][k]-seq[0][k])/RAD);
   }
   if(deepest>.005)violations.push('hoof penetration '+(deepest*1000).toFixed(1)+'mm');
   if(maxStanceError>.012)violations.push('stance vertical error '+(maxStanceError*1000).toFixed(1)+'mm');
   if(maxEdge>1.20)violations.push('skinned edge stretch '+maxEdge.toFixed(3)+'x');
   if(maxSeam>12)violations.push('cycle seam '+maxSeam.toFixed(1)+' degrees');
   if(slip>.015)violations.push('stride-corrected stance delta '+(1000*slip).toFixed(1)+'mm');
   if(lateralSlip>.015)violations.push('lateral stance-foot slide '+(1000*lateralSlip).toFixed(1)+'mm');
   if(minimumSwingClearance<-.005)violations.push('swing foot ground penetration '+(1000*minimumSwingClearance).toFixed(1)+'mm');
   if(deepest>baselineDepth+.001)violations.push('penetration regression vs V16.7 baseline');
   if(maxEdge>baselineEdge+.02)violations.push('skin stretch regression vs V16.7 baseline');
   if(maxStanceError>baselineStanceError+.001)violations.push('stance contact regression vs V16.7 baseline');
   if(slip>baselineSlip+.001)violations.push('stance slide regression vs V16.7 baseline');
   if(backedOff.length)violations.push('regression guard active on '+backedOff.length+' frames; experimental gait not approved');
   const times=Float32Array.from({length:N},(_,i)=>i*clip.duration/N);
   const channels=clip.channels.map(ch=>{
    const node=a.g.doc.nodes[ch.node].name;
    let source=null;
    for(const leg of FEET){const idx=builder.chains[leg].indexOf(node);
     if(idx>=0){source=limbs[leg].map(frame=>frame[idx]);break;}
    }
    if(!source||ch.path!=='rotation')return ch;
    const data=new Float32Array(N*4);
    source.forEach((x,i)=>data.set([Math.sin(x/2),0,0,Math.cos(x/2)],4*i));
    return {node:ch.node,path:'rotation',sam:{times,data,interpolation:'LINEAR'}};
   });
   const candidate={name:NAME,duration:clip.duration,channels};
   if(channels.length!==19)throw Error('Final Walk channels changed unexpectedly');
   const report={mode:'walk',frames:N,skinnedVertices:24314,hoofSamples:N*4*3,
    optimizationMethod:'shared-pose skin-aware IK, V16.7-consistent stance phase, contact+skin baseline protection',
    guard:{activationCount:backedOff.length,minInterpolationFraction:smallestGuardAlpha,
     samples:backedOff.slice(0,16)},
    maximumPenetrationMm:1000*deepest,baselineMaximumPenetrationMm:1000*baselineDepth,
    maxStanceErrorMm:1000*maxStanceError,baselineMaxStanceErrorMm:1000*baselineStanceError,
    maximumSkinEdgeStretch:maxEdge,baselineMaximumSkinEdgeStretch:baselineEdge,
    maximumCycleSeamDeg:maxSeam,
    largestConsecutiveCorrectedStanceZDeltaMm:1000*slip,
     baselineLargestCorrectedStanceZDeltaMm:1000*baselineSlip,
    maxStanceLateralDeltaMm:1000*lateralSlip,
    minSwingClearanceMm:1000*minimumSwingClearance,
    maxToePenetrationMm:1000*maxHoofTipPenetration,maxHeelPenetrationMm:1000*maxHoofHeelPenetration,
    worstFrame:{penetration:worstPenetrationFrame,hoof:worstPenetrationFoot,
     skinStretch:worstStretchFrame,stanceError:worstStanceFrame},
    edgeCounts:a.edgeCounts,localEdgeSamples:Object.fromEntries(FEET.map(l=>[l,a.legEdges[l].length])),
     worstSkinEdge,
    status:violations.length?'FAIL':'NUMERIC_GATE_PASS_VISUAL_NOT_VERIFIED',violations,
    nativeModelPreserved:true,gate:{penetrationMm:5,stanceHeightMm:12,
     stanceStepMm:15,edgeStretch:1.20,angleSeamDeg:12},
    limits:'19 X-axis hinges cannot physically guarantee 3D hoof attitude or friction; 160-frame proxy ground relative displacement'};
   // Keep validated candidate in memory only. A numeric pass is not a production approval.
   state.report=report;
   state.candidate=violations.length?null:candidate;
   state.status='finished';
   return {report,candidate:state.candidate}; 
  }catch(e){state.error=String(e?.stack||e);state.status='error';throw e;}
 }
 function runViewer(notify){
  if(typeof object3d==='undefined'||typeof readAccessor!=='function')
   throw Error('V16.8 must run inside original viewer with actual GLB');
  const old=window.__horseV165,ref=window.__horseV167Builder;
  if(!old?.ready||!ref?.build||window.__horseGaitV12?.belly?.corrected!==440)
   throw Error('V16.8 legacy body / belly correction / gait builder missing');
  // The old V16.5 sole property contains a summary, not the rich geometry.
   // Re-read immutable original source, validate all original hoof indices.
   const scanner=window.__horseV16Targets,measured=scanner?.collect?.(object3d);
   if(measured?.bodyVertexCount!==24314||!Number.isFinite(measured?.floor)||
      Math.abs(measured.floor-old.groundY)>.002)
    throw Error('Original hoof scan/floor mismatch');
   for(const leg of FEET){
    const oldFoot=old.sole?.[leg],f=measured.feet?.[leg];
    if(!oldFoot||!f||oldFoot.contactVertex!==f.contactVertex||
       oldFoot.toeVertex!==f.frontVertex||oldFoot.heelVertex!==f.backVertex)
     throw Error('Protected hoof index mismatch: '+leg);
   }
   return run(object3d,window.__horseV167,{feet:measured.feet,floor:measured.floor},ref,readAccessor,notify);
 }
 return {N,NAME,FEET,prepare,measure,goal,run,runViewer,state};
});
