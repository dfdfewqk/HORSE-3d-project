/* HORSE RANCH V16.1: C2-continuous four-beat walk foot targets.
 * X lateral, Y up, Z forward. Displacements are model-local, not world planting proof.
 * Touchdown sequence: RH -> RF -> LH -> LF, 0.25 cycle apart.
 */
(function(root,factory){'use strict';const api=factory();root.__horseV161Targets=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const N=160,TAU=Math.PI*2;
const CONFIG=Object.freeze({
 HindR:{touch:0,stance:.64,stride:.235,lift:.052},
 ForeR:{touch:.25,stance:.66,stride:.225,lift:.050},
 HindL:{touch:.50,stance:.64,stride:.235,lift:.052},
 ForeL:{touch:.75,stance:.66,stride:.225,lift:.050}
});
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const fract=x=>((x%1)+1)%1;
const smooth=x=>{let u=clamp(x);return u*u*u*(u*(u*6-15)+10);};
function state(name,frame){
 const c=CONFIG[name];if(!c)throw Error('Unknown limb '+name);
 const phase=fract(frame/N-c.touch),stance=phase<c.stance;
 if(stance){const u=phase/c.stance;
  return {phase,stance,u,segment:u<.06?'touchdown':u>.94?'breakover':'support',z:c.stride*(.5-u),lift:0,
   support:smooth(u/.075)*(1-smooth((u-.91)/.09))};
 }
 const u=(phase-c.stance)/(1-c.stance),A=-c.stride/2,B=c.stride/2,
  m=-c.stride*(1-c.stance)/c.stance;
 // Quintic Hermite: position, derivative and acceleration match stance at both ends.
 const D=B-A-m;const z=A+m*u+10*D*u**3-15*D*u**4+6*D*u**5;
 const lift=64*c.lift*u**3*(1-u)**3;
 return {phase,stance,u,segment:u<.5?'lift-and-flex':'protract-and-extend',z,lift,support:0};
}
function sampleAll(frame){return Object.fromEntries(Object.keys(CONFIG).map(k=>[k,state(k,frame)]));}
function check(){
 const out={};for(const name of Object.keys(CONFIG)){
  let maxSeamPos=0,maxSeamVel=0;
  const s=CONFIG[name],h=1e-5;
  for(const edge of [0,s.stance]){
   const a=state(name,(edge-h+s.touch)*N),b=state(name,(edge+h+s.touch)*N),
    prev=state(name,(edge-2*h+s.touch)*N),next=state(name,(edge+2*h+s.touch)*N);
   const dv1=(a.z-prev.z)/h,dv2=(next.z-b.z)/h;
   maxSeamPos=Math.max(maxSeamPos,Math.abs(a.z-b.z),Math.abs(a.lift-b.lift));
   maxSeamVel=Math.max(maxSeamVel,Math.abs(dv1-dv2));
  }
  out[name]={maxSeamPos,maxSeamVel,stride:s.stride,stance:s.stance};
 }return out;
}
return {N,CONFIG,state,sampleAll,check,smooth};
});