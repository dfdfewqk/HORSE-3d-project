/* HORSE RANCH V13.9b: deterministic 160-frame GLB skin QA.
 * No changes to GLB/poses/skin/animation. Not hoof contact or GPU validation.
 */
(function(){'use strict';
 const N=160,foot={HindR:890,HindL:3696,ForeR:984,ForeL:3790};
 const names={V135:'Gallop_V13_5_HIND_HOCK_FOLD',
  V137b:'Gallop_V13_7_INTEGRATED_CANDIDATE',
  V138:'Gallop_V13_8_WHOLE_BODY_BALANCE_CANDIDATE',
  V139:'Gallop_V13_9_SUPPORT_BALANCE_CANDIDATE',
  V14Cruise:'Gallop_V14_CRUISE', V14Fast:'Gallop_V14_FAST', V14Sprint:'Gallop_V14_SPRINT'};
 const state={status:'idle',progress:0,result:null,error:null,run};
 window.__horseV14SkinAudit=state;
 function ok(x,label){if(!Number.isFinite(x))throw Error('Non-finite '+label);return x;}
 function mul(a,b){const o=new Float64Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;
   for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];o[c*4+r]=ok(v,'matrix');}
  return o;}
 // glTF matrices are COLUMN MAJOR; four rows and columns, no missing 3x3 row.
 function trs(t,q,s){const [x,y,z,w]=q,[sx,sy,sz]=s;
  const xx=2*x*x,yy=2*y*y,zz=2*z*z,xy=2*x*y,xz=2*x*z,yz=2*y*z,wx=2*w*x,wy=2*w*y,wz=2*w*z;
  return Float64Array.from([(1-yy-zz)*sx,(xy+wz)*sx,(xz-wy)*sx,0,
   (xy-wz)*sy,(1-xx-zz)*sy,(yz+wx)*sy,0,
   (xz+wy)*sz,(yz-wx)*sz,(1-xx-yy)*sz,0,t[0],t[1],t[2],1].map(v=>ok(v,'TRS')));}
 function sample(s,t,n){const times=s.times,data=s.data,interpolation=s.interpolation;
  if(!times?.length||!data?.length)throw Error('Empty animation sampler');
  let lo=0,hi=times.length-1;while(lo<hi){const m=(lo+hi)>>1;
   if(times[m]<t)lo=m+1;else hi=m;}
  const b=lo,a=times[b]<t?b:Math.max(0,b-1);
  const f=times[b]===times[a]?0:Math.max(0,Math.min(1,(t-times[a])/(times[b]-times[a])));
  const stride=interpolation==='CUBICSPLINE'?n*3:n,shift=interpolation==='CUBICSPLINE'?n:0,out=[];
  for(let j=0;j<n;j++){let v1=data[a*stride+shift+j],v2=data[b*stride+shift+j];
   out.push(ok(v1+(v2-v1)*(interpolation==='STEP'?0:f),'sample'));}
  if(n===4){let l=Math.hypot(...out);if(l<1e-10)throw Error('Zero quaternion');return out.map(v=>v/l);}
  return out;}
 function prepare(){
  const g=object3d;
  if(!g?.doc?.meshes?.[0]?.primitives?.[0]||g.skins?.[0]?.joints?.length!==19)
   throw Error('Expected original GLB and 19-joint skin');
  if(!window.__horseGaitV139?.ready||!window.__horseV14?.ready||!window.__horseGaitV12?.hindRegionProtectedV134||
     window.__horseGaitV12?.belly?.corrected!==440)throw Error('V13.9/V13.4 are not ready');
  const raw=g.doc.meshes[0].primitives[0],at=raw.attributes;
  const pos=readAccessor(g,at.POSITION),j=readAccessor(g,at.JOINTS_0),
   w=readAccessor(g,at.WEIGHTS_0),idx=readAccessor(g,raw.indices);
  const count=pos.length/3,limbNames=g.skins[0].joints.map(id=>g.doc.nodes[id].name);
  if(count!==24314)throw Error('Unexpected body vertex count '+count);
  const inRegion={hind:new Uint8Array(count),fore:new Uint8Array(count)};
  for(let i=0;i<count;i++){let h=0,f=0;
   for(let k=0;k<4;k++){const name=limbNames[j[i*4+k]],weight=w[i*4+k];
    ok(weight,'skin weight');if(!name)throw Error('Missing skin joint name');
    if(name.startsWith('Hind'))h+=weight;if(name.startsWith('Fore'))f+=weight;}
   inRegion.hind[i]=h>.5&&pos[3*i+1]<.95&&pos[3*i+2]<-3.1?1:0;
   inRegion.fore[i]=f>.5&&pos[3*i+1]<.95&&pos[3*i+2]>-2.8?1:0;}
  const edges={hind:[],fore:[]},seen=new Set();
  for(let k=0;k<idx.length;k+=3){
   for(const [x,y] of [[idx[k],idx[k+1]],[idx[k+1],idx[k+2]],[idx[k+2],idx[k]]]){
    const a=Math.min(x,y),b=Math.max(x,y),id=a*count+b;
    if(seen.has(id))continue;seen.add(id);
    const A=3*a,B=3*b,d=Math.hypot(pos[A]-pos[B],pos[A+1]-pos[B+1],pos[A+2]-pos[B+2]);
    if(d<.008||d>.12)continue;
    for(const region of ['hind','fore'])if(inRegion[region][a]&&inRegion[region][b])
     edges[region].push([A,B,d]);
   }
  }
  if(edges.hind.length!==2932||edges.fore.length!==3107)
   throw Error('Mismatched edge cohorts '+edges.hind.length+'/'+edges.fore.length);
  const parents=new Int16Array(g.doc.nodes.length).fill(-1);
  g.doc.nodes.forEach((node,i)=>(node.children||[]).forEach(ch=>parents[ch]=i));
  const joints=g.skins[0].joints,bind=joints.map((_,i)=>g.skins[0].ibms.subarray(i*16,(i+1)*16));
  const clips=Object.entries(names).map(([key,name])=>{
   const clip=g.animations.find(x=>x.name===name);
   if(!clip||clip.channels.length!==19||clip.duration<=0)throw Error('Missing clip '+name);
   return{key,clip};
  });
  return {g,pos,j,w,count,edges,parents,joints,bind,clips};
 }
 function deform(a,clip,frame){
  const {g,pos,j,w,count,parents,joints,bind}=a,time=clip.duration*frame/N;
  const local=g.nodes.map(n=>({t:n.baseT,q:n.baseQ,s:n.baseS}));
  for(const ch of clip.channels){const target=local[ch.node];
   if(ch.path==='rotation')target.q=sample(ch.sam,time,4);
   else if(ch.path==='translation')target.t=sample(ch.sam,time,3);
   else if(ch.path==='scale')target.s=sample(ch.sam,time,3);}
  const world=[];
  function nodeWorld(i){if(world[i])return world[i];const n=g.nodes[i],p=parents[i],t=local[i];
   const m=n.useMatrix?new Float64Array(n.matrix):trs(t.t,t.q,t.s);
   world[i]=p<0?m:mul(nodeWorld(p),m);return world[i];}
  // World-space skin matrix = joint world * inverse bind; mesh world cancels
  // as in the viewer's mesh-local skin followed by mesh world transform.
  const bone=joints.map((id,i)=>mul(nodeWorld(id),bind[i]));
  const coords=new Float32Array(pos.length);
  for(let i=0;i<count;i++){const k=3*i,u=4*i,x=pos[k],y=pos[k+1],z=pos[k+2];let X=0,Y=0,Z=0,total=0;
   for(let n=0;n<4;n++){const weight=w[u+n];if(weight<.00001)continue;
    const m=bone[j[u+n]];if(!m)throw Error('Bad bone index at vertex '+i);
    X+=weight*(m[0]*x+m[4]*y+m[8]*z+m[12]);
    Y+=weight*(m[1]*x+m[5]*y+m[9]*z+m[13]);
    Z+=weight*(m[2]*x+m[6]*y+m[10]*z+m[14]);total+=weight;}
   if(total<.001)throw Error('Missing weights at vertex '+i);
   coords[k]=ok(X,'skinned X');coords[k+1]=ok(Y,'skinned Y');coords[k+2]=ok(Z,'skinned Z');
  }return coords;}
 function run(progress){
  if(state.status==='running')return Promise.reject(Error('Already running'));
  state.status='running';state.progress=0;state.result=null;state.error=null;
  return new Promise((resolve,reject)=>{
   let a;try{a=prepare();}catch(err){state.status='error';state.error=String(err.message||err);reject(err);return;}
   const data={};
   for(const {key} of a.clips){data[key]={maxSkin:{},footProxy:{}};
    for(const id of Object.keys(foot))data[key].footProxy[id]={minY:Infinity,frame:-1};
    data[key].values={hind:new Float64Array(a.edges.hind.length),fore:new Float64Array(a.edges.fore.length)};}
   let step=0,total=a.clips.length*N;
   function tick(){try{
    for(const stop=Math.min(total,step+2);step<stop;step++){
     const v=a.clips[Math.floor(step/N)],frame=step%N,r=data[v.key],coords=deform(a,v.clip,frame);
     for(const region of ['hind','fore'])a.edges[region].forEach(([A,B,d],i)=>{
      const ratio=Math.hypot(coords[A]-coords[B],coords[A+1]-coords[B+1],coords[A+2]-coords[B+2])/d;
      ok(ratio,'edge '+v.key+' '+region);if(ratio>r.values[region][i])r.values[region][i]=ratio;
     });
     for(const [id,vertex] of Object.entries(foot)){
      const y=coords[vertex*3+1],p=r.footProxy[id];
      if(y<p.minY){p.minY=y;p.frame=frame;}
     }
    }
    state.progress=step/total;if(progress)progress(state.progress);
    if(step<total)return setTimeout(tick,0);
    for(const {key} of a.clips)for(const region of ['hind','fore']){
     const vals=Array.from(data[key].values[region]).sort((x,y)=>x-y);
     data[key].maxSkin[region]={max:vals.at(-1),p99:vals[Math.floor(.99*(vals.length-1))],
      above1_5:vals.filter(x=>x>1.5).length};
    }
    if(Math.abs(data.V135.maxSkin.hind.max-1.32234)>.003||
       Math.abs(data.V135.maxSkin.fore.max-1.69887)>.003)
      throw Error('Former V13.5 baseline was not reproduced');
    for(const v of Object.values(data))delete v.values;
    state.result={framesPerClip:N,bodyVertices:a.count,cohorts:{hind:2932,fore:3107},
     correctedBelly:440,versions:data,numericVerified:true,
     gpuVerified:false,hoofGroundContactVerified:false,readyForMain:false};
    state.status='finished';resolve(state.result);
   }catch(err){state.status='error';state.error=String(err.message||err);reject(err);}}
   setTimeout(tick,0);
  });
 }
})();