/* V16.6: register visibly distinct joint tracks without silently falling back.
 * Changes only Walk option; original g.animations remain immutable.
 */
(function(){'use strict';let attempts=0;
const timer=setInterval(()=>{
 if(!window.__viewerReady||!window.__horseV165?.ready||!window.__horseV166Legs){
  if(++attempts>950){clearInterval(timer);window.__horseV166Error='V16.5 or limb driver not ready';}return;
 }
 clearInterval(timer);
 try{
  const g=object3d,sel=document.getElementById('animations'),
   old=window.__horseV165,v15=window.__horseV15,v14=window.__horseV14,driver=window.__horseV166Legs;
  if(g.skins?.[0]?.joints?.length!==19||window.__horseGaitV12?.belly?.corrected!==440)throw Error('Protected GLB invariants missing');
  const source=g.animations.find(x=>x.name==='Walk_V16_5_PLANTED_WALK');
  if(!source)throw Error('V16.5 Walk not available');
  if(g.animations.some(x=>x.name==='Walk_V16_6_LEGS_REBUILT'))throw Error('Duplicate V16.6 clip');
  const out=driver.build(source,g.doc,old.fallbackLegs||[]);
  if(out.legMovementCount!==4)throw Error('All four legs do not show new animation data');
  const primitive=g.doc.meshes?.[0]?.primitives?.[0],skin=g.skins[0],attr=primitive?.attributes;
  if(!attr||!readAccessor)throw Error('Real GLB mesh accessor unavailable');
  const joints=readAccessor(g,attr.JOINTS_0),weights=readAccessor(g,attr.WEIGHTS_0),
   indices=new Map(skin.joints.map((id,i)=>[g.doc.nodes[id]?.name,i]));
  const influence={};let allWeighted=0;
  for(const [leg,chain] of Object.entries(driver.chain)){
   const counts=chain.map(name=>{
    const index=indices.get(name);if(index===undefined)throw Error('Leg is not a skin joint: '+name);
    let influenced=0;
    for(let i=0;i<weights.length;i+=4){
     let sum=0;for(let j=0;j<4;j++)if(joints[i+j]===index)sum+=weights[i+j];
     if(sum>.12)influenced++;
    }
    if(influenced>0)allWeighted++;return {joint:name,skinnedVertices:influenced};
   });
   influence[leg]=counts;
  }
  const existing=g.animations.slice(),opts=[...sel.options];
  if(opts.map(x=>x.textContent.trim()).join('|')!=='정지 자세|Walk|Gallop Cruise|Gallop Fast|Gallop Sprint')
   throw Error('Protected gait selector unexpectedly changed');
  const index=g.animations.length;g.animations.push(out.clip);
  const walk=opts.find(x=>x.textContent.trim()==='Walk');walk.value=String(index);
  const priorMode=v15.setMode,priorSpeed=v15.setSpeed;
  function useNew(){
   if(sel.value!==String(index)){sel.value=String(index);sel.dispatchEvent(new Event('change'));}
   v15.mode='walk';v15.selectedClip=out.clip.name;v14.mode='walk';v14.selectedClip=out.clip.name;
  }
  function setMode(id){const result=priorMode(id);
   if(id==='walk'){useNew();return {...result,mode:'walk',clip:out.clip.name,period:out.clip.duration};}return result;}
  function setSpeed(value){const result=priorSpeed(value);
   if(result?.mode==='walk'){useNew();return {...result,clip:out.clip.name,period:out.clip.duration};}return result;}
  v15.setMode=v14.setMode=setMode;v15.setSpeed=v14.setSpeed=setSpeed;
  sel.addEventListener('change',()=>{if(sel.value===String(index)){
   v15.mode='walk';v15.selectedClip=out.clip.name;v14.mode='walk';v14.selectedClip=out.clip.name;}});
  if(existing.some((clip,i)=>g.animations[i]!==clip))throw Error('Protected animation clip modified');
  const sampleInfo={ready:true,version:'V16.6',clip:out.clip.name,clipIndex:index,
   v165ClipIndex:g.animations.indexOf(source),rigBones:19,legChannelsRebuilt:14,
   legMovementCount:out.legMovementCount,skinJointsInfluenced:allWeighted,
   skinWeights:influence,jointMetrics:out.stats,previousLegFallbacks:old.fallbackLegs||[],
   modelSourcePreserved:true,gallopClipsPreserved:true,gpuVisualVerified:false,
   gaitPhysicallyValidated:false,realGLBSourceObserved:true};
  window.__horseV166=sampleInfo;useNew();
 }catch(error){window.__horseV166Error=String(error?.message||error);console.error('V16.6 limb rebuild',error);}
},100);
})();