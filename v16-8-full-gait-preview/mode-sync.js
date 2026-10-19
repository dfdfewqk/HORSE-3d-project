/* HORSE RANCH V16.8 — actual selection state is authoritative. */
(function(){'use strict';let tries=0;
const timer=setInterval(()=>{
 const rt=window.__horseV167;
 if(!rt?.ready||!window.__horseV167Visual?.ready||!window.__viewerReady){
  if(++tries>950){clearInterval(timer);window.__horseV168SyncError='Original viewer did not initialize';}return;
 }
 clearInterval(timer);
 try{
  const g=object3d,sel=document.getElementById('animations'),speed=document.getElementById('speed');
  if(!sel||!speed||g?.skins?.[0]?.joints?.length!==19)throw Error('Original controls/GLB missing');
  const idleOption=[...sel.options].find(o=>/정지\s*자세|idle|stop/i.test(o.textContent));
  if(!idleOption||!Number.isInteger(Number(idleOption.value)))throw Error('Idle option missing');
  const idleIndex=Number(idleOption.value),ids=['walk','cruise','fast','sprint'],
   refs=Object.fromEntries(ids.map(mode=>[mode,{new:rt.clipIndexes[mode],old:rt.sourceIndexes[mode]}]));
  for(const mode of ids)for(const version of ['new','old'])
   if(!Number.isInteger(refs[mode][version])||!g.animations[refs[mode][version]])
    throw Error('Missing real clip '+mode+'/'+version);
  // The five visible options must remain five. A comparison index only works
  // if it is assigned to its actual option, otherwise select.value becomes '' (Idle).
  const labels={walk:'Walk',cruise:'Gallop Cruise',fast:'Gallop Fast',sprint:'Gallop Sprint'};
  const options=Object.fromEntries(ids.map(mode=>[
   mode,[...sel.options].find(o=>o.textContent.trim()===labels[mode])]));
  if([...sel.options].length!==5||Object.values(options).some(v=>!v))
   throw Error('The preserved five options changed');
  const resetOptions=()=>{for(const mode of ids)options[mode].value=String(refs[mode].new);};
  function snapshot(){
   const idx=Number(sel.value),clip=g.animations[idx];
   if(!Number.isInteger(idx)||!clip)throw Error('Invalid real animation index '+sel.value);
   const entry=ids.flatMap(mode=>['old','new'].map(version=>({mode,version,index:refs[mode][version]})))
    .find(e=>e.index===idx);
   if(!entry&&idx!==idleIndex)throw Error('Unmapped real clip selected: '+idx);
   const mode=entry?.mode||'idle',version=entry?.version||'idle',
    t=typeof animTime==='number'&&Number.isFinite(animTime)?animTime:0;
   return {index:idx,clip:clip.name,duration:clip.duration,mode,version,
    playing:typeof play==='boolean'?play:null,speed:Number(speed.value),
    phase:clip.duration>0?((t%clip.duration)+clip.duration)%clip.duration/clip.duration:0};
  }
  function syncLegacy(s){
   if(window.__horseV15){window.__horseV15.mode=s.mode;window.__horseV15.selectedClip=s.clip;}
   if(window.__horseV14){window.__horseV14.mode=s.mode;window.__horseV14.selectedClip=s.clip;}
  }
  function choose(mode,version='new'){
   const index=mode==='idle'?idleIndex:refs[mode]?.[version];
   if(!Number.isInteger(index)||!g.animations[index])throw Error('Unknown mode/version '+mode+'/'+version);
   const prev=snapshot(),wasPlaying=prev.playing,duration=g.animations[index].duration;
   if(mode!=='idle')options[mode].value=String(index);
   sel.value=String(index);
   if(prev.index!==index)sel.dispatchEvent(new Event('change',{bubbles:true}));
   animTime=duration>0?prev.phase*duration:0;
   if(typeof setClip==='function')setClip(g);
   if(typeof updateWorld==='function')updateWorld(g);
   if(typeof play==='boolean'&&wasPlaying!==null)play=wasPlaying;
   const actual=snapshot();if(actual.index!==index)throw Error('Selection mismatch');
   syncLegacy(actual);return actual;
  }
  sel.addEventListener('change',()=>{try{syncLegacy(snapshot());}catch(e){window.__horseV168SyncError=String(e.message||e);}});
  speed.addEventListener('input',()=>{try{syncLegacy(snapshot());}catch(e){window.__horseV168SyncError=String(e.message||e);}});
  // Programmatic speed/mode controls from V15/V16.7 also expect new option IDs.
  const oldSetMode=window.__horseV15?.setMode,oldSetSpeed=window.__horseV15?.setSpeed;
  if(oldSetMode&&oldSetSpeed){
   const setMode=mode=>{resetOptions();const r=oldSetMode(mode);syncLegacy(snapshot());return r;};
   const setSpeed=kmh=>{resetOptions();const r=oldSetSpeed(kmh);syncLegacy(snapshot());return r;};
   window.__horseV15.setMode=window.__horseV14.setMode=setMode;
   window.__horseV15.setSpeed=window.__horseV14.setSpeed=setSpeed;
  }
  window.__horseV168Sync={ready:true,version:'V16.8-P0',snapshot,choose,idleIndex,
   originalGlbChanged:false,contactVerified:false,poseCrossfadeVerified:false};
  syncLegacy(snapshot());
 }catch(e){window.__horseV168SyncError=String(e?.message||e);console.error('V16.8 mode sync',e);}
},100);
})();