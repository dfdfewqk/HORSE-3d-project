/* HORSE RANCH V13.9 — measured-proxy-informed support response CANDIDATE.
 * Reference 19-joint embedded GLB; preserves original mesh, skin, inverse bind,
 * limb-channel references and all pre-existing clips. This is NOT ground IK.
 * Before release, verify foot sole contact, 160-frame skin and native WebGL.
 */
(function(){'use strict';
  const NAME='Gallop_V13_9_SUPPORT_BALANCE_CANDIDATE';
  const SOURCE='Gallop_V13_8_WHOLE_BODY_BALANCE_CANDIDATE';
  const N=160, DURATION=.72, TWO_PI=2*Math.PI;
  const requiredParts=['Torso','Neck','Head','Tail','HindR_Hip','HindL_Hip','ForeR_Shoulder','ForeL_Shoulder'];
  const pulse=(frame,center,width)=>Math.exp((Math.cos(TWO_PI*(frame-center)/N)-1)*Math.pow(N/(TWO_PI*width),2));
  // A SMALL reversible corrective lift, not a measured force or physical contact.
  // Fitted only to actual GLB V13.8 distal mesh-proxy minima: RH sample 12, LH 33.
  // Other stance, collision, and root-motion checks are not yet proven.
  const support=frame=>.006*pulse(frame,12,14)+.011*pulse(frame,33,14);
  let tries=0;
  const poll=setInterval(()=>{
    if(!window.__horseGaitV138?.ready){
      if(++tries>700){clearInterval(poll);window.__horseV139Error='V13.8 not ready';}
      return;
    }
    clearInterval(poll);
    try{
      const g=object3d;
      const base=g?.animations?.find(a=>a.name===SOURCE);
      if(!base||g.skins?.[0]?.joints?.length!==19||g.animations.some(a=>a.name===NAME))
        throw Error('Expected unique V13.8 clip on 19-joint source');
      if(base.channels.length!==19||Math.abs(base.duration-DURATION)>1e-6)
        throw Error('Unexpected source clip track count/duration');
      if(!window.__horseGaitV12?.hindRegionProtectedV134||
         window.__horseGaitV12?.belly?.corrected!==440)
        throw Error('V13.4 protected 440-vertex abdomen weights not confirmed');
      if(window.__horseGaitV137?.hindWarpAmplitudeSamples!==1)
        throw Error('Expected V13.7b low-amplitude limb source');
      const key=ch=>(g.doc.nodes[ch.node]?.name||'')+'|'+ch.path;
      const keys=new Set(base.channels.map(key));
      for(const name of requiredParts){
        if(!keys.has(name+'|rotation'))throw Error('Missing joint in source: '+name);
      }
      const torso=base.channels.find(ch=>key(ch)==='Torso|translation');
      if(!torso||torso.sam?.times?.length!==N||torso.sam?.data?.length!==N*3)
        throw Error('Torso translation must be 160 VEC3 samples');
      const data=new Float32Array(torso.sam.data);
      let maxLift=0;
      for(let i=0;i<N;i++){
        const y=data[3*i+1],lift=support(i);
        if(!Number.isFinite(y)||!Number.isFinite(lift)||lift<0||lift>.018)
          throw Error('Invalid support correction at frame '+i);
        data[3*i+1]=y+lift;
        maxLift=Math.max(maxLift,lift);
      }
      // All other 18 channel objects are reused rather than silently retimed.
      let updated=0;
      const channels=base.channels.map(ch=>{
        if(ch!==torso)return ch;
        updated++;
        return {node:ch.node,path:ch.path,
          sam:{times:ch.sam.times,data,interpolation:'LINEAR'}};
      });
      if(updated!==1||channels.length!==base.channels.length)
        throw Error('Unexpected torso-only corrective patch count');
      const selector=document.getElementById('animations');
      if(!selector)throw Error('Missing animation selector');
      const clipIndex=g.animations.length;
      g.animations.push({name:NAME,duration:base.duration,channels});
      const opt=document.createElement('option');
      opt.value=String(clipIndex);
      opt.textContent='△ V13.9 시험 — 후지 지지·몸통 균형';
      selector.appendChild(opt);
      selector.value=opt.value;
      selector.dispatchEvent(new Event('change'));
      window.__horseGaitV139={ready:true,clip:NAME,from:SOURCE,
        editedChannels:updated,unchangedChannelCount:18,
        sampleCount:N,maxSupportLift:maxLift,
        actualGLBProxyAnalyzed:true,actualHoofContactProven:false,
        skin160Verified:false,nativeWebGLVerified:false,originalClipsPreserved:true};
    }catch(error){
      window.__horseV139Error=String(error?.message||error);
      console.error('V13.9 support candidate',error);
    }
  },100);
})();