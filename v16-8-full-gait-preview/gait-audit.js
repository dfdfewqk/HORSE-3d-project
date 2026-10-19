/* HORSE RANCH V16.8 IK staging CPU audit: V16.2/V16.7 real-GLB geometry, read-only */
(function(){'use strict';
const N=160,names={walkOld:'Walk_V16_7_FOOTFALL',walk:'Walk_V16_8_IK_STAGING',
 cruiseOld:'Gallop_V16_7_CRUISE',cruise:'Gallop_V16_8_CRUISE_IK_STAGING',
 fastOld:'Gallop_V16_7_FAST',fast:'Gallop_V16_8_FAST_IK_STAGING',
 sprintOld:'Gallop_V16_7_SPRINT',sprint:'Gallop_V16_8_SPRINT_IK_STAGING'};
const state={status:'idle',progress:0,result:null,error:null,run};
window.__horseV168QA=state;
function ok(x,label){if(!Number.isFinite(x))throw Error('Nonfinite '+label);return x;}
function mul(a,b){const o=new Float64Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];o[c*4+r]=ok(v,'matrix');}return o;}
function trs(t,q,s){const [x,y,z,w]=q,[sx,sy,sz]=s;
 const xx=2*x*x,yy=2*y*y,zz=2*z*z,xy=2*x*y,xz=2*x*z,yz=2*y*z,wx=2*w*x,wy=2*w*y,wz=2*z*w;
 return Float64Array.from([(1-yy-zz)*sx,(xy+wz)*sx,(xz-wy)*sx,0,
  (xy-wz)*sy,(1-xx-zz)*sy,(yz+wx)*sy,0,
  (xz+wy)*sz,(yz-wx)*sz,(1-xx-yy)*sz,0,t[0],t[1],t[2],1]);}
function sample(s,t,n){const ts=s.times,d=s.data;if(!ts.length)throw Error('Empty sampler');
 let lo=0,hi=ts.length-1;while(lo<hi){const m=(lo+hi)>>1;if(ts[m]<t)lo=m+1;else hi=m;}
 const b=lo,a=ts[b]<t?b:Math.max(0,b-1),v=ts[a]===ts[b]?0:Math.max(0,Math.min(1,(t-ts[a])/(ts[b]-ts[a])));
 const o=Array.from({length:n},(_,j)=>d[a*n+j]*(1-v)+d[b*n+j]*v);
 if(n===4){const l=Math.hypot(...o);if(l<1e-8)throw Error('Zero quat');return o.map(x=>x/l);}return o;}
