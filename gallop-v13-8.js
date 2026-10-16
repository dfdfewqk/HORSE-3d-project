/* HORSE RANCH V13.8 — whole-body balanced Gallop EXPERIMENT.
 * Builds only a new animation clip from V13.7b; original GLB, meshes, joints,
 * skin, weights and every preexisting clip remain unchanged. WEB 19-joint rig.
 * Contact times are prior hoof-PROXY minima, NOT observed foot-contact data.
 * DO NOT ship to main before actual GLB and rendered-motion validation.
 */
(function(){'use strict';
 const NAME='Gallop_V13_8_WHOLE_BODY_BALANCE_CANDIDATE';
 const SOURCE='Gallop_V13_7_INTEGRATED_CANDIDATE';
 const N=160,TAU=2*Math.PI,RAD=Math.PI/180;
 // Cues: RH 11, LH 35, RF 59, LF 82; flight-like gap after LF.
 // Event-weighted responses are deliberately small and continuously periodic.
 const pulse=(i,center,width)=>Math.exp((Math.cos(TAU*(i-center)/N)-1)*Math.pow(N/(TAU*width),2));
 const heightRaw=i=>-.008*pulse(i,11,12)-.010*pulse(i,35,13)
                     +.010*pulse(i,53,16)-.012*pulse(i,81,15)
                     +.020*pulse(i,119,23);
 const pitchRaw=i=>-.20*pulse(i,11,14)+.35*pulse(i,45,18)
                     -.55*pulse(i,81,17)+.35*pulse(i,121,26);
 const average=f=>Array.from({length:N},(_,i)=>f(i)).reduce((a,b)=>a+b,0)/N;
 const meanY=average(heightRaw),meanPitch=average(pitchRaw);
 const responseY=i=>heightRaw(i)-meanY;
 const responsePitch=i=>pitchRaw(i)-meanPitch; // degrees, rig-local X
 const secondary={
  Neck:i=>-.58*responsePitch(i-3)+.10*Math.sin(TAU*(i-13)/N),
  Head:i=>-.38*responsePitch(i-6)+.07*Math.sin(TAU*(i-23)/N),
  Tail:i=>-.45*responsePitch(i-10)+.30*Math.sin(TAU*(i-75)/N)
 };
 function composeX(arr,i,delta){
  const k=4*i,x=arr[k],y=arr[k+1],z=arr[k+2],w=arr[k+3];
  const s=Math.sin(delta*RAD/2),c=Math.cos(delta*RAD/2);
  const out=[w*s+x*c,y*c+z*s,z*c-y*s,w*c-x*s];
  const length=Math.hypot(...out);
  if(!Number.isFinite(length)||length<.999||length>1.001)
   throw Error('Invalid source/additive quaternion at sample '+i);
  return out.map(v=>v/length);
 }
 let retries=0;
 const check=setInterval(()=>{
  if(!window.__horseGaitV137?.ready){
   if(++retries>700){clearInterval(check);window.__horseV138Error='V13.7b unavailable';}
   return;
  }
  clearInterval(check);
  try{
   const g=object3d,base=g?.animations.find(a=>a.name===SOURCE);
   if(!base||g.skins?.[0]?.joints?.length!==19||g.animations.some(a=>a.name===NAME))
    throw Error('Expected unique V13.7b source in 19-joint preview');
   if(base.channels.length!==19||Math.abs(base.duration-.72)>1e-6)
    throw Error('Unexpected source track count or duration');
   const key=ch=>(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path;
   const byName=new Map(base.channels.map(ch=>[key(ch),ch]));
   const required=['Torso|translation','Torso|rotation','Neck|rotation','Head|rotation','Tail|rotation'];
   for(const name of required){
    const c=byName.get(name),rotation=name.endsWith('rotation');
    const length=c?.sam?.times?.length;
    if(!c||!length||length<2||c.sam?.data?.length!==length*(rotation?4:3)
       ||(name.startsWith('Torso|')&&length!==N))
     throw Error('Missing/mismatched whole-body source track: '+name);
   }
   const changed=new Map(),stats={maxAddedY:0,maxAddedPitch:0,secondaryMax:{}};
   const torsoPosition=new Float32Array(byName.get('Torso|translation').sam.data);
   for(let i=0;i<N;i++){
    const dy=responseY(i);
    torsoPosition[i*3+1]+=dy;
    stats.maxAddedY=Math.max(stats.maxAddedY,Math.abs(dy));
    stats.maxAddedPitch=Math.max(stats.maxAddedPitch,Math.abs(responsePitch(i)));
   }
   changed.set('Torso|translation',torsoPosition);
   for(const name of ['Torso','Neck','Head','Tail']){
    const source=byName.get(name+'|rotation').sam.data;
    const track=byName.get(name+'|rotation');
    const values=new Float32Array(source.length);
    let peak=0;
    for(let i=0;i<track.sam.times.length;i++){
     // Existing head/neck/tail samplers may use fewer than 160 keys.
     // Add motion at each original key's timestamp; preserve its sampling grid.
     const phase=track.sam.times[i]/base.duration*N;
     const delta=name==='Torso'?responsePitch(phase):secondary[name](phase);
     peak=Math.max(peak,Math.abs(delta));
     values.set(composeX(source,i,delta),i*4);
    }
    if(name!=='Torso')stats.secondaryMax[name]=peak;
    changed.set(name+'|rotation',values);
   }
   let count=0;
   const channels=base.channels.map(ch=>{
    const data=changed.get(key(ch));
    if(!data)return ch;
    count++;
    return {node:ch.node,path:ch.path,sam:{times:ch.sam.times,data,interpolation:'LINEAR'}};
   });
   if(count!==5||channels.length!==19)throw Error('Expected five new whole-body tracks, got '+count);
   const select=document.getElementById('animations');
   if(!select)throw Error('Missing animation selector');
   const newIndex=g.animations.length;
   g.animations.push({name:NAME,duration:base.duration,channels});
   const option=document.createElement('option');
   option.value=String(newIndex);
   option.textContent='△ V13.8 실험 — 몸통·사지·목·머리·꼬리 통합';
   select.appendChild(option);
   select.value=String(newIndex);
   select.dispatchEvent(new Event('change'));
   window.__horseGaitV138={ready:true,clip:NAME,from:SOURCE,
    changedTracks:5,inheritedLimbTracks:14,rigJoints:19,
    originalClipsPreserved:true,originalGLBPreserved:true,stats,
    contactVerified:false,fullGLBSkinVerified:false,visualVerified:false,userGPUVerified:false};
  }catch(e){window.__horseV138Error=String(e?.message||e);console.error('V13.8 candidate',e);}
 },100);
})();
