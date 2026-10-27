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
   let transition=null,lastTime=null,travel=0,anchors={},releases={},lastPose=null,bodyLift=0;
   const copyPose=()=>model.nodes.map(n=>({t:n.t.slice(),q:n.q.slice(),s:n.s.slice()}));
   const nativeSetClip=setClip;
   const mix=(a,b,u)=>{const sign=a.reduce((v,x,k)=>v+x*b[k],0)<0?-1:1,v=a.map((x,k)=>x*(1-u)+b[k]*sign*u),n=Math.hypot(...v);return v.map(x=>x/n);};
   setClip=function(g){
    nativeSetClip(g);
    if(g!==model)return;
    const api=window.__horseV171,policy=window.__horseV171Contact;
    if(!api?.ready)return;
    const mode=indexModes.get(clipIndex),cfg=policy.configs[mode];
    if(!cfg){lastTime=null;anchors={};releases={};transition=null;lastPose=null;bodyLift=0;return;}
    // Legacy wrappers add secondary motion to every clip. The new clips already
    // contain body motion: sample them last so those offsets cannot undo contact.
    const active=model.animations[clipIndex];
    for(const node of model.nodes){node.t=node.baseT.slice();node.q=node.baseQ.slice();node.s=node.baseS.slice();}
    for(const ch of active.channels)model.nodes[ch.node][ch.path==='rotation'?'q':ch.path==='translation'?'t':'s']=policy.sample(ch.sam,policy.frac(animTime/active.duration)*active.duration,ch.path==='rotation'?4:3);
    let dt=lastTime===null?0:Math.max(0,Math.min(.1,animTime-lastTime));lastTime=animTime;
    const phase=policy.frac(animTime/cfg.period),wasTransition=!!transition;
    let velocity=cfg.speed;
    if(transition){
     transition.elapsed+=dt;const u=Math.min(1,transition.elapsed/transition.duration),t=u*u*u*(10+u*(-15+6*u));
     velocity=transition.speed*(1-t)+cfg.speed*t;
     // Advance the outgoing motion; do not blend from a frozen snapshot.
     const old=model.animations[transition.index],sampler=window.__horseV167Builder;
     const prior=transition.pose.map(n=>({t:n.t.slice(),q:n.q.slice(),s:n.s.slice()}));
     if(old&&!transition.interrupted)for(const ch of old.channels){const dim=ch.path==='rotation'?4:3;prior[ch.node][ch.path==='rotation'?'q':ch.path==='translation'?'t':'s']=policy.sample(ch.sam,(transition.time+transition.elapsed)%old.duration,dim);}
     for(let i=0;i<model.nodes.length;i++){const node=model.nodes[i],from=prior[i];for(let k=0;k<3;k++){node.t[k]=from.t[k]*(1-t)+node.t[k]*t;node.s[k]=from.s[k]*(1-t)+node.s[k]*t;}node.q=mix(from.q,node.q,t);}
     if(u>=1)transition=null;
    }
    travel+=velocity*dt;
    const pose=copyPose(),geo=api.geometry;
    bodyLift*=Math.exp(-dt/.15);pose[geo.torso].t[1]+=bodyLift;
    const liveSolve=(p,leg,target,iterations)=>api.solveFoot(p,leg,{...target,...(lastPose&&dt>0?{previousAngles:geo.chains[leg].map(id=>2*Math.atan2(lastPose[id].q[0],lastPose[id].q[3])),maxStep:18*dt}: {})},iterations);
    if(lastPose&&dt>0)for(const leg of policy.feet){
     const desired=geo.foot(pose,leg),preferredAngles=geo.chains[leg].map(id=>2*Math.atan2(pose[id].q[0],pose[id].q[3]));
     for(const id of geo.chains[leg])pose[id].q=lastPose[id].q.slice();
     liveSolve(pose,leg,{y:Math.max(geo.floor+.002,desired.y),z:desired.z,preferredAngles,orientationWeight:.15},16);
    }
    for(const leg of policy.feet){
     const state=policy.state(mode,leg,phase),hold=transition?.hold[leg]>transition?.elapsed;
     if(transition?.pending.has(leg)){if(!state.stance)transition.pending.delete(leg);continue;}
     if(!state.stance&&!hold){
      if(anchors[leg]){const f=geo.foot(pose,leg);releases[leg]={z:anchors[leg].z,y:f.y,elapsed:0};}
      delete anchors[leg];
      if(releases[leg]){const release=releases[leg];release.elapsed+=dt;const u=Math.min(1,release.elapsed/.20),blend=u*u*u*(10+u*(-15+6*u)),f=geo.foot(pose,leg);liveSolve(pose,leg,{stance:false,y:release.y*(1-blend)+f.y*blend,z:(release.z-travel)*(1-blend)+f.z*blend},12);if(u>=1)delete releases[leg];}
      continue;
     }
     delete releases[leg];
     const actual=geo.foot(pose,leg);
     if(!anchors[leg])anchors[leg]={z:actual.z+travel,landingY:wasTransition?Math.max(geo.floor+.002,actual.y):geo.floor+.002,elapsed:0};
     const anchor=anchors[leg];anchor.elapsed+=dt;const landing=Math.min(1,anchor.elapsed/.10),settle=landing*landing*landing*(10+landing*(-15+6*landing));
     const target={stance:true,z:anchor.z-travel,y:anchor.landingY*(1-settle)+(geo.floor+.002)*settle};
     // The final operation is contact IK, including while blending.
     liveSolve(pose,leg,target,10);
    }
    // A blended swing can dip below both endpoint soles; enforce clearance too.
    for(const leg of policy.feet){const f=geo.foot(pose,leg);if(f.y<geo.floor+.001)liveSolve(pose,leg,{y:geo.floor+.002,z:f.z},16);}
    // If rate-limited legs cannot clear the floor, move their shared body
    // and reproject supports. Carry this correction into subsequent frames.
    for(let pass=0;pass<3;pass++){
     const deficit=Math.max(...policy.feet.map(l=>geo.floor+.001-geo.foot(pose,l).y));
     if(deficit<=.0001)break;
     const lift=Math.min(.025,deficit);pose[geo.torso].t[1]+=lift;bodyLift+=lift;
     for(const leg of policy.feet)if(anchors[leg]?.elapsed>=.1)liveSolve(pose,leg,{y:geo.floor+.002,z:anchors[leg].z-travel},12);
    }
    lastPose=pose;
    for(let i=0;i<model.nodes.length;i++){model.nodes[i].t=pose[i].t;model.nodes[i].q=pose[i].q;model.nodes[i].s=pose[i].s;}
   };
   function snapshot(){
    const index=clipIndex,clip=model.animations[index],duration=clip?.duration||0;
    return {mode:indexModes.get(index)||'unregistered',version:indexModes.has(index)?'v171':'loading',
     index,clip:clip?.name||'정지 자세',playing:!!play&&index>=0,
     speed:Number(rate.value),duration,
     phase:duration?((animTime%duration)+duration)%duration/duration:0,
     blending:!!transition,bodyLift,selectMatches:String(options.value)===String(index)};
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
    const from=window.__horseV171Contact.configs[before.mode],to=window.__horseV171Contact.configs[mode],
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
      const desired=window.__horseV171Contact.sample(ch.sam,next.duration*candidate,4),
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
    const before=snapshot(),interrupted=!!transition,oldTime=animTime;
    if(before.index===next)return before;
    const target=model.animations[next],aligned=mode==='idle'?0:matchedPhase(mode,before,target);
    const savedAnchors=structuredClone(anchors),savedTravel=travel;
    const pose=copyPose(),other=mode==='idle'?null:[...options.options].find(o=>o.textContent.trim()===names[mode]);
    if(mode!=='idle'&&!other)throw Error('Missing native selector for '+mode);
    if(other)other.value=String(next);
    options.value=String(next);
    options.dispatchEvent(new Event('change',{bubbles:true}));
    if(clipIndex!==next||String(options.value)!==String(next))
     throw Error('Native clip selection did not update '+mode);
    anchors=savedAnchors;travel=savedTravel;releases={};
    animTime=target?.duration?aligned*target.duration:0;
    play=mode!=='idle';
    const policy=window.__horseV171Contact,oldCfg=policy.configs[before.mode],hold={};
    for(const leg of policy.feet){const st=oldCfg?policy.state(before.mode,leg,before.phase):null;hold[leg]=st?.stance?Math.min(.16,(st.duty-st.phase)*oldCfg.period):0;}
    transition=mode==='idle'?null:{pose,index:before.index,time:oldTime,elapsed:0,duration:before.mode==='walk'||mode==='walk'?.55:.32,speed:oldCfg?.speed||0,hold,interrupted,pending:new Set(policy.feet.filter(leg=>!hold[leg]&&policy.state(mode,leg,aligned).stance))};
    lastTime=animTime;
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
    },stopTransition:()=>{transition=null;anchors={};releases={};lastTime=null;lastPose=null;bodyLift=0;return snapshot();},
    registered,originalGlbPreserved:true};
  }catch(e){window.__horseV171BridgeError=String(e?.stack||e);console.error(e);}
 },100);
})();