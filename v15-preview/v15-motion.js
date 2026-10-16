/* HORSE RANCH V15: conservative whole-body motion candidate, no base GLB changes. */
(function(){'use strict';
const PI=Math.PI,TAU=2*PI,N=160,RAD=PI/180;
const SOURCES={
 walk:'Walk_V14_GROUNDED',
 cruise:'Gallop_V14_CRUISE',
 fast:'Gallop_V14_FAST',
 sprint:'Gallop_V14_SPRINT'
};
const MODES=[
 {id:'walk',name:'Walk_V15_BALANCED',source:SOURCES.walk,nominal:7},
 {id:'cruise',name:'Gallop_V15_CRUISE',source:SOURCES.cruise,nominal:44},
 {id:'fast',name:'Gallop_V15_FAST',source:SOURCES.fast,nominal:55},
 {id:'sprint',name:'Gallop_V15_SPRINT',source:SOURCES.sprint,nominal:65}
];
// Small rig-local amplitudes. Design candidates, not measured forces or angles.
const C={
 walk:{height:.0025,body:.17,neck:1.00,head:.50,tail:.65},
 cruise:{height:.0045,body:.35,neck:.80,head:.40,tail:1.00},
 fast:{height:.0075,body:.55,neck:1.10,head:.55,tail:1.35},
 sprint:{height:.010,body:.75,neck:1.40,head:.70,tail:1.75}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function rotateX(v,k,deg) {
 if(!deg)return;
 const x=v[k],y=v[k+1],z=v[k+2],w=v[k+3],a=deg*RAD*.5,s=Math.sin(a),c=Math.cos(a);
 let nx=w*s+x*c,ny=y*c+z*s,nz=z*c-y*s,nw=w*c-x*s;
 const norm=Math.hypot(nx,ny,nz,nw);
 if(!Number.isFinite(norm)||norm<.95)throw Error('V15 invalid quaternion');
 v[k]=nx/norm;v[k+1]=ny/norm;v[k+2]=nz/norm;v[k+3]=nw/norm;
}
function correction(id,part,phase) {
 const a=C[id],w=id==='walk';
 if(part==='Torso')return a.body*(w?Math.sin(phase+.35):Math.sin(phase-.9)+.18*Math.sin(2*phase));
 if(part==='Neck')return a.neck*(w?Math.sin(2*phase-.50):Math.sin(phase-1.2)+.15*Math.sin(2*phase-.2));
 if(part==='Head')return -a.head*(w?Math.sin(2*phase-.70):Math.sin(phase-1.48)+.12*Math.sin(2*phase-.45));
 if(part==='Tail')return a.tail*Math.sin(phase-1.7);
 return 0;
}
function make(g,mode){
 const src=g.animations.find(x=>x.name===mode.source);
 if(!src||src.channels.length!==19||src.duration<=0)throw Error('Missing V14 gait '+mode.source);
 let edits=0;
 const channels=src.channels.map(ch=>{
  const part=g.doc.nodes[ch.node]?.name||'',old=ch.sam;
  if(!['translation','rotation'].includes(ch.path))return ch;
  if(old.interpolation==='CUBICSPLINE')return ch; // Keep unknown sampler intact.
  const eligible=(part==='Torso'&&ch.path==='translation')||
   (ch.path==='rotation'&&['Torso','Neck','Head','Tail'].includes(part));
  if(!eligible)return ch;
  const n=ch.path==='rotation'?4:3;
  if(!old.times?.length||old.data?.length!==old.times.length*n)
   throw Error('Unexpected V15 channel size '+part);
  const values=new Float32Array(old.data),p=C[mode.id];
  for(let i=0;i<old.times.length;i++){
   const phase=TAU*old.times[i]/src.duration;
   if(ch.path==='translation'){
    values[i*3+1]+=p.height*(mode.id==='walk'?Math.sin(2*phase-.65):Math.cos(phase-.65)-.18*Math.cos(2*phase));
   }else{
    rotateX(values,i*4,correction(mode.id,part,phase));
   }
  }
  for(const x of values)if(!Number.isFinite(x))throw Error('Nonfinite V15 pose: '+part);
  edits++;
  return {node:ch.node,path:ch.path,sam:{times:old.times,data:values,interpolation:'LINEAR'}};
 });
 if(edits!==5)throw Error('V15 must modify exactly 5 whole-body channels, found '+edits);
 return {name:mode.name,duration:src.duration,channels};
}
let polls=0;
const timer=setInterval(()=>{
 if(!window.__horseV14?.ready||!window.__viewerReady){
  if(++polls>900){clearInterval(timer);window.__horseV15Error='V14 source not ready';}
  return;
 }
 clearInterval(timer);
 try {
  const g=object3d,select=document.getElementById('animations'),rate=document.getElementById('speed');
  if(g?.skins?.[0]?.joints?.length!==19||window.__horseGaitV12?.belly?.corrected!==440)
   throw Error('Original 19-joint rig or 440 abdomen correction missing');
  if(!select||!rate)throw Error('V15 viewer controls missing');
  const stop=[...select.options].find(x=>/정지\s*자세|stop|idle/i.test(x.textContent));
  if(!stop)throw Error('Original rest pose option missing');
  if(MODES.some(m=>g.animations.some(a=>a.name===m.name)))throw Error('V15 already applied');
  const generated=MODES.map(m=>make(g,m));
  for(const clip of generated)g.animations.push(clip);
  select.replaceChildren(stop,...MODES.map(m=>{
   const opt=document.createElement('option');opt.value=String(g.animations.findIndex(x=>x.name===m.name));
   opt.textContent=({walk:'Walk',cruise:'Gallop Cruise',fast:'Gallop Fast',sprint:'Gallop Sprint'})[m.id];
   return opt;
  }));
  const labels=[...select.options].map(x=>x.textContent.trim());
  if(labels.length!==5||labels[0]!=='정지 자세')throw Error('Unexpected V15 options');
  const api={ready:true,experimental:true,originalGlbPreserved:true,rigJoints:19,
    enhancedClips:generated.map(x=>x.name),mode:'cruise',speedKmh:44,
    modes:[{id:'idle',name:'정지 자세',nominal:0},...MODES.map(x=>({id:x.id,name:x.name,nominal:x.nominal}))],
    setMode,setSpeed
  };
  function choose(id,kmh) {
   if(id!=='idle'&&!MODES.some(m=>m.id===id))throw Error('Invalid V15 mode '+id);
   const clip=MODES.find(m=>m.id===id),target=id==='idle'?String(stop.value):
    String(g.animations.findIndex(x=>x.name===clip.name));
   if(select.value!==target){select.value=target;select.dispatchEvent(new Event('change'));}
   const factor=id==='idle'?0:clamp(kmh/clip.nominal,id==='walk'?.70:.82,id==='walk'?1.20:1.18);
   if(id!=='idle')rate.value=factor.toFixed(2);
   api.mode=id;api.speedKmh=kmh;
   api.playbackFactor=factor;api.selectedClip=id==='idle'?'정지 자세':clip.name;
   return {mode:id,clip:api.selectedClip,period:clip?g.animations[Number(target)].duration:0,
    speedKmh:kmh,playbackFactor:factor};
  }
  function setMode(id) {
   if(id==='stop')id='idle';
   const mode=MODES.find(m=>m.id===id);
   return choose(id,mode?mode.nominal:0);
  }
  function setSpeed(x) {
   const kmh=Number(x);if(!Number.isFinite(kmh))throw Error('Invalid V15 speed');
   const val=clamp(kmh,0,80);
   const id=val<=0?'idle':val<15?'walk':val<51?'cruise':val<61?'fast':'sprint';
   return choose(id,val);
  }
  window.__horseV15=api;
  const compat=window.__horseV14;
  compat.setSpeed=setSpeed;compat.setMode=setMode;compat.modes=api.modes;
  select.addEventListener('change',()=>{
   const m=MODES.find(m=>String(g.animations.findIndex(x=>x.name===m.name))===select.value);
   if(m){api.mode=m.id;api.selectedClip=m.name;api.speedKmh=m.nominal;}
   else if(select.value===String(stop.value)){api.mode='idle';api.speedKmh=0;api.selectedClip='정지 자세';}
  });
  choose('cruise',44);
 }catch(error){
  window.__horseV15Error=String(error?.message||error);
  console.error('V15 motion candidate',error);
 }
},100);
})();