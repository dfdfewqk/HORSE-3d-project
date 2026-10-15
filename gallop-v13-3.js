/* HORSE RANCH V13.3 — hind stifle pivot and inverse-bind correction.
 * Keeps the existing mesh, forelegs, abdomen, and every gait channel unchanged.
 * Root cause (19-bone WEB rig): stifle pivot ≈0.18 units ahead of its weighted skin region.
 * Unlike V13.2 angle-only clipping, this corrects the rotation centre AND its bind matrix.
 * Aborts without changes if the runtime model does not match the validated topology.
 */
(function(){'use strict';
const VERSION='V13.3_HIND_STIFLE_BIND_FIX', STRENGTH=.85;
const EPS=0.00001;
function eq(a,b,t=.035){return Math.abs(a-b)<=t;}
function length(v){return Math.hypot(...v);}
function copy(v){return Array.from(v);}
function tryInstall(){
 const g=object3d;
 if(!g || g.skins?.length!==1)throw Error('Expected 19-joint web model skin');
 const skin=g.skins[0],doc=g.doc,prims=doc.meshes?.[0]?.primitives;
 const part=prims?.[0], at=part?.attributes;
 if(!at || at.POSITION===undefined || at.WEIGHTS_0===undefined || at.JOINTS_0===undefined)
    throw Error('Body skin geometry not available');
 if(!skin.ibms || skin.joints.length!==19)throw Error('Unexpected skin bones or bind matrices');
 const names=skin.joints.map(n=>doc.nodes[n]?.name||'');
 const pos=readAccessor(g,at.POSITION),weights=readAccessor(g,at.WEIGHTS_0),joints=readAccessor(g,at.JOINTS_0);
 if(pos.length/3!==weights.length/4 || weights.length!==joints.length || pos.length/3<10000)
    throw Error('Unexpected mesh accessor dimensions');
 const parent=new Array(g.nodes.length).fill(-1);
 for(let i=0;i<g.nodes.length;i++)for(let c of g.nodes[i].children){if(parent[c]!==-1)throw Error('Multiple joint parents');parent[c]=i;}
 function originalRestPivot(id){const v=[0,0,0];const seen=new Set();
  for(let k=id;k!==-1;k=parent[k]){
   if(seen.has(k))throw Error('Bone hierarchy contains cycle');seen.add(k);
   const n=g.nodes[k];if(n.useMatrix || n.baseQ.some((x,i)=>Math.abs(x-(i===3?1:0))>EPS)||n.baseS.some(x=>!eq(x,1,EPS)))
    throw Error('Nontrivial bind rotations/scales; refusing unsafe translation-only patch');
   for(let axis=0;axis<3;axis++)v[axis]+=n.baseT[axis];
  }return v;
 }
 const meshNode=g.nodes.find(n=>n.mesh===0 && n.skin===0);
 if(!meshNode || length(originalRestPivot(meshNode.i))>.001)throw Error('Mesh is not at origin: unsupported bind frame');
 const plans=[];
 for(const side of ['L','R']){
  const s='Hind'+side+'_Stifle',h='Hind'+side+'_Hock';
  const si=names.indexOf(s),hi=names.indexOf(h),sn=skin.joints[si],hn=skin.joints[hi];
  if(si<0||hi<0 || !g.nodes[sn].children.includes(hn))throw Error('Hind chain not found: '+side);
  for(const clip of g.animations)for(const ch of clip.channels){
    if((ch.node===sn||ch.node===hn)&&ch.path==='translation')
      throw Error('Animated hind translation would override corrected pivot: '+clip.name);
  }
  const original=originalRestPivot(sn);
  const m=skin.ibms,o=si*16;
  for(let c=0;c<16;c++)if(!eq(m[o+c],(c%5===0)?1:((c===12||c===13||c===14)?-original[c-12]:0),.035))
    throw Error('Inverse-bind matrix does not match rest position: '+s);
  let sum=0,center=[0,0,0],count=0;
  for(let i=0;i<pos.length/3;i++){
   let w=0;for(let k=0;k<4;k++)if(joints[i*4+k]===si)w+=weights[i*4+k];
   if(w<.30)continue;
   sum+=w;count++;
   for(let k=0;k<3;k++)center[k]+=pos[i*3+k]*w;
  }
  if(count<25||count>1000||sum<15)throw Error('Not enough recognizable stifle skin vertices: '+side);
  center=center.map(x=>x/sum);
  const diff=center.map((x,k)=>x-original[k]);
  const discrepancy=length(diff);
  if(discrepancy<.10 || discrepancy>.31 || diff[2]>-.06 || Math.abs(diff[0])>.09)
    throw Error('Unexpected stifle skin/pivot offset '+s+': '+diff.map(x=>x.toFixed(3)).join(','));
  const delta=diff.map(x=>x*STRENGTH);
  const stifle=g.nodes[sn],hock=g.nodes[hn];
  if(stifle.useMatrix||hock.useMatrix)throw Error('Matrix-mode hind joint unsupported');
  plans.push({side,si,sn,hn,delta,original,center,discrepancy,count});
 }
 const [L,R]=plans;
 if(!eq(L.delta[1],R.delta[1],.04)||!eq(L.delta[2],R.delta[2],.04)||!eq(L.delta[0],-R.delta[0],.04))
   throw Error('Asymmetrical hind bind geometry: refusing correction');
 const originals=plans.map(p=>({sn:p.sn,hn:p.hn,
    st:copy(g.nodes[p.sn].baseT), ht:copy(g.nodes[p.hn].baseT),
    liveSt:copy(g.nodes[p.sn].t),liveHt:copy(g.nodes[p.hn].t),
    docSt:copy(doc.nodes[p.sn].translation),docHt:copy(doc.nodes[p.hn].translation),
    ibm:copy(skin.ibms.subarray(p.si*16,p.si*16+16))}));
 try{
  for(const p of plans){
   const a=g.nodes[p.sn],b=g.nodes[p.hn];
   for(let k=0;k<3;k++){
    a.baseT[k]+=p.delta[k];a.t[k]+=p.delta[k];
    b.baseT[k]-=p.delta[k];b.t[k]-=p.delta[k];
    doc.nodes[p.sn].translation[k]=a.baseT[k];doc.nodes[p.hn].translation[k]=b.baseT[k];
    skin.ibms[p.si*16+12+k]-=p.delta[k];
   }
  }
  for(const p of plans){
   const st=originalRestPivot(p.sn),hk=originalRestPivot(p.hn);
   for(let k=0;k<3;k++){
    if(!eq(st[k],p.original[k]+p.delta[k],.0002))throw Error('Stifle rest update mismatch');
    if(!eq(-skin.ibms[p.si*16+12+k],st[k],.0002))throw Error('Inverse bind not synchronized');
    if(!eq(hk[k],originals[plans.indexOf(p)].st[k]+originals[plans.indexOf(p)].ht[k]+originalRestPivot(parent[p.sn])[k],.0002))
      throw Error('Hock rest origin drift detected');
   }
  }
 }catch(e){for(let k=0;k<plans.length;k++){
   const p=plans[k],o=originals[k],a=g.nodes[p.sn],b=g.nodes[p.hn];
   a.baseT=o.st;a.t=o.liveSt;b.baseT=o.ht;b.t=o.liveHt;
   doc.nodes[p.sn].translation=o.docSt;doc.nodes[p.hn].translation=o.docHt;
   skin.ibms.set(o.ibm,p.si*16);
  }throw e;}
 const results=plans.map(p=>({side:p.side,skinVertices:p.count,
   pivotBefore:p.original.map(x=>+x.toFixed(4)),skinCentre:p.center.map(x=>+x.toFixed(4)),
   pivotShift:p.delta.map(x=>+x.toFixed(4))}));
 window.__horseGaitV13_3={ready:true,fix:VERSION,correctedJoints:2,bindMatrices:2,
     correctedWeights:0,existingGaitTracksUnchanged:true,frontUnchanged:true,bellyUnchanged:true,
     results,source:'existing 19-bone web rig',verifiedOnUserGPU:false};
 document.title='HORSE RANCH V13.3 — 뒷다리 관절 중심 및 바인드 교정';
 const title=document.querySelector('#header h1');if(title)title.textContent='HORSE RANCH V13.3 · 뒷다리 구조 교정';
 const subtitle=document.getElementById('subtitle');if(subtitle)subtitle.textContent='뒷다리 슬관절 회전 중심 / Inverse Bind Matrix 수정 · 앞다리·복부·기존 질주 보존';
}
let tries=0;const timer=setInterval(()=>{
 if(!window.__horseGaitV13_2?.ready){if(++tries>650){clearInterval(timer);window.__horseV13_3Error='V13.2 dependency unavailable';}return;}
 clearInterval(timer);
 try{tryInstall();}catch(e){window.__horseV13_3Error=String(e.message||e);console.error('HORSE RANCH V13.3 hind fix',e);}
},100);
})();