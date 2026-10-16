/* HORSE RANCH V14 speed-dependent Gallop laboratory. EXPERIMENT ONLY.
   Source GLB, earlier 13 animations and V13.4 440 weighted vertices are preserved.
   The values in this file are design tuning, not measured physical foot contact. */
(function(){'use strict';
 const BASE='Gallop_V13_9_SUPPORT_BALANCE_CANDIDATE',N=160,TWO=2*Math.PI,RAD=Math.PI/180;
 const MODE=[
  {id:'canter',name:'Canter_PREVIEW',nominal:30,period:null},
  {id:'cruise',name:'Gallop_V14_CRUISE',nominal:44,period:.51,warp:0,fold:0,rise:0},
  {id:'fast',name:'Gallop_V14_FAST',nominal:55,period:.46,warp:1,fold:.75,rise:.0007},
  {id:'sprint',name:'Gallop_V14_SPRINT',nominal:65,period:.42,warp:1.7,fold:1.3,rise:.0012}
 ];
 const EVENT={HindR:12,HindL:34,ForeR:59,ForeL:82},THRESHOLD=[36,50,60];
 const pulse=(i,c,w)=>Math.exp((Math.cos(TWO*(i-c)/N)-1)*(N/(TWO*w))**2);
 function sample(sam,t,size){
  let lo=0,hi=sam.times.length-1;
  if(hi<1)throw Error('Invalid animation sampler');
  while(lo<hi){let mid=(lo+hi)>>1;if(sam.times[mid]<t)lo=mid+1;else hi=mid;}
  const b=lo,a=sam.times[b]<t?b:Math.max(0,b-1);
  const w=sam.times[a]===sam.times[b]?0:Math.max(0,Math.min(1,(t-sam.times[a])/(sam.times[b]-sam.times[a])));
  const stride=sam.interpolation==='CUBICSPLINE'?size*3:size,add=sam.interpolation==='CUBICSPLINE'?size:0;
  const v=Array.from({length:size},(_,k)=>{let x=sam.data[a*stride+add+k],y=sam.data[b*stride+add+k];return x+(y-x)*w});
  if(v.some(x=>!Number.isFinite(x)))throw Error('Nonfinite animation key');
  if(size===4){const len=Math.hypot(...v);if(!Number.isFinite(len)||len<.00001)throw Error('Zero quaternion');return v.map(x=>x/len);}
  return v;
 }
 function rotateX(v,degrees){
  if(!degrees)return v;
  const [x,y,z,w]=v,s=Math.sin(degrees*RAD/2),c=Math.cos(degrees*RAD/2);
  const q=[w*s+x*c,y*c+z*s,z*c-y*s,w*c-x*s],n=Math.hypot(...q);
  if(!Number.isFinite(n)||n<.9)throw Error('Invalid adjusted quaternion');
  return q.map(x=>x/n);
 }
 function makeClip(g,base,m){
  const times=Float32Array.from({length:N},(_,i)=>i*m.period/N);
  const channels=base.channels.map(ch=>{
   const part=g.doc.nodes[ch.node]?.name||'',limb=/^(Hind[LR]|Fore[LR])_/.exec(part)?.[1],n=ch.path==='rotation'?4:3;
   if(!['rotation','translation'].includes(ch.path))throw Error('Unexpected base path '+ch.path);
   const data=new Float32Array(N*n);
   for(let i=0;i<N;i++){
    const phase=limb?(i+m.warp*(limb.startsWith('Fore')?.4:1)*Math.sin(TWO*(i-EVENT[limb])/N)+N)%N:i;
    let v=sample(ch.sam,phase/N*base.duration,n);
    if(ch.path==='rotation'){
     let delta=0;
     if(limb?.startsWith('Hind')&&(/_Stifle$|_Hock$/.test(part)))
      delta=-m.fold*pulse(i,limb==='HindR'?111:132,16)*(part.endsWith('Hock')?1:.55);
     if(part==='Torso')delta=m.fold*.1*Math.sin(TWO*(i-29)/N);
     if(part==='Neck')delta=-m.fold*.13*Math.sin(TWO*(i-6)/N);
     if(part==='Head')delta=-m.fold*.1*Math.sin(TWO*(i-10)/N);
     if(part==='Tail')delta=m.fold*.16*Math.sin(TWO*(i-16)/N);
     v=rotateX(v,delta);
    }else if(part==='Torso')v[1]+=m.rise*(Math.cos(TWO*(i-32)/N)-Math.cos(TWO*(i-110)/N));
    for(let k=0;k<n;k++){if(!Number.isFinite(v[k]))throw Error('Nonfinite generated key');data[i*n+k]=v[k];}
   }
   return {node:ch.node,path:ch.path,sam:{times,data,interpolation:'LINEAR'}};
  });
  if(channels.length!==19)throw Error('Expected 19 channels');
  return {name:m.name,duration:m.period,channels};
 }
 let attempts=0;
 const poll=setInterval(()=>{
  if(!window.__horseGaitV139?.ready){if(++attempts>700){clearInterval(poll);window.__horseV14Error='V13.9 timeout';}return;}
  clearInterval(poll);
  try{
   const g=object3d,base=g?.animations?.find(a=>a.name===BASE);
   if(!base||base.channels.length!==19||g.skins?.[0]?.joints?.length!==19)throw Error('Expected V13.9 19-joint source');
   if(window.__horseGaitV12?.belly?.corrected!==440)throw Error('V13.4 abdomen correction not confirmed');
   if(!g.animations.some(a=>a.name==='Canter_PREVIEW'))throw Error('Canter source missing');
   if(MODE.slice(1).some(m=>g.animations.some(a=>a.name===m.name)))throw Error('V14 already installed');
   const selector=document.getElementById('animations'),rate=document.getElementById('speed');
   if(!selector||!rate)throw Error('Viewer controls missing');
   for(const m of MODE.slice(1)){
    g.animations.push(makeClip(g,base,m));
    const opt=document.createElement('option');opt.value=String(g.animations.length-1);
    opt.textContent='△ V14 시험 · '+m.id.toUpperCase();selector.appendChild(opt);
   }
   rate.step='.01';
   let selected=1;
   const api={ready:true,experimental:true,source:BASE,createdClips:3,originalClipsPreserved:true,
    modes:MODE.map(({id,name,nominal,period})=>({id,name,nominal,period})),mode:'cruise',speedKmh:44,setSpeed};
   function setSpeed(speed){
    if(!Number.isFinite(Number(speed)))throw Error('Invalid race speed');
    const kmh=Math.max(0,Math.min(80,Number(speed)));
    let next=selected;
    while(next<3&&kmh>THRESHOLD[next]+1)next++;
    while(next>0&&kmh<THRESHOLD[next-1]-1)next--;
    const m=MODE[next],target=g.animations.findIndex(a=>a.name===m.name);
    if(target<0)throw Error('Missing speed gait: '+m.name);
    const duration=g.animations[target].duration;
    if(next!==selected||Number(selector.value)!==target){
     const current=g.animations[Number(selector.value)];
     const fraction=current?.duration?(animTime%current.duration)/current.duration:0;
     selector.value=String(target);selector.dispatchEvent(new Event('change'));
     Promise.resolve().then(()=>{animTime=fraction*duration;});
    }
    const multiplier=Math.max(.82,Math.min(1.18,kmh/m.nominal));
    rate.value=multiplier.toFixed(2);
    selected=next;
    api.mode=m.id;api.speedKmh=kmh;api.period=duration;api.playbackFactor=multiplier;
    api.selectedClip=m.name;
    return {mode:m.id,clip:m.name,period:duration,speedKmh:kmh,playbackFactor:multiplier};
   }
   window.__horseV14=api;setSpeed(44);
  }catch(e){window.__horseV14Error=String(e?.message||e);console.error('V14 speed gait laboratory',e);}
 },100);
})();