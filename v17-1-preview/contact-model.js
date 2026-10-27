/* Contact policy shared by the baker, live transitions and independent audit.
 * Distances use the GLB's metre-sized preview coordinates (not horse speed telemetry).
 */
(function(root,factory){const api=factory();root.__horseV171Contact=api;if(typeof module==='object')module.exports=api;})(typeof window==='undefined'?globalThis:window,()=>{
'use strict';
const feet=['HindR','ForeR','HindL','ForeL'],frac=x=>((x%1)+1)%1;
const configs={
 walk:{period:1.44,touch:{HindR:0,ForeR:.25,HindL:.5,ForeL:.75},stance:{fore:.64,hind:.63},speed:.28,lift:.055},
 cruise:{period:.51,touch:{HindR:0,HindL:.16,ForeR:.39,ForeL:.54},stance:{fore:.26,hind:.28},speed:2.5,lift:.10},
 fast:{period:.46,touch:{HindR:0,HindL:.155,ForeR:.375,ForeL:.535},stance:{fore:.22,hind:.25},speed:3.2,lift:.13},
 sprint:{period:.42,touch:{HindR:0,HindL:.145,ForeR:.365,ForeL:.52},stance:{fore:.185,hind:.225},speed:3.9,lift:.16}
};
function state(mode,leg,phase){const c=configs[mode],kind=leg.startsWith('Fore')?'fore':'hind',d=c.stance[kind],p=frac(phase-c.touch[leg]),stance=p<d;return {stance,phase:p,duty:d,u:stance?p/d:(p-d)/(1-d),kind};}
function target(mode,leg,phase,restZ,floor){
 const c=configs[mode],s=state(mode,leg,phase),travel=c.speed*c.period*s.duty;
 let z,y=floor+.002;
 if(s.stance)z=restZ+travel*(.5-s.u);
 else {const u=s.u,m=-c.speed*c.period*(1-s.duty),D=travel-m;
  z=restZ-travel/2+m*u+D*(10*u**3-15*u**4+6*u**5);
  y+=c.lift*64*u**3*(1-u)**3;
 }
 return {...s,z,y};
}
function aerial(mode){const c=configs[mode],events=[0,1];for(const leg of feet){const s=state(mode,leg,c.touch[leg]);events.push(c.touch[leg],frac(c.touch[leg]+s.duty));}
 const t=[...new Set(events)].sort((a,b)=>a-b),out=[];for(let i=1;i<t.length;i++)if(feet.every(l=>!state(mode,l,(t[i]+t[i-1])/2).stance)){if(out.length&&Math.abs(out.at(-1)[1]-t[i-1])<1e-9)out.at(-1)[1]=t[i];else out.push([t[i-1],t[i]]);}return out;
}
function sample(s,t,n){
 const ts=s.times,d=s.data;let lo=0,hi=ts.length-1;while(lo<hi){const m=(lo+hi)>>1;if(ts[m]<t)lo=m+1;else hi=m;}const b=lo,a=Math.max(0,b-1),span=ts[b]-ts[a],u=span?Math.max(0,Math.min(1,(t-ts[a])/span)):0;
 const cubic=s.interpolation==='CUBICSPLINE',stride=cubic?3*n:n,offset=cubic?n:0;
 const A=Array.from({length:n},(_,k)=>d[a*stride+offset+k]),B=Array.from({length:n},(_,k)=>d[b*stride+offset+k]);
 let out;
 if(s.interpolation==='STEP')out=(t>=ts[b]?B:A).slice();
 else if(cubic){const u2=u*u,u3=u2*u;out=A.map((v,k)=>(2*u3-3*u2+1)*v+(u3-2*u2+u)*span*d[a*stride+2*n+k]+(-2*u3+3*u2)*B[k]+(u3-u2)*span*d[b*stride+k]);}
 else {const sign=n===4&&A.reduce((v,x,k)=>v+x*B[k],0)<0?-1:1;out=A.map((v,k)=>v*(1-u)+B[k]*sign*u);}
 if(n===4){const norm=Math.hypot(...out);if(norm<1e-10)throw Error('Zero quaternion');out=out.map(v=>v/norm);}if(!out.every(Number.isFinite))throw Error('Invalid animation sample');return out;
}
return {feet,configs,state,target,aerial,frac,sample};
});
