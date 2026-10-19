/* V16.8 event timeline / world-space hoof goals. No fake physical contacts.
 * Inputs are inspected real GLB sole vertex positions, root pose and frame.
 * Out-of-reach constraints must be reported rather than silently replaced.
 */
(function(root,factory){'use strict';const api=factory();root.__horseV168Contact=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const N=160,fract=x=>((x%1)+1)%1,clamp=(a,l=0,h=1)=>Math.max(l,Math.min(h,a)),
 smooth=x=>{const t=clamp(x);return t*t*t*(t*(t*6-15)+10)};
const C={
 walk:{events:[['HindR',0],['ForeR',.25],['HindL',.5],['ForeL',.75]],stance:{fore:.64,hind:.63},stride:{fore:.265,hind:.29},lift:{fore:.065,hind:.07},flight:false},
 cruise:{events:[['HindR',0],['HindL',.16],['ForeR',.39],['ForeL',.54]],stance:{fore:.185,hind:.19},stride:{fore:.48,hind:.49},lift:{fore:.088,hind:.10},flight:true},
 fast:{events:[['HindR',0],['HindL',.155],['ForeR',.375],['ForeL',.535]],stance:{fore:.16,hind:.17},stride:{fore:.54,hind:.57},lift:{fore:.105,hind:.12},flight:true},
 sprint:{events:[['HindR',0],['HindL',.145],['ForeR',.365],['ForeL',.52]],stance:{fore:.145,hind:.15},stride:{fore:.61,hind:.65},lift:{fore:.12,hind:.135},flight:true}};
function at(mode,leg,frame,foot,ground){
 const c=C[mode];if(!c||!c.events.some(([name])=>name===leg))throw Error('Unknown gait/leg');
 if(!foot?.ref||!Number.isFinite(foot.restY)||!Number.isFinite(foot.restZ)||!Number.isFinite(ground))throw Error('Unmeasured sole');
 const [_,touch]=c.events.find(([name])=>name===leg),p=fract(frame/N-touch),
  kind=leg.startsWith('Fore')?'fore':'hind',duration=c.stance[kind],
  stride=c.stride[kind],lift=c.lift[kind];
 const stance=p<duration,u=stance?p/duration:(p-duration)/(1-duration);
 const travel=stance?1-smooth(u):smooth(u);
 const toe=stance?smooth((u-.84)/.16):0;
 const height=stance?.003*toe:.003*(1-smooth(u/.18))+lift*Math.pow(Math.sin(Math.PI*u),2);
 const pitch=stance?toe*7:(7*(1-smooth(u/.18))-6*Math.sin(Math.PI*u)**2);
 // Independent virtual forward root travel is necessary for a loop-in-place.
 // Contact proxies must not claim a world-fixed planted hoof on a translating horse.
 const relativeZ=stance?stride*(.5-smooth(u)):stride*(smooth(u)-.5);
 return {leg,mode,phase:p,contactPhase:stance?'stance':'swing',event:stance?
  (u<.15?'loading':u>.85?'breakover':'midstance'):
  (u<.22?'toe-off':u>.82?'placement':'recovery'),
  x:foot.ref[0],y:ground+height,
  z:foot.restZ+relativeZ,pitchDeg:pitch,stance,relativeZ,
  virtualTravel:stride*travel,frame,ground,physicallyVerified:false};
}
function timeline(mode,feet,ground){
 const rows=[],c=C[mode];
 if(!c)throw Error('Unknown gait');
 for(let f=0;f<N;f++){const legs=Object.fromEntries(c.events.map(([name])=>[name,at(mode,name,f,feet[name],ground)]));
 rows.push({frame:f,legs,allAirborne:Object.values(legs).every(x=>!x.stance)});}
 return {mode,rows,events:c.events,airborneSamples:rows.filter(x=>x.allAirborne).length,
  verifiedGLB:false,physicalGroundReaction:false};
}
return {N,config:C,at,timeline,smooth};
});