function prepare(){
 const g=object3d,info=window.__horseV167;if(!info?.ready||g.skins?.[0]?.joints?.length!==19)
  throw Error('V16.7 not ready');
 const mesh=g.doc.meshes[0].primitives[0],a=mesh.attributes;
 const pos=readAccessor(g,a.POSITION),j=readAccessor(g,a.JOINTS_0),w=readAccessor(g,a.WEIGHTS_0),indices=readAccessor(g,mesh.indices);
 if(pos.length!==24314*3||window.__horseGaitV12?.belly?.corrected!==440)throw Error('Baseline mesh not preserved');
 const parent=new Int16Array(g.doc.nodes.length).fill(-1);
 g.doc.nodes.forEach((n,i)=>(n.children||[]).forEach(ch=>parent[ch]=i));
 const bones=g.skins[0].joints,ibm=bones.map((_,i)=>g.skins[0].ibms.subarray(i*16,i*16+16));
 const limb=bones.map(i=>g.doc.nodes[i].name);
 const regions={fore:new Uint8Array(pos.length/3),hind:new Uint8Array(pos.length/3)};
 for(let i=0;i<pos.length/3;i++){
  let fore=0,hind=0;for(let k=0;k<4;k++){
   const n=limb[j[i*4+k]],v=w[i*4+k];if(n.startsWith('Fore'))fore+=v;if(n.startsWith('Hind'))hind+=v;
  }
  regions.fore[i]=fore>.5&&pos[3*i+1]<.95&&pos[3*i+2]>-2.8?1:0;
  regions.hind[i]=hind>.5&&pos[3*i+1]<.95&&pos[3*i+2]<-3.1?1:0;
 }
 const edges={fore:[],hind:[]},seen=new Set(),count=pos.length/3;
 for(let k=0;k<indices.length;k+=3)for(const [v1,v2] of [[indices[k],indices[k+1]],[indices[k+1],indices[k+2]],[indices[k+2],indices[k]]]){
  const u=Math.min(v1,v2),v=Math.max(v1,v2),id=u*count+v;if(seen.has(id))continue;seen.add(id);
  const d=Math.hypot(pos[3*u]-pos[3*v],pos[3*u+1]-pos[3*v+1],pos[3*u+2]-pos[3*v+2]);
  if(d<.008||d>.12)continue;
  for(const r of ['fore','hind'])if(regions[r][u]&&regions[r][v])edges[r].push([3*u,3*v,d]);
 }
 if(edges.fore.length!==3107||edges.hind.length!==2932)throw Error('Skin cohort count regression');
 const clips=Object.fromEntries(Object.entries(names).map(([k,n])=>[k,g.animations.find(a=>a.name===n)]));
 if(Object.values(clips).some(x=>!x||x.channels.length!==19))throw Error('Walk candidate missing');
 const old=window.__horseV165;
 if(!old?.sole||!Number.isFinite(old.groundY))throw Error('V16.5 original sole scanner missing');
 return {g,pos,j,w,parent,bones,ibm,clips,edges,feet:old.sole,ground:old.groundY};
}
function deform(a,clip,frame){
 const {g,pos,j,w,parent,bones,ibm}=a,t=frame*clip.duration/N;
 const local=g.nodes.map(n=>({t:n.baseT,q:n.baseQ,s:n.baseS}));
 for(const ch of clip.channels){if(ch.path==='rotation')local[ch.node].q=sample(ch.sam,t,4);
  if(ch.path==='translation')local[ch.node].t=sample(ch.sam,t,3);
  if(ch.path==='scale')local[ch.node].s=sample(ch.sam,t,3);}
 const world=[];function nodeWorld(i){if(world[i])return world[i];
  const n=g.nodes[i],tr=local[i],m=n.useMatrix?new Float64Array(n.matrix):trs(tr.t,tr.q,tr.s);
  world[i]=parent[i]<0?m:mul(nodeWorld(parent[i]),m);return world[i];}
 const bone=bones.map((i,k)=>mul(nodeWorld(i),ibm[k])),coords=new Float32Array(pos.length);
 for(let i=0;i<pos.length/3;i++){
  let X=0,Y=0,Z=0,sum=0;const p=3*i,u=4*i,x=pos[p],y=pos[p+1],z=pos[p+2];
  for(let k=0;k<4;k++){const weight=w[u+k];if(weight<.00001)continue;
   const m=bone[j[u+k]];if(!m)throw Error('Skin joint mismatch');
   X+=weight*(m[0]*x+m[4]*y+m[8]*z+m[12]);
   Y+=weight*(m[1]*x+m[5]*y+m[9]*z+m[13]);
   Z+=weight*(m[2]*x+m[6]*y+m[10]*z+m[14]);sum+=weight;
  }if(sum<.001)throw Error('Skin weight missing at vertex '+i);
  coords[p]=ok(X,'x');coords[p+1]=ok(Y,'y');coords[p+2]=ok(Z,'z');
 }
 return coords;
}
function run(onProgress){
 if(state.status==='running')return Promise.reject(Error('Already auditing'));
 state.status='running';state.progress=0;state.result=null;state.error=null;
 let setup;try{setup=prepare();}catch(e){state.status='error';state.error=String(e);return Promise.reject(e);}
 const stats={};
 for(const key of Object.keys(names)){
  stats[key]={feet:Object.fromEntries(Object.keys(setup.feet).map(k=>[k,{minY:Infinity,maxY:-Infinity,
   worstPenetration:0,worstToePenetration:0,worstHeelPenetration:0,maxToeHeelHeightDifference:0,maxStanceVerticalError:0,maxStanceHorizontalDelta:0,maxCorrectedStanceSlip:0,stanceSamples:0,nearGround:0,samples:[]}]))};
  stats[key].edge={fore:new Float64Array(setup.edges.fore.length),hind:new Float64Array(setup.edges.hind.length)};
 }
 let step=0;
 return new Promise((resolve,reject)=>{
  function tick(){try{
   for(let finish=Math.min(8*N,step+2);step<finish;step++){
    const key=Object.keys(names)[Math.floor(step/N)],frame=step%N,clip=setup.clips[key],coords=deform(setup,clip,frame),s=stats[key];
    for(const region of ['fore','hind'])setup.edges[region].forEach(([a,b,base],i)=>{
     const v=Math.hypot(coords[a]-coords[b],coords[a+1]-coords[b+1],coords[a+2]-coords[b+2])/base;
     if(v>s.edge[region][i])s.edge[region][i]=v;
    });
    for(const [name,config] of Object.entries(setup.feet)){
     const f=s.feet[name],verts=[config.contactVertex,config.frontVertex,config.backVertex];
      if(verts.some(x=>!Number.isInteger(x)||x<0||x>=coords.length/3))throw Error('Sole vertex reference invalid: '+name);
     const contactY=coords[config.contactVertex*3+1],toeY=coords[config.frontVertex*3+1],heelY=coords[config.backVertex*3+1];
      const minY=Math.min(contactY,toeY,heelY);
      f.worstToePenetration=Math.max(f.worstToePenetration,Math.max(0,setup.ground-toeY));
      f.worstHeelPenetration=Math.max(f.worstHeelPenetration,Math.max(0,setup.ground-heelY));
      f.maxToeHeelHeightDifference=Math.max(f.maxToeHeelHeightDifference,Math.abs(toeY-heelY));
     const z=coords[config.contactVertex*3+2];
     const modeId=key.endsWith('Old')?key.slice(0,-3):key,
      setupMode=window.__horseV167Builder.configs[modeId],
       p=((frame/N-setupMode.touch[name])%1+1)%1,
       kind=name.startsWith('Fore')?'fore':'hind',
       stanceDuration=setupMode.stance[kind],
       phase={stance:p<stanceDuration};
     const u=Math.min(1,Math.max(0,p/stanceDuration)),a=.10,den=1-a;
     const relativeProgress=u<a?u*u/(2*a*den):u>1-a?1-(1-u)**2/(2*a*den):(u-a/2)/den;
     // A treadmill-relative proxy. NOT physical whole-horse displacement.
     const correctedZ=z+setupMode.stride[kind]*relativeProgress;
     f.minY=Math.min(f.minY,minY);f.maxY=Math.max(f.maxY,minY);
     f.worstPenetration=Math.max(f.worstPenetration,Math.max(0,setup.ground-minY));
     if(phase.stance){f.stanceSamples++;f.maxStanceVerticalError=Math.max(f.maxStanceVerticalError,Math.abs(minY-setup.ground));
       if(f.samples.length){const prev=f.samples.at(-1);if(prev.frame===frame-1&&prev.stance){
        f.maxStanceHorizontalDelta=Math.max(f.maxStanceHorizontalDelta,Math.abs(z-prev.z));
        f.maxCorrectedStanceSlip=Math.max(f.maxCorrectedStanceSlip,Math.abs(correctedZ-prev.correctedZ));
       }}}
     if(Math.abs(minY-setup.ground)<.012)f.nearGround++;
     f.samples.push({frame,stance:phase.stance,y:minY,toeY,heelY,contactY,z,correctedZ});
    }
   }
   state.progress=step/(8*N);if(onProgress)onProgress(state.progress);
   if(step<8*N){setTimeout(tick,0);return;}
   for(const s of Object.values(stats))for(const region of ['fore','hind']){
    const v=Array.from(s.edge[region]).sort((a,b)=>a-b);
    s.edge[region]={max:v.at(-1),p99:v[Math.floor((v.length-1)*.99)],above1_5:v.filter(x=>x>1.5).length};
   }
   const summary=Object.fromEntries(Object.entries(stats).map(([key,s])=>[key,{edge:s.edge,
    feet:Object.fromEntries(Object.entries(s.feet).map(([name,f])=>[name,{minY:f.minY,maxY:f.maxY,
     worstPenetration:f.worstPenetration,worstToePenetration:f.worstToePenetration,
      worstHeelPenetration:f.worstHeelPenetration,maxToeHeelHeightDifference:f.maxToeHeelHeightDifference,
      maxStanceVerticalError:f.maxStanceVerticalError,
     maxStanceHorizontalDeltaPerFrame:f.maxStanceHorizontalDelta,maxTravelCorrectedStanceSlip:f.maxCorrectedStanceSlip,stanceSamples:f.stanceSamples,nearGround:f.nearGround,
     sampleFrames:f.samples.filter(x=>x.frame%20===0),allFrames:f.samples}]))}]));
   state.result={framesPerClip:N,candidateSamples:4*N,totalSkinSamples:8*N,bodyVertices:24314,edgeCohorts:{fore:3107,hind:2932},
    modes:summary,sourceGLBIntact:true,
    physicalContactProven:false,gpuVisualVerified:false,bodyPitchRollYaw:'Existing Torso rotations included in CPU skinning',referenceState:'Each gait uses its own reference contact phases; not calibrated locomotion data'};
   state.status='finished';window.__horseV168Experiment.geometryQA=true;resolve(state.result);
  }catch(e){state.status='error';state.error=String(e?.message||e);reject(e);}}
  setTimeout(tick,0);
 });
}
})();