/* HORSE RANCH V17.1 — contact-constrained 19-bone animation.
 * Preserves the model buffers. Cached clips are fingerprint-checked.
 * Skin stretch remains a separate, mandatory acceptance criterion.
 */
(function(){'use strict';
const scriptURL=typeof document!=='undefined'?document.currentScript?.src:null;
const bakedData=scriptURL?fetch(new URL('contact-clips.json',scriptURL)).then(r=>r.ok?r.json():null).catch(()=>null):Promise.resolve(null);

const N=160,PI=Math.PI,TAU=2*PI,RAD=PI/180,
 FEET=['HindR','ForeR','HindL','ForeL'],MODES=['walk','cruise','fast','sprint'],
 clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),frac=x=>((x%1)+1)%1,
 ease=v=>{let t=clamp(v,0,1);return t*t*(3-2*t);};
function multiply(a,b){
 const c=new Float64Array(16);
 for(let col=0;col<4;col++)for(let row=0;row<4;row++)
  for(let k=0;k<4;k++)c[col*4+row]+=a[k*4+row]*b[col*4+k];
 return c;
}
function localMatrix(t,q,s){
 const [x,y,z,w]=q,[sx,sy,sz]=s,xx=2*x*x,yy=2*y*y,zz=2*z*z,
 xy=2*x*y,xz=2*x*z,yz=2*y*z,wx=2*w*x,wy=2*w*y,wz=2*w*z;
 return Float64Array.from([(1-yy-zz)*sx,(xy+wz)*sx,(xz-wy)*sx,0,
 (xy-wz)*sy,(1-xx-zz)*sy,(yz+wx)*sy,0,
 (xz+wy)*sz,(yz-wx)*sz,(1-xx-yy)*sz,0,t[0],t[1],t[2],1]);
}
function qmultiply(a,b){
 const [x,y,z,w]=a,[u,v,k,h]=b;
 const t=[w*u+x*h+y*k-z*v,w*v-x*k+y*h+z*u,w*k+x*v-y*u+z*h,w*h-x*u-y*v-z*k];
 const norm=Math.hypot(...t);if(norm<1e-9)throw Error('Zero quaternion');
 return t.map(n=>n/norm);
}
function xdelta(a){return [Math.sin(a*.5),0,0,Math.cos(a*.5)];}
function copyPose(g,clip,i,sampler){
 const state=g.nodes.map(n=>({t:Array.from(n.baseT),q:Array.from(n.baseQ),s:Array.from(n.baseS)}));
 for(const ch of clip.channels){
  const x=sampler.sample(ch.sam,clip.duration*i/N,ch.path==='rotation'?4:3);
  state[ch.node][ch.path==='rotation'?'q':ch.path==='translation'?'t':'s']=x;
 }
 return state;
}
function scanner(g,builder){
 const mesh=g.doc.meshes[0].primitives[0],a=mesh.attributes,doc=g.doc.nodes,
  skin=g.skins[0],pos=readAccessor(g,a.POSITION),ji=readAccessor(g,a.JOINTS_0),
  weight=readAccessor(g,a.WEIGHTS_0),indices=readAccessor(g,mesh.indices),
  parents=new Int16Array(doc.length).fill(-1);
 doc.forEach((n,i)=>(n.children||[]).forEach(k=>parents[k]=i));
 if(skin.joints.length!==19||pos.length!==24314*3)throw Error('Unexpected source GLB topology');
 const original=window.__horseV16Targets?.collect(g);
 if(!original?.feet||!Number.isFinite(original.floor))throw Error('Real hoof detector unavailable');
 const chains=Object.fromEntries(FEET.map(name=>[name,builder.chains[name].map(n=>{
  const i=doc.findIndex(x=>x.name===n);if(i<0)throw Error('Missing '+n);return i;
 })]));
 const namedJoints=skin.joints.map(id=>doc[id].name);
 const localEdges={};
 for(const leg of FEET){
  const important=new Set(namedJoints.map((n,i)=>n.startsWith(leg+'_')?i:-1).filter(i=>i>=0));
  const affected=i=>{
   let sum=0;for(let k=0;k<4;k++)if(important.has(ji[i*4+k]))sum+=weight[i*4+k];return sum;
  };
  const pts=[],seen=new Set();
  for(let i=0;i<indices.length;i+=3){
   for(const [u,v] of [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]){
    const x=Math.min(u,v),y=Math.max(u,v),key=x*24314+y;
    if(seen.has(key))continue;seen.add(key);
    const width=Math.abs(pos[x*3]-original.feet[leg].ref[0]),
     distance=Math.abs(pos[y*3]-original.feet[leg].ref[0]);
    if(width>.33||distance>.33||Math.max(affected(x),affected(y))<.35||
      Math.min(affected(x),affected(y))<.08)continue;
    const len=Math.hypot(pos[x*3]-pos[y*3],pos[x*3+1]-pos[y*3+1],pos[x*3+2]-pos[y*3+2]);
    if(len>.008&&len<.12)pts.push([x,y,len]);
   }
  }
  if(pts.length<20)throw Error('Missing skinned limb edge cohort: '+leg);
  const chosen=32;
  localEdges[leg]=Array.from({length:Math.min(chosen,pts.length)},
   (_,i)=>pts[Math.floor(i*pts.length/Math.min(chosen,pts.length))]);
 }
 function matrices(p){
  const world=new Array(doc.length);
  function transform(id){
   if(world[id])return world[id];
   const n=g.nodes[id],s=p[id],m=n.useMatrix?n.matrix:localMatrix(s.t,s.q,s.s);
   world[id]=parents[id]<0?m:multiply(transform(parents[id]),m);
   return world[id];
  }
  return skin.joints.map((id,k)=>multiply(transform(id),skin.ibms.subarray(k*16,k*16+16)));
 }
 function vertex(index,m){
  const i=3*index,j=4*index,x=pos[i],y=pos[i+1],z=pos[i+2];let X=0,Y=0,Z=0;
  for(let k=0;k<4;k++){
   const w=weight[j+k];if(w<.000001)continue;
   const t=m[ji[j+k]];
   X+=w*(t[0]*x+t[4]*y+t[8]*z+t[12]);
   Y+=w*(t[1]*x+t[5]*y+t[9]*z+t[13]);
   Z+=w*(t[2]*x+t[6]*y+t[10]*z+t[14]);
  }
  return [X,Y,Z];
 }
 function foot(p,leg,skin=false){
  const m=matrices(p),info=original.feet[leg],
   contacts=[info.contactVertex,info.frontVertex,info.backVertex].map(i=>vertex(i,m));
  let skinStretch=1;
  if(skin){
   let upper=0;
   for(const [u,v,len] of localEdges[leg]){
    const a=vertex(u,m),b=vertex(v,m);
    const ratio=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])/len;
    upper=Math.max(upper,ratio);
   }
   skinStretch=upper;
  }
  const sole=info.sole.map(i=>vertex(i,m));
  return {x:contacts[0][0],y:Math.min(...sole.map(x=>x[1])),z:contacts[0][2],
   toe:contacts[1][1],heel:contacts[2][1],skinStretch};
 }
 let signature=2166136261;
 for(const array of [pos,ji,weight,skin.ibms]){const canonical=Float32Array.from(array,v=>v===0?0:v);for(const byte of new Uint8Array(canonical.buffer)){signature^=byte;signature=Math.imul(signature,16777619)>>>0;}}
 return {signature:signature.toString(16),original,chains,foot,matrices,vertex,localEdges,torso:doc.findIndex(n=>n.name==='Torso'),
  neck:doc.findIndex(n=>n.name==='Neck'),head:doc.findIndex(n=>n.name==='Head'),floor:original.floor};
}
const policy=window.__horseV171Contact;
const limits={fore:[[-1.2,.85],[0,1.9],[-1.1,1.1]],hind:[[-1,.70],[-.25,1.25],[-1.20,.75],[-1,1]]};
const angle=q=>2*Math.atan2(q[0],q[3]);
function linear(A,b){const n=b.length,m=A.map((r,i)=>[...r,b[i]]);for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(m[i][k])>Math.abs(m[p][k]))p=i;[m[k],m[p]]=[m[p],m[k]];if(Math.abs(m[k][k])<1e-12)return b.map(()=>0);const d=m[k][k];for(let j=k;j<=n;j++)m[k][j]/=d;for(let i=0;i<n;i++)if(i!==k){const f=m[i][k];for(let j=k;j<=n;j++)m[i][j]-=f*m[k][j];}}return m.map(r=>r[n]);}
/* Real skinned sole residual; no bone translation, scaling or mesh edits. */
function solveFoot(p,leg,t,geom,iterations=24){
 const ids=geom.chains[leg],bounds=limits[leg.startsWith('Fore')?'fore':'hind'].map((b,k)=>t.previousAngles?[Math.max(b[0],t.previousAngles[k]-t.maxStep),Math.min(b[1],t.previousAngles[k]+t.maxStep)]:b);
 const preferred=t.preferredAngles||ids.map(id=>angle(p[id].q));let q=ids.map((id,k)=>clamp(angle(p[id].q),...bounds[k]));
 // A straight carpus is a singular IK seed. Start on the flexion branch
 // when the foot must rise, instead of extending the knee backwards.
 if(leg.startsWith('Fore')&&q[1]<.3&&t.y>geom.foot(p,leg).y+.005){const bend=.4-q[1];q[1]=.4;q[0]-=bend*.4;q[2]-=bend*.6;}
 if(t.previousAngles)q=q.map((v,k)=>clamp(v,...bounds[k]));
 const apply=a=>ids.forEach((id,k)=>p[id].q=xdelta(a[k]));
 const residual=()=>{const f=geom.foot(p,leg);return [t.y-f.y,t.z-f.z,(t.orientationWeight??0.025)*(preferred[ids.length-1]-angle(p[ids[ids.length-1]].q))];};
 apply(q);let r=residual(),cost=r.reduce((a,v)=>a+v*v,0);
 for(let iteration=0;iteration<iterations;iteration++){
  if(Math.hypot(r[0],r[1])<.0005&&Math.abs(r[2])<.001)break;
  const J=ids.map((id,k)=>{const a=q.slice();a[k]+=.0005;apply(a);const d=residual();return d.map((x,j)=>(r[j]-x)/.0005);});apply(q);
  const damping=.00004,A=ids.map((_,i)=>ids.map((_,j)=>J[i].reduce((v,x,k)=>v+x*J[j][k],0)+(i===j?damping:0))),b=ids.map((_,i)=>J[i].reduce((v,x,k)=>v+x*r[k],0));
  let delta=linear(A,b);
  for(let k=0;k<ids.length;k++)if((q[k]<=bounds[k][0]+1e-6&&delta[k]<0)||(q[k]>=bounds[k][1]-1e-6&&delta[k]>0)){for(let j=0;j<ids.length;j++){A[k][j]=0;A[j][k]=0;}A[k][k]=1;b[k]=0;}
  delta=linear(A,b);const trust=Math.min(1,.15/Math.max(...delta.map(Math.abs)));let improved=false;
  for(const scale of [1,.5,.2,.05,.01]){const candidate=q.map((v,k)=>clamp(v+delta[k]*trust*scale,...bounds[k]));apply(candidate);const next=residual(),c=next.reduce((a,v)=>a+v*v,0);
   if(c<cost){q=candidate;r=next;cost=c;improved=true;break;}
  }
  if(!improved){
   for(const step of [.03,.008,.002])for(let k=0;k<ids.length;k++)for(const dir of [-1,1]){const a=q.slice();a[k]=clamp(a[k]+step*dir,...bounds[k]);apply(a);const next=residual(),c=next.reduce((v,x)=>v+x*x,0);if(c<cost){q=a;r=next;cost=c;improved=true;}}
   if(!improved){apply(q);break;}
  }
 }
 apply(q);return Math.hypot(r[0],r[1]);
}
function phasePose(g,mode,phase,builder,geom){
 const c=policy.configs[mode],base=g.animations.find(a=>a.name===builder.configs[mode].name);
 const p=g.nodes.map(n=>({t:Array.from(n.baseT),q:Array.from(n.baseQ),s:Array.from(n.baseS)}));
 for(const ch of base.channels){const v=policy.sample(ch.sam,base.duration*phase,ch.path==='rotation'?4:3);p[ch.node][ch.path==='rotation'?'q':ch.path==='translation'?'t':'s']=v;}
 // Retiming the whole limb keeps the source recovery coordination when duty changes.
 for(const leg of FEET){const state=policy.state(mode,leg,phase),old=builder.configs[mode],d=old.stance[state.kind],oldPhase=policy.frac(old.touch[leg]+(state.stance?state.u*d:d+state.u*(1-d)));
  for(const id of geom.chains[leg]){const ch=base.channels.find(x=>x.node===id&&x.path==='rotation');p[id].q=policy.sample(ch.sam,oldPhase*base.duration,4);}
 }
 // Replace accumulated legacy root offsets with a single support-based body prior.
 const weights=FEET.map(leg=>{const st=policy.state(mode,leg,phase);return st.stance?Math.sin(Math.PI*st.u)**2:0;}),front=weights[1]+weights[3],hind=weights[0]+weights[2];
 p[geom.torso].t=Array.from(g.nodes[geom.torso].baseT);
 p[geom.torso].t[1]-=mode==='walk'?.025:.045;
 p[geom.torso].t[1]+=(mode==='walk'?.006:.018)*(1-Math.min(1,(front+hind)/1.5));
 p[geom.torso].q=xdelta((mode==='walk'?.008:.024)*(front-hind));
 return p;
}
function targetsFor(mode,phase,geom){return Object.fromEntries(FEET.map(l=>[l,policy.target(mode,l,phase,geom.original.feet[l].restZ,geom.floor)]));}
function solvePose(p,targets,geom,outer=3){
 let residual=0;
 for(let pass=0;pass<outer;pass++){
  for(const leg of FEET)solveFoot(p,leg,targets[leg],geom);
  if(pass===outer-1)break;
  const stance=FEET.filter(l=>targets[l].stance);
  if(stance.length){const error=stance.reduce((sum,l)=>sum+targets[l].y-geom.foot(p,l).y,0)/stance.length;
   // Signed, bounded body correction; always followed by another limb solve.
   p[geom.torso].t[1]+=clamp(error*.65,-.012,.012);
  }
 }
 for(const leg of FEET){const f=geom.foot(p,leg),t=targets[leg];residual=Math.max(residual,Math.hypot(f.y-t.y,f.z-t.z));}
 return residual;
}
function bake(g,mode,builder,geom){
 const c=policy.configs[mode],base=g.animations.find(a=>a.name===builder.configs[mode].name),frames=[],allTargets=[];let worst=0;
 let previous=null;
 // Warm-start around the closed cycle so IK keeps the same bend solution.
 for(let lap=0;lap<2;lap++)for(let i=0;i<N;i++){
  const p=phasePose(g,mode,i/N,builder,geom),targets=targetsFor(mode,i/N,geom);
  for(const leg of FEET)targets[leg].preferredAngles=geom.chains[leg].map(id=>angle(p[id].q));allTargets[i]=targets;
  if(previous)for(const leg of FEET)for(const id of geom.chains[leg]){const a=angle(previous[id].q),b=angle(p[id].q);p[id].q=xdelta(.95*a+.05*b);}
  solvePose(p,allTargets[i],geom);frames[i]=p;previous=p;
 }
 // Smooth the null-space choice, then reproject contact constraints, never the reverse.
 for(let pass=0;pass<3;pass++){
  const values=frames.map(p=>p.map(n=>angle(n.q)));
  for(let i=0;i<N;i++){for(const leg of FEET)for(const id of geom.chains[leg])frames[i][id].q=xdelta(.25*values[(i+N-1)%N][id]+.5*values[i][id]+.25*values[(i+1)%N][id]);
   solvePose(frames[i],allTargets[i],geom,1);
  }
 }
 for(let i=0;i<N;i++)for(const leg of FEET){const f=geom.foot(frames[i],leg),t=targetsFor(mode,i/N,geom)[leg];worst=Math.max(worst,Math.hypot(f.y-t.y,f.z-t.z));}
 // A closing key eliminates the previous last-sample hold at duration.
 frames.push(frames[0]);const times=Float32Array.from({length:N+1},(_,i)=>c.period*i/N);
 const channels=base.channels.map(ch=>{const dim=ch.path==='rotation'?4:3,key=ch.path==='rotation'?'q':ch.path==='translation'?'t':'s',data=new Float32Array((N+1)*dim);for(let i=0;i<=N;i++)data.set(frames[i][ch.node][key],i*dim);return {node:ch.node,path:ch.path,sam:{times,data,interpolation:'LINEAR'}};});
 return {clip:{name:'V17_1_'+mode.toUpperCase()+'_CONTACT_IK',duration:c.period,channels},stats:{mode,method:'world-anchor-skinned-contact-IK',period:c.period,phasePhases:N,contactFootIds:FEET,referenceJointCount:19,originalSkinPreserved:true,rigExtended:false,aerialIntervals:policy.aerial(mode),maxTargetResidualMm:worst*1000,approved:false}};
}
let count=0;
const wait=setInterval(async()=>{
 if(!window.__horseV167?.ready||!window.__horseV171Bridge?.ready||!window.__viewerReady){if(++count>1000){clearInterval(wait);window.__horseV171Error='Runtime unavailable';}return;}
 clearInterval(wait);
 try{const g=object3d,builder=window.__horseV167Builder,geom=scanner(g,builder),results={};
  const cache=await bakedData;
  if(cache&&(cache.revision!==1||cache.signature!==geom.signature||JSON.stringify(cache.configs)!==JSON.stringify(policy.configs)))throw Error('Baked contact data mismatch: model '+geom.signature+' expected '+cache.signature+'; policy '+(JSON.stringify(cache.configs)===JSON.stringify(policy.configs)));
  for(const mode of MODES){const r=cache?cache.modes[mode]:bake(g,mode,builder,geom),index=g.animations.length;
   if(!r?.clip||r.clip.channels.length!==19)throw Error('Missing contact clip '+mode);
   for(const ch of r.clip.channels){ch.sam.times=Float32Array.from(ch.sam.times);ch.sam.data=Float32Array.from(ch.sam.data);}g.animations.push(r.clip);window.__horseV171Bridge.register(mode,index);results[mode]={index,...r.stats};}
  window.__horseV171={ready:true,version:'V17.1',results,geometry:geom,rebuild:()=>({revision:1,signature:geom.signature,configs:policy.configs,modes:Object.fromEntries(MODES.map(m=>[m,bake(g,m,builder,geom)]))}),targetsFor:(m,p)=>targetsFor(m,p,geom),solvePose:(p,t,n=2)=>solvePose(p,t,geom,n),solveFoot:(p,l,t,n)=>solveFoot(p,l,t,geom,n),originalGlbPreserved:true,originalSkinPreserved:true,rigExtended:false,experimental:true};
 }catch(e){window.__horseV171Error=String(e.stack||e);console.error(e);}
},100);
})();
