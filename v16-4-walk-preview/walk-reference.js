/* HORSE RANCH V16.4: walk reference phase and event priors.
  Hodson/Clayton/Lanovaz forelimb carpal flexion peaked around 76% limb stride
  (PMID 10952376); hindlimb stifle/tarsus coordinate during swing (PMID 11191608).
  Numeric curves below are DEVELOPMENT ESTIMATES for 19-bone synthetic rig,
  not anatomical measurements of this horse.
*/
(function(root,init){'use strict';const x=init();root.__horseV164Reference=x;if(typeof module==='object'&&module.exports)module.exports=x;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const N=160,TAU=Math.PI*2,RAD=Math.PI/180;
const CONFIG=Object.freeze({
 HindR:{touch:0,stance:.635,stride:.32,lift:.062,side:1,kind:'hind'},
 ForeR:{touch:.25,stance:.650,stride:.30,lift:.057,side:1,kind:'fore'},
 HindL:{touch:.50,stance:.635,stride:.32,lift:.062,side:-1,kind:'hind'},
 ForeL:{touch:.75,stance:.650,stride:.30,lift:.057,side:-1,kind:'fore'}
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const frac=x=>((x%1)+1)%1;
const smooth=x=>{let t=clamp(x);return t*t*(3-2*t);};
const smoother=x=>{let t=clamp(x);return t*t*t*(t*(t*6-15)+10);};
function phase(name,frame){const c=CONFIG[name];if(!c)throw Error('Unknown foot '+name);return frac(frame/N-c.touch);}
function sampleCurve(curve,p){
 if(p<=curve[0][0])return curve[0][1];for(let i=1;i<curve.length;i++)if(p<=curve[i][0]){
  const [a,x]=curve[i-1],[b,y]=curve[i];return x+(y-x)*smoother((p-a)/(b-a));
 }return curve[curve.length-1][1];
}
const PRIORS={
 fore:{shoulder:[[0,-19],[.22,-7],[.47,5],[.65,7],[.78,-8],[.94,-20],[1,-19]],
       knee:[[0,2],[.28,4],[.55,5],[.65,10],[.76,32],[.84,21],[.96,3],[1,2]],
       fetlock:[[0,-3],[.23,5],[.48,7],[.64,6],[.73,4],[.81,9],[.92,-4],[1,-3]]},
 hind:{hip:[[0,-25],[.27,-15],[.52,-5],[.635,0],[.78,-21],[.93,-30],[1,-25]],
       stifle:[[0,14],[.13,7],[.40,10],[.65,16],[.79,33],[.89,27],[1,14]],
       hock:[[0,13],[.12,5],[.40,7],[.65,13],[.80,-19],[.91,-8],[1,13]],
       fetlock:[[0,2],[.23,8],[.50,6],[.65,14],[.77,0],[.90,-4],[1,2]]}
};
function priors(name,frame){const c=CONFIG[name],p=phase(name,frame),defs=PRIORS[c.kind];return Object.values(defs).map(curve=>sampleCurve(curve,p)*RAD);}
function support(name,frame){
 const c=CONFIG[name],p=phase(name,frame);if(p>=c.stance)return 0;
 const u=p/c.stance;return smoother(u/.115)*(1-smoother((u-.84)/.16));
}
function all(frame){return Object.fromEntries(Object.keys(CONFIG).map(name=>[name,{phase:phase(name,frame),support:support(name,frame)}]));}
return {N,TAU,RAD,CONFIG,PRIORS,clamp,frac,smooth,smoother,phase,priors,support,all};
});