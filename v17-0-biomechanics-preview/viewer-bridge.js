/* HORSE RANCH V17.0 — current-only playback bridge.
 * Historical gait clips remain as internal, protected algorithm dependencies.
 * No old-version choice or comparison UI; never mutates original GLB/skin.
 */
(function(){'use strict';let attempts=0;
 const loop=setInterval(()=>{
  if(!window.__horseV167?.ready||!window.__viewerReady){
   if(++attempts>900){clearInterval(loop);window.__horseV170BridgeError='Base model/runtime failed to load';}
   return;
  }
  clearInterval(loop);
  try{
   const model=object3d,options=document.getElementById('animations'),
    rate=document.getElementById('speed'),ids=['walk','cruise','fast','sprint'],
    names={walk:'Walk',cruise:'Gallop Cruise',fast:'Gallop Fast',sprint:'Gallop Sprint'},
    idle=Number([...options.options].find(o=>o.textContent.trim()==='정지 자세')?.value),
    registered={},indexModes=new Map([[idle,'idle']]);
   if(!Number.isInteger(idle)||idle>=0||model.skins?.[0]?.joints?.length!==19)
    throw Error('Original idle or 19-joint rig missing');
   let transition=null;
   const copyPose=()=>model.nodes.map(n=>({t:n.t.slice(),q:n.q.slice(),s:n.s.slice()}));
   const nativeSetClip=setClip;
   setClip=function(g){
    nativeSetClip(g);
    if(!transition||g!==model)return;
    const progress=Math.min(1,Math.max(0,(performance.now()-transition.started)/180)),
     t=progress*progress*(3-2*progress);
    for(let i=0;i<model.nodes.length;i++){
     const node=model.nodes[i],prior=transition.pose[i];
     for(let k=0;k<3;k++){
      node.t[k]=prior.t[k]*(1-t)+node.t[k]*t;
      node.s[k]=prior.s[k]*(1-t)+node.s[k]*t;
     }
     let dot=0;for(let k=0;k<4;k++)dot+=prior.q[k]*node.q[k];
     const sign=dot<0?-1:1,interp=[];
     for(let k=0;k<4;k++)interp.push(prior.q[k]*(1-t)+node.q[k]*t*sign);
     const norm=Math.hypot(...interp);
     if(norm>1e-9)for(let k=0;k<4;k++)node.q[k]=interp[k]/norm;
    }
    if(progress>=1)transition=null;
   };
   function snapshot(){
    const index=clipIndex,clip=model.animations[index],duration=clip?.duration||0;
    return {mode:indexModes.get(index)||'unregistered',version:indexModes.has(index)?'v17':'loading',
     index,clip:clip?.name||'정지 자세',playing:!!play&&index>=0,
     speed:Number(rate.value),duration,
     phase:duration?((animTime%duration)+duration)%duration/duration:0,
     blending:!!transition,selectMatches:String(options.value)===String(index)};
   }
   function choose(mode){
    if(mode!=='idle'&&!ids.includes(mode))throw Error('Unsupported mode '+mode);
    const next=mode==='idle'?idle:registered[mode];
    if(!Number.isInteger(next))throw Error('V17 gait has not been baked: '+mode);
    const before=snapshot();
    if(before.index===next)return before;
    const pose=copyPose(),other=mode==='idle'?null:[...options.options].find(o=>o.textContent.trim()===names[mode]);
    if(mode!=='idle'&&!other)throw Error('Missing native selector for '+mode);
    if(other)other.value=String(next);
    options.value=String(next);
    options.dispatchEvent(new Event('change',{bubbles:true}));
    if(clipIndex!==next||String(options.value)!==String(next))
     throw Error('Native clip selection did not update '+mode);
    const target=model.animations[next];
    animTime=target?.duration?before.phase*target.duration:0;
    play=mode!=='idle';
    transition={pose,started:performance.now()};
    playBtn.textContent=play?'⏸ 일시정지':'▶ 재생';
    for(const runtime of [window.__horseV14,window.__horseV15]){
     if(runtime){runtime.mode=mode;runtime.selectedClip=target?.name||'정지 자세';}
    }
    return snapshot();
   }
   function registerV17(mode,index){
    if(!ids.includes(mode)||Number.isInteger(registered[mode])||
       !Number.isInteger(index)||!model.animations[index]?.name.startsWith('V17_0_'))
     throw Error('Invalid V17 clip registration: '+mode);
    registered[mode]=index;indexModes.set(index,mode);
    return index;
   }
   window.__horseV170Bridge={ready:true,choose,chooseIdle:()=>choose('idle'),registerV17,snapshot,
    setPlaying:on=>{play=clipIndex>=0&&!!on;playBtn.textContent=play?'⏸ 일시정지':'▶ 재생';return snapshot();},
    setSpeed:v=>{
     const n=Number(v);if(!Number.isFinite(n)||n<Number(rate.min)||n>Number(rate.max))
      throw Error('Invalid playback speed');
     rate.value=String(n);
     rate.dispatchEvent(new Event('input',{bubbles:true}));
     rate.dispatchEvent(new Event('change',{bubbles:true}));
     return snapshot();
    },stopTransition:()=>{transition=null;return snapshot();},
    registered,originalGlbPreserved:true};
  }catch(e){window.__horseV170BridgeError=String(e?.stack||e);console.error(e);}
 },100);
})();