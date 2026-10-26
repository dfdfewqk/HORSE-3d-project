/* HORSE RANCH V17.1 — current-only playback bridge.
 * Historical gait clips remain as internal, protected algorithm dependencies.
 * No old-version choice or comparison UI; never mutates original GLB/skin.
 */
(function(){'use strict';let attempts=0;
 const loop=setInterval(()=>{
  if(!window.__horseV167?.ready||!window.__viewerReady){
   if(++attempts>900){clearInterval(loop);window.__horseV171BridgeError='Base model/runtime failed to load';}
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
    return {mode:indexModes.get(index)||'unregistered',version:indexModes.has(index)?'v171':'loading',
     index,clip:clip?.name||'정지 자세',playing:!!play&&index>=0,
     speed:Number(rate.value),duration,
     phase:duration?((animTime%duration)+duration)%duration/duration:0,
     blending:!!transition,selectMatches:String(options.value)===String(index)};
   }
   // Phase-matched transition: find a target gait time whose planted feet
   // and 14 real joint rotations are most compatible with the current pose.
   // Do not copy an arbitrary normalized timestamp from Walk to Sprint.
   function matchedPhase(mode,before,next){
    if(before.mode==='idle'||before.mode==='unregistered'||!Number.isFinite(before.phase))
     return 0;
    if(before.mode===mode)return before.phase;
    const builder=window.__horseV167Builder,configs=builder?.configs;
    if(!configs?.[mode])return before.phase;
    const from=configs[before.mode],to=configs[mode],
     nodes=model.doc.nodes,joints=new Set([...Object.values(builder.chains).flat()]),
     channels=next.channels.filter(c=>c.path==='rotation'&&joints.has(nodes[c.node]?.name)),
     distance=(a,b)=>{const delta=Math.abs(a-b);return Math.min(delta,1-delta);},
     contact=(cfg,leg,phase)=>{
      const p=frac(phase-cfg.touch[leg]);
      return p<(leg.startsWith('Fore')?cfg.stance.fore:cfg.stance.hind);
     };
    let scoreBest=Infinity,phaseBest=before.phase;
    for(let i=0;i<64;i++){
     const candidate=i/64;let score=.22*distance(candidate,before.phase)**2;
     if(from)for(const leg of Object.keys(builder.chains))
      if(contact(from,leg,before.phase)!==contact(to,leg,candidate))
       score+=(leg.startsWith('Fore')?.30:.21);
     for(const ch of channels){
      const desired=builder.sample(ch.sam,next.duration*candidate,4),
       now=model.nodes[ch.node].q,cos=Math.abs(now.reduce((v,x,k)=>v+x*desired[k],0));
      score+=.22*(1-Math.min(1,cos))**2;
     }
     if(score<scoreBest){scoreBest=score;phaseBest=candidate;}
    }
    return phaseBest;
   }
   function frac(v){return ((v%1)+1)%1;}
   function choose(mode){
    if(mode!=='idle'&&!ids.includes(mode))throw Error('Unsupported mode '+mode);
    const next=mode==='idle'?idle:registered[mode];
    if(!Number.isInteger(next))throw Error('V17 gait has not been baked: '+mode);
    const before=snapshot();
    if(before.index===next)return before;
    const target=model.animations[next],aligned=mode==='idle'?0:matchedPhase(mode,before,target);
    const pose=copyPose(),other=mode==='idle'?null:[...options.options].find(o=>o.textContent.trim()===names[mode]);
    if(mode!=='idle'&&!other)throw Error('Missing native selector for '+mode);
    if(other)other.value=String(next);
    options.value=String(next);
    options.dispatchEvent(new Event('change',{bubbles:true}));
    if(clipIndex!==next||String(options.value)!==String(next))
     throw Error('Native clip selection did not update '+mode);
    animTime=target?.duration?aligned*target.duration:0;
    play=mode!=='idle';
    transition={pose,started:performance.now()};
    playBtn.textContent=play?'⏸ 일시정지':'▶ 재생';
    for(const runtime of [window.__horseV14,window.__horseV15]){
     if(runtime){runtime.mode=mode;runtime.selectedClip=target?.name||'정지 자세';}
    }
    return snapshot();
   }
   function register(mode,index){
    if(!ids.includes(mode)||Number.isInteger(registered[mode])||
       !Number.isInteger(index)||!model.animations[index]?.name.startsWith('V17_1_'))
     throw Error('Invalid V17 clip registration: '+mode);
    registered[mode]=index;indexModes.set(index,mode);
    return index;
   }
   window.__horseV171Bridge={ready:true,choose,chooseIdle:()=>choose('idle'),register,snapshot,
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
  }catch(e){window.__horseV171BridgeError=String(e?.stack||e);console.error(e);}
 },100);
})();