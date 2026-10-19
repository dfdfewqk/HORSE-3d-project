/* HORSE RANCH V16.8 — isolated bridge for the real legacy viewer.
 * Canonical state is clipIndex/animTime/play in legacy-v7, not toolbar text.
 * Keeps V16.7 animation and GLB immutable; experimental 180ms pose blend.
 */
(function(){'use strict';
 let attempts=0;
 const timer=setInterval(()=>{
  if(!window.__horseV167?.ready||!window.__horseV167Visual?.ready||!window.__viewerReady){
   if(++attempts>900){clearInterval(timer);window.__horseV168BridgeError='Legacy viewer or source clips unavailable';}
   return;
  }
  clearInterval(timer);
  try{
   const g=object3d,source=window.__horseV167,ids=['walk','cruise','fast','sprint'],
    selectEl=document.getElementById('animations'),rate=document.getElementById('speed'),
    idle=Number([...selectEl.options].find(x=>x.textContent.trim()==='정지 자세')?.value);
   if(!Number.isInteger(idle)||idle>=0||g.skins[0].joints.length!==19)throw Error('Original Idle/rig changed');
   const map=new Map([[idle,{mode:'idle',version:'idle'}]]);
   for(const mode of ids){
    const old=source.sourceIndexes[mode],fresh=source.clipIndexes[mode];
    if(!Number.isInteger(old)||!Number.isInteger(fresh)||old<0||fresh<0||old===fresh)
     throw Error('V16.8 invalid clip mapping '+mode);
    map.set(old,{mode,version:'old'});map.set(fresh,{mode,version:'new'});
   }
   let transition=null,suppress=false,lowerChange=null;
   const setButton=()=>{playBtn.textContent=play&&clipIndex>=0?'⏸ 일시정지':'▶ 재생';};
   const unit=x=>Math.min(1,Math.max(0,x));
   const copyPose=()=>g.nodes.map(n=>({t:n.t.slice(),q:n.q.slice(),s:n.s.slice()}));
   const originalSetClip=setClip;
   setClip=function(model){
    originalSetClip(model);
    if(!transition||model!==g)return;
    const alpha=unit((performance.now()-transition.start)/transition.duration),
     t=alpha*alpha*(3-2*alpha);
    for(let i=0;i<g.nodes.length;i++){
     const n=g.nodes[i],from=transition.pose[i];
     if(!from)continue;
     for(let k=0;k<3;k++){
      n.t[k]=from.t[k]*(1-t)+n.t[k]*t;
      n.s[k]=from.s[k]*(1-t)+n.s[k]*t;
     }
     let sign=0;for(let k=0;k<4;k++)sign+=from.q[k]*n.q[k];
     const q=new Array(4);for(let k=0;k<4;k++)q[k]=from.q[k]*(1-t)+n.q[k]*t*(sign<0?-1:1);
     const norm=Math.hypot(...q);
     if(norm>.00001)for(let k=0;k<4;k++)n.q[k]=q[k]/norm;
    }
    if(alpha>=1)transition=null;
   };
   function snapshot(){
    const index=clipIndex,clip=g.animations[index],id=map.get(index)||{mode:'unknown',version:'unknown'};
    const duration=clip?.duration||0;
    return {index,mode:id.mode,version:id.version,clip:clip?.name||'정지 자세',
     playing:!!play&&index>=0,speed:Number(rate.value),duration,
     phase:duration>0?((animTime%duration)+duration)%duration/duration:0,
     blending:!!transition,selectMatches:String(selectEl.value)===String(index)};
   }
   function updateMode(s){
    if(s.mode==='unknown')return;
    for(const obj of [window.__horseV15,window.__horseV14]){
     if(!obj)continue;
     obj.mode=s.mode;obj.selectedClip=s.clip;
    }
   }
   const labels={walk:'Walk',cruise:'Gallop Cruise',fast:'Gallop Fast',sprint:'Gallop Sprint'};
   function ensureOption(destination){
    const resolved=map.get(destination);
    if(!resolved)throw Error('No mapped gait for clip '+destination);
    if(resolved.mode==='idle')return;
    const option=[...selectEl.options].find(o=>o.textContent.trim()===labels[resolved.mode]);
    if(!option)throw Error('Missing five-mode option '+resolved.mode);
    // Previous clips are not selectable by value unless a REAL option owns
    // that value. Assigning a missing value clears HTMLSelectElement.value.
    option.value=String(destination);
   }
   function nextPose(origin,destination,wasPlaying){
    if(!Number.isInteger(destination)||!map.has(destination))
     throw Error('V16.8 invalid clip request '+destination);
    if(origin.index===destination)return origin;
    const sourcePose=copyPose();
    const oldPhase=origin.phase;
    suppress=true;
    try{ensureOption(destination);selectEl.value=String(destination);selectEl.dispatchEvent(new Event('change',{bubbles:true}));}
    finally{suppress=false;}
    if(clipIndex!==destination||selectEl.value!==String(destination))
     throw Error('Legacy selection mismatch after change: '+destination+'/'+selectEl.value);
    const target=g.animations[destination];
    animTime=target?.duration?oldPhase*target.duration:0;
    play=destination>=0&&wasPlaying;
    setButton();
    transition={pose:sourcePose,start:performance.now(),duration:180};
    const state=snapshot();updateMode(state);return state;
   }
   function choose(mode,version='new'){
    if(mode==='idle')return nextPose(snapshot(),idle,false);
    if(!ids.includes(mode)||!['new','old'].includes(version))throw Error('Invalid gait comparison request');
    return nextPose(snapshot(),source[version==='new'?'clipIndexes':'sourceIndexes'][mode],true);
   }
   selectEl.addEventListener('change',()=>{
    if(suppress)return;
    const before=snapshot(),pose=copyPose();
    lowerChange={before,pose};
    queueMicrotask(()=>{
     const event=lowerChange;if(!event||event.before!==before)return;lowerChange=null;
     if(clipIndex===before.index)return;
     const target=g.animations[clipIndex];
     animTime=target?.duration?before.phase*target.duration:0;
     play=clipIndex>=0?before.playing:false;
     setButton();transition={pose,start:performance.now(),duration:180};
     updateMode(snapshot());
    });
   },{capture:true});
   playBtn.addEventListener('click',()=>{if(clipIndex<0){play=false;setButton();}});
   const api={ready:true,version:'V16.8',snapshot,choose,
    chooseIdle:()=>choose('idle'),compare:()=>{
     const s=snapshot();return s.mode==='idle'||s.mode==='unknown'?s:choose(s.mode,s.version==='new'?'old':'new');
    },setPlaying:enabled=>{
     if(clipIndex<0){play=false;}else play=!!enabled;setButton();return snapshot();
    },setSpeed:factor=>{
     const value=Number(factor),min=Number(rate.min),max=Number(rate.max);
     if(!Number.isFinite(value)||value<min||value>max)throw Error('Out-of-range playback speed');
     const step=Number(rate.step)||.25;
     rate.value=String(Math.round(value/step)*step);
     rate.dispatchEvent(new Event('input',{bubbles:true}));
     rate.dispatchEvent(new Event('change',{bubbles:true}));
     return snapshot();
    },stopTransition:()=>{transition=null;return snapshot();},
    sourceOfTruth:'legacy clipIndex',preservesOriginalGlb:true,
    manualChromeVisualPass:false,physicalHoofContactValidated:false};
   window.__horseV168Bridge=api;
  }catch(e){window.__horseV168BridgeError=String(e?.stack||e);console.error(e);}
 },90);
})();